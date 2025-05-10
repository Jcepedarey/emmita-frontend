import jsPDF from "jspdf";
import "jspdf-autotable";

// ✅ Función para redimensionar y comprimir el logo antes de insertarlo
const redimensionarLogo = (src, width = 150) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Para evitar problemas de CORS en producción
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const escala = width / img.width;
      canvas.width = width;
      canvas.height = img.height * escala;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Exportar como PNG optimizado
      resolve(canvas.toDataURL("image/png", 0.7));
    };
    img.src = src;
  });

export async function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  // 🖼️ Ruta del logo
  const logoUrl = "/icons/logo.png";
  const logoOptimizado = await redimensionarLogo(logoUrl, 150); // 150px de ancho

  // 🖼️ Insertar imagen ya redimensionada y comprimida
  doc.addImage(logoOptimizado, "PNG", 10, 10, 30, 30); // (x, y, width, height)

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
}
