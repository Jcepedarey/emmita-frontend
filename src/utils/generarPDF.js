import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generarNombreArchivo } from "./nombrePDF";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("es-CO");
const num = (n, def = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
};
const soloFecha = (f) => {
  if (!f) return "-";
  try {
    const d = new Date(f);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return "-";
  }
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
  doc.addImage(logo, "PNG", 10, 10, 35, 30);
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  const fechaCreacion = soloFecha(documento.fecha_creacion);
  // Si no hay fecha_evento, intenta usar la primera de fechas_evento
  const fechaEvento =
    soloFecha(documento.fecha_evento) !== "-"
      ? soloFecha(documento.fecha_evento)
      : (Array.isArray(documento.fechas_evento) && documento.fechas_evento[0]) ? documento.fechas_evento[0] : "-";

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
  headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center", valign: "middle" },
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

// 💰 Garantía (solo la palabra en negrilla, seguido del valor)
if (documento.garantia && documento.garantia !== "0") {
  const textoValor = `$${Number(documento.garantia).toLocaleString("es-CO")}` +
    (documento.fecha_garantia ? ` - Fecha: ${documento.fecha_garantia}` : "");

  // "GARANTÍA:" en negrilla
  doc.setFont(undefined, "bold");
  doc.text("GARANTÍA:", 10, y);

  // medir ancho para pegar justo después
  const ancho = doc.getTextWidth("GARANTÍA: ");

  // valor normal, sin tanto espacio
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
    const fecha = typeof abono === "object" ? abono.fecha : "sin fecha";
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

// Flags que vienen del frontend (fallback a >0 por compatibilidad)
const flagDesc = Boolean(documento.aplicar_descuento);
const flagRet = Boolean(documento.aplicar_retencion);
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

  // ─── Pie ────────────────────────────────────────────────────────────────────
  const yFinal = 270;
  doc.setFontSize(10);
  doc.text("Instagram: @alquileryeventosemmita", 10, yFinal);
  doc.text("Facebook: Facebook.com/alquileresemmita", 10, yFinal + 5);
  doc.text("Email: alquileresemmita@hotmail.com", 10, yFinal + 10);

  // ─── Guardar ────────────────────────────────────────────────────────────────
  const fechaSegura = documento.fecha_creacion || new Date();
  const nombreArchivo = generarNombreArchivo(tipo, fechaSegura, documento.nombre_cliente);
  doc.save(nombreArchivo);
}
