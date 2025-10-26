import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generarNombreArchivo } from "./nombrePDF";

 // ─── Paleta de colores por tipo ──────────────────────────────────────────────
const PALETTE = {
  azul: [41, 128, 185],
  sage: [140, 153, 135],
};

/**
 * Devuelve el color de encabezado de tabla según el tipo de documento
 * @param {string} tipo - "cotizacion" o "pedido"
 */
function colorHead(tipo) {
  return tipo === "cotizacion" ? PALETTE.sage : PALETTE.azul;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("es-CO");
const num = (n, def = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
};
// Devuelve dd/mm/aaaa sin desfase por zona horaria.
const soloFecha = (f) => {
  if (!f) return "-";

  if (f instanceof Date) {
    const dd = String(f.getDate()).padStart(2, "0");
    const mm = String(f.getMonth() + 1).padStart(2, "0");
    const yy = f.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  const s = String(f).trim();

  // ISO con o sin tiempo
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const yy = iso[1], mm = iso[2], dd = iso[3];
    return `${dd}/${mm}/${yy}`;
  }

  // d/m/aaaa o dd/mm/aaaa
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yy = dmy[3];
    return `${dd}/${mm}/${yy}`;
  }

  // fallback
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return "-";
};

// Mantengo tu procesador de imágenes y fondo
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

