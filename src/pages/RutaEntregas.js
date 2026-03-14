// src/pages/RutaEntregas.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { obtenerDatosTenantPDF } from "../utils/tenantPDF";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";

const hoyISO = () => new Date().toISOString().split("T")[0];

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

const soloFecha = (valor) => {
  if (!valor) return "";
  const s = String(valor).trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export default function RutaEntregas() {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(hoyISO());
  const [todasOrdenes, setTodasOrdenes] = useState([]);
  const [ruta, setRuta] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [notasRuta, setNotasRuta] = useState({});
  const [seleccionados, setSeleccionados] = useState(new Set());
  const checkboxMaestroRef = useRef(null);

  // Cargar órdenes no cerradas una sola vez
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .eq("cerrada", false)
        .order("fecha_entrega", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error cargando órdenes:", error);
      } else {
        setTodasOrdenes(data || []);
      }
      setCargando(false);
    };
    cargar();
  }, []);

  // Filtrar en memoria cuando cambia la fecha o las órdenes
  useEffect(() => {
    if (!fecha) {
      setRuta([]);
      return;
    }
    const filtradas = todasOrdenes.filter((o) => {
      const diaEntrega = o.fecha_entrega
        ? String(o.fecha_entrega).slice(0, 10)
        : o.fecha_evento
        ? String(o.fecha_evento).slice(0, 10)
        : null;
      return diaEntrega === fecha;
    });
    setRuta(filtradas);
  }, [fecha, todasOrdenes]);

  // Seleccionar todos al cargar/cambiar ruta
  useEffect(() => {
    setSeleccionados(new Set(ruta.map((o) => o.id)));
  }, [ruta]);

  // Estado indeterminate del checkbox maestro
  useEffect(() => {
    if (checkboxMaestroRef.current) {
      checkboxMaestroRef.current.indeterminate =
        seleccionados.size > 0 && seleccionados.size < ruta.length;
    }
  }, [seleccionados, ruta]);

  // ──────────────── Selección ────────────────
  const toggleSeleccion = (id) =>
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTodos = () =>
    seleccionados.size === ruta.length
      ? setSeleccionados(new Set())
      : setSeleccionados(new Set(ruta.map((o) => o.id)));

  // ──────────────── Orden drag (botones ▲ ▼) ────────────────
  const mover = (index, direccion) => {
    const nuevo = [...ruta];
    const destino = index + direccion;
    if (destino < 0 || destino >= nuevo.length) return;
    [nuevo[index], nuevo[destino]] = [nuevo[destino], nuevo[index]];
    setRuta(nuevo);
  };

  // ──────────────── Acciones de cada tarjeta ────────────────
  const editarOrden = (orden) => {
    const cliente = orden.clientes || {};
    navigate("/crear-documento", {
      state: {
        documento: {
          ...orden,
          nombre_cliente: cliente.nombre || "",
          identificacion: cliente.identificacion || "",
          telefono: cliente.telefono || "",
          direccion: cliente.direccion || "",
          email: cliente.email || "",
          fecha_creacion: orden.fecha_creacion || orden.fecha || null,
          abonos: orden.abonos || [],
          garantia: orden.garantia || "",
          garantiaRecibida: orden.garantiaRecibida || false,
          estado: orden.estado || "",
          numero: orden.numero || "",
          esEdicion: true,
          idOriginal: orden.id,
        },
        tipo: "orden",
      },
    });
  };

  const manejarPDF = async (orden) => {
    await generarPDF(
      {
        ...orden,
        nombre_cliente: orden.clientes?.nombre || "N/A",
        identificacion: orden.clientes?.identificacion || "N/A",
        telefono: orden.clientes?.telefono || "N/A",
        direccion: orden.clientes?.direccion || "N/A",
        email: orden.clientes?.email || "N/A",
        fecha_creacion: orden.fecha_creacion || orden.fecha || null,
        fecha_evento: orden.fecha_evento || null,
      },
      "orden"
    );
  };

  const manejarRemision = async (orden) => {
    await generarRemision({
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "N/A",
      identificacion: orden.clientes?.identificacion || "N/A",
      telefono: orden.clientes?.telefono || "N/A",
      direccion: orden.clientes?.direccion || "N/A",
      email: orden.clientes?.email || "N/A",
      fecha_creacion: orden.fecha_creacion || orden.fecha || null,
      fecha_evento: orden.fecha_evento || null,
    });
  };

  // ──────────────── Exportar PDF de ruta (tarjetas) ────────────────
  const exportarPDFRuta = async () => {
    const pedidos = ruta.filter((o) => seleccionados.has(o.id));
    if (pedidos.length === 0) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const MARGIN = 14;
    const CARD_W = PAGE_W - MARGIN * 2;
    const CARD_GAP = 4;
    const FOOTER_RESERVE = 22;

    // ── Paleta SwAlquiler ──
    const AZUL       = [0, 119, 182];   // #0077B6
    const AZUL_OSC   = [2, 62, 138];    // #023E8A
    const NEGRO      = [30, 30, 30];
    const GRIS       = [100, 100, 100];
    const GRIS_OSC   = [60, 60, 60];
    const SEP        = [229, 231, 235]; // #E5E7EB
    const ROJO_PIN   = [220, 38, 38];   // pin de mapa
    const VERDE_TEL  = [34, 197, 94];   // icono teléfono

    const emp = await obtenerDatosTenantPDF();
    const logo = await procesarImagen(emp.logoUrl, 250, 1.0);
    const fondo = await procesarImagen(emp.fondoUrl, 300, 0.9);

    const insertarPagina = () => {
      // Marca de agua
      const cx = (PAGE_W - 150) / 2;
      const cy = (PAGE_H - 150) / 2;
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(fondo, "PNG", cx, cy, 150, 150);
      doc.restoreGraphicsState();

      // Logo
      doc.addImage(logo, "PNG", 10, 10, 30, 30);

      // Nombre empresa
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...AZUL_OSC);
      doc.text(emp.nombre, 50, 20);

      // Datos empresa
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GRIS);
      doc.text(emp.direccion || "", 50, 26);
      doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);

      // Línea separadora
      doc.setDrawColor(...AZUL);
      doc.setLineWidth(0.5);
      doc.line(10, 42, 200, 42);

      // Subtítulo
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...AZUL);
      doc.text("Ruta de Entregas", 10, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GRIS);
      doc.text(`Fecha de entrega: ${soloFecha(fecha)}`, 10, 56);
      const totalStr = `${pedidos.length} pedido${pedidos.length !== 1 ? "s" : ""}  ·  Generado: ${soloFecha(hoyISO())}`;
      doc.text(totalStr, PAGE_W - MARGIN, 56, { align: "right" });
    };

    insertarPagina();
    let y = 62;

    pedidos.forEach((orden, i) => {
      const cliente = orden.clientes || {};
      const notas = notasRuta[orden.id] || "";
      const CARD_H = notas ? 49 : 40;

      // Saltar a nueva página si no cabe
      if (y + CARD_H > PAGE_H - FOOTER_RESERVE) {
        doc.addPage();
        insertarPagina();
        y = 62;
      }

      // ── Fondo alternado ──
      if (i % 2 === 0) {
        doc.setFillColor(240, 249, 255); // #F0F9FF
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(...SEP);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, y, CARD_W, CARD_H, 3, 3, "FD");

      // Franja izquierda azul
      doc.setFillColor(...AZUL);
      doc.rect(MARGIN, y, 2, CARD_H, "F");

      // ── Fila 1: círculo numerado + OP + nombre ──
      const cirX = MARGIN + 11;
      const cirY = y + 10;
      doc.setFillColor(...AZUL);
      doc.circle(cirX, cirY, 5, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), cirX, cirY + 1, { align: "center" });

      // Número OP
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...AZUL);
      const opText = orden.numero || "OP-???";
      doc.text(opText, MARGIN + 19, y + 11);
      const opW = doc.getTextWidth(opText);

      // Nombre cliente
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NEGRO);
      const maxNombreW = CARD_W - 19 - opW - 6;
      const nombreLine = doc.splitTextToSize(cliente.nombre || "Sin cliente", maxNombreW)[0];
      doc.text(nombreLine, MARGIN + 19 + opW + 4, y + 11);

      // Línea separadora interna
      doc.setDrawColor(...SEP);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 4, y + 15, MARGIN + CARD_W - 4, y + 15);

      // ── Fila 2: pin rojo + dirección con link a Google Maps ──
      const pinX = MARGIN + 8;
      const pinY = y + 22;
      doc.setFillColor(...ROJO_PIN);
      doc.circle(pinX, pinY, 1.5, "F");

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRIS_OSC);
      const dir = cliente.direccion || "";
      const dirLine = doc.splitTextToSize(dir || "Sin direccion", CARD_W - 18)[0];
      doc.text(dirLine, MARGIN + 12, y + 23);
      if (dir) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`;
        const dirW = doc.getTextWidth(dirLine);
        doc.link(MARGIN + 12, y + 19, dirW, 5, { url: mapsUrl });
      }

      // ── Fila 3: círculo verde + teléfono | entrega | devolución ──
      const telIconX = MARGIN + 8;
      const telIconY = y + 31;
      doc.setFillColor(...VERDE_TEL);
      doc.circle(telIconX, telIconY, 1.5, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRIS_OSC);
      const partes = [];
      if (cliente.telefono) partes.push(`Tel: ${cliente.telefono}`);
      if (orden.fecha_entrega) partes.push(`Entrega: ${soloFecha(orden.fecha_entrega)}`);
      if (orden.fecha_devolucion) partes.push(`Dev.: ${soloFecha(orden.fecha_devolucion)}`);
      const row3 = partes.join("   |   ");
      doc.text(row3, MARGIN + 12, y + 32);
      if (cliente.telefono) {
        const telW = doc.getTextWidth(`Tel: ${cliente.telefono}`);
        doc.link(MARGIN + 12, y + 28, telW, 5, { url: `tel:${cliente.telefono}` });
      }

      // ── Fila 4: notas (opcional) ──
      if (notas) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(130, 130, 130);
        const notasLine = doc.splitTextToSize(`Notas: ${notas}`, CARD_W - 16)[0];
        doc.text(notasLine, MARGIN + 6, y + 42);
        doc.setFont("helvetica", "normal");
      }

      y += CARD_H + CARD_GAP;
    });

    // ── Pie en todas las páginas ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const footerY = PAGE_H - 14;
      doc.setDrawColor(...GRIS);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.setFont("helvetica", "normal");
      doc.text(`Pagina ${p} de ${pageCount}  ·  ${emp.nombre}`, MARGIN, footerY);

      const redes = [];
      if (emp.instagram) redes.push(`Instagram: ${emp.instagram}`);
      if (emp.facebook) redes.push(`Facebook: ${emp.facebook}`);
      if (emp.email) redes.push(`Email: ${emp.email}`);
      if (redes.length) {
        doc.text(redes.join("   "), PAGE_W - MARGIN, footerY, { align: "right" });
      }
    }

    doc.save(`Ruta-Entregas-${fecha}.pdf`);
  };

  // ──────────────── Render ────────────────
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>

          {/* HEADER */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">📦 Ruta de Entregas</h1>
          </div>

          {/* CONTROLES */}
          <div className="cd-card" style={{ marginBottom: 16 }}>
            <div className="cd-card-body">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                    📅 Fecha de entrega
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setFecha(hoyISO())}
                    className="cd-btn cd-btn-gris"
                    style={{ marginTop: "auto" }}
                  >
                    Hoy
                  </button>

                  {ruta.length > 0 && (
                    <button
                      onClick={exportarPDFRuta}
                      disabled={seleccionados.size === 0}
                      className="cd-btn cd-btn-azul"
                      style={{ marginTop: "auto", opacity: seleccionados.size === 0 ? 0.5 : 1 }}
                    >
                      🖨️ Exportar PDF de ruta
                    </button>
                  )}
                </div>

                {/* Resumen */}
                <div style={{
                  marginLeft: "auto",
                  padding: "10px 16px",
                  background: ruta.length > 0 ? "#f0f9ff" : "#f9fafb",
                  borderRadius: 8,
                  border: `1px solid ${ruta.length > 0 ? "#bae6fd" : "#e5e7eb"}`,
                  fontSize: 14,
                  fontWeight: 600,
                  color: ruta.length > 0 ? "#0369a1" : "#9ca3af",
                }}>
                  {cargando ? "⏳ Cargando..." : `${ruta.length} pedido${ruta.length !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
          </div>

          {/* CHECKBOX MAESTRO + CONTADOR */}
          {ruta.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              marginBottom: 10,
            }}>
              <input
                ref={checkboxMaestroRef}
                type="checkbox"
                checked={seleccionados.size === ruta.length && ruta.length > 0}
                onChange={toggleTodos}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#00B4D8" }}
              />
              <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                {seleccionados.size === ruta.length
                  ? "Seleccionar ninguno"
                  : "Seleccionar todos"}
              </span>
              <span style={{
                marginLeft: "auto",
                fontSize: 13,
                color: seleccionados.size > 0 ? "#0369a1" : "#9ca3af",
                fontWeight: 600,
              }}>
                {seleccionados.size} de {ruta.length} seleccionados
              </span>
            </div>
          )}

          {/* LISTA DE PEDIDOS */}
          {!cargando && ruta.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#9ca3af",
              background: "white",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                No hay pedidos con entrega el {soloFecha(fecha)}
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                Cambia la fecha o revisa que las órdenes tengan <strong>fecha_entrega</strong> configurada
              </div>
            </div>
          )}

          {ruta.map((orden, index) => {
            const cliente = orden.clientes || {};
            const esUltimo = index === ruta.length - 1;
            const estaSeleccionado = seleccionados.has(orden.id);

            return (
              <div
                key={orden.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: `1px solid ${estaSeleccionado ? "#bae6fd" : "#e5e7eb"}`,
                  marginBottom: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s, opacity 0.15s",
                  opacity: estaSeleccionado ? 1 : 0.5,
                }}
              >
                {/* Header de la tarjeta */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
                  borderBottom: "1px solid #bae6fd",
                  gap: 12,
                }}>
                  {/* Checkbox de selección */}
                  <input
                    type="checkbox"
                    checked={estaSeleccionado}
                    onChange={() => toggleSeleccion(orden.id)}
                    style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0, accentColor: "#00B4D8" }}
                  />

                  {/* Número de posición */}
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #00B4D8, #0077B6)",
                    color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#0077B6" }}>
                        {orden.numero || "OP-???"}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                        {cliente.nombre || "Sin cliente"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      📅 Evento: {soloFecha(orden.fecha_evento)}
                      {orden.fecha_entrega && (
                        <span style={{ marginLeft: 10 }}>
                          📦 Entrega: {soloFecha(orden.fecha_entrega)}
                        </span>
                      )}
                      {orden.fecha_devolucion && (
                        <span style={{ marginLeft: 10 }}>
                          📥 Devolución: {soloFecha(orden.fecha_devolucion)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de orden ▲ ▼ */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => mover(index, -1)}
                      disabled={index === 0}
                      title="Subir"
                      style={{
                        width: 26, height: 22,
                        border: "1px solid #d1d5db",
                        borderRadius: 4,
                        background: index === 0 ? "#f9fafb" : "white",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                        fontSize: 11, color: index === 0 ? "#d1d5db" : "#374151",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => mover(index, 1)}
                      disabled={esUltimo}
                      title="Bajar"
                      style={{
                        width: 26, height: 22,
                        border: "1px solid #d1d5db",
                        borderRadius: 4,
                        background: esUltimo ? "#f9fafb" : "white",
                        cursor: esUltimo ? "not-allowed" : "pointer",
                        fontSize: 11, color: esUltimo ? "#d1d5db" : "#374151",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Cuerpo de la tarjeta */}
                <div style={{
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  {/* Datos del cliente */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "6px 20px", flex: 1 }}>
                    {cliente.direccion && (
                      <div>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 2 }}>Dirección</div>
                        <div style={{ fontSize: 13, color: "#111827" }}>
                          📍{" "}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.direccion)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0077B6", textDecoration: "none" }}
                          >
                            {cliente.direccion}
                          </a>
                        </div>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 2 }}>Teléfono</div>
                        <div style={{ fontSize: 13, color: "#111827" }}>
                          <a
                            href={`tel:${cliente.telefono}`}
                            style={{ color: "#0077B6", textDecoration: "none" }}
                          >
                            📞 {cliente.telefono}
                          </a>
                        </div>
                      </div>
                    )}
                    {cliente.email && (
                      <div>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 2 }}>Email</div>
                        <div style={{ fontSize: 13, color: "#111827" }}>✉️ {cliente.email}</div>
                      </div>
                    )}
                    {orden.estado && (
                      <div>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 2 }}>Estado</div>
                        <div style={{ fontSize: 13 }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: "#f0fdf4",
                            color: "#166534",
                            fontSize: 12,
                            fontWeight: 500,
                          }}>
                            {orden.estado}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notas por pedido */}
                  <input
                    type="text"
                    placeholder="Notas..."
                    value={notasRuta[orden.id] || ""}
                    onChange={(e) =>
                      setNotasRuta((prev) => ({ ...prev, [orden.id]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "6px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: 13,
                      color: "#374151",
                      background: "#fafafa",
                      boxSizing: "border-box",
                    }}
                  />

                  {/* Botones de acción */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => editarOrden(orden)}
                      title="Editar pedido"
                      style={{
                        padding: "7px 12px",
                        background: "rgba(0,180,216,0.08)",
                        border: "1px solid rgba(0,180,216,0.25)",
                        borderRadius: 7,
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#0077B6",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => manejarPDF(orden)}
                      title="Descargar PDF"
                      style={{
                        padding: "7px 12px",
                        background: "rgba(100,116,139,0.08)",
                        border: "1px solid rgba(100,116,139,0.2)",
                        borderRadius: 7,
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#374151",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => manejarRemision(orden)}
                      title="Generar remisión"
                      style={{
                        padding: "7px 12px",
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        borderRadius: 7,
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#065f46",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      🚚 Remisión
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </Protegido>
  );
}
