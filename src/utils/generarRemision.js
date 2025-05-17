// ✅ REMISIÓN PDF DESDE CREARDOCUMENTO - UNIFICADO
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import supabase from "../supabaseClient";

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

  const remisionId = `REM-${documento.numero || documento.numero_orden || documento.id?.toString().slice(-5) || "SN"}`;

  // 🧾 Encabezado
  doc.addImage(logo, "PNG", 10, 10, 35, 30);
  doc.setFontSize(16);
  doc.text("REMISIÓN", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("Alquiler & Eventos Emmita", 105, 26, { align: "center" });
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio", 105, 31, { align: "center" });
  doc.text("Cel: 3166534685 - 3118222934", 105, 36, { align: "center" });
  doc.line(10, 44, 200, 44);

  // 🧾 Datos del documento y cliente usando la misma lógica de generarPDF.js
  doc.setFontSize(12);
  doc.text(`No. de Remisión: ${remisionId}`, 10, 48);
  doc.text(`Cliente: ${documento.nombre_cliente || "Cliente no especificado"}`, 10, 55);
  if (documento.identificacion) doc.text(`Identificación: ${documento.identificacion}`, 10, 61);
  if (documento.telefono) doc.text(`Teléfono: ${documento.telefono}`, 10, 67);
  if (documento.direccion) doc.text(`Dirección: ${documento.direccion}`, 10, 73);
  if (documento.email) doc.text(`Correo: ${documento.email}`, 10, 79);
  doc.text(`Fecha de creación: ${documento.fecha || "-"}`, 10, 85);
  doc.text(`Fecha del evento: ${documento.fecha_evento || "-"}`, 10, 91);

  // 📋 Tabla de artículos
  const filas = [];
  (documento.productos || []).forEach((p) => {
    if (p.es_grupo && Array.isArray(p.productos)) {
      p.productos.forEach((sub) => {
        filas.push([sub.cantidad, `(${p.nombre}) ${sub.nombre}`]);
      });
    } else {
      filas.push([p.cantidad, p.nombre]);
    }
  });

  autoTable(doc, {
    startY: 100,
    head: [["Cantidad", "Artículo"]],
    body: filas,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 160 }
    },
    didDrawPage: insertarFondo,
    margin: { bottom: 40 }
  });

  // ✍️ Firmas al pie de página
  const h = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.text("Firma responsable entrega:", 20, h - 40);
  doc.line(20, h - 35, 90, h - 35);
  doc.text("Firma del cliente:", 120, h - 40);
  doc.line(120, h - 35, 190, h - 35);

  doc.save(`${remisionId}.pdf`);
};

// Alias
export { generarRemisionPDF as generarRemision };
