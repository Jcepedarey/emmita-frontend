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
            <p>{respuesta}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AsistenteModal;