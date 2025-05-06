import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // 👈 CAMBIO IMPORTANTE

autoTable(jsPDF); // 👈 REGISTRO MANUAL

export function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("📊 Informe de movimientos contables", 20, 20);

  const tabla = movimientos
    .filter((m) => m.fecha && m.tipo && !isNaN(m.monto))
    .map((m) => [
      m.fecha,
      m.tipo.toUpperCase(),
      `$${m.monto.toLocaleString("es-CO")}`,
      m.descripcion || "-",
      m.categoria || "-",
      m.estado || "-",
      m.justificacion || "-",
      m.fecha_modificacion?.split("T")[0] || "-",
      m.usuario || "Administrador",
    ]);

  doc.setFontSize(10);
  doc.text(`Generado el: ${new Date().toLocaleDateString("es-CO")}`, 20, 28);

  doc.autoTable({
    startY: 35,
    head: [[
      "Fecha", "Tipo", "Monto", "Descripción",
      "Categoría", "Estado", "Justificación",
      "Modificado", "Usuario"
    ]],
    body: tabla,
    styles: { font: "helvetica", fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  const nombreArchivo = `movimientos_contables_${new Date().toLocaleDateString("es-CO").replaceAll("/", "-")}.pdf`;
  doc.save(nombreArchivo);
}
