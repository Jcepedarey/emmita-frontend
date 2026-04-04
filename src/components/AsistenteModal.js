// src/components/AsistenteModal.js
import React, { useState } from "react";
import "./AsistenteModal.css";
import { consultarIA } from "../utils/asistenteIA";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

function AsistenteModal({ visible, onClose }) {
  const [mensaje, setMensaje] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const enviarConsulta = async () => {
    if (!mensaje.trim()) return;
    setEnviando(true);
    const resultado = await consultarIA(mensaje);
    setRespuesta(resultado);
    setEnviando(false);
  };

  const comenzarVoz = () => {
    resetTranscript();
    SpeechRecognition.startListening({ language: "es-CO" });
  };

  const detenerVoz = () => {
    SpeechRecognition.stopListening();
    setMensaje(transcript);
  };

  if (!visible) return null;

  return (
    <div className="modal-fondo">
      <div className="modal-contenido">
        <button className="cerrar-modal" onClick={onClose}>✖️</button>
        <h2 className="titulo-modal">🤖 Asistente Inteligente</h2>
        <textarea
          placeholder="Escribe tu consulta o habla..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className="input-modal"
        />
        <div className="acciones-modal">
          {browserSupportsSpeechRecognition && (
            <button
              onClick={listening ? detenerVoz : comenzarVoz}
              className={listening ? "btn-rojo" : "btn-azul"}
            >
              {listening ? "🎙️ Detener Voz" : "🎤 Hablar"}
            </button>
          )}
          <button className="btn-verde" onClick={enviarConsulta} disabled={enviando}>
            {enviando ? "Enviando..." : "🚀 Enviar"}
          </button>
        </div>
        {respuesta && (
          <div className="respuesta-modal">
            <strong>✅ Respuesta:</strong>
            <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7 }}>
              {respuesta.split("\n").map((linea, i) => {
                if (!linea.trim()) return <br key={i} />;
                // Detectar líneas de lista (- o • o 🔹 etc)
                const esLista = /^[\-•🔹🔸📦📋✅❌🔍💰👥📊📅🔧]/.test(linea.trim());
                return (
                  <div key={i} style={{
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
          </div>
        )}
      </div>
    </div>
  );
}

export default AsistenteModal;