// ✅ PDF DE RECEPCIÓN DE PEDIDO CON ESTÉTICA UNIFICADA
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const procesarImagenRecepcion = (src, width = 150, calidad = 1.0) =>
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

export const generarPDFRecepcion = async (revision, cliente, productosRecibidos, comentario) => {
  const doc = new jsPDF();
  const logoOptimizado = await procesarImagenRecepcion("/icons/logo.png", 250, 1.0);
  const fondoOptimizado = await procesarImagenRecepcion("/icons/fondo_emmita.png", 300, 0.9);

  const insertarFondo = () => {
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondoOptimizado, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();
  };
  insertarFondo();

  doc.addImage(logoOptimizado, "PNG", 10, 10, 35, 30);
  doc.setFontSize(16);
  doc.text("ACTA DE RECEPCIÓN DE PEDIDO", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("Alquiler & Eventos Emmita", 105, 26, { align: "center" });
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio", 105, 31, { align: "center" });
  doc.text("Cel: 3166534685 - 3118222934", 105, 36, { align: "center" });
  doc.line(10, 44, 200, 44);

  doc.setFontSize(12);
  doc.text(`Orden de pedido: ${revision.numero || "-"}`, 10, 48);
  doc.text(`Cliente: ${cliente?.nombre || "-"}`, 10, 55);
  doc.text(`Identificación: ${cliente?.identificacion || "-"}`, 10, 61);
  doc.text(`Dirección: ${cliente?.direccion || "-"}`, 10, 67);
  doc.text(`Teléfono: ${cliente?.telefono || "-"}`, 10, 73);
  doc.text(`Fecha revisión: ${new Date().toLocaleDateString("es-CO")}`, 10, 79);

  autoTable(doc, {
    startY: 90,
    head: [["Descripción", "Esperado", "Recibido", "Observación"]],
    body: (productosRecibidos || []).map((p) => [
      p.descripcion || "Sin nombre",
      p.esperado,
      p.recibido,
      p.observacion || ""
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    didDrawPage: insertarFondo
  });

  if (comentario) {
    doc.setFont("courier", "normal");
    doc.text("📝 Comentario general:", 10, doc.lastAutoTable.finalY + 10);
    doc.text(comentario, 10, doc.lastAutoTable.finalY + 18);
  }

  doc.text("_________________________", 20, doc.internal.pageSize.height - 40);
  doc.text("Firma responsable", 20, doc.internal.pageSize.height - 30);

  doc.save(`recepcion_${revision.numero || "pedido"}.pdf`);
};
