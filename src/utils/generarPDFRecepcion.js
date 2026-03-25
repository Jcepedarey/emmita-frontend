import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { generarNombreArchivo } from "./nombrePDF";
import { obtenerDatosTenantPDF } from "./tenantPDF";

// ─────────────────── Utilidades ───────────────────
const BLUE_HEAD = [41, 128, 185];
const GRID_ZEBRA_LIGHT = 255;
const GRID_ZEBRA_DARK = 245;

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

// dd/mm/aaaa (sin desfases)
const soloFecha = (f) => {
  if (!f) return "—";
  if (f instanceof Date) {
    const dd = String(f.getDate()).padStart(2, "0");
    const mm = String(f.getMonth() + 1).padStart(2, "0");
    const yy = f.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  const s = String(f).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`;
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return "—";
};

const procesarImagen = (src, width = 150, calidad = 1.0) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const escala = width / img.width;
      canvas.width = width;
      canvas.height = img.height * escala;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png", calidad));
    };
    img.src = src;
  });

// ──────────────── Principal ────────────────
// 🆕 Agregado parámetro pagosProveedoresRecepcion y garantiaInfo
export async function generarPDFRecepcion(revision, clienteInput, productosRecibidos, ingresosAdicionales = [], pagosProveedoresRecepcion = [], garantiaInfo = {}) {
  const doc = new jsPDF();

  // Recursos gráficos (MISMO tratamiento que Remisión)
  const emp = await obtenerDatosTenantPDF();
  const logo = emp.logoUrl ? await procesarImagen(emp.logoUrl, 250, 1.0) : null;
  const fondo = emp.fondoUrl ? await procesarImagen(emp.fondoUrl, 300, 0.9) : null;

  // ⚠️ CRÍTICO: insertarFondo() solo UNA VEZ al inicio
  const insertarFondo = () => {
    if (!fondo) return;
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();
  };
  insertarFondo();

  // Cliente (si llega parcial)
  const cliente = clienteInput || {};

  // ─── Encabezado (EXACTO como Remisión) ───
  if (logo) doc.addImage(logo, "PNG", 10, 10, 30, 30);
  doc.setFontSize(16);
  doc.text(emp.nombre, 50, 20);
  doc.setFontSize(10);
  doc.text(emp.direccion, 50, 26);
  doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // Datos cliente (MISMA distribución que Remisión)
  doc.setFontSize(12);
  doc.text(`Cliente: ${cliente?.nombre || "N/A"}`, 10, 48);
  doc.text(`Identificación: ${cliente?.identificacion || "N/A"}`, 10, 55);
  doc.text(`Teléfono: ${cliente?.telefono || "N/A"}`, 10, 61);
  doc.text(`Dirección: ${cliente?.direccion || "N/A"}`, 10, 67);
  doc.text(`Correo: ${cliente?.email || "N/A"}`, 10, 73);

  // Fecha revisión (derecha, como Remisión)
  doc.setFontSize(11);
  doc.text(`Fecha revisión: ${soloFecha(new Date())}`, 150, 48);

  // ─── TABLA DE ARTÍCULOS (zebra mejorado) ───
  let zebraIndex = 0;
  autoTable(doc, {
    theme: "plain",
    head: [["Descripción", "Esperado", "Recibido", "Observación"]],
    body: (productosRecibidos || []).map((p) => [
      p.descripcion || "—",
      p.esperado ?? "—",
      p.recibido ?? "—",
      (p.observacion && String(p.observacion).trim()) || "—",
    ]),
    startY: 85,
    styles: { font: "helvetica", fontSize: 10 },
    headStyles: { 
      fillColor: BLUE_HEAD, 
      textColor: 255, 
      halign: "center", 
      valign: "middle" 
    },
    columnStyles: {
      0: { cellWidth: 92 },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 46, halign: "left" },
    },
    didParseCell: (data) => {
      const { section, column, cell, row, table } = data;
      if (section === "head") return;

      if (section === "body") {
        // Zebra 255/245
        const shade = zebraIndex % 2 === 0 ? GRID_ZEBRA_LIGHT : GRID_ZEBRA_DARK;
        cell.styles.fillColor = [shade, shade, shade];

        // Observación: guion centrado si está vacío
        if (column.index === 3) {
          const raw = row.raw?.[3];
          if (!raw || raw === "—") {
            cell.styles.halign = "center";
          }
        }

        // Incrementar zebra al final de cada fila
        if (column.index === table.columns.length - 1) zebraIndex++;
      }
    },
    margin: { left: 10, right: 10 },
  });

  // ─── RESUMEN FINANCIERO ───
  let y = (doc.lastAutoTable?.finalY || 100) + 10;

  // ─── SECCIÓN DE GARANTÍA ───
  const garantiaTotal = Number(garantiaInfo.garantiaTotal || revision?.garantia || 0);
  const garantiaRetenidaVal = Number(garantiaInfo.garantiaRetenida || 0);
  const garantiaDevuelta = Math.max(0, garantiaTotal - garantiaRetenidaVal);

  if (garantiaTotal > 0) {
    // Verificar si hay espacio en la página
    if (y + 45 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      insertarFondo();
      y = 20;
    }

    autoTable(doc, {
      startY: y,
      theme: "plain",
      head: [["Concepto", "Valor ($)"]],
      body: [
        ["Garantía entregada por el cliente", money(garantiaTotal)],
        ["Monto retenido (daños/demora)", garantiaRetenidaVal > 0 ? money(garantiaRetenidaVal) : "$0"],
        ["Devuelto al cliente", money(garantiaDevuelta)],
      ],
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: {
        fillColor: [245, 158, 11],
        textColor: 255,
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 60, halign: "center" },
      },
      didParseCell: (data) => {
        const { section, row, cell } = data;
        if (section === "body") {
          cell.styles.fillColor = [255, 251, 235]; // amber-50
          // Highlight retained row in red
          if (row.index === 1 && garantiaRetenidaVal > 0) {
            cell.styles.textColor = [220, 38, 38];
            cell.styles.fontStyle = "bold";
          }
          // Highlight returned row in green
          if (row.index === 2) {
            cell.styles.textColor = [22, 163, 74];
            cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 10, right: 10 },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // ===== INGRESOS =====
  const abonos = Array.isArray(revision?.abonos) ? revision.abonos : [];
  let totalIngresos = 0;

  const ingresosRows = abonos.map((a, i) => {
    const valor = Number(a?.valor ?? a ?? 0);
    const fecha = a?.fecha ? soloFecha(a.fecha) : "—";
    totalIngresos += valor;
    return [`Abono ${i + 1}`, fecha, money(valor)];
  });

  // Ingresos adicionales (pagos en recepción de cliente)
  ingresosAdicionales.forEach((ing, i) => {
    const valor = Number(ing.valor || 0);
    if (valor > 0) {
      ingresosRows.push([
        `Pago en recepción ${i + 1}`,
        ing.fecha ? soloFecha(ing.fecha) : "—",
        money(valor),
      ]);
      totalIngresos += valor;
    }
  });

  // 🛡️ Garantía retenida como ingreso
  if (garantiaRetenidaVal > 0) {
    ingresosRows.push([
      "Garantía retenida (daños/demora)",
      soloFecha(new Date()),
      money(garantiaRetenidaVal),
    ]);
    totalIngresos += garantiaRetenidaVal;
  }

  // ✅ TABLA DE INGRESOS
  zebraIndex = 0;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    head: [["Concepto", "Fecha", "Valor ($)"]],
    body: ingresosRows.length ? ingresosRows : [["—", "—", money(0)]],
    foot: [["TOTAL INGRESOS", "—", money(totalIngresos)]],
    styles: { font: "helvetica", fontSize: 10 },
    headStyles: { 
      fillColor: BLUE_HEAD, 
      textColor: 255, 
      halign: "center", 
      valign: "middle" 
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 55, halign: "center" },
    },
    didParseCell: (data) => {
      const { section, column, cell, table } = data;
      if (section === "head") return;

      if (section === "body") {
        const shade = zebraIndex % 2 === 0 ? GRID_ZEBRA_LIGHT : GRID_ZEBRA_DARK;
        cell.styles.fillColor = [shade, shade, shade];
        if (column.index === table.columns.length - 1) zebraIndex++;
      }

      if (section === "foot") {
        cell.styles.fontStyle = "bold";
        cell.styles.fontSize = 11.5;
        if (column.index === 2) cell.styles.textColor = [22, 163, 74];
        cell.styles.halign = "center";
      }
    },
    margin: { left: 10, right: 10 },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ===== GASTOS (ACTUALIZADO CON DETALLE DE PAGOS A PROVEEDORES) =====
  let totalGastos = 0;
  const gastosRows = [];

  // 🆕 PAGOS A PROVEEDORES (desde pagos_proveedores de la orden)
  const pagosProveedoresOrden = revision?.pagos_proveedores || [];

  pagosProveedoresOrden.forEach((prov) => {
    (prov.abonos || []).forEach((abono) => {
      const valor = Number(abono.valor || 0);
      if (valor > 0) {
        const fecha = abono.fecha ? soloFecha(abono.fecha) : "—";
        gastosRows.push([
          `Pago a ${prov.proveedor_nombre}`,
          fecha,
          money(valor),
        ]);
        totalGastos += valor;
      }
    });
  });

  // 🆕 PAGOS ADICIONALES EN RECEPCIÓN
  (pagosProveedoresRecepcion || []).forEach((pago) => {
    const valor = Number(pago.abono_recepcion || 0);
    if (valor > 0) {
      const fecha = pago.fecha_abono_recepcion ? soloFecha(pago.fecha_abono_recepcion) : soloFecha(new Date());
      gastosRows.push([
        `Pago a ${pago.proveedor_nombre} (recepción)`,
        fecha,
        money(valor),
      ]);
      totalGastos += valor;
    }
  });

  // Descuento aplicado
  if (Number(revision?.descuento) > 0) {
    gastosRows.push(["Descuento aplicado", "—", money(Number(revision.descuento))]);
    totalGastos += Number(revision.descuento);
  }

  // Retención legal
  if (Number(revision?.retencion) > 0) {
    gastosRows.push(["Retención legal", "—", money(Number(revision.retencion))]);
    totalGastos += Number(revision.retencion);
  }

  // ✅ TABLA DE GASTOS
  zebraIndex = 0;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    head: [["Concepto", "Fecha", "Valor ($)"]],
    body: gastosRows.length ? gastosRows : [["—", "—", money(0)]],
    foot: [["TOTAL GASTOS", "—", money(totalGastos)]],
    styles: { font: "helvetica", fontSize: 10 },
    headStyles: { 
      fillColor: BLUE_HEAD, 
      textColor: 255, 
      halign: "center", 
      valign: "middle" 
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 55, halign: "center" },
    },
    didParseCell: (data) => {
      const { section, column, cell, table } = data;
      if (section === "head") return;

      if (section === "body") {
        const shade = zebraIndex % 2 === 0 ? GRID_ZEBRA_LIGHT : GRID_ZEBRA_DARK;
        cell.styles.fillColor = [shade, shade, shade];
        if (column.index === table.columns.length - 1) zebraIndex++;
      }

      if (section === "foot") {
        cell.styles.fontStyle = "bold";
        cell.styles.fontSize = 11.5;
        if (column.index === 2) cell.styles.textColor = [220, 38, 38];
        cell.styles.halign = "center";
      }
    },
    margin: { left: 10, right: 10 },
  });

  // ===== GANANCIA NETA (mini-tabla centrada) =====
  const gananciaNeta = totalIngresos - totalGastos;
  const pageW = doc.internal.pageSize.getWidth();
  const miniWidth = 120;
  const leftMargin = (pageW - miniWidth) / 2;

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    theme: "plain",
    head: [["GANANCIA NETA ($)"]],
    body: [[money(gananciaNeta)]],
    styles: { font: "helvetica", fontSize: 11 },
    headStyles: { 
      fillColor: BLUE_HEAD, 
      textColor: 255, 
      fontStyle: "bold", 
      halign: "center" 
    },
    bodyStyles: {
      fillColor: [GRID_ZEBRA_DARK, GRID_ZEBRA_DARK, GRID_ZEBRA_DARK],
      halign: "center",
      fontStyle: "bold",
      textColor: gananciaNeta >= 0 ? [22, 163, 74] : [220, 38, 38],
    },
    tableWidth: miniWidth,
    margin: { left: leftMargin, right: leftMargin },
  });

  // Guardar
  const nombreArchivo = generarNombreArchivo(
    "recepcion",
    revision?.fecha || new Date(),
    cliente?.nombre
  );
  doc.save(nombreArchivo);
}

export default generarPDFRecepcion;