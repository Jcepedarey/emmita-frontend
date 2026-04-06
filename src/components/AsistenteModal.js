// src/components/AsistenteModal.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AsistenteModal.css";
import { consultarIA, NOMBRE_ASISTENTE } from "../utils/asistenteIA";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import supabase from "../supabaseClient";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

// ─── Contador de consultas diarias (localStorage por ahora) ───
const LIMITE_CONSULTAS_DIARIAS = 30;

function getConsultasHoy() {
  try {
    const data = JSON.parse(localStorage.getItem("sw_ia_consultas") || "{}");
    const hoy = new Date().toISOString().slice(0, 10);
    if (data.fecha !== hoy) return { fecha: hoy, total: 0 };
    return data;
  } catch { return { fecha: new Date().toISOString().slice(0, 10), total: 0 }; }
}

function incrementarConsulta() {
  const data = getConsultasHoy();
  data.total += 1;
  localStorage.setItem("sw_ia_consultas", JSON.stringify(data));
  return data.total;
}

// ─── Voz de respuesta ───
function limpiarParaVoz(texto) {
  return texto
    .replace(/\*\*/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/<function=[^>]*>[^<]*<\/function>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/[🔹🔸📦📋✅❌🔍💰👥📊📅🔧🤖👋🎉⚠️📞📧🆔📍🏢💎⭐🆓🛡️🔊🔇🚀🗑️🔎🎙️⏹🆕⏰✏️📄📤]/g, "")
    .replace(/[\-•|]/g, ", ")
    .replace(/\d+\.\s/g, "")
    .replace(/[A-Z]{2,3}-\d{8}-\d+/g, "")
    .replace(/COT-\d+-\d+/g, "")
    .replace(/\$[\d.,]+/g, (match) => {
      const num = match.replace(/[$.]/g, "").replace(/,/g, "");
      return `${Number(num).toLocaleString("es-CO")} pesos`;
    })
    .replace(/USD|dolares|dólares/gi, "pesos")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
}

function leerEnVozAlta(texto) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(limpiarParaVoz(texto));
  utterance.lang = "es-CO";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  const voces = window.speechSynthesis.getVoices();
  const vozES = voces.find((v) => v.lang.startsWith("es")) || null;
  if (vozES) utterance.voice = vozES;
  window.speechSynthesis.speak(utterance);
}

function detenerVozRespuesta() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ─── Helper: formatear fecha para display ───
const soloFecha = (f) => (f ? String(f).slice(0, 10) : "");

// ═══════════════════════════════════════════════════════════
// Componente de botones de acción para un pedido/cotización
// ═══════════════════════════════════════════════════════════
function BotonesAccion({ acciones, onEditar, onPDF, onRemision, cargando }) {
  if (!acciones || acciones.length === 0) return null;

  // Mostrar máximo 3 documentos con botones
  const mostrar = acciones.slice(0, 3);

  return (
    <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
      {mostrar.map((acc, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, color: "#6b7280", minWidth: 80 }}>
            {acc.tipo === "pedido" ? "📦" : "📋"} {acc.numero}
          </span>
          <button
            onClick={() => onEditar(acc.id, acc.tipo)}
            disabled={cargando}
            style={btnStyle("#2563eb", "#dbeafe")}
            title="Editar documento"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => onPDF(acc.id, acc.tipo)}
            disabled={cargando}
            style={btnStyle("#059669", "#d1fae5")}
            title="Generar PDF"
          >
            📄 PDF
          </button>
          {acc.tipo === "pedido" && (
            <button
              onClick={() => onRemision(acc.id)}
              disabled={cargando}
              style={btnStyle("#7c3aed", "#ede9fe")}
              title="Generar remisión"
            >
              📤 Remisión
            </button>
          )}
        </div>
      ))}
      {acciones.length > 3 && (
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
          +{acciones.length - 3} documentos más...
        </div>
      )}
    </div>
  );
}

