import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generarPDF(documento, tipo = "cotizacion") {
  const doc = new jsPDF();

  // Cargar imagen del logo
  const logo = await fetch("/logo.png")
    .then((res) => res.blob())
    .then((blob) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    });

  // ENCABEZADO
  doc.addImage(logo, "PNG", 10, 10, 30, 25); // x, y, ancho, alto
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 38, 200, 38);

  // DATOS PRINCIPALES
  doc.setFontSize(12);
  doc.text(`Tipo de documento: ${tipo.toUpperCase()}`, 10, 45);
  doc.text(`Cliente ID: ${documento.cliente_id}`, 10, 52);
  doc.text(`Fecha creación: ${documento.fecha?.split("T")[0] || "-"}`, 10, 58);
  if (documento.fecha_evento) {
    doc.text(`Fecha evento: ${documento.fecha_evento?.split("T")[0]}`, 10, 64);
  }

  // TABLA DE PRODUCTOS
  const productos = documento.productos || [];
  const filas = productos.map((p) => [
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

  // TOTAL
  doc.setFontSize(12);
  doc.text(`TOTAL: $${documento.total}`, 150, doc.previousAutoTable.finalY + 10);

  // PIE DE PÁGINA
  const yFinal = 270;
  doc.setFontSize(10);
  doc.text("Instagram: @alquileryeventosemmita", 10, yFinal);
  doc.text("Facebook: Facebook.com/alquileresemmita", 10, yFinal + 5);
  doc.text("Email: alquileresemmita@hotmail.com", 10, yFinal + 10);

  // GUARDAR
  doc.save(`${tipo}_${documento.id || "documento"}.pdf`);
}
