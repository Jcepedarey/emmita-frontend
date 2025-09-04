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

  // Marca de agua
  const insertarFondo = () => {
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();
  };
  insertarFondo();

  // Nombre de archivo e ID visible
  const fechaSegura = documento.fecha_creacion || new Date();
  const nombreArchivo = generarNombreArchivo("remision", fechaSegura, documento.nombre_cliente);
  const remisionId = nombreArchivo.replace(".pdf", "");

  // Fechas (sin hora)
  const fechaCreacion = documento.fecha_creacion
    ? new Date(documento.fecha_creacion).toISOString().slice(0, 10)
    : "-";
  const fechaEvento = documento.fecha_evento
    ? new Date(documento.fecha_evento).toISOString().slice(0, 10)
    : "-";

  // 🧾 Encabezado (igual al PDF normal)
  doc.addImage(logo, "PNG", 10, 10, 35, 30);
  doc.setFontSize(16);
  doc.text("Alquiler & Eventos Emmita", 50, 20);
  doc.setFontSize(10);
  doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio, Meta", 50, 26);
  doc.text("Cel-Whatsapp 3166534685 - 3118222934", 50, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // Datos cliente (izquierda)
  doc.setFontSize(12);
  doc.text(`No. de Remisión: ${remisionId}`, 10, 48);
  doc.text(`Cliente: ${documento.nombre_cliente || "Cliente no especificado"}`, 10, 55);
  doc.text(`Identificación: ${documento.identificacion || "N/A"}`, 10, 61);
  doc.text(`Teléfono: ${documento.telefono || "N/A"}`, 10, 67);
  doc.text(`Dirección: ${documento.direccion || "N/A"}`, 10, 73);
  doc.text(`Correo: ${documento.email || "N/A"}`, 10, 79);

  // Fechas (derecha)
  doc.setFontSize(11);
  doc.text(`Fecha creación: ${fechaCreacion}`, 150, 48);
  doc.text(`Fecha del evento: ${fechaEvento}`, 150, 55);

  // 📋 Tabla de artículos (con grupos)
  //  - Si el ítem es grupo: se muestra UNA fila centrada con el nombre del grupo
  //    y debajo cada artículo con la cantidad TOTAL = cantidad_del_subartículo * cantidad_del_grupo.
  const filas = [];
  (documento.productos || []).forEach((p) => {
    if (p.es_grupo && Array.isArray(p.productos)) {
      const factorGrupo = Number(p.cantidad) || 1;

      // Título del grupo centrado y sin "Grupo:"
      filas.push([
  {
    content: p.nombre || "Grupo sin nombre",
    colSpan: 2,
    _grupo: true, // ← marcador para estilos en el hook
  },
]);

      p.productos.forEach((sub) => {
        const cantSub = (Number(sub.cantidad) || 0) * factorGrupo; // 👈 MULTIPLICA
        if (cantSub > 0) {
          filas.push([
  cantSub,
  { content: sub.nombre, _temp: !!sub.temporal || !!sub.es_proveedor },
]);
        }
      });
    } else {
      // Producto normal
      filas.push([
  Number(p.cantidad) || 0,
  { content: p.nombre, _temp: !!p.temporal || !!p.es_proveedor },
]);
    }
  });

  let zebraIndex = 0;

autoTable(doc, {
  theme: "plain", // usamos plain y pintamos nosotros
  head: [["Cantidad", "Artículo"]],
  body: filas,
  startY: 90,
  styles: { fontSize: 10 },
  headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center", valign: "middle" },
  columnStyles: {
  0: { cellWidth: 30, halign: "center" }, // ← centra los números de la columna Cantidad
  1: { cellWidth: 150 },
},
  // Zebra intercalado y reseteo al cambiar de grupo
  didParseCell: (data) => {
  const { cell, row, column, table, section } = data;

  // 👉 Encabezado centrado
  if (section === "head") {
    cell.styles.halign = "center";
    cell.styles.valign = "middle";
    return; // no aplicar zebra aquí
  }

  // 👉 Solo para el cuerpo aplicamos título de grupo y zebra
  if (section !== "body") return;

  const lastCol = table.columns.length - 1;
  const isGrupo = row.raw?.[0]?._grupo === true;

  if (isGrupo) {
    // título de grupo
    cell.styles.fontStyle = "bold";
    cell.styles.halign = "center";
    cell.styles.fillColor = [235, 235, 235];
    cell.styles.cellPadding = { top: 4, bottom: 3, left: 2, right: 2 };
    if (column.index === lastCol) zebraIndex = 0; // reinicia zebra tras el título
  } else {
    // zebra intercalado
    const shade = zebraIndex % 2 === 0 ? 255 : 245;
    cell.styles.fillColor = [shade, shade, shade];
    if (column.index === lastCol) zebraIndex++;
  }
},
didDrawCell: (data) => {
  const { section, row, column, cell } = data;
  // Solo cuerpo y solo columna "Artículo" (índice 1)
  if (section === "body" && column.index === 1) {
    const esTemporal = row.raw?.[1]?._temp === true;
    if (esTemporal) {
      // Subrayado suave (gris claro) dentro del ancho de la celda
      doc.setDrawColor(170);       // gris suave
      doc.setLineWidth(0.4);
      const y = cell.y + cell.height - 2; // 2pt por encima del borde inferior
      doc.line(cell.x + 2, y, cell.x + cell.width - 2, y);
    }
  }
},
  didDrawPage: insertarFondo,
  margin: { left: 10, right: 10 },
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
