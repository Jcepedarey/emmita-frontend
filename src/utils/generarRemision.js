import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { generarNombreArchivo } from "./nombrePDF";

// 🖼️ Optimización de imagen
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

export const generarRemisionPDF = async (documento) => {
  const doc = new jsPDF();
  const logo = await procesarImagen("/icons/logo.png", 250, 1.0);
  const fondo = await procesarImagen("/icons/fondo_emmita.png", 300, 0.9);

  const insertarFondo = () => {
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();
  };

  insertarFondo();

  const fechaSegura = documento.fecha_creacion || new Date();
  const nombreArchivo = generarNombreArchivo("remision", fechaSegura, documento.nombre_cliente);
  const remisionId = nombreArchivo.replace(".pdf", "");

  const fechaCreacion = documento.fecha_creacion ? new Date(documento.fecha_creacion).toISOString().slice(0, 10) : "-";
  const fechaEvento = documento.fecha_evento ? new Date(documento.fecha_evento).toISOString().slice(0, 10) : "-";

  // 🧾 Encabezado (unificado con generarPDF)
doc.addImage(logo, "PNG", 10, 10, 35, 30);
doc.setFontSize(16);
doc.text("Alquiler & Eventos Emmita", 50, 20);
doc.setFontSize(10);
doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
doc.setLineWidth(0.5);
doc.line(10, 42, 200, 42);

  // 🧾 Datos del cliente (izquierda)
doc.setFontSize(12);
doc.text(`No. de Remisión: ${remisionId}`, 10, 48);
doc.text(`Cliente: ${documento.nombre_cliente || "Cliente no especificado"}`, 10, 55);
doc.text(`Identificación: ${documento.identificacion || "N/A"}`, 10, 61);
doc.text(`Teléfono: ${documento.telefono || "N/A"}`, 10, 67);
doc.text(`Dirección: ${documento.direccion || "N/A"}`, 10, 73);
doc.text(`Correo: ${documento.email || "N/A"}`, 10, 79);

  // 📅 Fechas (derecha)
  doc.setFontSize(11);
  doc.text(`Fecha creación: ${fechaCreacion}`, 150, 48);
  doc.text(`Fecha del evento: ${fechaEvento}`, 150, 55);

  // 📋 Tabla de artículos (grupos con título centrado y artículos debajo)
const filas = [];
(documento.productos || []).forEach((p) => {
  if (p.es_grupo && Array.isArray(p.productos)) {
    const tituloGrupo = p.nombre || "Grupo";
    // Fila de título: ocupa 2 columnas, centrado y en negrita
    filas.push([{ content: tituloGrupo, colSpan: 2, styles: { fontStyle: "bold", halign: "center" } }]);
    // Sub-ítems sin prefijo del grupo
    p.productos.forEach((sub) => {
      filas.push([sub.cantidad || "-", sub.nombre || "—"]);
    });
  } else {
    filas.push([p.cantidad || "-", p.nombre || "—"]);
  }
});

  autoTable(doc, {
  startY: 85,
  head: [["Cantidad", "Artículo"]],
  body: filas,
  styles: { fontSize: 10 },
  headStyles: { fillColor: [41, 128, 185] },
  columnStyles: {
    0: { cellWidth: 30 },
    // ...
  },
  // ...
});

  // ✍️ Firmas
  const h = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.text("Firma responsable entrega:", 20, h - 40);
  doc.line(20, h - 35, 90, h - 35);
  doc.text("Firma del cliente:", 120, h - 40);
  doc.line(120, h - 35, 190, h - 35);

  doc.save(nombreArchivo);
};

export { generarRemisionPDF as generarRemision };
export default generarRemisionPDF;
