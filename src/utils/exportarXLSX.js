// src/utils/exportarXLSX.js — Exportador Excel profesional con estilos
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* ─── Constantes de estilo ─── */
const AZUL_HEADER = "0F172A";       // fondo encabezado oscuro
const AZUL_TITULO = "0077B6";       // azul primario SwAlquiler
const VERDE = "16A34A";
const ROJO = "DC2626";
const GRIS_CLARO = "F8FAFC";
const GRIS_BORDE = "E2E8F0";
const BLANCO = "FFFFFF";

const borderThin = {
  top: { style: "thin", color: { argb: GRIS_BORDE } },
  bottom: { style: "thin", color: { argb: GRIS_BORDE } },
  left: { style: "thin", color: { argb: GRIS_BORDE } },
  right: { style: "thin", color: { argb: GRIS_BORDE } },
};

const fontHeader = { bold: true, size: 11, color: { argb: BLANCO }, name: "Calibri" };
const fontBody = { size: 10, name: "Calibri" };
const fontTitulo = { bold: true, size: 14, color: { argb: AZUL_TITULO }, name: "Calibri" };
const fontSubtitulo = { size: 10, color: { argb: "64748B" }, name: "Calibri" };
const fontResumen = { bold: true, size: 11, name: "Calibri" };

const money = (n) => Number(n || 0);

/* ═══════════════════════════════════════════════════════════════
   EXPORTAR FINANCIERO
   ═══════════════════════════════════════════════════════════════ */
export async function exportarFinancieroXLSX(serieMes, kpis, periodoTexto) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SwAlquiler";
  wb.created = new Date();

  const ws = wb.addWorksheet("Financiero", {
    properties: { defaultColWidth: 18 },
  });

  // ── Título ──
  ws.mergeCells("A1:D1");
  const titulo = ws.getCell("A1");
  titulo.value = "Informe Financiero — SwAlquiler";
  titulo.font = fontTitulo;
  titulo.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:D2");
  const sub = ws.getCell("A2");
  sub.value = `Período: ${periodoTexto} · Generado: ${new Date().toLocaleDateString("es-CO")}`;
  sub.font = fontSubtitulo;

  // ── KPIs ──
  ws.getRow(4).height = 22;
  const kpiLabels = ["Ingresos reales", "Gastos reales", "Ganancia neta", "Pedidos con abono"];
  const kpiValues = [kpis.ingresos, kpis.gastos, kpis.ganancia, kpis.pedidos];
  const kpiColors = [VERDE, ROJO, kpis.ganancia >= 0 ? VERDE : ROJO, AZUL_TITULO];

  kpiLabels.forEach((label, i) => {
    const col = i + 1;
    const cellLabel = ws.getCell(4, col);
    cellLabel.value = label;
    cellLabel.font = { ...fontBody, bold: true, color: { argb: "64748B" } };
    cellLabel.alignment = { horizontal: "center" };

    const cellVal = ws.getCell(5, col);
    cellVal.value = i === 3 ? kpiValues[i] : money(kpiValues[i]);
    if (i < 3) cellVal.numFmt = '"$"#,##0';
    cellVal.font = { bold: true, size: 14, color: { argb: kpiColors[i] }, name: "Calibri" };
    cellVal.alignment = { horizontal: "center" };
  });

  // ── Tabla mensual ──
  const headerRow = 7;
  const headers = ["Mes", "Ingresos", "Gastos", "Ganancia"];
  const headerCells = ws.getRow(headerRow);
  headers.forEach((h, i) => {
    const cell = headerCells.getCell(i + 1);
    cell.value = h;
    cell.font = fontHeader;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_HEADER } };
    cell.alignment = { horizontal: i === 0 ? "left" : "right", vertical: "middle" };
    cell.border = borderThin;
  });
  headerCells.height = 24;

  const nombreMes = (k) => {
    const [y, m] = (k || "").split("-").map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  };

  serieMes.meses.forEach((k, i) => {
    const row = ws.getRow(headerRow + 1 + i);
    const isZebra = i % 2 === 1;

    const vals = [nombreMes(k), money(serieMes.ingresos[i]), money(serieMes.gastos[i]), money(serieMes.ganancia[i])];
    vals.forEach((v, j) => {
      const cell = row.getCell(j + 1);
      cell.value = v;
      cell.font = j === 0 ? fontBody : { ...fontBody, numFmt: '"$"#,##0' };
      if (j > 0) cell.numFmt = '"$"#,##0';
      cell.alignment = { horizontal: j === 0 ? "left" : "right" };
      cell.border = borderThin;
      if (isZebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } };

      // Color de ganancia
      if (j === 3) cell.font = { ...fontBody, bold: true, color: { argb: v >= 0 ? VERDE : ROJO } };
      if (j === 1) cell.font = { ...fontBody, color: { argb: VERDE } };
      if (j === 2) cell.font = { ...fontBody, color: { argb: ROJO } };
    });
  });

  // ── Fila de totales ──
  const totalRow = headerRow + 1 + serieMes.meses.length;
  const totR = ws.getRow(totalRow);
  const totales = [
    "TOTAL",
    serieMes.ingresos.reduce((a, b) => a + b, 0),
    serieMes.gastos.reduce((a, b) => a + b, 0),
    serieMes.ganancia.reduce((a, b) => a + b, 0),
  ];
  totales.forEach((v, j) => {
    const cell = totR.getCell(j + 1);
    cell.value = v;
    if (j > 0) cell.numFmt = '"$"#,##0';
    cell.font = { ...fontResumen, color: { argb: j === 3 ? (v >= 0 ? VERDE : ROJO) : AZUL_HEADER } };
    cell.alignment = { horizontal: j === 0 ? "left" : "right" };
    cell.border = { top: { style: "medium", color: { argb: AZUL_TITULO } }, bottom: { style: "medium", color: { argb: AZUL_TITULO } }, left: borderThin.left, right: borderThin.right };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EFF6FF" } };
  });

  // ── Anchos de columna ──
  ws.columns = [
    { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 },
  ];

  await descargarWorkbook(wb, "financiero");
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTAR CLIENTES
   ═══════════════════════════════════════════════════════════════ */
