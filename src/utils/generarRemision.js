// C:\Users\pc\frontend-emmita\src\utils\generarRemision.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generarRemision(documento) {
  const doc = new jsPDF();

  const logo = await fetch("/logo.png")
    .then((res) => res.blob())
    .then((blob) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    });

  // ENCABEZADO
  doc.addImage(logo, "PNG", 10, 10, 30, 25);
  doc.setFontSize(16);
  doc.text("REMISIÓN", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("Alquiler & Eventos Emmita", 105, 26, { align: "center" });
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio", 105, 31, { align: "center" });
  doc.text("Cel: 3166534685 - 3118222934", 105, 36, { align: "center" });
  doc.line(10, 42, 200, 42);

  // DATOS DEL DOCUMENTO
  const remisionId = `REM-OP${documento.id || "SIN-ID"}`;
  doc.setFontSize(12);
  doc.text(`No. de Remisión: ${remisionId}`, 10, 50);

  doc.text(`Cliente: ${documento.cliente_nombre || documento.cliente_id}`, 10, 56);
  if (documento.identificacion) doc.text(`Identificación: ${documento.identificacion}`, 10, 62);
  if (documento.telefono) doc.text(`Teléfono: ${documento.telefono}`, 10, 68);
  if (documento.direccion) doc.text(`Dirección: ${documento.direccion}`, 10, 74);
  if (documento.email) doc.text(`Correo: ${documento.email}`, 10, 80);
  doc.text(`Fecha de creación: ${documento.fecha?.split("T")[0] || "-"}`, 10, 86);
  doc.text(`Fecha del evento: ${documento.fecha_evento || "-"}`, 10, 92);

  const startY = 100;

  // TABLA DE PRODUCTOS (cantidad a la izquierda)
  const filas = [];

  (documento.productos || []).forEach((p) => {
    if (p.es_grupo && Array.isArray(p.productos)) {
      p.productos.forEach((sub) => {
        filas.push([
          sub.cantidad,
          sub.nombre
        ]);
      });
    } else {
      filas.push([
        p.cantidad,
        p.nombre
      ]);
    }
  });

  autoTable(doc, {
    head: [["Cantidad", "Artículo"]],
    body: filas,
    startY: startY,
  });

  // FIRMAS
  const y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : 120;
  doc.setFontSize(10);
  doc.text("Firma responsable entrega:", 20, y);
  doc.line(20, y + 5, 90, y + 5);

  doc.text("Firma del cliente:", 120, y);
  doc.line(120, y + 5, 190, y + 5);

  // NOMBRE DEL ARCHIVO
  doc.save(`${remisionId}.pdf`);
}