export async function generarPDF(documento, tipo = "cotizacion") {
  const doc = new jsPDF();

  // ─── Recursos gráficos ───────────────────────────────────────────────────────
  const logoUrl = "/icons/logo.png";
  const fondoUrl = "/icons/fondo_emmita.png";
  const logo = await procesarImagen(logoUrl, 250, 1.0);
  const fondo = await procesarImagen(fondoUrl, 300, 0.9);

  const insertarFondo = () => {
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();
  };
  insertarFondo();

  // ─── Encabezado ──────────────────────────────────────────────────────────────
  doc.addImage(logo, "PNG", 10, 10, 30, 30); // ancho=alto → círculo perfecto
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  const fechaCreacion = soloFecha(documento.fecha_creacion);
const fechaEvento =
  soloFecha(documento.fecha_evento) !== "-"
    ? soloFecha(documento.fecha_evento)
    : (Array.isArray(documento.fechas_evento) && documento.fechas_evento[0])
      ? soloFecha(documento.fechas_evento[0])
      : "-";

  doc.setFontSize(12);
  doc.text(`Tipo de documento: ${tipo === "cotizacion" ? "Cotización" : "Orden de Pedido"}`, 10, 48);
  doc.text(`Cliente: ${documento.nombre_cliente || "Cliente"}`, 10, 55);
  doc.text(`Identificación: ${documento.identificacion || "N/A"}`, 10, 61);
  doc.text(`Teléfono: ${documento.telefono || "N/A"}`, 10, 67);
  doc.text(`Dirección: ${documento.direccion || "N/A"}`, 10, 73);
  doc.text(`Correo: ${documento.email || "N/A"}`, 10, 79);
  doc.text(`Fecha creación: ${fechaCreacion}`, 150, 48);
  doc.text(`Fecha evento: ${fechaEvento}`, 150, 55);

  // ─── Tabla Productos ─────────────────────────────────────────────────────────
  const esMulti = Boolean(documento.multi_dias);
  const nd = num(documento.numero_dias, 1);

  const head = esMulti
    ? [["Cantidad", "Artículo", "Precio", "V. x Días", "Subtotal"]]
    : [["Cantidad", "Artículo", "Precio", "Subtotal"]];

  const body = (documento.productos || []).map((p) => {
  const cantidad = num(p.cantidad, 0);
  const precio = num(p.precio, 0);

  // si el ítem NO se multiplica por días, "V. x Días" debe ser el precio unitario
  const usaDias = p.multiplicarPorDias !== false;
  const valorPorDias = usaDias ? (precio * nd) : precio;

  // fallback del subtotal coherente con usaDias
  const subtotal = num(
    p.subtotal,
    precio * cantidad * (esMulti ? (usaDias ? nd : 1) : 1)
  );

  if (esMulti) {
    return [
      cantidad || 0,
      p.nombre || "",
      `$${fmt(precio)}`,
      `$${fmt(valorPorDias)}`,
      `$${fmt(subtotal)}`,
    ];
  }
  return [cantidad || 0, p.nombre || "", `$${fmt(precio)}`, `$${fmt(subtotal)}`];
});

  autoTable(doc, {
  head,
  body,
  startY: 85,
  styles: { font: "helvetica", fontSize: 10 },
  headStyles: { 
  fillColor: colorHead(tipo), 
  textColor: 255, 
  halign: "center", 
  valign: "middle" 
},
  columnStyles: esMulti
    ? {
        0: { cellWidth: 22, halign: "center" }, // Cantidad (más ancho que antes)
        1: { cellWidth: 90 },                   // Artículo
        2: { cellWidth: 26, halign: "center" }, // Precio
        3: { cellWidth: 26, halign: "center" }, // V. x Días
        4: { cellWidth: 26, halign: "center" }, // Subtotal
      }
    : {
        0: { cellWidth: 30, halign: "center" }, // Cantidad más cómoda
        1: { cellWidth: 100 },                  // Artículo
        2: { cellWidth: 30, halign: "center" }, // Precio
        3: { cellWidth: 30, halign: "center" }, // Subtotal
      },
  margin: { left: 10, right: 10 },
  didDrawPage: insertarFondo,
});

  let y = (doc.lastAutoTable?.finalY || 100) + 10;

  // ===== Pre-cálculo de espacio para Garantía + Abonos + Totales + Redes =====
const pageHeight0 = doc.internal.pageSize.getHeight();
const footerHeight = 15;    // 3 líneas de redes (5px c/u)
const bottomMargin = 15;    // margen inferior
const safeBottom0 = pageHeight0 - bottomMargin - footerHeight;

// Flags para totales (las usamos también para calcular altura)
const flagDesc = Boolean(documento.aplicar_descuento);
const flagRet  = Boolean(documento.aplicar_retencion);

// Altura estimada del bloque "contenido final"
let needed = 0;

// Garantía (una línea)
if (documento.garantia && documento.garantia !== "0") {
  needed += 12;
}

// Abonos: título + N líneas
const abonosCount = Array.isArray(documento.abonos) ? documento.abonos.length : 0;
if (abonosCount > 0) {
  needed += 8 + abonosCount * 8;
}

// Separador (línea horizontal + margen)
needed += 10;

// Totales
if (flagDesc || flagRet) {
  // TOTAL BRUTO
  needed += 8;
  if (flagDesc) needed += 8;
  if (flagRet)  needed += 8;
  // TOTAL NETO
  needed += 10;
} else {
  // TOTAL
  needed += 10;
}

// SALDO FINAL (reservamos línea)
needed += 10;

// ¿Cabe todo este bloque arriba del pie?
if (y + needed > safeBottom0) {
  doc.addPage();
  insertarFondo();
  y = 40; // margen superior cómodo en la nueva página
}

// 💰 Garantía (solo la palabra en negrilla, seguido del valor)
if (documento.garantia && documento.garantia !== "0") {
  const fechaG = documento.fecha_garantia ? soloFecha(documento.fecha_garantia) : "";
  const textoValor = `$${Number(documento.garantia).toLocaleString("es-CO")}` +
    (fechaG ? ` - Fecha: ${fechaG}` : "");

  doc.setFont(undefined, "bold");
  doc.text("GARANTÍA:", 10, y);

  const ancho = doc.getTextWidth("GARANTÍA: ");

  doc.setFont(undefined, "normal");
  doc.text(textoValor, 10 + ancho, y);

  y += 12;
}

// 💸 Abonos (ahora justo debajo de Garantía)
// 💸 Abonos (ahora justo debajo de Garantía)
let totalAbonos = 0;
if (Array.isArray(documento.abonos) && documento.abonos.length > 0) {
  doc.setFont(undefined, "bold");
  doc.text("ABONOS:", 10, y);
  doc.setFont(undefined, "normal");
  y += 8;

  documento.abonos.forEach((abono, i) => {
  const valor = typeof abono === "object" ? abono.valor : abono;
  const fechaRaw = typeof abono === "object" ? abono.fecha : "";
  const fecha = fechaRaw ? soloFecha(fechaRaw) : "sin fecha";
  doc.text(`• Abono ${i + 1}: $${fmt(valor)} - Fecha: ${fecha}`, 15, y);
  y += 8;
  totalAbonos += num(valor, 0);
});

  y += 4;
}

// ── Línea separadora antes de totales
doc.setDrawColor(180);       // gris
doc.setLineWidth(0.5);
doc.line(10, y, 200, y);
y += 10;

// ── Totales
const totalBruto = (documento.productos || []).reduce(
  (acc, p) =>
    acc +
    num(
      p.subtotal,
      num(p.precio) * num(p.cantidad) * (esMulti ? (p.multiplicarPorDias === false ? 1 : nd) : 1)
    ),
  0
);
const descuento = num(documento.descuento, 0);
const retencion = num(documento.retencion, 0);
const totalNeto = num(
  documento.total_neto,
  Math.max(0, totalBruto - descuento - retencion)
);

const saldo = Math.max(0, totalNeto - totalAbonos);

const xTot = 150;
doc.setFontSize(12);

// OJO: usamos los flags ya declarados ARRIBA en el pre-chequeo
const hayAjustes = flagDesc || flagRet;

if (hayAjustes) {
  doc.text(`TOTAL BRUTO: $${fmt(totalBruto)}`, xTot, y);
  y += 8;

  if (flagDesc) {
    doc.text(`DESCUENTO: -$${fmt(descuento)}`, xTot, y);
    y += 8;
  }
  if (flagRet) {
    doc.text(`RETENCIÓN: -$${fmt(retencion)}`, xTot, y);
    y += 8;
  }

  doc.setFont(undefined, "bold");
  doc.text(`TOTAL NETO: $${fmt(totalNeto)}`, xTot, y);
  doc.setFont(undefined, "normal");
  y += 10;
} else {
  doc.setFont(undefined, "bold");
  doc.text(`TOTAL: $${fmt(totalBruto)}`, xTot, y);
  doc.setFont(undefined, "normal");
  y += 10;
}

// Mostrar SIEMPRE el saldo final (aún si no hay abonos)
doc.text(`SALDO FINAL: $${fmt(saldo)}`, xTot, y);
y += 6; // pequeño respiro

// ─── Pie anclado al borde inferior (con guardia anti-encime) ─────────────────
// Si por cualquier motivo quedamos muy cerca del pie, forzamos nueva página
const pageHeight = doc.internal.pageSize.getHeight();
const yFooter    = pageHeight - bottomMargin - footerHeight;

if (y > yFooter - 4) {
  doc.addPage();
  insertarFondo();
}

// Recalcular por si agregamos página
const pageHeight2 = doc.internal.pageSize.getHeight();
const yFooter2    = pageHeight2 - bottomMargin - footerHeight;

doc.setFontSize(10);
doc.text("Instagram: @alquileryeventosemmita", 10, yFooter2);
doc.text("Facebook: Facebook.com/alquileresemmita", 10, yFooter2 + 5);
doc.text("Email: alquileresemmita@hotmail.com", 10, yFooter2 + 10);

// ─── Guardar PDF ─────────────────────────────────────────────────────────────
const fechaSegura = documento.fecha_creacion || new Date();
const nombreArchivo = generarNombreArchivo(tipo, fechaSegura, documento.nombre_cliente);
doc.save(nombreArchivo);
}
