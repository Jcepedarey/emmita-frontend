// src/pages/SuperAdmin.js
import React, { useEffect, useState, useMemo } from "react";
import { useTenant } from "../context/TenantContext";
import { Navigate } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchAPI } from "../utils/api";
import Protegido from "../components/Protegido";

const API_URL = process.env.REACT_APP_API_URL || "https://backend-emmita.onrender.com";
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

const PLANES_INFO = {
  trial: { label: "Trial", color: "#f59e0b", bg: "#fefce8", border: "#fde68a", icon: "🆓" },
  basico: { label: "Básico", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", icon: "⭐" },
  profesional: { label: "Profesional", color: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe", icon: "💎" },
};

const ESTADOS_INFO = {
  activo: { label: "Activo", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  suspendido: { label: "Suspendido", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

export default function SuperAdmin() {
  const { esSuperAdmin, cargando } = useTenant();
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPlan, setFiltroPlan] = useState("");

  // Protección: si no es super_admin, redirigir
  if (!cargando && !esSuperAdmin) {
    return <Navigate to="/inicio" />;
  }

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [tenantsData, statsData] = await Promise.all([
        fetchAPI(`${API_URL}/api/superadmin/tenants`),
        fetchAPI(`${API_URL}/api/superadmin/stats`),
      ]);
      setTenants(tenantsData || []);
      setStats(statsData || null);
    } catch (err) {
      console.error("Error cargando datos super admin:", err);
      Swal.fire("Error", "No se pudieron cargar los datos", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (esSuperAdmin) cargarDatos();
  }, [esSuperAdmin]); // eslint-disable-line

  // ─── Filtros ───
  const tenantsFiltrados = useMemo(() => {
    let lista = tenants;
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      lista = lista.filter((t) =>
        (t.nombre || "").toLowerCase().includes(q) ||
        (t.admin_email || "").toLowerCase().includes(q) ||
        (t.admin_nombre || "").toLowerCase().includes(q)
      );
    }
    if (filtroEstado) lista = lista.filter((t) => (t.estado || "activo") === filtroEstado);
    if (filtroPlan) lista = lista.filter((t) => t.plan === filtroPlan);
    return lista;
  }, [tenants, buscar, filtroEstado, filtroPlan]);

  // ─── Acciones ───
  const cambiarPlan = async (tenant) => {
    const { value: plan } = await Swal.fire({
      title: `Cambiar plan de ${tenant.nombre}`,
      html: `
        <div style="text-align:left;font-size:13px;">
          <p>Plan actual: <strong>${tenant.plan}</strong></p>
          <p>Selecciona el nuevo plan:</p>
        </div>
      `,
      input: "select",
      inputOptions: {
        trial: "🆓 Trial (14 días, 50 productos, 1 usuario)",
        basico: "⭐ Básico (30 días, 200 productos, 2 usuarios)",
        profesional: "💎 Profesional (30 días, ilimitado, 10 usuarios)",
      },
      inputValue: tenant.plan,
      showCancelButton: true,
      confirmButtonText: "Cambiar plan",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0077B6",
    });

    if (!plan) return;

    try {
      await fetchAPI(`${API_URL}/api/superadmin/tenants/${tenant.id}/plan`, {
        method: "PUT",
        body: JSON.stringify({ plan }),
      });
      Swal.fire("✅ Plan actualizado", `${tenant.nombre} ahora tiene plan ${plan}`, "success");
      cargarDatos();
    } catch (err) {
      Swal.fire("Error", "No se pudo cambiar el plan", "error");
    }
  };

  const toggleEstado = async (tenant) => {
    const esActivo = (tenant.estado || "activo") === "activo";
    const nuevoEstado = esActivo ? "suspendido" : "activo";

    const confirm = await Swal.fire({
      title: esActivo ? `¿Suspender a ${tenant.nombre}?` : `¿Reactivar a ${tenant.nombre}?`,
      text: esActivo
        ? "La empresa no podrá acceder al sistema hasta que la reactives."
        : "La empresa podrá acceder nuevamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: esActivo ? "Sí, suspender" : "Sí, reactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: esActivo ? "#dc2626" : "#16a34a",
    });

    if (!confirm.isConfirmed) return;

    try {
      await fetchAPI(`${API_URL}/api/superadmin/tenants/${tenant.id}/estado`, {
        method: "PUT",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      Swal.fire("✅ Listo", `${tenant.nombre} fue ${nuevoEstado === "activo" ? "reactivado" : "suspendido"}`, "success");
      cargarDatos();
    } catch (err) {
      Swal.fire("Error", "No se pudo cambiar el estado", "error");
    }
  };

  const renovar = async (tenant) => {
    const { value: dias } = await Swal.fire({
      title: `Renovar ${tenant.nombre}`,
      html: `
        <div style="text-align:left;font-size:13px;">
          <p>Plan: <strong>${tenant.plan}</strong></p>
          <p>Vencimiento actual: <strong>${tenant.fecha_vencimiento ? new Date(tenant.fecha_vencimiento).toLocaleDateString("es-CO") : "N/A"}</strong></p>
          <p>¿Cuántos días renovar?</p>
        </div>
      `,
      input: "select",
      inputOptions: {
        30: "30 días (1 mes)",
        60: "60 días (2 meses)",
        90: "90 días (3 meses)",
        180: "180 días (6 meses)",
        365: "365 días (1 año)",
      },
      inputValue: "30",
      showCancelButton: true,
      confirmButtonText: "Renovar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });

    if (!dias) return;

    const { isConfirmed: desdeVenc } = tenant.fecha_vencimiento
      ? await Swal.fire({
          title: "¿Desde cuándo?",
          text: "¿Renovar desde la fecha de vencimiento actual (no pierde días) o desde hoy?",
          showCancelButton: true,
          confirmButtonText: "Desde vencimiento",
          cancelButtonText: "Desde hoy",
          confirmButtonColor: "#0077B6",
        })
      : { isConfirmed: false };

    try {
      const result = await fetchAPI(`${API_URL}/api/superadmin/tenants/${tenant.id}/renovar`, {
        method: "PUT",
        body: JSON.stringify({ dias: Number(dias), desdeVencimiento: desdeVenc }),
      });
      Swal.fire("✅ Renovado", `Nueva fecha de vencimiento: ${result.nueva_fecha_vencimiento}`, "success");
      cargarDatos();
    } catch (err) {
      Swal.fire("Error", "No se pudo renovar", "error");
    }
  };

  // ─── Estilos ───
  const cardStyle = {
    background: "white", borderRadius: 12, border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
  };
  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
    borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#f8fafc",
  };

  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 1100 }}>

          {/* Header */}
          <div className="sw-header" style={{ marginBottom: 20 }}>
            <h1 className="sw-header-titulo">🛡️ Super Admin — Gestión de Empresas</h1>
          </div>

          {/* KPIs */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total empresas", valor: stats.total, color: "#0077B6" },
                { label: "Activas", valor: stats.activos, color: "#16a34a" },
                { label: "Suspendidas", valor: stats.suspendidos, color: "#dc2626" },
                { label: "En trial", valor: stats.enTrial, color: "#f59e0b" },
                { label: "Plan básico", valor: stats.basico, color: "#3b82f6" },
                { label: "Plan profesional", valor: stats.profesional, color: "#8b5cf6" },
              ].map((kpi, i) => (
                <div key={i} style={{ ...cardStyle, padding: "14px 16px", textAlign: "center", borderLeft: `4px solid ${kpi.color}` }}>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase" }}>{kpi.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color, marginTop: 4 }}>{kpi.valor}</div>
                </div>
              ))}
            </div>
          )}

          {/* Alertas */}
          {stats && (stats.trialsPorVencer > 0 || stats.planesPorVencer > 0) && (
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.trialsPorVencer > 0 && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fefce8", border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
                  ⏰ <strong>{stats.trialsPorVencer}</strong> trial{stats.trialsPorVencer > 1 ? "s" : ""} por vencer en los próximos 3 días
                </div>
              )}
              {stats.planesPorVencer > 0 && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#991b1b" }}>
                  ⚠️ <strong>{stats.planesPorVencer}</strong> plan{stats.planesPorVencer > 1 ? "es" : ""} por vencer en los próximos 5 días
                </div>
              )}
            </div>
          )}

          {/* Filtros */}
          <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 250px", minWidth: 200 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar empresa, admin, email..."
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 38 }}
                />
              </div>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
                <option value="">Todos los estados</option>
                <option value="activo">✅ Activos</option>
                <option value="suspendido">🚫 Suspendidos</option>
              </select>
              <select value={filtroPlan} onChange={(e) => setFiltroPlan(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
                <option value="">Todos los planes</option>
                <option value="trial">🆓 Trial</option>
                <option value="basico">⭐ Básico</option>
                <option value="profesional">💎 Profesional</option>
              </select>
              {(buscar || filtroEstado || filtroPlan) && (
                <button
                  onClick={() => { setBuscar(""); setFiltroEstado(""); setFiltroPlan(""); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                >
                  ✕ Limpiar
                </button>
              )}
            </div>
            {(buscar || filtroEstado || filtroPlan) && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {tenantsFiltrados.length} de {tenants.length} empresas
              </div>
            )}
          </div>

          {/* Lista de tenants */}
          <div style={cardStyle}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>
                📋 Empresas registradas ({tenantsFiltrados.length})
              </h3>
              <button
                onClick={cargarDatos}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "white", fontSize: 12, cursor: "pointer" }}
              >
                🔄 Refrescar
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Cargando empresas...</div>
            ) : tenantsFiltrados.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>No se encontraron empresas</div>
              </div>
            ) : (
              tenantsFiltrados.map((t) => {
                const planInfo = PLANES_INFO[t.plan] || PLANES_INFO.trial;
                const estadoInfo = ESTADOS_INFO[t.estado || "activo"] || ESTADOS_INFO.activo;
                const esActivo = (t.estado || "activo") === "activo";
                const porVencer = t.dias_restantes !== null && t.dias_restantes <= 5 && t.dias_restantes > 0;
                const vencido = t.dias_restantes !== null && t.dias_restantes <= 0 && t.plan !== "trial";

                return (
                  <div key={t.id} style={{
                    padding: "16px",
                    borderBottom: "1px solid #f3f4f6",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafbfc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Fila principal */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      {/* Info empresa */}
                      <div style={{ flex: "1 1 300px", minWidth: 250 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{t.nombre}</span>
                          {/* Badge plan */}
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                            background: planInfo.bg, color: planInfo.color, border: `1px solid ${planInfo.border}`,
                          }}>
                            {planInfo.icon} {planInfo.label}
                          </span>
                          {/* Badge estado */}
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                            background: estadoInfo.bg, color: estadoInfo.color, border: `1px solid ${estadoInfo.border}`,
                          }}>
                            {esActivo ? "✅" : "🚫"} {estadoInfo.label}
                          </span>
                          {/* Alerta vencimiento */}
                          {porVencer && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: "#fefce8", color: "#92400e", border: "1px solid #fde68a" }}>
                              ⏰ {t.dias_restantes} día{t.dias_restantes !== 1 ? "s" : ""}
                            </span>
                          )}
                          {vencido && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                              ❌ Vencido
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
                          <span>👤 {t.admin_nombre}</span>
                          <span>📧 {t.admin_email}</span>
                          {t.telefono_empresa && <span>📞 {t.telefono_empresa}</span>}
                        </div>

                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
                          <span>📅 Registro: {t.fecha_registro ? new Date(t.fecha_registro).toLocaleDateString("es-CO") : "—"}</span>
                          {t.fecha_vencimiento && <span>⏳ Vence: {new Date(t.fecha_vencimiento).toLocaleDateString("es-CO")}</span>}
                          <span>👥 {t.usuarios} usuario{t.usuarios !== 1 ? "s" : ""}</span>
                          <span>📦 {t.productos} producto{t.productos !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                        <button
                          onClick={() => cambiarPlan(t)}
                          style={{
                            padding: "7px 12px", borderRadius: 8, border: "1px solid #ddd6fe",
                            background: "#faf5ff", color: "#7c3aed", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                          title="Cambiar plan"
                        >
                          💎 Plan
                        </button>
                        <button
                          onClick={() => renovar(t)}
                          style={{
                            padding: "7px 12px", borderRadius: 8, border: "1px solid #bbf7d0",
                            background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                          title="Renovar suscripción"
                        >
                          🔄 Renovar
                        </button>
                        <button
                          onClick={() => toggleEstado(t)}
                          style={{
                            padding: "7px 12px", borderRadius: 8,
                            border: esActivo ? "1px solid #fecaca" : "1px solid #bbf7d0",
                            background: esActivo ? "#fef2f2" : "#f0fdf4",
                            color: esActivo ? "#dc2626" : "#16a34a",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                          }}
                          title={esActivo ? "Suspender" : "Reactivar"}
                        >
                          {esActivo ? "🚫 Suspender" : "✅ Reactivar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </Protegido>
  );
}