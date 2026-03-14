// src/pages/RutaEntregas.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { obtenerDatosTenantPDF } from "../utils/tenantPDF";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";

const hoyISO = () => new Date().toISOString().split("T")[0];

// 🖼️ Igual que en generarRemision.js
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
      // Usar fecha_entrega como día de entrega; fallback a fecha_evento
      const diaEntrega = o.fecha_entrega
        ? String(o.fecha_entrega).slice(0, 10)
        : o.fecha_evento
        ? String(o.fecha_evento).slice(0, 10)
        : null;
      return diaEntrega === fecha;
    });
    setRuta(filtradas);
  }, [fecha, todasOrdenes]);

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

  // ──────────────── Exportar PDF de ruta ────────────────
  const exportarPDFRuta = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const CYAN = [0, 180, 216];
    const GRIS = [100, 100, 100];
    const NEGRO = [30, 30, 30];

    // 1️⃣ Cargar datos de empresa (mismo patrón que generarRemision.js)
    const emp = await obtenerDatosTenantPDF();
    const logo = await procesarImagen(emp.logoUrl, 250, 1.0);
    const fondo = await procesarImagen(emp.fondoUrl, 300, 0.9);

    // 2️⃣ Marca de agua centrada (igual que generarRemision.js)
    const centerX = (doc.internal.pageSize.getWidth() - 150) / 2;
    const centerY = (doc.internal.pageSize.getHeight() - 150) / 2;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(fondo, "PNG", centerX, centerY, 150, 150);
    doc.restoreGraphicsState();

    // 3️⃣ Encabezado igual que generarRemision.js
    doc.addImage(logo, "PNG", 10, 10, 30, 30);
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(emp.nombre, 50, 20);
    doc.setFontSize(10);
    doc.text(emp.direccion || "", 50, 26);
    doc.text(emp.telefono ? `Cel-Whatsapp ${emp.telefono}` : "", 50, 31);
    doc.setLineWidth(0.5);
    doc.line(10, 42, 200, 42);

    // 4️⃣ Subtítulo de la ruta
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CYAN);
    doc.text("📦 Ruta de Entregas", 10, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de entrega: ${soloFecha(fecha)}`, 10, 56);
    const totalStr = `${ruta.length} pedido${ruta.length !== 1 ? "s" : ""}  ·  Generado: ${soloFecha(hoyISO())}`;
    doc.text(totalStr, 200, 56, { align: "right" });

    // Tabla
    autoTable(doc, {
      startY: 62,
      head: [["#", "Pedido", "Cliente", "Dirección", "Teléfono", "Fecha evento", "Notas"]],
      body: ruta.map((o, i) => [
        i + 1,
        o.numero || "—",
        o.clientes?.nombre || "—",
        o.clientes?.direccion || "—",
        o.clientes?.telefono || "—",
        soloFecha(o.fecha_evento),
        "",
      ]),
      headStyles: {
        fillColor: CYAN,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: NEGRO,
      },
      alternateRowStyles: {
        fillColor: [240, 249, 255],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 22 },
        2: { cellWidth: 38 },
        3: { cellWidth: 50 },
        4: { cellWidth: 26 },
        5: { cellWidth: 24 },
        6: { cellWidth: 28 },
      },
      styles: {
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
        cellPadding: 3,
        overflow: "linebreak",
      },
      margin: { left: 14, right: 14 },
    });

    // Pie
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(
        `Página ${i} de ${pageCount} · ${emp.nombre}`,
        14,
        doc.internal.pageSize.height - 8
      );
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
                      className="cd-btn cd-btn-azul"
                      style={{ marginTop: "auto" }}
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

            return (
              <div
                key={orden.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s",
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
                        <div style={{ fontSize: 13, color: "#111827" }}>📍 {cliente.direccion}</div>
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
