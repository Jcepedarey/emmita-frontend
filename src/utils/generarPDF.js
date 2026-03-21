import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import { generarNombreArchivo } from "./nombrePDF";
  import { obtenerDatosTenantPDF } from "./tenantPDF";

  // ─── Paleta de colores por tipo ──────────────────────────────────────────────
  const PALETTE = {
    azul: [41, 128, 185],
    sage: [140, 153, 135],
  };

  // ─── Config de redes sociales para PDF ──────────────────────────────────
  const REDES_PDF = {
    instagram: { sigla: "IG", color: [225, 48, 108] },
    facebook: { sigla: "FB", color: [24, 119, 242] },
    tiktok: { sigla: "TK", color: [1, 1, 1] },
    youtube: { sigla: "YT", color: [255, 0, 0] },
    whatsapp: { sigla: "WA", color: [37, 211, 102] },
    web: { sigla: "WEB", color: [0, 119, 182] },
  };

  /**
   * Devuelve el color de encabezado de tabla según el tipo de documento
   * @param {string} tipo - "cotizacion" o "pedido"
   */
  function colorHead(tipo) {
    return tipo === "cotizacion" ? PALETTE.sage : PALETTE.azul;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────────
  const fmt = (n) => Number(n || 0).toLocaleString("es-CO");
  const num = (n, def = 0) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : def;
  };
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

  // Mantengo tu procesador de imágenes y fondo
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

  export async function generarPDF(documento, tipo = "cotizacion") {
    const doc = new jsPDF();

    // ─── Datos de la empresa (dinámico) ──────────────────────────────────────────
    const emp = await obtenerDatosTenantPDF();
    const logo = await procesarImagen(emp.logoUrl, 250, 1.0);
    const fondo = await procesarImagen(emp.fondoUrl, 300, 0.9);

    const insertarFondo = () => {
      const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
      const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
      doc.restoreGraphicsState();
    };
    insertarFondo();

    // ─── Encabezado ──────────────────────────────────────────────────────────────
    doc.addImage(logo, "PNG", 10, 10, 30, 30);
    doc.setFontSize(16);
    doc.text(emp.nombre, 50, 20);
    doc.setFontSize(10);
    doc.text(emp.direccion, 50, 26);
    doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);
    doc.setLineWidth(0.5);
    doc.line(10, 42, 200, 42);

      const fechaCreacion = soloFecha(documento.fecha_creacion);

    // ¿Es alquiler por varios días?
    const esMultiDias = !!documento.multi_dias;

    // Aseguramos un arreglo ordenado de fechas de evento
    const listaFechas = Array.isArray(documento.fechas_evento)
      ? [...documento.fechas_evento].filter(Boolean).sort()
      : [];

    // Valores y etiquetas a mostrar en el PDF
    let etiquetaFecha1 = "Fecha evento";
    let valorFecha1 = "-";
    let etiquetaFecha2 = "";
    let valorFecha2 = "";

    if (!esMultiDias) {
      // Caso normal: un solo día
      const unica = documento.fecha_evento || listaFechas[0] || null;
      valorFecha1 = unica ? soloFecha(unica) : "-";
    } else {
      // Caso multi días: mostramos fecha inicio y fecha final
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

    doc.setFontSize(12);
    doc.text(
      `Tipo de documento: ${tipo === "cotizacion" ? "Cotización" : "Orden de Pedido"}`,
      10,
      48
    );
    doc.text(`Cliente: ${documento.nombre_cliente || "Cliente"}`, 10, 55);
    doc.text(`Identificación: ${documento.identificacion || "N/A"}`, 10, 61);
    doc.text(`Teléfono: ${documento.telefono || "N/A"}`, 10, 67);
    doc.text(`Dirección: ${documento.direccion || "N/A"}`, 10, 73);
    doc.text(`Correo: ${documento.email || "N/A"}`, 10, 79);

    // Columna derecha de fechas
    doc.text(`Fecha creación: ${fechaCreacion}`, 150, 48);
    doc.text(`${etiquetaFecha1}: ${valorFecha1}`, 150, 55);

    // Solo mostramos "Fecha final" cuando es alquiler por varios días
    if (esMultiDias && valorFecha2) {
      doc.text(`${etiquetaFecha2}: ${valorFecha2}`, 150, 62);
    }

    // ─── Tabla Productos ─────────────────────────────────────────────────────────
    const esMulti = Boolean(documento.multi_dias);
    const nd = num(documento.numero_dias, 1);

    const mostrarNotas = Boolean(documento.mostrar_notas);

const head = (() => {
  if (esMulti && mostrarNotas) {
    return [["Cantidad", "Artículo", "Notas", "Precio", "V. x Días", "Subtotal"]];
  } else if (esMulti && !mostrarNotas) {
    return [["Cantidad", "Artículo", "Precio", "V. x Días", "Subtotal"]];
  } else if (!esMulti && mostrarNotas) {
    return [["Cantidad", "Artículo", "Notas", "Precio", "Subtotal"]];
  } else {
    return [["Cantidad", "Artículo", "Precio", "Subtotal"]];
  }
})();

    const body = (documento.productos || []).map((p) => {
  const cantidad = num(p.cantidad, 0);
  const precio = num(p.precio, 0);

  const usaDias = p.multiplicarPorDias !== false;
  const valorPorDias = usaDias ? (precio * nd) : precio;

  const subtotal = num(
    p.subtotal,
    precio * cantidad * (esMulti ? (usaDias ? nd : 1) : 1)
  );

  const notas = (p.notas || "").trim();

  if (esMulti && mostrarNotas) {
    return [
      cantidad || 0,
      p.nombre || "",
      notas,
      `$${fmt(precio)}`,
      `$${fmt(valorPorDias)}`,
      `$${fmt(subtotal)}`,
    ];
  } else if (esMulti && !mostrarNotas) {
    return [
      cantidad || 0,
      p.nombre || "",
      `$${fmt(precio)}`,
      `$${fmt(valorPorDias)}`,
      `$${fmt(subtotal)}`,
    ];
  } else if (!esMulti && mostrarNotas) {
    return [
      cantidad || 0,
      p.nombre || "",
      notas,
      `$${fmt(precio)}`,
      `$${fmt(subtotal)}`,
    ];
  } else {
    return [
      cantidad || 0,
      p.nombre || "",
      `$${fmt(precio)}`,
      `$${fmt(subtotal)}`,
    ];
  }
});

    autoTable(doc, {
  head,
  body,
  startY: 85,
  styles: { font: "helvetica", fontSize: 10 },
  headStyles: {
    fillColor: colorHead(tipo),
    textColor: 255,
    halign: "center",
    valign: "middle",
  },
  columnStyles: (() => {
    if (esMulti && mostrarNotas) {
      return {
        0: { cellWidth: 20, halign: "center" },  // Cantidad
        1: { cellWidth: 65 },                     // Artículo (reducido)
        2: { cellWidth: 40 },                     // Notas
        3: { cellWidth: 23, halign: "center" },  // Precio
        4: { cellWidth: 23, halign: "center" },  // V. x Días
        5: { cellWidth: 23, halign: "center" },  // Subtotal
      };
    } else if (esMulti && !mostrarNotas) {
      return {
        0: { cellWidth: 22, halign: "center" },  // Cantidad
        1: { cellWidth: 90 },                     // Artículo
        2: { cellWidth: 26, halign: "center" },  // Precio
        3: { cellWidth: 26, halign: "center" },  // V. x Días
        4: { cellWidth: 26, halign: "center" },  // Subtotal
      };
    } else if (!esMulti && mostrarNotas) {
      return {
        0: { cellWidth: 25, halign: "center" },  // Cantidad
        1: { cellWidth: 70 },                     // Artículo (reducido)
        2: { cellWidth: 45 },                     // Notas
        3: { cellWidth: 28, halign: "center" },  // Precio
        4: { cellWidth: 28, halign: "center" },  // Subtotal
      };
    } else {
      return {
        0: { cellWidth: 30, halign: "center" },  // Cantidad
        1: { cellWidth: 100 },                    // Artículo
        2: { cellWidth: 30, halign: "center" },  // Precio
        3: { cellWidth: 30, halign: "center" },  // Subtotal
      };
    }
  })(),
  margin: { left: 10, right: 10 },
  didDrawPage: insertarFondo,
});

let y = (doc.lastAutoTable?.finalY || 100) + 10;
    // ===== Pre-cálculo de espacio para Garantía + Abonos + Totales + Redes =====
  const pageHeight0 = doc.internal.pageSize.getHeight();
  const footerHeight = 30;    // redes + condiciones
  const bottomMargin = 12;    // margen inferior
  const safeBottom0 = pageHeight0 - bottomMargin - footerHeight;

  // Flags para totales (las usamos también para calcular altura)
  const flagDesc = Boolean(documento.aplicar_descuento) || num(documento.descuento, 0) > 0;
  const flagRet  = Boolean(documento.aplicar_retencion) || num(documento.retencion, 0) > 0;

  // Altura estimada del bloque "contenido final"
  let needed = 0;

  // Garantía (una línea)
  if (documento.garantia && documento.garantia !== "0") {
    needed += 12;
  }

  // Abonos: título + N líneas
  const abonosCount = Array.isArray(documento.abonos) ? documento.abonos.length : 0;
  if (abonosCount > 0) {
    needed += 8 + abonosCount * 8;
  }

  // Separador (línea horizontal + margen)
  needed += 10;

  // Totales
  if (flagDesc || flagRet) {
    // TOTAL BRUTO
    needed += 8;
    if (flagDesc) needed += 8;
    if (flagRet)  needed += 8;
    // TOTAL NETO
    needed += 10;
  } else {
    // TOTAL
    needed += 10;
  }

  // SALDO FINAL (reservamos línea)
  needed += 10;

  // ¿Cabe todo este bloque arriba del pie?
  if (y + needed > safeBottom0) {
    doc.addPage();
    insertarFondo();
    y = 40; // margen superior cómodo en la nueva página
  }

  // 💰 Garantía (solo la palabra en negrilla, seguido del valor)
  if (documento.garantia && documento.garantia !== "0") {
    const fechaG = documento.fecha_garantia ? soloFecha(documento.fecha_garantia) : "";
    const textoValor = `$${Number(documento.garantia).toLocaleString("es-CO")}` +
      (fechaG ? ` - Fecha: ${fechaG}` : "");

    doc.setFont(undefined, "bold");
    doc.text("GARANTÍA:", 10, y);

    const ancho = doc.getTextWidth("GARANTÍA: ");

    doc.setFont(undefined, "normal");
    doc.text(textoValor, 10 + ancho, y);

    y += 12;
  }

  // 💸 Abonos (ahora justo debajo de Garantía)
  // 💸 Abonos (ahora justo debajo de Garantía)
  let totalAbonos = 0;
  if (Array.isArray(documento.abonos) && documento.abonos.length > 0) {
    doc.setFont(undefined, "bold");
    doc.text("ABONOS:", 10, y);
    doc.setFont(undefined, "normal");
    y += 8;

    documento.abonos.forEach((abono, i) => {
    const valor = typeof abono === "object" ? abono.valor : abono;
    const fechaRaw = typeof abono === "object" ? abono.fecha : "";
    const fecha = fechaRaw ? soloFecha(fechaRaw) : "sin fecha";
    doc.text(`• Abono ${i + 1}: $${fmt(valor)} - Fecha: ${fecha}`, 15, y);
    y += 8;
    totalAbonos += num(valor, 0);
  });

    y += 4;
  }

  // ── Línea separadora antes de totales
  doc.setDrawColor(180);       // gris
  doc.setLineWidth(0.5);
  doc.line(10, y, 200, y);
  y += 10;

  // ── Totales
  const totalBruto = (documento.productos || []).reduce(
    (acc, p) =>
      acc +
      num(
        p.subtotal,
        num(p.precio) * num(p.cantidad) * (esMulti ? (p.multiplicarPorDias === false ? 1 : nd) : 1)
      ),
    0
  );
  const descuento = num(documento.descuento, 0);
  const retencion = num(documento.retencion, 0);
  const totalNeto = num(
    documento.total_neto,
    Math.max(0, totalBruto - descuento - retencion)
  );

  const saldo = Math.max(0, totalNeto - totalAbonos);

  const xTot = 150;
  doc.setFontSize(12);

  // OJO: usamos los flags ya declarados ARRIBA en el pre-chequeo
  const hayAjustes = flagDesc || flagRet;

  if (hayAjustes) {
    doc.text(`TOTAL BRUTO: $${fmt(totalBruto)}`, xTot, y);
    y += 8;

    if (flagDesc) {
      doc.text(`DESCUENTO: -$${fmt(descuento)}`, xTot, y);
      y += 8;
    }
    if (flagRet) {
      doc.text(`RETENCIÓN: -$${fmt(retencion)}`, xTot, y);
      y += 8;
    }

    doc.setFont(undefined, "bold");
    doc.text(`TOTAL NETO: $${fmt(totalNeto)}`, xTot, y);
    doc.setFont(undefined, "normal");
    y += 10;
  } else {
    doc.setFont(undefined, "bold");
    doc.text(`TOTAL: $${fmt(totalBruto)}`, xTot, y);
    doc.setFont(undefined, "normal");
    y += 10;
  }

  // Mostrar SIEMPRE el saldo final (aún si no hay abonos)
  doc.text(`SALDO FINAL: $${fmt(saldo)}`, xTot, y);
  y += 6; // pequeño respiro

  // 🆕 Nota de fechas de entrega y devolución (solo si tienen valor)
  const fEntrega = documento.fecha_entrega ? soloFecha(documento.fecha_entrega) : null;
  const fDevolucion = documento.fecha_devolucion ? soloFecha(documento.fecha_devolucion) : null;

  if (fEntrega || fDevolucion) {
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gris
    const partes = [];
    if (fEntrega) partes.push(`Entrega: ${fEntrega}`);
    if (fDevolucion) partes.push(`Devolución: ${fDevolucion}`);
    doc.text(partes.join("  ·  "), 10, y);
    doc.setTextColor(0, 0, 0); // restaurar negro
    doc.setFontSize(12);
    y += 8;
  }

  // ─── Pie anclado al borde inferior (con guardia anti-encime) ─────────────────
  // Si por cualquier motivo quedamos muy cerca del pie, forzamos nueva página
  const pageHeight = doc.internal.pageSize.getHeight();
  const yFooter    = pageHeight - bottomMargin - footerHeight;

  if (y > yFooter - 4) {
    doc.addPage();
    insertarFondo();
  }

  // Recalcular por si agregamos página
  const pageHeight2 = doc.internal.pageSize.getHeight();
  const yFooter2    = pageHeight2 - bottomMargin - footerHeight;

  // ─── Pie de página moderno: condiciones + redes sociales ─────────────────
  let yPie = yFooter2;

  // 📄 Texto de condiciones (si existe)
  if (emp.textoCondicionesPdf) {
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    const lineas = doc.splitTextToSize(emp.textoCondicionesPdf, 190);
    const lineasMostrar = lineas.slice(0, 3); // máx 3 líneas
    lineasMostrar.forEach((linea, i) => {
      doc.text(linea, 10, yPie + (i * 3.5));
    });
    yPie += lineasMostrar.length * 3.5 + 4;
  }

  // 📱 Redes sociales como pills con sigla de color
  const redes = emp.redesSociales || [];
  if (redes.length > 0) {
    let xPill = 10;
    const pillH = 5;
    const pillY = yPie;

    redes.forEach((red) => {
      const cfg = REDES_PDF[red.red];
      if (!cfg || !red.usuario) return;

      const texto = red.usuario;
      const sigla = cfg.sigla;
      const textoAncho = doc.getStringUnitWidth(texto) * 7.5 / doc.internal.scaleFactor;
      const siglaAncho = doc.getStringUnitWidth(sigla) * 7 / doc.internal.scaleFactor;
      const pillW = siglaAncho + textoAncho + 12;

      // No dibujar si se sale de la página
      if (xPill + pillW > 200) return;

      // Cuadro de sigla (color)
      doc.setFillColor(...cfg.color);
      doc.roundedRect(xPill, pillY - 3.5, siglaAncho + 5, pillH, 1.2, 1.2, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(sigla, xPill + 2.5, pillY);

      // Texto del usuario
      doc.setFontSize(7.5);
      doc.setTextColor(75, 85, 99);
      doc.text(texto, xPill + siglaAncho + 7, pillY);

      xPill += pillW + 6;
    });
  }

  // Si no hay redes ni condiciones, mostrar email como fallback
  if (redes.length === 0 && !emp.textoCondicionesPdf && emp.email) {
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(emp.email, 10, yPie);
  }

  doc.setTextColor(0, 0, 0); // restaurar

  // ─── Guardar PDF ─────────────────────────────────────────────────────────────
  const fechaSegura = documento.fecha_creacion || new Date();
  const nombreArchivo = generarNombreArchivo(tipo, fechaSegura, documento.nombre_cliente);
  doc.save(nombreArchivo);
  }