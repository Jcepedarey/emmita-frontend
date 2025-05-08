import jsPDF from "jspdf";
import "jspdf-autotable";

export function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  // 🖼️ Insertar logo desde /public/icons/logo.png
  const logoUrl = "/icons/logo.png";
  const img = new Image();
  img.src = logoUrl;

  img.onload = () => {
    doc.addImage(img, "PNG", 10, 10, 30, 30); // (x, y, width, height)

    // 🧾 Encabezado
    doc.setFontSize(14);
    doc.text("Informe de movimientos contables - Alquiler y eventos Emmita", 50, 20);

    // 📆 Fecha de generación
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString("es-CO")}`, 50, 28);

    // 🧮 Construir tabla
    const tabla = movimientos
      .filter((m) => m.fecha && m.tipo && !isNaN(m.monto))
      .map((m) => [
        m.fecha,
        m.tipo.toUpperCase(),
        `$${parseInt(m.monto).toLocaleString("es-CO")}`,
        m.descripcion || "-",
        m.categoria || "-",
        m.estado || "-",
        m.justificacion || "-",
        m.fecha_modificacion?.split("T")[0] || "-",
        m.usuario || "Administrador",
      ]);

    doc.autoTable({
      startY: 45,
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
  };
}
