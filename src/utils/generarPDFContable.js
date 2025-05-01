// src/utils/generarPDFContable.js
import jsPDF from "jspdf";
import "jspdf-autotable";

export function generarPDFContable(movimientos) {
  const doc = new jsPDF();
  const fechaActual = new Date().toLocaleDateString();

  doc.setFontSize(16);
  doc.text("📊 Resumen Contable", 20, 20);
  doc.setFontSize(10);
  doc.text(`Generado el: ${fechaActual}`, 20, 28);

  const movimientosFiltrados = movimientos.filter((m) => m.estado === "activo");

  doc.autoTable({
    startY: 35,
    head: [["Fecha", "Tipo", "Monto", "Descripción", "Categoría"]],
    body: movimientosFiltrados.map((m) => [
      m.fecha?.split("T")[0] || "-",
      m.tipo?.toUpperCase(),
      `$${parseFloat(m.monto).toFixed(2)}`,
      m.descripcion || "-",
      m.categoria || "-",
    ]),
    styles: { fontSize: 9 },
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] }
  });

  doc.save(`reporte_contable_${fechaActual.replace(/\//g, "-")}.pdf`);
}
