// src/components/Protegido.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../context/TenantContext";

export default function Protegido({ children }) {
  const navigate = useNavigate();
  const { tenant, perfil, cargando } = useTenant();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
    } else {
      setVerificado(true);
    }
  }, [navigate]);

  // Mientras verifica sesión o carga tenant
  if (!verificado || cargando) return null;

  // ─── Verificar estado del tenant ───
  const suspendido = tenant?.estado === "suspendido" || tenant?.estado === "inactivo";

  // ─── Verificar trial vencido ───
  let trialVencido = false;
  if (tenant?.plan === "trial" && tenant?.fecha_registro) {
    const inicio = new Date(tenant.fecha_registro);
    const ahora = new Date();
    const diffDias = Math.floor((ahora - inicio) / (1000 * 60 * 60 * 24));
    trialVencido = diffDias >= 14;
  }

  // ─── Pantalla de bloqueo ───
  if (suspendido || trialVencido) {
    const esSuspendido = suspendido;
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #f8fafc 0%, #e0f2fe 100%)",
        padding: 20
      }}>
        <div style={{
          maxWidth: 460,
          width: "100%",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          padding: "40px 32px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {esSuspendido ? "⏸️" : "⏰"}
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 700,
            color: "#111827", margin: "0 0 8px"
          }}>
            {esSuspendido ? "Cuenta suspendida" : "Prueba gratuita finalizada"}
          </h1>
          <p style={{
            fontSize: 14, color: "#6b7280",
            lineHeight: 1.6, margin: "0 0 24px"
          }}>
            {esSuspendido
              ? "Tu cuenta ha sido suspendida temporalmente. Contacta a SwAlquiler para reactivarla."
              : "Tu período de prueba de 14 días ha terminado. Activa un plan para seguir disfrutando de SwAlquiler."
            }
          </p>

          {/* Info de contacto */}
          <div style={{
            background: "#f0f9ff",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            textAlign: "left"
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0077B6", marginBottom: 8 }}>
              📞 Contacta a SwAlquiler
            </div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
              <div>📱 WhatsApp: <a href="https://wa.me/573214909600" style={{ color: "#0077B6", textDecoration: "none", fontWeight: 500 }}>321 490 9600</a></div>
              <div>📧 Email: <a href="mailto:soporte@swalquiler.com" style={{ color: "#0077B6", textDecoration: "none", fontWeight: 500 }}>soporte@swalquiler.com</a></div>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
            <a
              href="https://wa.me/573214909600?text=Hola%2C%20quiero%20activar%20un%20plan%20en%20SwAlquiler"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 20px", borderRadius: 10,
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                color: "white", fontWeight: 600, fontSize: 14,
                textDecoration: "none", border: "none", cursor: "pointer"
              }}
            >
              💬 Escribir por WhatsApp
            </a>
            <button
              onClick={() => {
                localStorage.removeItem("usuario");
                navigate("/login");
              }}
              style={{
                padding: "10px 20px", borderRadius: 10,
                background: "transparent", color: "#6b7280",
                fontWeight: 500, fontSize: 13,
                border: "1px solid #e5e7eb", cursor: "pointer"
              }}
            >
              Cerrar sesión
            </button>
          </div>

          {/* Nombre de empresa si existe */}
          {tenant?.nombre && (
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
              Empresa: {tenant.nombre} · Plan: {tenant.plan || "trial"}
            </div>
          )}
        </div>
      </div>
    );
  }

  return children;
}