const btnStyle = (color, bg) => ({
  fontSize: 11, padding: "3px 8px", borderRadius: 6,
  border: `1px solid ${color}30`, background: bg,
  color, cursor: "pointer", fontWeight: 500,
  transition: "all 0.15s",
});

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
function AsistenteModal({ visible, onClose }) {
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]); // [{tipo: "user"|"ia", texto, acciones?}]
  const [enviando, setEnviando] = useState(false);
  const [consultasHoy, setConsultasHoy] = useState(getConsultasHoy().total);
  const [vozActiva, setVozActiva] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const historialRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setMensaje(transcript);
  }, [transcript]);

  useEffect(() => {
    if (historialRef.current) {
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
    }
  }, [historial]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHablando(window.speechSynthesis?.speaking || false);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!visible) detenerVozRespuesta();
  }, [visible]);

  // ─── Cargar documento completo desde Supabase ───
  const cargarDocumentoCompleto = useCallback(async (id, tipo) => {
    const tabla = tipo === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { data, error } = await supabase
      .from(tabla)
      .select("*, clientes(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error cargando documento:", error);
      return null;
    }
    return data;
  }, []);

  // ─── Acción: Editar ───
  const handleEditar = useCallback(async (id, tipo) => {
    setCargandoAccion(true);
    try {
      const doc = await cargarDocumentoCompleto(id, tipo);
      if (!doc) {
        alert("No se pudo cargar el documento.");
        return;
      }

      const cliente = doc.clientes || {};
      const documentoCompleto = {
        ...doc,
        nombre_cliente: cliente.nombre || "",
        identificacion: cliente.identificacion || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
        email: cliente.email || "",
        fecha_creacion: doc.fecha_creacion || doc.fecha || null,
        abonos: doc.abonos || [],
        garantia: doc.garantia || "",
        fechaGarantia: doc.fechaGarantia || "",
        garantiaRecibida: doc.garantiaRecibida || false,
        estado: doc.estado || "",
        numero: doc.numero || "",
        esEdicion: true,
        idOriginal: doc.id,
      };

      detenerVozRespuesta();
      onClose();
      navigate("/crear-documento", {
        state: {
          documento: documentoCompleto,
          tipo: tipo === "cotizacion" ? "cotizacion" : "orden",
        },
      });
    } catch (err) {
      console.error("Error al editar:", err);
      alert("Error al cargar el documento.");
    } finally {
      setCargandoAccion(false);
    }
  }, [cargarDocumentoCompleto, navigate, onClose]);

  // ─── Acción: PDF ───
  const handlePDF = useCallback(async (id, tipo) => {
    setCargandoAccion(true);
    try {
      const doc = await cargarDocumentoCompleto(id, tipo);
      if (!doc) {
        alert("No se pudo cargar el documento.");
        return;
      }

      const docPDF = {
        ...doc,
        nombre_cliente: doc.clientes?.nombre || "N/A",
        identificacion: doc.clientes?.identificacion || "N/A",
        telefono: doc.clientes?.telefono || "N/A",
        direccion: doc.clientes?.direccion || "N/A",
        email: doc.clientes?.email || "N/A",
        fecha_creacion: soloFecha(doc.fecha_creacion || doc.fecha),
        fecha_evento: soloFecha(doc.fecha_evento),
      };

      await generarPDF(docPDF, tipo === "cotizacion" ? "cotizacion" : "orden");
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Error al generar el PDF.");
    } finally {
      setCargandoAccion(false);
    }
  }, [cargarDocumentoCompleto]);

  // ─── Acción: Remisión ───
  const handleRemision = useCallback(async (id) => {
    setCargandoAccion(true);
    try {
      const doc = await cargarDocumentoCompleto(id, "pedido");
      if (!doc) {
        alert("No se pudo cargar el documento.");
        return;
      }

      const docRemision = {
        ...doc,
        nombre_cliente: doc.clientes?.nombre || "N/A",
        identificacion: doc.clientes?.identificacion || "N/A",
        telefono: doc.clientes?.telefono || "N/A",
        direccion: doc.clientes?.direccion || "N/A",
        email: doc.clientes?.email || "N/A",
        fecha_creacion: soloFecha(doc.fecha_creacion || doc.fecha),
        fecha_evento: soloFecha(doc.fecha_evento),
      };

      await generarRemision(docRemision);
    } catch (err) {
      console.error("Error generando remisión:", err);
      alert("Error al generar la remisión.");
    } finally {
      setCargandoAccion(false);
    }
  }, [cargarDocumentoCompleto]);

  // ─── Enviar consulta ───
  const enviarConsulta = async () => {
    const texto = mensaje.trim();
    if (!texto) return;

    if (consultasHoy >= LIMITE_CONSULTAS_DIARIAS) {
      setHistorial((prev) => [...prev, {
        tipo: "ia",
        texto: `⚠️ Has alcanzado el límite de ${LIMITE_CONSULTAS_DIARIAS} consultas para hoy. El contador se reinicia a medianoche.`,
        acciones: [],
      }]);
      return;
    }

    setHistorial((prev) => [...prev, { tipo: "user", texto }]);
    setMensaje("");
    resetTranscript();
    setEnviando(true);

    try {
      const resultado = await consultarIA(texto);
      const nuevoTotal = incrementarConsulta();
      setConsultasHoy(nuevoTotal);

      // resultado ahora es { texto, acciones }
      const textoIA = resultado.texto || resultado;
      const acciones = resultado.acciones || [];

      setHistorial((prev) => [...prev, { tipo: "ia", texto: textoIA, acciones }]);

      if (vozActiva) leerEnVozAlta(textoIA);
    } catch (err) {
      setHistorial((prev) => [...prev, { tipo: "ia", texto: "⚠️ Error al procesar la consulta.", acciones: [] }]);
    }

    setEnviando(false);
  };

  const comenzarVoz = () => {
    resetTranscript();
    SpeechRecognition.startListening({ language: "es-CO", continuous: false });
  };

  const detenerVoz = () => {
    SpeechRecognition.stopListening();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarConsulta();
    }
  };

  const limpiarHistorial = () => {
    setHistorial([]);
    detenerVozRespuesta();
  };

  if (!visible) return null;

  const porcentajeUso = Math.min(100, Math.round((consultasHoy / LIMITE_CONSULTAS_DIARIAS) * 100));

  return (
    <div className="modal-fondo">
      <div className="modal-contenido" style={{ maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🤖 Asistente Inteligente</h2>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Groq + Llama 3.3 • Tool Calling</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => { setVozActiva(!vozActiva); if (vozActiva) detenerVozRespuesta(); }}
              title={vozActiva ? "Desactivar respuesta por voz" : "Activar respuesta por voz"}
              style={{
                padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb",
                background: vozActiva ? "#dbeafe" : "white", cursor: "pointer",
                fontSize: 14,
              }}
            >
              {vozActiva ? "🔊" : "🔇"}
            </button>
            <button className="cerrar-modal" onClick={() => { detenerVozRespuesta(); onClose(); }} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>✕</button>
          </div>
        </div>

        {/* Barra de uso */}
        <div style={{ padding: "8px 16px", background: "#f8fafc", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              Consultas hoy: <strong>{consultasHoy}</strong> / {LIMITE_CONSULTAS_DIARIAS}
            </span>
            <span style={{ fontSize: 11, color: porcentajeUso >= 80 ? "#dc2626" : "#6b7280" }}>
              {LIMITE_CONSULTAS_DIARIAS - consultasHoy} restantes
            </span>
          </div>
          <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4, transition: "width 0.3s",
              width: `${porcentajeUso}%`,
              background: porcentajeUso >= 80 ? "#ef4444" : porcentajeUso >= 50 ? "#f59e0b" : "#22c55e",
            }} />
          </div>
        </div>

        {/* Historial de conversación */}
        <div ref={historialRef} style={{
          flex: 1, overflowY: "auto", padding: "12px 16px",
          minHeight: 150, maxHeight: "50vh",
        }}>
          {historial.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "#9ca3af" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                ¡Hola! Soy <span style={{ color: "#2563eb", fontWeight: 700 }}>{NOMBRE_ASISTENTE}</span>, tu asistente inteligente.
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>¿En qué puedo ayudarte hoy?</div>
              <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6, color: "#b0b0b0" }}>
                Consulta disponibilidad, busca clientes, revisa pedidos, finanzas y más.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 12 }}>
                {["¿Qué pedidos tengo esta semana?", "Busca cliente María", "¿Hay 50 sillas para el 20/04?"].map((s, i) => (
                  <button key={i} onClick={() => setMensaje(s)} style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 16,
                    border: "1px solid #dbeafe", background: "#eff6ff", color: "#2563eb",
                    cursor: "pointer",
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            historial.map((msg, i) => (
              <div key={i} style={{
                marginBottom: 12,
                display: "flex",
                justifyContent: msg.tipo === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: msg.tipo === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.tipo === "user" ? "linear-gradient(135deg, #0077B6, #00B4D8)" : "#f8fafc",
                  color: msg.tipo === "user" ? "white" : "#111827",
                  border: msg.tipo === "user" ? "none" : "1px solid #e5e7eb",
                  fontSize: 13, lineHeight: 1.7,
                }}>
                  {msg.tipo === "ia" ? (
                    <div>
                      {/* Renderizar texto limpio */}
                      {(msg.texto || "")
                        .replace(/<function=[^>]*>[^<]*<\/function>/g, "")
                        .replace(/<function=[^>]*>/g, "")
                        .replace(/<\/function>/g, "")
                        .split("\n").map((linea, j) => {
                        if (!linea.trim()) return <br key={j} />;
                        const esLista = /^[\-•🔹🔸📦📋✅❌🔍💰👥📊📅🔧\d]+[\.\)]/.test(linea.trim());
                        return (
                          <div key={j} style={{
                            padding: esLista ? "4px 0 4px 8px" : "2px 0",
                            borderLeft: esLista ? "3px solid #0077B6" : "none",
                            marginBottom: esLista ? 4 : 0,
                            background: esLista ? "#f0f9ff" : "transparent",
                            borderRadius: esLista ? 4 : 0,
                            paddingLeft: esLista ? 10 : 0,
                          }}>
                            {linea}
                          </div>
                        );
                      })}

                      {/* Botones de acción */}
                      <BotonesAccion
                        acciones={msg.acciones}
                        onEditar={handleEditar}
                        onPDF={handlePDF}
                        onRemision={handleRemision}
                        cargando={cargandoAccion}
                      />
                    </div>
                  ) : (
                    msg.texto
                  )}
                </div>
              </div>
            ))
          )}
          {enviando && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{
                padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
                background: "#f8fafc", border: "1px solid #e5e7eb",
                fontSize: 13, color: "#6b7280",
              }}>
                <span className="dots-typing">Pensando</span>
              </div>
            </div>
          )}
          {cargandoAccion && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{
                padding: "8px 14px", borderRadius: "14px 14px 14px 4px",
                background: "#eff6ff", border: "1px solid #bfdbfe",
                fontSize: 12, color: "#2563eb",
              }}>
                ⏳ Cargando documento...
              </div>
            </div>
          )}
        </div>

        {/* Input + acciones */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
          {listening && (
            <div style={{
              padding: "6px 12px", marginBottom: 8, borderRadius: 8,
              background: "#fef2f2", border: "1px solid #fecaca",
              fontSize: 12, color: "#dc2626", textAlign: "center",
              animation: "pulse 1.5s infinite",
            }}>
              🎙️ Escuchando... habla ahora
            </div>
          )}
          {hablando && (
            <div style={{
              padding: "6px 12px", marginBottom: 8, borderRadius: 8,
              background: "#dbeafe", border: "1px solid #bfdbfe",
              fontSize: 12, color: "#2563eb", textAlign: "center",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>🔊 Reproduciendo respuesta...</span>
              <button onClick={detenerVozRespuesta} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: "1px solid #bfdbfe", background: "white", cursor: "pointer" }}>⏹ Detener</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              placeholder="Escribe o habla..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              style={{
                flex: 1, padding: "10px 12px", border: "1px solid #e5e7eb",
                borderRadius: 10, fontSize: 14, resize: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {browserSupportsSpeechRecognition && (
                <button
                  onClick={listening ? detenerVoz : comenzarVoz}
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: "none",
                    background: listening ? "#ef4444" : "#f3f4f6",
                    color: listening ? "white" : "#374151",
                    cursor: "pointer", fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title={listening ? "Detener" : "Hablar"}
                >
                  {listening ? "⏹" : "🎤"}
                </button>
              )}
              <button
                onClick={enviarConsulta}
                disabled={enviando || !mensaje.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: enviando || !mensaje.trim() ? "#e5e7eb" : "linear-gradient(135deg, #0077B6, #00B4D8)",
                  color: "white", cursor: enviando ? "not-allowed" : "pointer",
                  fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Enviar"
              >
                🚀
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button onClick={limpiarHistorial} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 12,
              border: "1px solid #e5e7eb", background: "white", color: "#6b7280",
              cursor: "pointer",
            }}>
              🗑️ Limpiar chat
            </button>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>Enter para enviar • Shift+Enter nueva línea</span>
          </div>
        </div>

        {/* CSS para animaciones */}
        <style>{`
          .dots-typing::after {
            content: '';
            animation: dots 1.5s steps(4, end) infinite;
          }
          @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    </div>
  );
}

export default AsistenteModal;