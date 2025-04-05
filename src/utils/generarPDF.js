import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generarPDF(documento, tipo = "cotizacion") {
  const doc = new jsPDF();

  // Cargar imagen del logo
  let logo = null;
  try {
    const blob = await fetch("/logo.png").then((res) => res.blob());
    logo = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("No se pudo cargar el logo.");
  }

  // ENCABEZADO
  if (logo) doc.addImage(logo, "PNG", 10, 10, 30, 25);
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 38, 200, 38);

  // DATOS DEL DOCUMENTO
  doc.setFontSize(12);
  doc.text(`Tipo de documento: ${tipo === "cotizacion" ? "Cotización" : "Orden de Pedido"}`, 10, 45);
  doc.text(`Cliente ID: ${documento.cliente_id}`, 10, 52);
  doc.text(`Fecha creación: ${documento.fecha?.split("T")[0] || "-"}`, 10, 58);
  if (documento.fecha_evento) {
    doc.text(`Fecha evento: ${documento.fecha_evento?.split("T")[0]}`, 10, 64);
  }

  // TABLA DE PRODUCTOS
  const filas = (documento.productos || []).map((p) => [
    p.nombre,
    p.cantidad,
    `$${p.precio}`,
    `$${p.subtotal || p.precio * p.cantidad}`,
  ]);

  autoTable(doc, {
    head: [["Producto", "Cantidad", "Precio", "Subtotal"]],
    body: filas,
    startY: 70,
  });

  let y = doc.previousAutoTable.finalY + 10;

  // GARANTÍA
  if (documento.garantia) {
    doc.text(`GARANTÍA: $${documento.garantia}`, 10, y);
    y += 8;
  }

  // ABONOS
  if (documento.abonos?.length > 0) {
    doc.text("ABONOS:", 10, y);
    documento.abonos.forEach((abono, i) => {
      y += 6;
      doc.text(`• Abono ${i + 1}: $${abono}`, 15, y);
    });
    y += 8;
  }

  // TOTAL y SALDO FINAL
  doc.setFontSize(12);
  doc.text(`TOTAL: $${documento.total}`, 150, y);
  y += 8;
  if (documento.abonos?.length > 0) {
    const totalAbonos = documento.abonos.reduce((a, b) => a + b, 0);
    const saldo = documento.total - totalAbonos;
    doc.text(`SALDO FINAL: $${saldo}`, 150, y);
  }

  // PIE DE PÁGINA
  const yFinal = 270;
  doc.setFontSize(10);
  doc.text("Instagram: @alquileryeventosemmita", 10, yFinal);
  doc.text("Facebook: Facebook.com/alquileresemmita", 10, yFinal + 5);
  doc.text("Email: alquileresemmita@hotmail.com", 10, yFinal + 10);

  // NOMBRE DEL ARCHIVO
  const prefix = tipo === "cotizacion" ? "cot" : "ord";
  const id = documento.id || "documento";
  const nombreCliente = documento.nombre_cliente || "cliente";
  const nombreArchivo = `${prefix}_${id}_${nombreCliente.replace(/\s+/g, "_")}.pdf`;

  doc.save(nombreArchivo);
}
