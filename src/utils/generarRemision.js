import { jsPDF } from "jspdf";
  import autoTable from "jspdf-autotable";
  import { generarNombreArchivo } from "./nombrePDF";
  import { obtenerDatosTenantPDF } from "./tenantPDF";

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

  export const generarRemisionPDF = async (documento) => {
    const doc = new jsPDF();
    const emp = await obtenerDatosTenantPDF();
    const logo = emp.logoUrl ? await procesarImagen(emp.logoUrl, 250, 1.0) : null;
    const fondo = emp.fondoUrl ? await procesarImagen(emp.fondoUrl, 300, 0.9) : null;

    // Marca de agua
    const insertarFondo = () => {
      if (!fondo) return;
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
    const mostrarNotas = Boolean(documento.mostrar_notas);

    // Fechas (formato dd/mm/aaaa)
  const fechaCreacion = documento.fecha_creacion ? soloFecha(documento.fecha_creacion) : "-";
  const fechaEvento   = documento.fecha_evento   ? soloFecha(documento.fecha_evento)   : "-";

    // ─── Encabezado ──────────────────────────────────────────────────────────────
    if (logo) doc.addImage(logo, "PNG", 10, 10, 30, 30);
    doc.setFontSize(16);
    doc.text(emp.nombre, 50, 20);
    doc.setFontSize(10);
    doc.text(emp.direccion, 50, 26);
    doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);
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

    // Detectar si es alquiler por varios días
    const esMultiDias = !!documento.multi_dias;

    // Arreglo de fechas ordenadas
    const listaFechas = Array.isArray(documento.fechas_evento)
      ? [...documento.fechas_evento].filter(Boolean).sort()
      : [];

    // Variables a mostrar
    let etiquetaFecha1 = "Fecha del evento";
    let valorFecha1 = "-";
    let etiquetaFecha2 = "";
    let valorFecha2 = "";

    if (!esMultiDias) {
      const unica = documento.fecha_evento || listaFechas[0] || null;
      valorFecha1 = unica ? soloFecha(unica) : "-";
    } else {
      etiquetaFecha1 = "Fecha inicio";
      etiquetaFecha2 = "Fecha final";

      const primera = listaFechas[0] || documento.fecha_evento || null;
      const ultima =
        listaFechas.length > 1
          ? listaFechas[listaFechas.length - 1]
          : (listaFechas[0] || documento.fecha_evento || null);

      valorFecha1 = primera ? soloFecha(primera) : "-";
      valorFecha2 = ultima ? soloFecha(ultima) : "-";
    }

    doc.text(`Fecha creación: ${fechaCreacion}`, 150, 48);
    doc.text(`${etiquetaFecha1}: ${valorFecha1}`, 150, 55);

    // Línea inferior (espaciado ajustado igual al PDF de pedido)
    if (esMultiDias && valorFecha2) {
      doc.text(`${etiquetaFecha2}: ${valorFecha2}`, 150, 62);
    }

    // 📋 Tabla de artículos (con grupos y soporte de notas)
const filas = [];
(documento.productos || []).forEach((p) => {
  if (p.es_grupo && Array.isArray(p.productos)) {
    const factorGrupo = Number(p.cantidad) || 1;

    // Título del grupo (centrado). El colSpan depende de si hay columna de Notas.
    filas.push([
      {
        content: p.nombre || "Grupo sin nombre",
        colSpan: mostrarNotas ? 3 : 2,
        _grupo: true, // ← marcador para estilos en el hook
      },
    ]);

    // Sub-items del grupo
    p.productos.forEach((sub) => {
      const cantSub = (Number(sub.cantidad) || 0) * factorGrupo; // 👈 MULTIPLICA
      if (cantSub > 0) {
        if (mostrarNotas) {
          filas.push([
            cantSub,
            { content: sub.nombre, _temp: !!sub.temporal || !!sub.es_proveedor },
            (sub.notas || "").trim(),
          ]);
        } else {
          filas.push([
            cantSub,
            { content: sub.nombre, _temp: !!sub.temporal || !!sub.es_proveedor },
          ]);
        }
      }
    });
  } else {
    // Producto normal
    if (mostrarNotas) {
      filas.push([
        Number(p.cantidad) || 0,
        { content: p.nombre, _temp: !!p.temporal || !!p.es_proveedor },
        (p.notas || "").trim(),
      ]);
    } else {
      filas.push([
        Number(p.cantidad) || 0,
        { content: p.nombre, _temp: !!p.temporal || !!p.es_proveedor },
      ]);
    }
  }
});

let zebraIndex = 0;

autoTable(doc, {
  theme: "plain", // usamos plain y pintamos nosotros
  head: mostrarNotas ? [["Cantidad", "Artículo", "Notas"]] : [["Cantidad", "Artículo"]],
  body: filas,
  startY: 85,
  styles: { fontSize: 10 },
  headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "center", valign: "middle" },
  columnStyles: mostrarNotas
  ? {
      0: { cellWidth: 25, halign: "center" },  // Cantidad
      1: { cellWidth: 110 },                    // Artículo (reducido)
      2: { cellWidth: 55 },                     // Notas
    }
  : {
      0: { cellWidth: 30, halign: "center" },
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


    // ✍️ Firmas: debajo de la tabla (o en nueva página si no caben)
  const pageH = doc.internal.pageSize.height;
  const firmasAlto = 30; // alto estimado del bloque de firmas
  let yFirmas = (doc.lastAutoTable?.finalY || 90) + 16;

  // 🆕 Nota de fechas de entrega y devolución
  const fEntrega = documento.fecha_entrega ? soloFecha(documento.fecha_entrega) : null;
  const fDevolucion = documento.fecha_devolucion ? soloFecha(documento.fecha_devolucion) : null;

  if (fEntrega || fDevolucion) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const partes = [];
    if (fEntrega) partes.push(`Entrega: ${fEntrega}`);
    if (fDevolucion) partes.push(`Devolución: ${fDevolucion}`);
    doc.text(partes.join("  ·  "), 10, yFirmas);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    yFirmas += 12;
  }

  // Si no caben en esta hoja, saltamos de página
  if (yFirmas + firmasAlto > pageH - 10) {
    doc.addPage();
    yFirmas = 40; // margen superior en la nueva página
  }

  doc.setFontSize(10);
  doc.text("Firma responsable entrega:", 20, yFirmas);
  doc.line(20, yFirmas + 5, 90, yFirmas + 5);
  doc.text("Firma del cliente:", 120, yFirmas);
  doc.line(120, yFirmas + 5, 190, yFirmas + 5);

  // (lo que sigue ya lo tenías)
  doc.save(nombreArchivo);
  };

  export { generarRemisionPDF as generarRemision };
  export default generarRemisionPDF;