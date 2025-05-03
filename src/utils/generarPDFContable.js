// src/utils/generarPDFContable.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generarPDFContable(movimientos) {
  const doc = new jsPDF();
  const fechaActual = new Date().toLocaleDateString("es-CO");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
doc.text("📊 Informe de movimientos contables", 20, 20);
  doc.setFontSize(10);
  doc.text(`Generado el: ${fechaActual}`, 20, 28);

  const tabla = movimientos.map((m) => [
    m.fecha?.split("T")[0] || "-",
    m.tipo?.toUpperCase(),
    `$${m.monto.toLocaleString("es-CO")}`,
    m.descripcion || "-",
    m.categoria || "-",
    m.estado,
    m.justificacion || "-",
    m.fecha_modificacion?.split("T")[0] || "-",
    m.usuario || "Administrador",
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Fecha", "Tipo", "Monto", "Descripción", "Categoría", "Estado", "Justificación", "Modificado", "Usuario"]],
    body: tabla,
    styles: { fontSize: 9 },
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] }
  });

  doc.save(`movimientos_contables_${fechaActual.replace(/\//g, "-")}.pdf`);
}