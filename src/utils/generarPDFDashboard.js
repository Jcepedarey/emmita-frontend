// src/utils/generarPDFDashboard.js — Sesión 9 v2: PDF Dashboard profesional
// NOTA: jsPDF no soporta emojis Unicode — todos los textos usan caracteres ASCII/Latin-1
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { obtenerDatosTenantPDF } from "./tenantPDF"; // ✅ Import correcto

/* ─── Constantes ─── */
const BLUE = [41, 128, 185];
const GREEN = [16, 185, 129];
const RED = [239, 68, 68];
const GRAY = [100, 116, 139];
const DARK = [31, 41, 55];
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const soloFecha = (f) => {
  if (!f) return "-";
  const s = String(f).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
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
    img.onerror = () => resolve(null);
    img.src = src;
  });

const nombreMes = (k) => {
  const [y, m] = (k || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
};

// Limpiar emojis de cualquier texto (por seguridad)
const limpiar = (txt) => String(txt || "").replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu, "").trim();

/* ─── Funcion principal ─── */
export async function generarPDFDashboard(data) {
  const {
    desde, hasta, periodoTexto,
    kpis, serieMes, topClientes,
    articulosPropios, articulosProveedor, proveedores,
    resumenFinanciero, resumenClientes, resumenProveedoresTexto,
  } = data;

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginBottom = 22; // espacio reservado para footer

  // Recursos graficos
  let logo = null, fondo = null;
  // ✅ CORRECCIÓN: Declaramos 'emp' aquí afuera con valores por defecto
  let emp = { 
    nombre: "Alquiler & Eventos Emmita", 
    direccion: "Villavicencio, Meta",
    telefono: "",
    logoUrl: "/icons/logo.png",
    fondoUrl: "/icons/fondo_emmita.png"
  };

  try {
    // Intentamos cargar los datos reales del tenant
    const datosTenant = await obtenerDatosTenantPDF();
    if (datosTenant) {
        emp = datosTenant; // Si existen, sobrescribimos los valores por defecto
    }
    logo = await procesarImagen(emp.logoUrl, 250, 1.0);
    fondo = await procesarImagen(emp.fondoUrl, 300, 0.9);
  } catch (error) {
    console.error("Error cargando recursos PDF:", error);
  }

  const insertarFondo = () => {
    if (!fondo) return;
    const cx = (pageW - 150) / 2, cy = (pageH - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondo, "PNG", cx, cy, 150, 150);
    doc.restoreGraphicsState();
  };

  // Tracker de posicion Y
  let y = 0;

  const ensureSpace = (needed = 40) => {
    if (y + needed > pageH - marginBottom) {
      doc.addPage();
      insertarFondo();
      y = 20;
    }
  };

  const drawSectionTitle = (title) => {
    ensureSpace(30);
    doc.setFontSize(13);
    doc.setTextColor(...BLUE);
    doc.text(limpiar(title), 14, y);
    // Linea decorativa
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    const tw = doc.getTextWidth(limpiar(title));
    doc.line(14, y + 2, 14 + tw, y + 2);
    y += 8;
    doc.setTextColor(...DARK);
  };

  const drawSmallText = (lines) => {
    if (!lines || !lines.length) return;
    doc.setFontSize(9);
    doc.setTextColor(80);
    lines.forEach((line) => {
      ensureSpace(12);
      const cleaned = limpiar(line);
      if (!cleaned) return;
      const wrapped = doc.splitTextToSize(cleaned, pageW - 28);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4.2;
    });
    y += 2;
  };

  // ═══════════════════════════════════════════════════════════
  //  ENCABEZADO
  // ═══════════════════════════════════════════════════════════
  insertarFondo();

  if (logo) doc.addImage(logo, "PNG", 10, 10, 30, 30);
  doc.setFontSize(16);
  doc.setTextColor(30);
  // ✅ Ahora sí 'emp' existe aquí
  doc.text(emp.nombre || "Empresa", 50, 20); 
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(emp.direccion || "", 50, 26);
  doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(10, 40, pageW - 10, 40);

  // Titulo
  doc.setFontSize(20);
  doc.setTextColor(...BLUE);
  doc.text("REPORTE DASHBOARD", pageW / 2, 52, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(80);
  const periodoLabel = periodoTexto || `${soloFecha(desde)} - ${soloFecha(hasta)}`;
  doc.text(`Periodo: ${limpiar(periodoLabel)}`, pageW / 2, 60, { align: "center" });

  // ═══════════════════════════════════════════════════════════
  //  KPIs
  // ═══════════════════════════════════════════════════════════
  y = 70;
  drawSectionTitle("Indicadores Clave (KPIs)");

  autoTable(doc, {
    startY: y,
    head: [["Ingresos Reales", "Gastos Reales", "Ganancia Neta", "Pedidos con Abono"]],
    body: [[
      money(kpis.ingresos),
      money(kpis.gastos),
      money(kpis.ganancia),
      String(kpis.pedidos || 0),
    ]],
    theme: "grid",
    styles: { fontSize: 11, halign: "center", cellPadding: 5 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontStyle: "bold", fontSize: 12 },
    columnStyles: {
      0: { textColor: GREEN },
      1: { textColor: RED },
      2: { textColor: (kpis.ganancia >= 0 ? GREEN : RED) },
      3: { textColor: GRAY },
    },
  });
  y = doc.lastAutoTable.finalY + 4;

  // Variacion
  const vars = [];
  if (kpis.pctIng !== undefined && kpis.pctIng !== 0) vars.push(`Ingresos: ${kpis.pctIng > 0 ? "+" : ""}${kpis.pctIng}% vs anterior`);
  if (kpis.pctGas !== undefined && kpis.pctGas !== 0) vars.push(`Gastos: ${kpis.pctGas > 0 ? "+" : ""}${kpis.pctGas}% vs anterior`);
  if (vars.length) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(vars.join("   |   "), 14, y);
    y += 6;
  }

  // Resumen financiero
  if (resumenFinanciero && resumenFinanciero.length) {
    y += 2;
    drawSectionTitle("Resumen Financiero");
    drawSmallText(resumenFinanciero);
  }

  // ═══════════════════════════════════════════════════════════
  //  FINANCIERO — Tabla mensual
  // ═══════════════════════════════════════════════════════════
  if (serieMes && serieMes.meses && serieMes.meses.length > 0) {
    drawSectionTitle("Tendencia Financiera por Mes");

    autoTable(doc, {
      startY: y,
      head: [["Mes", "Ingresos", "Gastos", "Ganancia"]],
      body: serieMes.meses.map((k, i) => [
        nombreMes(k),
        money(serieMes.ingresos[i]),
        money(serieMes.gastos[i]),
        money(serieMes.ganancia[i]),
      ]),
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: BLUE, textColor: 255 },
      columnStyles: {
        1: { halign: "right", textColor: GREEN },
        2: { halign: "right", textColor: RED },
        3: { halign: "right", fontStyle: "bold" },
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════════════════════════
  //  CLIENTES — Top 10
  // ═══════════════════════════════════════════════════════════
  if (topClientes && topClientes.length > 0) {
    drawSectionTitle("Top Clientes - Recaudo Real");

    autoTable(doc, {
      startY: y,
      head: [["#", "Cliente", "Pedidos", "Recaudo Real", "Promedio"]],
      body: topClientes.map((c, i) => [
        i + 1,
        limpiar(c.nombre),
        c.pedidos,
        money(c.recaudo),
        money(c.promedio),
      ]),
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: BLUE, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { halign: "center", cellWidth: 22 },
        3: { halign: "right", fontStyle: "bold", textColor: GREEN },
        4: { halign: "right", textColor: GRAY },
      },
    });
    y = doc.lastAutoTable.finalY + 4;

    if (resumenClientes && resumenClientes.length) {
      drawSmallText(resumenClientes);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ARTICULOS — Propios
  // ═══════════════════════════════════════════════════════════
  if (articulosPropios && articulosPropios.length > 0) {
    drawSectionTitle("Articulos Mas Alquilados (Propios)");

    autoTable(doc, {
      startY: y,
      head: [["#", "Articulo", "Cantidad"]],
      body: articulosPropios.slice(0, 10).map((a, i) => [
        i + 1,
        limpiar(a.nombre),
        Number(a.cantidad).toLocaleString("es-CO"),
      ]),
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { halign: "right", fontStyle: "bold" },
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════════════════════════
  //  ARTICULOS — Proveedor
  // ═══════════════════════════════════════════════════════════
  if (articulosProveedor && articulosProveedor.length > 0) {
    drawSectionTitle("Articulos Mas Alquilados (Proveedor)");

    autoTable(doc, {
      startY: y,
      head: [["#", "Articulo", "Cantidad"]],
      body: articulosProveedor.slice(0, 10).map((a, i) => [
        i + 1,
        limpiar(a.nombre),
        Number(a.cantidad).toLocaleString("es-CO"),
      ]),
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { halign: "right", fontStyle: "bold" },
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════════════════════════
  //  PROVEEDORES
  // ═══════════════════════════════════════════════════════════
  if (proveedores && proveedores.length > 0) {
    drawSectionTitle("Resumen de Proveedores - Pagos Reales");

    autoTable(doc, {
      startY: y,
      head: [["Proveedor", "Ordenes", "Adeudado", "Pagado", "Pendiente"]],
      body: proveedores.map((p) => [
        limpiar(p.nombre),
        p.ordenes,
        money(p.total),
        money(p.pagado),
        p.pendiente > 0 ? money(p.pendiente) : "Pagado",
      ]),
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: GRAY, textColor: 255 },
      columnStyles: {
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "right" },
        3: { halign: "right", textColor: GREEN },
        4: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 4) {
          const val = proveedores[hookData.row.index]?.pendiente || 0;
          hookData.cell.styles.textColor = val > 0 ? RED : GREEN;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 4;

    if (resumenProveedoresTexto && resumenProveedoresTexto.length) {
      drawSmallText(resumenProveedoresTexto);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  FOOTER con paginacion
  // ═══════════════════════════════════════════════════════════
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Pagina ${i} de ${pages}`, pageW / 2, pageH - 8, { align: "center" });
    doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, pageW - 14, pageH - 8, { align: "right" });
    // ✅ 'emp' también existe aquí y funciona
    doc.text(`Swalquiler - ${emp.nombre || ""}`, 14, pageH - 8);
  }

  // ═══════════════════════════════════════════════════════════
  //  GUARDAR
  // ═══════════════════════════════════════════════════════════
  const fechaStr = new Date().toISOString().slice(0, 10);
  doc.save(`Dashboard_${limpiar(periodoTexto || fechaStr).replace(/\s+/g, "_")}.pdf`);
}

export default generarPDFDashboard;