export async function exportarClientesXLSX(topClientes, periodoTexto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Top Clientes");

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = "Top Clientes — Recaudo Real";
  ws.getCell("A1").font = fontTitulo;
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Período: ${periodoTexto}`;
  ws.getCell("A2").font = fontSubtitulo;

  const headers = ["#", "Cliente", "Pedidos", "Recaudo real", "Promedio"];
  agregarTabla(ws, 4, headers, topClientes.map((c, i) => [
    i + 1, c.nombre, c.pedidos, money(c.recaudo), money(c.promedio),
  ]), [6, 28, 10, 18, 18], [null, null, "center", '"$"#,##0', '"$"#,##0']);

  await descargarWorkbook(wb, "top_clientes_real");
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTAR ARTÍCULOS
   ═══════════════════════════════════════════════════════════════ */
export async function exportarArticulosXLSX(artD, subTabArt, periodoTexto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Artículos ${subTabArt}`);

  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = `Top Artículos — ${subTabArt === "propios" ? "Propios" : "Proveedor"}`;
  ws.getCell("A1").font = fontTitulo;
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:B2");
  ws.getCell("A2").value = `Período: ${periodoTexto}`;
  ws.getCell("A2").font = fontSubtitulo;

  const headers = ["Artículo", "Cantidad"];
  agregarTabla(ws, 4, headers, artD.map((t) => [t.nombre, t.cantidad]), [35, 15], [null, "#,##0"]);

  await descargarWorkbook(wb, `top_articulos_${subTabArt}`);
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTAR PROVEEDORES
   ═══════════════════════════════════════════════════════════════ */
export async function exportarProveedoresXLSX(resumenProveedores, periodoTexto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Proveedores");

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = "Resumen de Proveedores — Dinero Real";
  ws.getCell("A1").font = fontTitulo;
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Período: ${periodoTexto}`;
  ws.getCell("A2").font = fontSubtitulo;

  const headers = ["Proveedor", "Adeudado", "Pagado real", "Pendiente", "Órdenes"];
  const rows = resumenProveedores.map((p) => [
    p.nombre, money(p.total), money(p.pagado), money(p.pendiente), p.ordenes,
  ]);

  const headerRow = 4;
  const hCells = ws.getRow(headerRow);
  headers.forEach((h, i) => {
    const cell = hCells.getCell(i + 1);
    cell.value = h;
    cell.font = fontHeader;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_HEADER } };
    cell.alignment = { horizontal: i === 0 ? "left" : "right", vertical: "middle" };
    cell.border = borderThin;
  });
  hCells.height = 24;

  rows.forEach((vals, i) => {
    const row = ws.getRow(headerRow + 1 + i);
    const isZebra = i % 2 === 1;
    vals.forEach((v, j) => {
      const cell = row.getCell(j + 1);
      cell.value = v;
      cell.font = fontBody;
      cell.alignment = { horizontal: j === 0 ? "left" : "right" };
      cell.border = borderThin;
      if (isZebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } };
      if (j === 1) cell.numFmt = '"$"#,##0';
      if (j === 2) { cell.numFmt = '"$"#,##0'; cell.font = { ...fontBody, color: { argb: VERDE } }; }
      if (j === 3) {
        cell.numFmt = '"$"#,##0';
        cell.font = { ...fontBody, bold: v > 0, color: { argb: v > 0 ? ROJO : VERDE } };
        if (v === 0) cell.value = "✓ Pagado";
      }
      if (j === 4) cell.alignment = { horizontal: "center" };
    });
  });

  ws.columns = [{ width: 26 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }];

  await descargarWorkbook(wb, "proveedores_real");
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS INTERNOS
   ═══════════════════════════════════════════════════════════════ */
function agregarTabla(ws, startRow, headers, rows, widths, formats) {
  const hCells = ws.getRow(startRow);
  headers.forEach((h, i) => {
    const cell = hCells.getCell(i + 1);
    cell.value = h;
    cell.font = fontHeader;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_HEADER } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });
  hCells.height = 24;

  rows.forEach((vals, i) => {
    const row = ws.getRow(startRow + 1 + i);
    const isZebra = i % 2 === 1;
    vals.forEach((v, j) => {
      const cell = row.getCell(j + 1);
      cell.value = v;
      cell.font = fontBody;
      cell.alignment = { horizontal: formats?.[j] === "center" ? "center" : (typeof v === "number" && j > 0 ? "right" : "left") };
      cell.border = borderThin;
      if (isZebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } };
      if (formats?.[j] && formats[j] !== "center" && formats[j] !== null) cell.numFmt = formats[j];
    });
  });

  if (widths) ws.columns = widths.map((w) => ({ width: w }));
}

async function descargarWorkbook(wb, nombreBase) {
  const buffer = await wb.xlsx.writeBuffer();
  const fechaHoy = new Date().toLocaleDateString("es-CO").replaceAll("/", "_");
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${nombreBase}_${fechaHoy}.xlsx`);
}