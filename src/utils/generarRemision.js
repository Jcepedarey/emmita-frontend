// ✅ PDF DE REMISIÓN CON OPTIMIZACIÓN TOTAL
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import supabase from "../supabaseClient";

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

export async function generarRemision(documento) {
  const doc = new jsPDF();
  const logoOptimizado = await procesarImagen("/icons/logo.png", 250, 1.0);
  const fondoOptimizado = await procesarImagen("/icons/fondo_emmita.png", 300, 0.9);

  const insertarFondo = () => {
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondoOptimizado, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();
  };

  insertarFondo();

  let cliente = documento.cliente;
  if (!cliente && documento.cliente_id) {
    const { data } = await supabase.from("clientes").select("*").eq("id", documento.cliente_id).single();
    cliente = data || {};
  }

  const remisionId = `REM-${documento.numero || documento.numero_orden || documento.id?.toString().slice(-5) || "SN"}`;

  doc.addImage(logoOptimizado, "PNG", 10, 10, 35, 30);
  doc.setFontSize(16);
  doc.text("REMISIÓN", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("Alquiler & Eventos Emmita", 105, 26, { align: "center" });
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio", 105, 31, { align: "center" });
  doc.text("Cel: 3166534685 - 3118222934", 105, 36, { align: "center" });
  doc.line(10, 44, 200, 44);

  doc.setFontSize(12);
  doc.text(`No. de Remisión: ${remisionId}`, 10, 48);
  doc.text(`Cliente: ${cliente?.nombre || "-"}`, 10, 55);
  doc.text(`Identificación: ${cliente?.identificacion || "-"}`, 10, 61);
  doc.text(`Teléfono: ${cliente?.telefono || "-"}`, 10, 67);
  doc.text(`Dirección: ${cliente?.direccion || "-"}`, 10, 73);
  doc.text(`Correo: ${cliente?.email || "-"}`, 10, 79);
  doc.text(`Fecha de creación: ${documento.fecha?.split("T")[0] || "-"}`, 10, 85);
  doc.text(`Fecha del evento: ${documento.fecha_evento || "-"}`, 10, 91);

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
    head: [["Cantidad", "Artículo"]],
    body: filas,
    startY: 100,
    tableWidth: "wrap",
    styles: { font: "helvetica", fontSize: 10 },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 170 } },
    didDrawPage: insertarFondo
  });

  const y = (doc.lastAutoTable?.finalY || 120) + 20;
  doc.setFontSize(10);
  doc.text("Firma responsable entrega:", 20, y);
  doc.line(20, y + 5, 90, y + 5);
  doc.text("Firma del cliente:", 120, y);
  doc.line(120, y + 5, 190, y + 5);

  doc.save(`${remisionId}.pdf`);
}