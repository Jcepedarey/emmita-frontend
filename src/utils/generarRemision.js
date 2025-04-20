import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import supabase from "../supabaseClient"; // ✅ Necesario para buscar datos

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

  // 🔎 Buscar cliente desde Supabase si no viene completo
  let cliente = documento.cliente;
  if (!cliente && documento.cliente_id) {
    const { data } = await supabase.from("clientes").select("*").eq("id", documento.cliente_id).single();
    cliente = data || {};
  }

  const remisionId = `REM-OP${documento.numero || documento.numero_orden || documento.id?.toString().slice(-5) || "SIN-ID"}`;

  doc.addImage(logo, "PNG", 10, 10, 30, 25);
  doc.setFontSize(16);
  doc.text("REMISIÓN", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("Alquiler & Eventos Emmita", 105, 26, { align: "center" });
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio", 105, 31, { align: "center" });
  doc.text("Cel: 3166534685 - 3118222934", 105, 36, { align: "center" });
  doc.line(10, 42, 200, 42);

  // ✅ DATOS DEL DOCUMENTO Y CLIENTE
  doc.setFontSize(12);
  doc.text(`No. de Remisión: ${remisionId}`, 10, 50);
  doc.text(`Cliente: ${cliente?.nombre || "No especificado"}`, 10, 56);
  doc.text(`Identificación: ${cliente?.identificacion || "-"}`, 10, 62);
  doc.text(`Teléfono: ${cliente?.telefono || "-"}`, 10, 68);
  doc.text(`Dirección: ${cliente?.direccion || "-"}`, 10, 74);
  doc.text(`Correo: ${cliente?.email || "-"}`, 10, 80);
  doc.text(`Fecha de creación: ${documento.fecha?.split("T")[0] || "-"}`, 10, 86);
  doc.text(`Fecha del evento: ${documento.fecha_evento || "-"}`, 10, 92);

  // ✅ TABLA DE PRODUCTOS
  const filas = [];

  (documento.productos || []).forEach((p) => {
    if (p.es_grupo && Array.isArray(p.productos)) {
      p.productos.forEach((sub) => {
        filas.push([`(${p.nombre}) ${sub.nombre}`, sub.cantidad]);
      });
    } else {
      filas.push([p.nombre, p.cantidad]);
    }
  });

  autoTable(doc, {
    head: [["Cantidad", "Artículo"]],
    body: filas,
    startY: 100,
    styles: { halign: "left" },
    columnStyles: {
      0: { cellWidth: 25 }, // Cantidad
      1: { cellWidth: 160 } // Artículo
    }
  });

  // ✅ FIRMAS
  const y = (doc.lastAutoTable?.finalY || 120) + 20;
  doc.setFontSize(10);
  doc.text("Firma responsable entrega:", 20, y);
  doc.line(20, y + 5, 90, y + 5);
  doc.text("Firma del cliente:", 120, y);
  doc.line(120, y + 5, 190, y + 5);

  // ✅ NOMBRE DEL ARCHIVO
  doc.save(`${remisionId}.pdf`);
}
