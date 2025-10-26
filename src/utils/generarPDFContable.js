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

  // Devuelve dd/mm/aaaa sin desfase por zona horaria.
const soloFecha = (f) => {
  if (!f) return "-";

  if (f instanceof Date) {
    const dd = String(f.getDate()).padStart(2, "0");
    const mm = String(f.getMonth() + 1).padStart(2, "0");
    const yy = f.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  const s = String(f).trim();

  // ISO con o sin tiempo
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const yy = iso[1], mm = iso[2], dd = iso[3];
    return `${dd}/${mm}/${yy}`;
  }

  // d/m/aaaa o dd/mm/aaaa
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yy = dmy[3];
    return `${dd}/${mm}/${yy}`;
  }

  // fallback
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return "-";
};

export async function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  const logoUrl = "/icons/logo.png";
  const fondoUrl = "/icons/fondo_emmita.png";

  const logoOptimizado = await procesarImagen(logoUrl, 250, 1.0);    // logo nítido
  const fondoOptimizado = await procesarImagen(fondoUrl, 300, 0.9);  // fondo más grande

  // ─── Encabezado ──────────────────────────────────────────────────────────────
  doc.addImage(logo, "PNG", 10, 10, 30, 30); // ancho=alto → círculo perfecto
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

// subtítulo del reporte
doc.setFontSize(12);
doc.text("Informe de movimientos contables", 10, 48);
doc.setFontSize(10);
doc.text(`Generado el: ${soloFecha(new Date())}`, 10, 55);

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
    startY: 85,
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