// src/components/BotonIAFlotante.js
import React from "react";

export default function BotonIAFlotante({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-purple-700 text-sm sm:text-base"
      title="Asistente inteligente"
    >
      🧠 Asistente IA
    </button>
  );
}
