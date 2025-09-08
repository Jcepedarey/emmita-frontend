// src/components/BotonIAFlotante.js
import React from "react";

/**
 * FAB de IA
 * - En móvil (<=768px) la posición/espaciado lo controla el CSS .boton-ia en mobile.css
 *   (fixed + safe-area + contain/isolation, etc.)
 * - En escritorio (>=md) aplican las utilidades md:* para esquina inferior derecha.
 */
export default function BotonIAFlotante({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Asistente IA"
      aria-label="Asistente IA"
      className="
        boton-ia
        bg-purple-600 text-white hover:bg-purple-700
        text-sm md:text-base
        md:fixed md:bottom-6 md:right-6
        md:px-4 md:py-3 md:rounded-full md:shadow-lg
        md:z-40
      "
    >
      🧠 IA
    </button>
  );
}
