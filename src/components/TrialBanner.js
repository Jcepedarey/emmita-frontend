// src/components/TrialBanner.js
import React from "react";
import useLimites from "../hooks/useLimites";
import { useTenant } from "../context/TenantContext";

export default function TrialBanner() {
  const { tenant } = useTenant();
  const { plan, diasRestantes, trialVencido, planVencido, tenantInactivo, cargando } = useLimites();

  if (!tenant || cargando) return null;

  // ─── Cuenta suspendida ───
  if (tenantInactivo) {
    return (
      <div style={estilos.banner("#dc2626")}>
        <span>⚠️ Tu cuenta está suspendida. Contacta a SwAlquiler para reactivarla.</span>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={estilos.boton}>
          WhatsApp
        </a>
      </div>
    );
  }

  // ─── Trial vencido ───
  if (trialVencido) {
    return (
      <div style={estilos.banner("#dc2626")}>
        <span>⏰ Tu prueba gratuita ha terminado. Activa un plan para seguir usando SwAlquiler.</span>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={estilos.boton}>
          Activar plan
        </a>
      </div>
    );
  }

  // ─── Plan pago vencido ───
  if (planVencido) {
    return (
      <div style={estilos.banner("#dc2626")}>
        <span>⏰ Tu plan ha vencido. Renueva tu suscripción para continuar.</span>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={estilos.boton}>
          Renovar
        </a>
      </div>
    );
  }

  // ─── Trial: solo mostrar cuando quedan ≤3 días ───
  if (plan === "trial" && diasRestantes !== null && diasRestantes <= 3) {
    const color = diasRestantes <= 1 ? "#dc2626" : "#f59e0b";
    return (
      <div style={estilos.banner(color)}>
        <span>
          ⚡ Tu prueba gratuita termina {diasRestantes === 0 ? "hoy" : `en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`}.
        </span>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={estilos.boton}>
          Activar plan
        </a>
      </div>
    );
  }

  // ─── Plan pago: solo mostrar cuando quedan ≤5 días ───
  if (plan !== "trial" && tenant?.fecha_vencimiento) {
    const vencimiento = new Date(tenant.fecha_vencimiento);
    const ahora = new Date();
    const diffDias = Math.floor((vencimiento - ahora) / (1000 * 60 * 60 * 24));

    if (diffDias >= 0 && diffDias <= 5) {
      const color = diffDias <= 2 ? "#dc2626" : "#f59e0b";
      return (
        <div style={estilos.banner(color)}>
          <span>
            📅 Tu plan {plan} vence {diffDias === 0 ? "hoy" : `en ${diffDias} día${diffDias !== 1 ? "s" : ""}`}. Renueva para no perder acceso.
          </span>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={estilos.boton}>
            Renovar
          </a>
        </div>
      );
    }
  }

  // ─── Si no hay nada urgente, no mostrar nada ───
  return null;
}

const WHATSAPP_LINK = "https://wa.me/573214909600?text=Hola%2C%20quiero%20activar%2Frenovar%20mi%20plan%20en%20SwAlquiler";

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