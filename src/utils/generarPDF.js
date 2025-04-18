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

  doc.text(`Cliente: ${documento.nombre_cliente || "Cliente seleccionado"}`, 10, 52);
  if (documento.identificacion) doc.text(`Identificación: ${documento.identificacion}`, 10, 58);
  if (documento.telefono) doc.text(`Teléfono: ${documento.telefono}`, 10, 64);
  if (documento.direccion) doc.text(`Dirección: ${documento.direccion}`, 10, 70);
  if (documento.email) doc.text(`Correo: ${documento.email}`, 10, 76);

  let startY = 82;

  if (documento.fecha) {
    doc.setFontSize(11);
    doc.text(`Fecha creación: ${documento.fecha}`, 150, 45);
  }
  if (documento.fecha_evento) {
    doc.setFontSize(11);
    doc.text(`Fecha evento: ${documento.fecha_evento}`, 150, 52);
  }

  // TABLA DE PRODUCTOS
  const filas = (documento.productos || []).map((p) => [
    p.cantidad || "-",
    p.nombre,
    `$${Number(p.precio).toLocaleString("es-CO")}`,
    `$${Number(p.subtotal || (p.precio || 0) * (p.cantidad || 1)).toLocaleString("es-CO")}`
  ]);

  autoTable(doc, {
    head: [["Cantidad", "Producto", "Precio", "Subtotal"]],
    body: filas,
    startY: startY,
  });

  let y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : startY + 20;

  // GARANTÍA
  if (documento.garantia && documento.garantia !== "0") {
    doc.text(`GARANTÍA: $${Number(documento.garantia).toLocaleString("es-CO")}`, 10, y);
    y += 8;
  }

  // ABONOS
  if (documento.abonos?.length > 0) {
    doc.text("ABONOS:", 10, y);
    documento.abonos.forEach((abono, i) => {
      y += 6;
      doc.text(`• Abono ${i + 1}: $${Number(abono).toLocaleString("es-CO")}`, 15, y);
    });
    y += 8;
  }

  // TOTAL y SALDO FINAL
  doc.setFontSize(12);
  doc.text(`TOTAL: $${Number(documento.total).toLocaleString("es-CO")}`, 150, y);
  y += 8;
  if (documento.abonos?.length > 0) {
    const totalAbonos = documento.abonos.reduce((a, b) => a + parseFloat(b || 0), 0);
    const saldo = documento.total - totalAbonos;
    doc.text(`SALDO FINAL: $${Number(saldo).toLocaleString("es-CO")}`, 150, y);
  }

  // PIE DE PÁGINA
  const yFinal = 270;
  doc.setFontSize(10);
  doc.text("Instagram: @alquileryeventosemmita", 10, yFinal);
  doc.text("Facebook: Facebook.com/alquileresemmita", 10, yFinal + 5);
  doc.text("Email: alquileresemmita@hotmail.com", 10, yFinal + 10);

  // NOMBRE DEL ARCHIVO
  const prefix = tipo === "cotizacion" ? "cot" : "ord";
  const nombreArchivo = `${prefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
