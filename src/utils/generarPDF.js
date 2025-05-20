import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generarNombreArchivo } from "./nombrePDF";

// ✅ Función reutilizable para optimizar imágenes (logo o fondo)
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

  // 🧾 Encabezado
  doc.addImage(logo, "PNG", 10, 10, 35, 30);
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // 📌 Datos generales
  const fechaCreacion = documento.fecha_creacion ? new Date(documento.fecha_creacion).toISOString().slice(0, 10) : "-";
  const fechaEvento = documento.fecha_evento ? new Date(documento.fecha_evento).toISOString().slice(0, 10) : "-";

  doc.setFontSize(12);
  doc.text(`Tipo de documento: ${tipo === "cotizacion" ? "Cotización" : "Orden de Pedido"}`, 10, 48);
  doc.text(`Cliente: ${documento.nombre_cliente || "Cliente seleccionado"}`, 10, 55);
  if (documento.identificacion) doc.text(`Identificación: ${documento.identificacion}`, 10, 61);
  if (documento.telefono) doc.text(`Teléfono: ${documento.telefono}`, 10, 67);
  if (documento.direccion) doc.text(`Dirección: ${documento.direccion}`, 10, 73);
  if (documento.email) doc.text(`Correo: ${documento.email}`, 10, 79);
  doc.text(`Fecha creación: ${fechaCreacion}`, 150, 48);
  doc.text(`Fecha evento: ${fechaEvento}`, 150, 55);

  // 🧾 Tabla de productos
  const filas = (documento.productos || []).map((p) => [
    p.cantidad || "-",
    p.nombre,
    `$${Number(p.precio).toLocaleString("es-CO")}`,
    `$${Number(p.subtotal || (p.precio || 0) * (p.cantidad || 1)).toLocaleString("es-CO")}`
  ]);

  autoTable(doc, {
    head: [["Cantidad", "Producto", "Precio", "Subtotal"]],
    body: filas,
    startY: 85,
    styles: { font: "helvetica", fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    didDrawPage: insertarFondo
  });

  let y = (doc.lastAutoTable?.finalY || 100) + 10;

  // 💰 Garantía
  if (documento.garantia && documento.garantia !== "0") {
    doc.text(`GARANTÍA: $${Number(documento.garantia).toLocaleString("es-CO")}`, 10, y);
    y += 8;
  }

  // 💸 Abonos
  if (documento.abonos?.length > 0) {
    doc.text("ABONOS:", 10, y);
    documento.abonos.forEach((abono, i) => {
      y += 6;
      doc.text(`• Abono ${i + 1}: $${Number(abono).toLocaleString("es-CO")}`, 15, y);
    });
    y += 8;
  }

  // 📊 Totales
  doc.setFontSize(12);
  doc.text(`TOTAL: $${Number(documento.total).toLocaleString("es-CO")}`, 150, y);
  y += 8;

  if (documento.abonos?.length > 0) {
    const totalAbonos = documento.abonos.reduce((a, b) => a + parseFloat(b || 0), 0);
    const saldo = documento.total - totalAbonos;
    doc.text(`SALDO FINAL: $${Number(saldo).toLocaleString("es-CO")}`, 150, y);
  }

  // 📎 Pie de página
  const yFinal = 270;
  doc.setFontSize(10);
  doc.text("Instagram: @alquileryeventosemmita", 10, yFinal);
  doc.text("Facebook: Facebook.com/alquileresemmita", 10, yFinal + 5);
  doc.text("Email: alquileresemmita@hotmail.com", 10, yFinal + 10);

  // 💾 Guardar archivo con nombre correcto
  const fechaSegura = documento.fecha_creacion || new Date();
  const nombreArchivo = generarNombreArchivo(tipo, fechaSegura, documento.nombre_cliente);
  doc.save(nombreArchivo);
}
