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
    img.onerror = () => resolve(null); // ← evitar crash si no carga
    img.src = src;
  });

// Devuelve dd/mm/aaaa sin desfase por zona horaria
const soloFecha = (f) => {
  if (!f) return "-";
  if (f instanceof Date) {
    return `${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${f.getFullYear()}`;
  }
  const s = String(f).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`;
  const d = new Date(s);
  if (!isNaN(d)) return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return "-";
};

export async function generarPDFContable(movimientos) {
  const doc = new jsPDF();

  const logoUrl = "/icons/logo.png";
  const fondoUrl = "/icons/fondo_emmita.png";

  const logoOptimizado = await procesarImagen(logoUrl, 250, 1.0);
  const fondoOptimizado = await procesarImagen(fondoUrl, 300, 0.9);

  // ─── Encabezado ───
  // ✅ FIX: Usar logoOptimizado en vez de 'logo' (que estaba undefined)
  if (logoOptimizado) {
    doc.addImage(logoOptimizado, "PNG", 10, 10, 30, 30);
  }
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // Subtítulo
  doc.setFontSize(12);
  doc.text("Informe de movimientos contables", 10, 48);
  doc.setFontSize(10);
  doc.text(`Generado el: ${soloFecha(new Date())}`, 10, 55);

  // ─── Resumen rápido ───
  const activos = movimientos.filter((m) => m.fecha && m.tipo && !isNaN(m.monto));
  const ingresos = activos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0);
  const gastos = activos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);
  const balance = ingresos - gastos;

  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // verde
  doc.text(`Ingresos: $${ingresos.toLocaleString("es-CO")}`, 10, 65);
  doc.setTextColor(239, 68, 68); // rojo
  doc.text(`Gastos: $${gastos.toLocaleString("es-CO")}`, 70, 65);
  doc.setTextColor(balance >= 0 ? 16 : 239, balance >= 0 ? 185 : 68, balance >= 0 ? 129 : 68);
  doc.text(`Balance: $${balance.toLocaleString("es-CO")}`, 130, 65);
  doc.setTextColor(0, 0, 0); // reset

  // ─── Tabla ───
  const tabla = activos.map((m) => [
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

  doc.autoTable({
    startY: 75,
    head: [["Fecha", "Tipo", "Monto", "Descripción", "Categoría", "Estado", "Justificación", "Modificado", "Usuario"]],
    body: tabla,
    styles: { font: "helvetica", fontSize: 8 },
    headStyles: { fillColor: [0, 119, 182] }, // sw-azul
    alternateRowStyles: { fillColor: [245, 247, 250] }, // zebra
    didDrawPage: () => {
      if (fondoOptimizado) {
        const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
        const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.addImage(fondoOptimizado, "PNG", centerX, centerY, 150, 150);
        doc.restoreGraphicsState();
      }
    },
  });

  const nombreArchivo = `movimientos_contables_${new Date().toLocaleDateString("es-CO").replaceAll("/", "-")}.pdf`;
  doc.save(nombreArchivo);
}