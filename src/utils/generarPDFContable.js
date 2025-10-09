import jsPDF from "jspdf";
import "jspdf-autotable";

// ✅ Redimensionar imágenes con compresión
const procesarImagen = (src, width = 150, calidad = 1.0) =>
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

  // 👉 Formatea SIEMPRE dd/mm/aaaa desde ISO, dd/mm/aaaa o algo parseable
const soloFecha = (f) => {
  if (!f) return "-";
  const s = String(f).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s; // ya viene D/M/Y
  const d = new Date(s);
  if (isNaN(d)) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export async function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  const logoUrl = "/icons/logo.png";
  const fondoUrl = "/icons/fondo_emmita.png";

  const logoOptimizado = await procesarImagen(logoUrl, 250, 1.0);    // logo nítido
  const fondoOptimizado = await procesarImagen(fondoUrl, 300, 0.9);  // fondo más grande

  // 📌 Insertar logo
  doc.addImage(logoOptimizado, "PNG", 10, 10, 35, 35); // logo más grande

  // 🧾 Encabezado
  doc.setFontSize(14);
  doc.text("Informe de movimientos contables - Alquiler y eventos Emmita", 50, 20);

  // 📆 Fecha de generación
  doc.setFontSize(10);
  doc.text(`Generado el: ${soloFecha(new Date())}`, 50, 28);

  // 🧮 Construir tabla
  const tabla = movimientos
  .filter((m) => m.fecha && m.tipo && !isNaN(m.monto))
  .map((m) => [
    soloFecha(m.fecha),
    m.tipo.toUpperCase(),
    `$${parseInt(m.monto).toLocaleString("es-CO")}`,
    m.descripcion || "-",
    m.categoria || "-",
    m.estado || "-",
    m.justificacion || "-",
    m.fecha_modificacion ? soloFecha(m.fecha_modificacion) : "-",
    m.usuario || "Administrador",
  ]);

  // 📄 Insertar tabla y fondo con marca de agua por página
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
    didDrawPage: (data) => {
      const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
      const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;

      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(fondoOptimizado, "PNG", centerX, centerY, 150, 150);
      doc.restoreGraphicsState();
    }
  });

  const nombreArchivo = `movimientos_contables_${new Date().toLocaleDateString("es-CO").replaceAll("/", "-")}.pdf`;
  doc.save(nombreArchivo);
}