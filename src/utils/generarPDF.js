import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import { generarNombreArchivo } from "./nombrePDF";
  import { obtenerDatosTenantPDF } from "./tenantPDF";

  // ─── Paleta de colores por tipo ──────────────────────────────────────────────
  const PALETTE = {
    azul: [41, 128, 185],
    sage: [140, 153, 135],
  };

  // ─── Config de redes sociales ──────────────────────────────────
  const REDES_PDF = {
    instagram: { bg: "#E1306C", bgArr: [225, 48, 108] },
    facebook:  { bg: "#1877F2", bgArr: [24, 119, 242] },
    tiktok:    { bg: "#010101", bgArr: [1, 1, 1] },
    youtube:   { bg: "#FF0000", bgArr: [255, 0, 0] },
    whatsapp:  { bg: "#25D366", bgArr: [37, 211, 102] },
    web:       { bg: "#0077B6", bgArr: [0, 119, 182] },
  };

  // ─── Generar ícono de red social como imagen base64 usando Canvas ───────────
  function generarIconoRed(red, size = 48) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const cfg = REDES_PDF[red];
    if (!cfg) return null;

    const r = size * 0.2; // radio de esquinas

    // Fondo redondeado
    ctx.fillStyle = cfg.bg;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Dibujar símbolo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    const cx = size / 2;
    const cy = size / 2;
    const u = size / 48; // unidad base para escalar

    if (red === "instagram") {
      // Cuadrado redondeado exterior
      ctx.lineWidth = 2.5 * u;
      const boxS = 22 * u;
      const boxR = 6 * u;
      ctx.beginPath();
      ctx.moveTo(cx - boxS/2 + boxR, cy - boxS/2);
      ctx.lineTo(cx + boxS/2 - boxR, cy - boxS/2);
      ctx.quadraticCurveTo(cx + boxS/2, cy - boxS/2, cx + boxS/2, cy - boxS/2 + boxR);
      ctx.lineTo(cx + boxS/2, cy + boxS/2 - boxR);
      ctx.quadraticCurveTo(cx + boxS/2, cy + boxS/2, cx + boxS/2 - boxR, cy + boxS/2);
      ctx.lineTo(cx - boxS/2 + boxR, cy + boxS/2);
      ctx.quadraticCurveTo(cx - boxS/2, cy + boxS/2, cx - boxS/2, cy + boxS/2 - boxR);
      ctx.lineTo(cx - boxS/2, cy - boxS/2 + boxR);
      ctx.quadraticCurveTo(cx - boxS/2, cy - boxS/2, cx - boxS/2 + boxR, cy - boxS/2);
      ctx.closePath();
      ctx.stroke();
      // Círculo central
      ctx.beginPath();
      ctx.arc(cx, cy, 7 * u, 0, Math.PI * 2);
      ctx.stroke();
      // Punto esquina superior derecha
      ctx.beginPath();
      ctx.arc(cx + 8 * u, cy - 8 * u, 2 * u, 0, Math.PI * 2);
      ctx.fill();

    } else if (red === "facebook") {
      // Letra f estilizada
      ctx.font = `bold ${28 * u}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("f", cx + 1 * u, cy + 2 * u);

    } else if (red === "tiktok") {
      // Nota musical simplificada
      ctx.font = `bold ${26 * u}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♪", cx, cy + 1 * u);

    } else if (red === "youtube") {
      // Triángulo de play
      ctx.beginPath();
      ctx.moveTo(cx - 6 * u, cy - 9 * u);
      ctx.lineTo(cx - 6 * u, cy + 9 * u);
      ctx.lineTo(cx + 10 * u, cy);
      ctx.closePath();
      ctx.fill();

    } else if (red === "whatsapp") {
      // Teléfono simplificado (auricular)
      ctx.font = `${22 * u}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✆", cx, cy + 1 * u);

    } else if (red === "web") {
      // Globo terráqueo simplificado
      ctx.lineWidth = 2 * u;
      // Círculo exterior
      ctx.beginPath();
      ctx.arc(cx, cy, 10 * u, 0, Math.PI * 2);
      ctx.stroke();
      // Línea horizontal
      ctx.beginPath();
      ctx.moveTo(cx - 10 * u, cy);
      ctx.lineTo(cx + 10 * u, cy);
      ctx.stroke();
      // Elipse vertical
      ctx.beginPath();
      ctx.ellipse(cx, cy, 5 * u, 10 * u, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    return canvas.toDataURL("image/png");
  }

  function colorHead(tipo) {
    return tipo === "cotizacion" ? PALETTE.sage : PALETTE.azul;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────────
  const fmt = (n) => Number(n || 0).toLocaleString("es-CO");
  const num = (n, def = 0) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : def;
  };
  const soloFecha = (f) => {
    if (!f) return "-";
    if (f instanceof Date) {
      const dd = String(f.getDate()).padStart(2, "0");
      const mm = String(f.getMonth() + 1).padStart(2, "0");
      const yy = f.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    const s = String(f).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`;
    const d = new Date(s);
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
    return "-";
  };

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
    const pageW = doc.internal.pageSize.getWidth();

    const emp = await obtenerDatosTenantPDF();
    const logo = emp.logoUrl ? await procesarImagen(emp.logoUrl, 250, 1.0) : null;
    const fondo = emp.fondoUrl ? await procesarImagen(emp.fondoUrl, 300, 0.9) : null;

    const insertarFondo = () => {
      if (!fondo) return;
      const centerX = (pageW - 150) / 2;
      const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
      doc.restoreGraphicsState();
    };
    insertarFondo();

    const headColor = colorHead(tipo);

    // ═══════════════════════════════════════════════════════════════════
    // ENCABEZADO (mismo estilo original)
    // ═══════════════════════════════════════════════════════════════════
    if (logo) doc.addImage(logo, "PNG", 10, 10, 30, 30);
    doc.setFontSize(16);
    doc.text(emp.nombre, 50, 20);
    doc.setFontSize(10);
    doc.text(emp.direccion, 50, 26);
    doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);

    // ✅ Franja de color delgada
    doc.setFillColor(...headColor);
    doc.rect(10, 41, pageW - 20, 0.8, "F");

    // ═══════════════════════════════════════════════════════════════════
    // TIPO + NÚMERO (mismo tamaño que datos del cliente, negro)
    // ═══════════════════════════════════════════════════════════════════
    const tipoTexto = tipo === "cotizacion" ? "Cotización" : "Orden de Pedido";
    const numeroDoc = documento.numero || "";

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(
      `${tipoTexto}${numeroDoc ? "  ·  " + numeroDoc : ""}`,
      10,
      48
    );
    doc.setFont(undefined, "normal");

    // ═══════════════════════════════════════════════════════════════════
    // DATOS DEL CLIENTE (izquierda) + FECHAS (derecha) — TAMAÑO ORIGINAL
    // ═══════════════════════════════════════════════════════════════════
    const fechaCreacion = soloFecha(documento.fecha_creacion);
    const esMultiDias = !!documento.multi_dias;
    const listaFechas = Array.isArray(documento.fechas_evento)
      ? [...documento.fechas_evento].filter(Boolean).sort()
      : [];

    let etiquetaFecha1 = "Fecha evento";
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
      const ultima = listaFechas.length > 1
        ? listaFechas[listaFechas.length - 1]
        : (listaFechas[0] || documento.fecha_evento || null);
      valorFecha1 = primera ? soloFecha(primera) : "-";
      valorFecha2 = ultima ? soloFecha(ultima) : "-";
    }

    // Cliente (izquierda) — fontSize 12 original
    doc.text(`Cliente: ${documento.nombre_cliente || "Cliente"}`, 10, 55);
    doc.text(`Identificación: ${documento.identificacion || "N/A"}`, 10, 61);
    doc.text(`Teléfono: ${documento.telefono || "N/A"}`, 10, 67);
    doc.text(`Dirección: ${documento.direccion || "N/A"}`, 10, 73);
    doc.text(`Correo: ${documento.email || "N/A"}`, 10, 79);

    // Fechas (derecha) — fontSize 12, alineadas al margen derecho de la tabla
    const xRight = pageW - 10;
    doc.text(`Fecha creación: ${fechaCreacion}`, xRight, 48, { align: "right" });
    doc.text(`${etiquetaFecha1}: ${valorFecha1}`, xRight, 55, { align: "right" });
    if (esMultiDias && valorFecha2) {
      doc.text(`${etiquetaFecha2}: ${valorFecha2}`, xRight, 62, { align: "right" });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TABLA DE PRODUCTOS
    // ═══════════════════════════════════════════════════════════════════
    const esMulti = Boolean(documento.multi_dias);
    const nd = num(documento.numero_dias, 1);
    const mostrarNotas = Boolean(documento.mostrar_notas);

    const head = (() => {
      if (esMulti && mostrarNotas) return [["Cantidad", "Artículo", "Notas", "Precio", "V. x Días", "Subtotal"]];
      if (esMulti && !mostrarNotas) return [["Cantidad", "Artículo", "Precio", "V. x Días", "Subtotal"]];
      if (!esMulti && mostrarNotas) return [["Cantidad", "Artículo", "Notas", "Precio", "Subtotal"]];
      return [["Cantidad", "Artículo", "Precio", "Subtotal"]];
    })();

    const body = (documento.productos || []).map((p) => {
      const cantidad = num(p.cantidad, 0);
      const precio = num(p.precio, 0);
      const usaDias = p.multiplicarPorDias !== false;
      const valorPorDias = usaDias ? (precio * nd) : precio;
      const subtotal = num(p.subtotal, precio * cantidad * (esMulti ? (usaDias ? nd : 1) : 1));
      const notas = (p.notas || "").trim();

      if (esMulti && mostrarNotas) return [cantidad || 0, p.nombre || "", notas, `$${fmt(precio)}`, `$${fmt(valorPorDias)}`, `$${fmt(subtotal)}`];
      if (esMulti && !mostrarNotas) return [cantidad || 0, p.nombre || "", `$${fmt(precio)}`, `$${fmt(valorPorDias)}`, `$${fmt(subtotal)}`];
      if (!esMulti && mostrarNotas) return [cantidad || 0, p.nombre || "", notas, `$${fmt(precio)}`, `$${fmt(subtotal)}`];
      return [cantidad || 0, p.nombre || "", `$${fmt(precio)}`, `$${fmt(subtotal)}`];
    });

    autoTable(doc, {
      head,
      body,
      startY: 85,
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: {
        fillColor: false,
        textColor: 255,
        halign: "center",
        valign: "middle",
      },
      willDrawCell: (data) => {
        // Dibujar fondo redondeado del encabezado completo una sola vez
        if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
          const tableLeft = 10;
          const tableRight = pageW - 10;
          doc.setFillColor(...headColor);
          doc.roundedRect(tableLeft, data.cell.y, tableRight - tableLeft, data.cell.height, 2, 2, 'F');
        }
      },
      columnStyles: (() => {
        if (esMulti && mostrarNotas) {
          return {
            0: { cellWidth: 20, halign: "center" },
            1: { cellWidth: 50 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25, halign: "center" },
            4: { cellWidth: 25, halign: "center" },
            5: { cellWidth: 30, halign: "center" },
          };
        } else if (esMulti && !mostrarNotas) {
          return {
            0: { cellWidth: 20, halign: "center" },
            1: { cellWidth: 70 },
            2: { cellWidth: 30, halign: "center" },
            3: { cellWidth: 30, halign: "center" },
            4: { cellWidth: 30, halign: "center" },
          };
        } else if (!esMulti && mostrarNotas) {
          return {
            0: { cellWidth: 20, halign: "center" },
            1: { cellWidth: 60 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30, halign: "center" },
            4: { cellWidth: 30, halign: "center" },
          };
        } else {
          return {
            0: { cellWidth: 20, halign: "center" },
            1: { cellWidth: 100 },
            2: { cellWidth: 30, halign: "center" },
            3: { cellWidth: 30, halign: "center" },
          };
        }
      })(),
      margin: { left: 10, right: 10 },
      didDrawPage: insertarFondo,
    });

    let y = (doc.lastAutoTable?.finalY || 100) + 10;

    // ═══════════════════════════════════════════════════════════════════
    // PRE-CÁLCULO DE ESPACIO
    // ═══════════════════════════════════════════════════════════════════
    const pageHeight0 = doc.internal.pageSize.getHeight();
    const footerHeight = 34;
    const bottomMargin = 12;
    const safeBottom0 = pageHeight0 - bottomMargin - footerHeight;

    const flagDesc = Boolean(documento.aplicar_descuento) || num(documento.descuento, 0) > 0;
    const flagRet  = Boolean(documento.aplicar_retencion) || num(documento.retencion, 0) > 0;

    let needed = 0;
    if (documento.garantia && documento.garantia !== "0") needed += 12;
    const abonosCount = Array.isArray(documento.abonos) ? documento.abonos.length : 0;
    if (abonosCount > 0) needed += 8 + abonosCount * 8;
    needed += 10;
    if (flagDesc || flagRet) {
      needed += 8;
      if (flagDesc) needed += 8;
      if (flagRet) needed += 8;
      needed += 10;
    } else {
      needed += 10;
    }
    needed += 10;

    if (y + needed > safeBottom0) {
      doc.addPage();
      insertarFondo();
      y = 40;
    }

    // ═══════════════════════════════════════════════════════════════════
    // GARANTÍA
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // ABONOS
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // LÍNEA SEPARADORA + TOTALES
    // ═══════════════════════════════════════════════════════════════════
    doc.setDrawColor(...headColor);
    doc.setLineWidth(0.5);
    doc.line(10, y, pageW - 10, y);
    y += 10;

    const totalBruto = (documento.productos || []).reduce(
      (acc, p) =>
        acc + num(p.subtotal, num(p.precio) * num(p.cantidad) * (esMulti ? (p.multiplicarPorDias === false ? 1 : nd) : 1)),
      0
    );
    const descuento = num(documento.descuento, 0);
    const retencion = num(documento.retencion, 0);
    const totalNeto = num(documento.total_neto, Math.max(0, totalBruto - descuento - retencion));
    const saldo = Math.max(0, totalNeto - totalAbonos);

    const xTot = 150;
    doc.setFontSize(12);

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

    doc.text(`SALDO FINAL: $${fmt(saldo)}`, xTot, y);
    y += 6;

    // ═══════════════════════════════════════════════════════════════════
    // FECHAS ENTREGA/DEVOLUCIÓN — encima del pie (como antes)
    // ═══════════════════════════════════════════════════════════════════
    const fEntrega = documento.fecha_entrega ? soloFecha(documento.fecha_entrega) : null;
    const fDevolucion = documento.fecha_devolucion ? soloFecha(documento.fecha_devolucion) : null;

    if (fEntrega || fDevolucion) {
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const partes = [];
      if (fEntrega) partes.push(`Entrega: ${fEntrega}`);
      if (fDevolucion) partes.push(`Devolución: ${fDevolucion}`);
      doc.text(partes.join("  ·  "), 10, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      y += 8;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PIE DE PÁGINA: Condiciones + Redes sociales con ÍCONOS REALES
    // ═══════════════════════════════════════════════════════════════════
    const pageHeight = doc.internal.pageSize.getHeight();
    const yFooter = pageHeight - bottomMargin - footerHeight;

    if (y > yFooter - 4) {
      doc.addPage();
      insertarFondo();
    }

    const pageHeight2 = doc.internal.pageSize.getHeight();
    const yFooter2 = pageHeight2 - bottomMargin - footerHeight;
    let yPie = yFooter2;

    // ── Línea decorativa fina
    doc.setDrawColor(...headColor);
    doc.setLineWidth(0.3);
    doc.line(30, yPie - 3, pageW - 30, yPie - 3);

    // 📄 Texto de condiciones centrado
    if (emp.textoCondicionesPdf) {
      doc.setFontSize(8.5);
      doc.setTextColor(130, 130, 130);
      const lineas = doc.splitTextToSize(emp.textoCondicionesPdf, 170);
      const lineasMostrar = lineas.slice(0, 3);
      lineasMostrar.forEach((linea, i) => {
        const lineW = doc.getStringUnitWidth(linea) * 8.5 / doc.internal.scaleFactor;
        doc.text(linea, (pageW - lineW) / 2, yPie + (i * 4));
      });
      yPie += lineasMostrar.length * 4 + 3;
    }

    // 📱 Redes sociales con ÍCONOS reales (Canvas → base64 → addImage)
    const redes = (emp.redesSociales || []).filter(r => r.usuario && REDES_PDF[r.red]);
    if (redes.length > 0) {
      const iconSize = 5; // mm en el PDF (antes 4)
      const gap = 6;      // espacio entre pills

      // Pre-generar íconos
      const redesConIcono = redes.map((red) => {
        const icono = generarIconoRed(red.red, 48);
        const texto = red.usuario;
        const textoW = doc.getStringUnitWidth(texto) * 9 / doc.internal.scaleFactor;
        const pillW = iconSize + 2 + textoW;
        return { red, icono, texto, textoW, pillW };
      });

      // Calcular ancho total para centrar
      const totalWidth = redesConIcono.reduce((acc, r) => acc + r.pillW, 0) + (redes.length - 1) * gap;
      let xPill = (pageW - totalWidth) / 2;
      const pillY = yPie;

      redesConIcono.forEach(({ icono, texto, pillW }) => {
        // Ícono como imagen
        if (icono) {
          try {
            doc.addImage(icono, "PNG", xPill, pillY - 4, iconSize, iconSize);
          } catch (e) {
            // Fallback silencioso si falla el ícono
          }
        }

        // Texto del usuario
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(texto, xPill + iconSize + 2, pillY);

        xPill += pillW + gap;
      });
    }

    // Fallback: email centrado
    if (redes.length === 0 && !emp.textoCondicionesPdf && emp.email) {
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      const emailW = doc.getStringUnitWidth(emp.email) * 8 / doc.internal.scaleFactor;
      doc.text(emp.email, (pageW - emailW) / 2, yPie);
    }

    doc.setTextColor(0, 0, 0);

    // ─── Guardar PDF ──────────────────────────────────────────────────
    const fechaSegura = documento.fecha_creacion || new Date();
    const nombreArchivo = generarNombreArchivo(tipo, fechaSegura, documento.nombre_cliente);
    doc.save(nombreArchivo);
  }