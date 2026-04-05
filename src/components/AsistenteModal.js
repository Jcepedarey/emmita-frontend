// src/components/AsistenteModal.js
import React, { useState, useRef, useEffect } from "react";
import "./AsistenteModal.css";
import { consultarIA } from "../utils/asistenteIA";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

// ─── Contador de consultas diarias (localStorage) ───
const LIMITE_CONSULTAS_DIARIAS = 30; // por tenant

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
    .replace(/\*\*/g, "")           // quitar negritas markdown
    .replace(/[🔹🔸📦📋✅❌🔍💰👥📊📅🔧🤖👋🎉⚠️📞📧🆔📍🏢💎⭐🆓🛡️🔊🔇🚀🗑️]/g, "") // quitar emojis
    .replace(/[\-•|]/g, ", ")       // guiones y pipes por comas
    .replace(/\d+\.\s/g, "")        // quitar numeración (1. 2. 3.)
    .replace(/\s{2,}/g, " ")        // espacios múltiples
    .replace(/,\s*,/g, ",")         // comas dobles
    .trim();
}

function leerEnVozAlta(texto) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(limpiarParaVoz(texto));
  utterance.lang = "es-CO";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  // Buscar voz en español
  const voces = window.speechSynthesis.getVoices();
  const vozES = voces.find((v) => v.lang.startsWith("es")) || null;
  if (vozES) utterance.voice = vozES;
  window.speechSynthesis.speak(utterance);
}

function detenerVozRespuesta() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function AsistenteModal({ visible, onClose }) {
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]); // [{tipo: "user"|"ia", texto}]
  const [enviando, setEnviando] = useState(false);
  const [consultasHoy, setConsultasHoy] = useState(getConsultasHoy().total);
  const [vozActiva, setVozActiva] = useState(false); // si lee las respuestas en voz alta
  const [hablando, setHablando] = useState(false); // si speechSynthesis está hablando
  const historialRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Actualizar mensaje con transcript de voz
  useEffect(() => {
    if (transcript) setMensaje(transcript);
  }, [transcript]);

  // Scroll al final del historial
  useEffect(() => {
    if (historialRef.current) {
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
    }
  }, [historial]);

  // Monitorear si speechSynthesis está hablando
  useEffect(() => {
    const interval = setInterval(() => {
      setHablando(window.speechSynthesis?.speaking || false);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Detener voz al cerrar
  useEffect(() => {
    if (!visible) detenerVozRespuesta();
  }, [visible]);

  const enviarConsulta = async () => {
    const texto = mensaje.trim();
    if (!texto) return;

    // Verificar límite diario
    if (consultasHoy >= LIMITE_CONSULTAS_DIARIAS) {
      setHistorial((prev) => [...prev, {
        tipo: "ia",
        texto: `⚠️ Has alcanzado el límite de ${LIMITE_CONSULTAS_DIARIAS} consultas para hoy. El contador se reinicia a medianoche.`,
      }]);
      return;
    }

    // Agregar mensaje del usuario al historial
    setHistorial((prev) => [...prev, { tipo: "user", texto }]);
    setMensaje("");
    resetTranscript();
    setEnviando(true);

    try {
      const resultado = await consultarIA(texto);
      const nuevoTotal = incrementarConsulta();
      setConsultasHoy(nuevoTotal);
      setHistorial((prev) => [...prev, { tipo: "ia", texto: resultado }]);

      // Leer respuesta en voz alta si está activado
      if (vozActiva) leerEnVozAlta(resultado);
    } catch (err) {
      setHistorial((prev) => [...prev, { tipo: "ia", texto: "⚠️ Error al procesar la consulta." }]);
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
            {/* Toggle voz de respuesta */}
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
              <div style={{ fontSize: 14, fontWeight: 500 }}>¿En qué puedo ayudarte?</div>
              <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
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
                      {msg.texto.split("\n").map((linea, j) => {
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
        </div>

        {/* Input + acciones */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
          {/* Indicador de voz */}
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