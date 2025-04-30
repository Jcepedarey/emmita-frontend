// src/utils/generarPDFRecepcion.js
import jsPDF from "jspdf";
import "jspdf-autotable";

export const generarPDFRecepcion = (revision, cliente, productosRecibidos, comentario) => {
  const doc = new jsPDF();

  // Título y datos del cliente
  doc.setFontSize(14);
  doc.text("📦 Acta de recepción de pedido", 20, 20);
  doc.setFontSize(11);
  doc.text(`Orden de pedido: ${revision.numero || "-"}`, 20, 30);
  doc.text(`Cliente: ${cliente?.nombre || "-"}`, 20, 36);
  doc.text(`Identificación: ${cliente?.identificacion || "-"}`, 20, 42);
  doc.text(`Dirección: ${cliente?.direccion || "-"}`, 20, 48);
  doc.text(`Teléfono: ${cliente?.telefono || "-"}`, 20, 54);
  doc.text(`Fecha revisión: ${new Date().toLocaleString()}`, 20, 60);

  // Tabla de productos
  doc.autoTable({
    startY: 70,
    head: [["Descripción", "Esperado", "Recibido", "Observación"]],
    body: productosRecibidos.map((p) => [
      p.descripcion || "Sin nombre",
      p.esperado,
      p.recibido,
      p.observacion || "",
    ]),
    theme: "grid",
    styles: { fontSize: 10 },
  });

  // Comentario general si existe
  if (comentario) {
    doc.text("📝 Comentario general:", 20, doc.lastAutoTable.finalY + 10);
    doc.setFont("courier", "normal");
    doc.text(comentario, 20, doc.lastAutoTable.finalY + 18);
  }

  // Firma
  doc.text("_________________________", 20, doc.internal.pageSize.height - 40);
  doc.text("Firma responsable", 20, doc.internal.pageSize.height - 30);

  // Guardar PDF
  doc.save(`recepcion_${revision.numero || "pedido"}.pdf`);
};
