import jsPDF from "jspdf";
import "jspdf-autotable";

// ✅ Función para redimensionar y comprimir imágenes
const procesarImagen = (src, width = 150, calidad = 0.9) =>
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

export async function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  // 🖼️ Procesar logo y fondo
  const logoUrl = "/icons/logo.png";
  const fondoUrl = "/icons/fondo_emmita.png";

  const logoOptimizado = await procesarImagen(logoUrl, 250, 1.0); // ancho mayor y máxima calidad
doc.addImage(logoOptimizado, "PNG", 10, 10, 40, 40); // mostrarlo un poco más grande

  // ✅ Función para aplicar fondo en cada página
  const aplicarFondo = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Guardar estado gráfico
      doc.saveGraphicsState();

      // Aplicar transparencia (opacidad ~10%)
      doc.setGState(new doc.GState({ opacity: 0.08 }));

      // Imagen centrada
      const centerX = (doc.internal.pageSize.getWidth() - 80) / 2;
      const centerY = (doc.internal.pageSize.getHeight() - 80) / 2;

      doc.addImage(fondoOptimizado, "PNG", centerX, centerY, 80, 80);

      // Restaurar estado gráfico
      doc.restoreGraphicsState();
    }
  };

  // 📌 Insertar logo
  doc.addImage(logoOptimizado, "PNG", 10, 10, 30, 30);

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
    didDrawPage: aplicarFondo // ✅ Fondo en cada página
  });

  const nombreArchivo = `movimientos_contables_${new Date().toLocaleDateString("es-CO").replaceAll("/", "-")}.pdf`;
  doc.save(nombreArchivo);
}
