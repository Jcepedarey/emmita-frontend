// src/utils/generarPDFContable.js — SESIÓN 4: PDF profesional de contabilidad
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────── Constantes ───────────────────
const BLUE_HEAD = [41, 128, 185];
const ZEBRA_LIGHT = 255;
const ZEBRA_DARK = 245;
const COLOR_VERDE = [22, 163, 74];
const COLOR_ROJO = [220, 38, 38];
const COLOR_GRIS = [100, 116, 139];

// ─────────────────── Utilidades ───────────────────
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

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
    img.onerror = () => resolve(null);
    img.src = src;
  });

// ─────────────────── Generador principal ───────────────────
/**
 * Genera PDF profesional de contabilidad
 * @param {Array} movimientos - Lista de movimientos contables (ya filtrados)
 * @param {Object} opciones - { desde, hasta, filtroCategoria, filtroOrigen }
 */
export async function generarPDFContable(movimientos, opciones = {}) {
  const doc = new jsPDF();
  const { desde, hasta, filtroCategoria, filtroOrigen } = opciones;

  // Recursos gráficos
  const logo = await procesarImagen("/icons/logo.png", 250, 1.0);
  const fondo = await procesarImagen("/icons/fondo_emmita.png", 300, 0.9);

  // Marca de agua en cada página
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

  // ─── Encabezado (mismo estilo que Recepción y Remisión) ───
  if (logo) doc.addImage(logo, "PNG", 10, 10, 30, 30);
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // ─── Título y período ───
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Informe de Contabilidad", 10, 50);

  doc.setFontSize(10);
  doc.setTextColor(...COLOR_GRIS);
  const periodoTexto = desde && hasta
    ? `Período: ${soloFecha(desde)} — ${soloFecha(hasta)}`
    : desde ? `Desde: ${soloFecha(desde)}`
    : hasta ? `Hasta: ${soloFecha(hasta)}`
    : "Período: Todo el historial";
  doc.text(periodoTexto, 10, 57);
  doc.text(`Generado: ${soloFecha(new Date())}`, 150, 50);

  // Filtros aplicados (si los hay)
  let yInfo = 57;
  if (filtroCategoria && filtroCategoria !== "todas") {
    doc.text(`Categoría: ${filtroCategoria}`, 150, yInfo);
    yInfo += 5;
  }
  if (filtroOrigen && filtroOrigen !== "todos") {
    doc.text(`Origen: ${filtroOrigen}`, 150, yInfo);
  }

  // ─── Resumen financiero (mini tabla centrada) ───
  const activos = movimientos.filter((m) => m.estado !== "eliminado");
  const ingresos = activos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0);
  const gastos = activos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);
  const balance = ingresos - gastos;

  autoTable(doc, {
    startY: 63,
    theme: "plain",
    head: [["INGRESOS", "GASTOS", "BALANCE NETO"]],
    body: [[money(ingresos), money(gastos), money(balance)]],
    styles: { font: "helvetica", fontSize: 11, halign: "center" },
    headStyles: {
      fillColor: BLUE_HEAD,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 12;
        data.cell.styles.fillColor = [ZEBRA_DARK, ZEBRA_DARK, ZEBRA_DARK];
        if (data.column.index === 0) data.cell.styles.textColor = COLOR_VERDE;
        if (data.column.index === 1) data.cell.styles.textColor = COLOR_ROJO;
        if (data.column.index === 2) data.cell.styles.textColor = balance >= 0 ? COLOR_VERDE : COLOR_ROJO;
      }
    },
    margin: { left: 25, right: 25 },
    tableWidth: 160,
  });

  // ─── Tabla principal de movimientos ───
  let zebraIndex = 0;
  const tablaBody = activos.map((m) => [
    soloFecha(m.fecha),
    m.tipo === "ingreso" ? "INGRESO" : "GASTO",
    money(Math.abs(Number(m.monto || 0))),
    truncar(m.descripcion || m.categoria || "—", 40),
    m.categoria || "—",
    origenLabel(m.origen),
  ]);

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 80) + 8,
    theme: "plain",
    head: [["Fecha", "Tipo", "Monto", "Descripción", "Categoría", "Origen"]],
    body: tablaBody.length ? tablaBody : [["—", "—", "—", "Sin movimientos en este período", "—", "—"]],
    styles: { font: "helvetica", fontSize: 8.5 },
    headStyles: {
      fillColor: BLUE_HEAD,
      textColor: 255,
      halign: "center",
      valign: "middle",
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 62 },
      4: { cellWidth: 35 },
      5: { cellWidth: 25, halign: "center" },
    },
    didParseCell: (data) => {
      const { section, column, cell, table } = data;
      if (section === "head") return;
      if (section === "body") {
        // Zebra
        const shade = zebraIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK;
        cell.styles.fillColor = [shade, shade, shade];
        if (column.index === table.columns.length - 1) zebraIndex++;

        // Color por tipo
        if (column.index === 1) {
          cell.styles.textColor = cell.raw === "INGRESO" ? COLOR_VERDE : COLOR_ROJO;
          cell.styles.fontStyle = "bold";
        }
        // Color monto
        if (column.index === 2) {
          const tipo = data.row.raw?.[1];
          cell.styles.textColor = tipo === "INGRESO" ? COLOR_VERDE : COLOR_ROJO;
        }
      }
    },
    didDrawPage: insertarFondo,
    margin: { left: 10, right: 10 },
  });

  // ─── Desglose por categoría ───
  const porCategoria = {};
  for (const m of activos) {
    const cat = m.categoria || "Sin categoría";
    if (!porCategoria[cat]) porCategoria[cat] = { ingresos: 0, gastos: 0, count: 0 };
    if (m.tipo === "ingreso") porCategoria[cat].ingresos += Number(m.monto || 0);
    if (m.tipo === "gasto") porCategoria[cat].gastos += Number(m.monto || 0);
    porCategoria[cat].count++;
  }

  const categoriasOrdenadas = Object.entries(porCategoria)
    .sort((a, b) => (b[1].ingresos + b[1].gastos) - (a[1].ingresos + a[1].gastos));

  if (categoriasOrdenadas.length > 0) {
    // Verificar si necesitamos nueva página
    const yActual = doc.lastAutoTable?.finalY || 200;
    if (yActual > 240) {
      doc.addPage();
      insertarFondo();
    }

    const startYCat = yActual > 240 ? 20 : yActual + 10;

    // Subtítulo
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Desglose por categoría", 10, startYCat);

    zebraIndex = 0;
    autoTable(doc, {
      startY: startYCat + 4,
      theme: "plain",
      head: [["Categoría", "Movs", "Ingresos", "Gastos", "Neto"]],
      body: categoriasOrdenadas.map(([cat, v]) => [
        cat,
        v.count,
        money(v.ingresos),
        money(v.gastos),
        money(v.ingresos - v.gastos),
      ]),
      foot: [["TOTALES", activos.length, money(ingresos), money(gastos), money(balance)]],
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: {
        fillColor: COLOR_GRIS,
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 37, halign: "right" },
        3: { cellWidth: 37, halign: "right" },
        4: { cellWidth: 37, halign: "right" },
      },
      didParseCell: (data) => {
        const { section, column, cell, table } = data;
        if (section === "head") return;

        if (section === "body") {
          const shade = zebraIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK;
          cell.styles.fillColor = [shade, shade, shade];
          if (column.index === table.columns.length - 1) zebraIndex++;

          if (column.index === 2) cell.styles.textColor = COLOR_VERDE;
          if (column.index === 3) cell.styles.textColor = COLOR_ROJO;
          if (column.index === 4) {
            const raw = data.row.raw;
            const neto = (raw?.[2] ? parseMoney(raw[2]) : 0) - (raw?.[3] ? parseMoney(raw[3]) : 0);
            cell.styles.textColor = neto >= 0 ? COLOR_VERDE : COLOR_ROJO;
            cell.styles.fontStyle = "bold";
          }
        }

        if (section === "foot") {
          cell.styles.fontStyle = "bold";
          cell.styles.fontSize = 10;
          cell.styles.fillColor = [230, 230, 230];
          cell.styles.halign = "center";
          if (column.index === 2) cell.styles.textColor = COLOR_VERDE;
          if (column.index === 3) cell.styles.textColor = COLOR_ROJO;
          if (column.index === 4) cell.styles.textColor = balance >= 0 ? COLOR_VERDE : COLOR_ROJO;
        }
      },
      didDrawPage: insertarFondo,
      margin: { left: 15, right: 15 },
    });
  }

  // ─── Pie de página con numeración ───
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Alquiler & Eventos Emmita — Informe Contable — Página ${i} de ${totalPages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // Guardar
  const fechaArchivo = new Date().toLocaleDateString("es-CO").replaceAll("/", "-");
  doc.save(`Contabilidad_${fechaArchivo}.pdf`);
}

// ─────────────────── Helpers internos ───────────────────
function truncar(texto, max) {
  if (!texto) return "—";
  return texto.length > max ? texto.slice(0, max - 1) + "…" : texto;
}

function origenLabel(origen) {
  switch (origen) {
    case "automatico": return "Auto";
    case "recurrente": return "Recurrente";
    case "recepcion": return "Recepción";
    default: return "Manual";
  }
}

function parseMoney(str) {
  if (!str) return 0;
  const limpio = String(str).replace(/[$.\s]/g, "").replace(",", ".");
  return Number(limpio) || 0;
}

export default generarPDFContable;