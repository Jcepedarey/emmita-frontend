// src/components/TrialBanner.js
// Banner que muestra los días restantes del trial
import React from "react";
import useLimites from "../hooks/useLimites";

export default function TrialBanner() {
  const { plan, diasRestantes, trialVencido, tenantInactivo, cargando } = useLimites();

  // No mostrar nada mientras carga o si es plan pago y activo
  if (cargando) return null;
  if (plan !== "trial" && !tenantInactivo) return null;

  // Cuenta suspendida
  if (tenantInactivo) {
    return (
      <div style={estilos.banner("#ef4444")}>
        ⚠️ Tu cuenta está suspendida. Contacta a SwAlquiler para reactivarla.
      </div>
    );
  }

  // Trial vencido
  if (trialVencido) {
    return (
      <div style={estilos.banner("#ef4444")}>
        ⏰ Tu prueba gratuita ha terminado. Contacta a SwAlquiler para activar tu plan.
        <a
          href="https://wa.me/573166534685?text=Hola%2C%20quiero%20activar%20mi%20plan%20en%20SwAlquiler"
          target="_blank"
          rel="noopener noreferrer"
          style={estilos.boton}
        >
          WhatsApp
        </a>
      </div>
    );
  }

  // Trial activo
  if (plan === "trial" && diasRestantes !== null) {
    const color = diasRestantes <= 2 ? "#f59e0b" : "#0077B6";
    const emoji = diasRestantes <= 2 ? "⚡" : "🎉";
    return (
      <div style={estilos.banner(color)}>
        {emoji} Prueba gratuita: <strong>{diasRestantes} día{diasRestantes !== 1 ? "s" : ""} restante{diasRestantes !== 1 ? "s" : ""}</strong>
        {diasRestantes <= 2 && (
          <a
            href="https://wa.me/573166534685?text=Hola%2C%20quiero%20activar%20mi%20plan%20en%20SwAlquiler"
            target="_blank"
            rel="noopener noreferrer"
            style={estilos.boton}
          >
            Activar plan
          </a>
        )}
      </div>
    );
  }

  return null;
}

const estilos = {
  banner: (bg) => ({
    width: "100%",
    padding: "8px 16px",
    background: bg,
    color: "white",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    boxSizing: "border-box",
    flexWrap: "wrap",
  }),
  boton: {
    background: "white",
    color: "#333",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
};