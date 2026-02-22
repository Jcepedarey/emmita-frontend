// src/pages/LandingPage.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Datos estáticos ───────────────────────────────────────────
const FUNCIONALIDADES = [
  {
    icono: "📝",
    titulo: "Cotizaciones y Pedidos",
    desc: "Crea documentos profesionales en segundos. Genera PDFs con tu logo y marca de agua automáticamente.",
    color: "#10b981",
  },
  {
    icono: "📦",
    titulo: "Inventario en Tiempo Real",
    desc: "Controla stock, disponibilidad y categorías. Importa desde Excel con un clic.",
    color: "#f59e0b",
  },
  {
    icono: "📅",
    titulo: "Agenda de Eventos",
    desc: "Calendario visual con todas tus entregas y recojos. Nunca pierdas una fecha importante.",
    color: "#ef4444",
  },
  {
    icono: "💰",
    titulo: "Contabilidad Automática",
    desc: "Ingresos, egresos y reportes financieros generados automáticamente desde tus pedidos.",
    color: "#22c55e",
  },
  {
    icono: "👥",
    titulo: "Multi-usuario",
    desc: "Agrega empleados con roles y permisos. Cada uno ve solo lo que necesita.",
    color: "#3b82f6",
  },
  {
    icono: "🤖",
    titulo: "Asistente con IA",
    desc: "Consulta datos, genera reportes y obtén respuestas al instante con inteligencia artificial.",
    color: "#8b5cf6",
  },
];

const PLANES = [
  {
    nombre: "Prueba Gratuita",
    precio: "Gratis",
    periodo: "14 días",
    color: "#64748b",
    destacado: false,
    caracteristicas: [
      "50 productos",
      "Clientes ilimitados",
      "Cotizaciones y pedidos",
      "1 usuario",
      "PDFs con tu logo",
      "Soporte por WhatsApp",
    ],
  },
  {
    nombre: "Básico",
    precio: "$49.000",
    periodo: "COP / mes",
    color: "#0077B6",
    destacado: false,
    caracteristicas: [
      "50 productos",
      "Clientes ilimitados",
      "Documentos ilimitados",
      "2 usuarios",
      "PDFs personalizados",
      "Contabilidad automática",
      "Soporte prioritario",
    ],
  },
  {
    nombre: "Profesional",
    precio: "$89.000",
    periodo: "COP / mes",
    color: "#00B4D8",
    destacado: true,
    caracteristicas: [
      "Productos ilimitados",
      "Clientes ilimitados",
      "Documentos ilimitados",
      "5 usuarios",
      "Asistente con IA",
      "Reportes avanzados",
      "Dashboard completo",
      "Soporte prioritario 24/7",
    ],
  },
  {
    nombre: "Enterprise",
    precio: "$149.000",
    periodo: "COP / mes",
    color: "#0077B6",
    destacado: false,
    caracteristicas: [
      "Todo en Profesional",
      "10 usuarios",
      "Marca de agua en PDFs",
      "Backup dedicado",
      "Capacitación incluida",
      "Soporte personalizado",
    ],
  },
];

const TESTIMONIOS = [
  {
    nombre: "Santiago P.",
    empresa: "Eventos Royal Prestige",
    ciudad: "Bogotá",
    texto: "Antes manejaba todo en cuadernos y WhatsApp. Con SwAlquiler tengo control total de mi inventario y mis clientes. ¡Increíble!",
    avatar: "👨‍💼",
  },
  {
    nombre: "María L.",
    empresa: "Deco Fiestas Luxury",
    ciudad: "Medellín",
    texto: "La generación de cotizaciones en PDF con mi logo le da un nivel profesional a mi negocio que antes no tenía.",
    avatar: "👩‍💼",
  },
  {
    nombre: "Andrés R.",
    empresa: "Eventos & Alquiler la Sucursal",
    ciudad: "Cali",
    texto: "El calendario de agenda me salvó. Ya no se me cruzan los pedidos ni pierdo fechas de entrega.",
    avatar: "👨‍💼",
  },
];

// ─── Componente principal ──────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [cotizacionesMes, setCotizacionesMes] = useState(20);
  const [menuMovil, setMenuMovil] = useState(false);
  const [seccionesVisibles, setSeccionesVisibles] = useState({});
  const observerRefs = useRef({});

  // Animación de entrada por sección
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSeccionesVisibles((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll("[data-animate]").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const animStyle = (id, delay = 0) => ({
    opacity: seccionesVisibles[id] ? 1 : 0,
    transform: seccionesVisibles[id] ? "translateY(0)" : "translateY(30px)",
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  // Cálculos de ahorro
  const minutosPorCotizacion = 15;
  const minutosPorCotizacionSw = 3;
  const horasAhorradas = ((cotizacionesMes * (minutosPorCotizacion - minutosPorCotizacionSw)) / 60).toFixed(1);
  const diasAhorrados = (horasAhorradas / 8).toFixed(1);

  return (
    <div style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif", color: "#1e293b", overflowX: "hidden" }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NAVBAR FIJO                                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src="/icons/swalquiler-logo.png" alt="SwAlquiler" style={{ width: 36, height: 36 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0077B6" }}>SwAlquiler</span>
        </div>

        {/* Links desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="landing-nav-desktop">
          <a href="#funcionalidades" style={navLink}>Funcionalidades</a>
          <a href="#precios" style={navLink}>Precios</a>
          <a href="#calculadora" style={navLink}>Ahorro</a>
          <a href="#contacto" style={navLink}>Contacto</a>
          <button onClick={() => navigate("/login")} style={navBtnSecundario}>Iniciar sesión</button>
          <button onClick={() => navigate("/registro")} style={navBtnPrimario}>Prueba gratis</button>
        </div>

        {/* Hamburguesa móvil */}
        <button onClick={() => setMenuMovil(!menuMovil)} className="landing-nav-hamburger" style={{
          background: "none", border: "none", fontSize: 26, cursor: "pointer",
          display: "none", color: "#374151",
        }}>
          {menuMovil ? "✕" : "☰"}
        </button>
      </nav>

      {/* Menú móvil */}
      {menuMovil && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0, bottom: 0,
          background: "rgba(255,255,255,0.98)", zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 24,
        }}>
          <a href="#funcionalidades" onClick={() => setMenuMovil(false)} style={{ ...navLink, fontSize: 20 }}>Funcionalidades</a>
          <a href="#precios" onClick={() => setMenuMovil(false)} style={{ ...navLink, fontSize: 20 }}>Precios</a>
          <a href="#calculadora" onClick={() => setMenuMovil(false)} style={{ ...navLink, fontSize: 20 }}>Ahorro</a>
          <a href="#contacto" onClick={() => setMenuMovil(false)} style={{ ...navLink, fontSize: 20 }}>Contacto</a>
          <button onClick={() => { setMenuMovil(false); navigate("/login"); }} style={{ ...navBtnSecundario, fontSize: 18, padding: "12px 32px" }}>Iniciar sesión</button>
          <button onClick={() => { setMenuMovil(false); navigate("/registro"); }} style={{ ...navBtnPrimario, fontSize: 18, padding: "12px 32px" }}>Prueba gratis</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100vh", paddingTop: 64,
        background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 30%, #ffffff 60%, #f0fdfa 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decoración de fondo */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,180,216,0.08) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,119,182,0.06) 0%, transparent 70%)",
        }} />

        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "60px 24px",
          display: "flex", alignItems: "center", gap: 60,
          flexWrap: "wrap", justifyContent: "center",
        }}>
          {/* Texto hero */}
          <div style={{ flex: "1 1 480px", maxWidth: 580 }}>
            <div style={{
              display: "inline-block", padding: "6px 16px",
              background: "linear-gradient(135deg, #0077B6, #00B4D8)",
              borderRadius: 20, color: "white", fontSize: 13,
              fontWeight: 600, marginBottom: 20, letterSpacing: 0.5,
            }}>
              ✨ Software #1 para alquiler de eventos en Colombia
            </div>

            <h1 style={{
              fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
              fontWeight: 900, lineHeight: 1.1,
              color: "#0f172a", margin: "0 0 20px 0",
            }}>
              Gestiona tu negocio de{" "}
              <span style={{
                background: "linear-gradient(135deg, #0077B6, #00B4D8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                alquiler de eventos
              </span>{" "}
              como un profesional
            </h1>

            <p style={{
              fontSize: 18, color: "#64748b", lineHeight: 1.6,
              marginBottom: 32, maxWidth: 500,
            }}>
              Cotizaciones, inventario, clientes, agenda y contabilidad en un solo lugar. 
              Deja los cuadernos y el Excel. Empieza a crecer.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/registro")}
                style={{
                  padding: "16px 36px", fontSize: 16, fontWeight: 700,
                  background: "linear-gradient(135deg, #0077B6, #00B4D8)",
                  color: "white", border: "none", borderRadius: 12,
                  cursor: "pointer", boxShadow: "0 4px 20px rgba(0,119,182,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 28px rgba(0,119,182,0.4)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(0,119,182,0.3)"; }}
              >
                Empieza gratis — 14 días
              </button>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "16px 36px", fontSize: 16, fontWeight: 600,
                  background: "white", color: "#0077B6",
                  border: "2px solid #0077B6", borderRadius: 12,
                  cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.background = "#f0f9ff"; }}
                onMouseLeave={(e) => { e.target.style.background = "white"; }}
              >
                Iniciar sesión
              </button>
            </div>

            {/* Stats rápidos */}
            <div style={{
              display: "flex", gap: 32, marginTop: 40,
              flexWrap: "wrap",
            }}>
              {[
                { num: "100%", label: "En la nube" },
                { num: "0", label: "Instalación" },
                { num: "24/7", label: "Disponible" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#0077B6" }}>{s.num}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Imagen hero - REEMPLAZADO */}
          <div style={{
            flex: "1 1 400px", maxWidth: 500,
            background: "linear-gradient(145deg, #0077B6 0%, #00B4D8 100%)",
            borderRadius: 20, padding: 4,
            boxShadow: "0 20px 60px rgba(0,119,182,0.2)",
          }}>
            <img src="/screenshots/hero.png" alt="SwAlquiler Dashboard" style={{ width: "100%", borderRadius: 17, display: "block" }} />
          </div>
        </div>

        {/* Flecha scroll */}
        <div style={{
          position: "absolute", bottom: 30, left: "50%",
          transform: "translateX(-50%)", animation: "bounce 2s infinite",
          fontSize: 28, color: "#94a3b8", cursor: "pointer",
        }} onClick={() => document.getElementById("funcionalidades")?.scrollIntoView({ behavior: "smooth" })}>
          ↓
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FUNCIONALIDADES                                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="funcionalidades" data-animate style={{
        padding: "100px 24px", background: "#ffffff",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60, ...animStyle("funcionalidades") }}>
            <span style={{
              display: "inline-block", padding: "6px 16px", background: "#f0f9ff",
              borderRadius: 20, color: "#0077B6", fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>
              Todo lo que necesitas
            </span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, margin: "0 0 16px 0" }}>
              Un sistema completo para tu negocio
            </h2>
            <p style={{ fontSize: 17, color: "#64748b", maxWidth: 600, margin: "0 auto" }}>
              Olvídate de múltiples herramientas. SwAlquiler integra todo lo que necesitas para gestionar tu empresa de alquiler de eventos.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {FUNCIONALIDADES.map((f, i) => (
              <div
                key={i}
                id={`func-${i}`}
                data-animate
                style={{
                  padding: 28, borderRadius: 16,
                  border: "1px solid #f1f5f9",
                  background: "#fff",
                  transition: "all 0.3s ease",
                  cursor: "default",
                  ...animStyle(`func-${i}`, i * 0.1),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)";
                  e.currentTarget.style.borderColor = f.color + "40";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#f1f5f9";
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: f.color + "15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, marginBottom: 16,
                }}>
                  {f.icono}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>{f.titulo}</h3>
                <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Espacio para capturas de pantalla - REEMPLAZADO */}
          <div id="screenshots" data-animate style={{
            marginTop: 80, textAlign: "center",
            ...animStyle("screenshots"),
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>
              Así se ve SwAlquiler en acción
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}>
              {[
                { label: "Dashboard principal", src: "/screenshots/dashboard.png" },
                { label: "Crear cotización", src: "/screenshots/cotizacion.png" },
                { label: "Inventario", src: "/screenshots/inventario.png" },
              ].map((item, i) => (
                <div key={i} style={{
                  borderRadius: 16, overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}>
                  <img src={item.src} alt={item.label} style={{ width: "100%", display: "block" }} />
                  <div style={{ padding: "12px 16px", background: "#f8fafc", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CALCULADORA DE AHORRO                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="calculadora" data-animate style={{
        padding: "100px 24px",
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
        color: "white",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", ...animStyle("calculadora") }}>
          <span style={{
            display: "inline-block", padding: "6px 16px", background: "rgba(0,180,216,0.2)",
            borderRadius: 20, color: "#67e8f9", fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            ⏱️ Calculadora de ahorro
          </span>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 800, margin: "0 0 16px 0" }}>
            ¿Cuánto tiempo ahorrarías?
          </h2>
          <p style={{ fontSize: 17, color: "#94a3b8", marginBottom: 40 }}>
            Mueve el deslizador para ver cuántas horas recuperas cada mes
          </p>

          <div style={{
            background: "rgba(255,255,255,0.05)", borderRadius: 20,
            padding: 40, border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <label style={{ fontSize: 16, color: "#cbd5e1", display: "block", marginBottom: 16 }}>
              ¿Cuántas cotizaciones haces al mes?
            </label>

            <div style={{ fontSize: 52, fontWeight: 900, color: "#00B4D8", marginBottom: 8 }}>
              {cotizacionesMes}
            </div>

            <input
              type="range"
              min="5"
              max="100"
              value={cotizacionesMes}
              onChange={(e) => setCotizacionesMes(Number(e.target.value))}
              style={{
                width: "100%", maxWidth: 400,
                accentColor: "#00B4D8",
                height: 8, marginBottom: 32,
                cursor: "pointer",
              }}
            />

            <div style={{
              display: "flex", justifyContent: "center", gap: 40,
              flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#22c55e" }}>
                  {horasAhorradas}h
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>Horas ahorradas / mes</div>
              </div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#f59e0b" }}>
                  {diasAhorrados}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>Días laborales ahorrados</div>
              </div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#00B4D8" }}>
                  ${(cotizacionesMes * 3000).toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>COP ahorrados en papel</div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 14, color: "#64748b", marginTop: 20 }}>
            * Basado en 15 min promedio por cotización manual vs 3 min con SwAlquiler
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PLANES Y PRECIOS                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="precios" data-animate style={{
        padding: "100px 24px", background: "#f8fafc",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60, ...animStyle("precios") }}>
            <span style={{
              display: "inline-block", padding: "6px 16px", background: "#f0f9ff",
              borderRadius: 20, color: "#0077B6", fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>
              Planes flexibles
            </span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, margin: "0 0 16px 0" }}>
              Elige el plan perfecto para tu negocio
            </h2>
            <p style={{ fontSize: 17, color: "#64748b" }}>
              Sin contratos. Sin letra pequeña. Cancela cuando quieras.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20, alignItems: "stretch",
          }}>
            {PLANES.map((plan, i) => (
              <div
                key={i}
                id={`plan-${i}`}
                data-animate
                style={{
                  background: plan.destacado
                    ? "linear-gradient(160deg, #0077B6, #00B4D8)"
                    : "#ffffff",
                  color: plan.destacado ? "white" : "#1e293b",
                  borderRadius: 20, padding: 32,
                  border: plan.destacado ? "none" : "1px solid #e2e8f0",
                  display: "flex", flexDirection: "column",
                  position: "relative", overflow: "hidden",
                  transform: plan.destacado ? "scale(1.03)" : "scale(1)",
                  boxShadow: plan.destacado ? "0 20px 60px rgba(0,119,182,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                  ...animStyle(`plan-${i}`, i * 0.1),
                }}
              >
                {plan.destacado && (
                  <div style={{
                    position: "absolute", top: 16, right: -32,
                    background: "#f59e0b", color: "#1e293b",
                    padding: "4px 40px", fontSize: 11, fontWeight: 700,
                    transform: "rotate(45deg)",
                  }}>
                    POPULAR
                  </div>
                )}

                <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0" }}>{plan.nombre}</h3>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 900 }}>{plan.precio}</span>
                  <span style={{
                    fontSize: 14,
                    color: plan.destacado ? "rgba(255,255,255,0.7)" : "#94a3b8",
                    marginLeft: 4,
                  }}>
                    {plan.periodo}
                  </span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", flex: 1 }}>
                  {plan.caracteristicas.map((c, j) => (
                    <li key={j} style={{
                      padding: "8px 0",
                      fontSize: 14,
                      borderBottom: `1px solid ${plan.destacado ? "rgba(255,255,255,0.1)" : "#f1f5f9"}`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ color: plan.destacado ? "#67e8f9" : "#22c55e" }}>✓</span>
                      {c}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate("/registro")}
                  style={{
                    width: "100%", padding: 14, borderRadius: 10,
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                    border: plan.destacado ? "2px solid white" : "2px solid #0077B6",
                    background: plan.destacado ? "white" : "transparent",
                    color: plan.destacado ? "#0077B6" : "#0077B6",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (plan.destacado) {
                      e.target.style.background = "rgba(255,255,255,0.9)";
                    } else {
                      e.target.style.background = "#0077B6";
                      e.target.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.destacado) {
                      e.target.style.background = "white";
                    } else {
                      e.target.style.background = "transparent";
                      e.target.style.color = "#0077B6";
                    }
                  }}
                >
                  {plan.precio === "Gratis" ? "Empieza gratis" : "Elegir plan"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TESTIMONIOS                                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="testimonios" data-animate style={{
        padding: "100px 24px", background: "#ffffff",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50, ...animStyle("testimonios") }}>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 800, margin: 0 }}>
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}>
            {TESTIMONIOS.map((t, i) => (
              <div
                key={i}
                id={`test-${i}`}
                data-animate
                style={{
                  padding: 28, borderRadius: 16,
                  background: "#f8fafc", border: "1px solid #f1f5f9",
                  ...animStyle(`test-${i}`, i * 0.15),
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{t.avatar}</div>
                <p style={{
                  fontSize: 15, color: "#475569", lineHeight: 1.6,
                  margin: "0 0 16px 0", fontStyle: "italic",
                }}>
                  "{t.texto}"
                </p>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.nombre}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{t.empresa} · {t.ciudad}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CTA FINAL                                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(135deg, #0077B6, #00B4D8)",
        textAlign: "center", color: "white",
      }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 800, margin: "0 0 16px 0" }}>
          ¿Listo para profesionalizar tu negocio?
        </h2>
        <p style={{ fontSize: 18, opacity: 0.85, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
          Únete a las empresas que ya gestionan su alquiler de eventos de forma inteligente.
        </p>
        <button
          onClick={() => navigate("/registro")}
          style={{
            padding: "18px 48px", fontSize: 18, fontWeight: 700,
            background: "white", color: "#0077B6",
            border: "none", borderRadius: 12, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
        >
          Empieza gratis — 14 días
        </button>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CONTACTO                                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="contacto" style={{
        padding: "60px 24px", background: "#0f172a", color: "white",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 40,
        }}>
          {/* Columna 1 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <img src="/icons/swalquiler-logo.png" alt="SwAlquiler" style={{ width: 32 }} />
              <span style={{ fontSize: 18, fontWeight: 700 }}>SwAlquiler</span>
            </div>
            <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
              Software de gestión para empresas de alquiler de mobiliario y eventos en Colombia.
            </p>
          </div>

          {/* Columna 2 */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#cbd5e1" }}>PRODUCTO</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#funcionalidades" style={footerLink}>Funcionalidades</a>
              <a href="#precios" style={footerLink}>Precios</a>
              <a href="#calculadora" style={footerLink}>Calculadora de ahorro</a>
            </div>
          </div>

          {/* Columna 3 */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#cbd5e1" }}>LEGAL</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/terminos" style={footerLink}>Términos y condiciones</a>
              <a href="/terminos" style={footerLink}>Política de privacidad</a>
            </div>
          </div>

          {/* Columna 4 - Contacto */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#cbd5e1" }}>CONTACTO</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <a href="tel:3214909600" style={{ ...footerLink, display: "flex", alignItems: "center", gap: 8 }}>
                📱 321 490 9600
              </a>
              <a href="https://wa.me/573214909600" target="_blank" rel="noreferrer" style={{ ...footerLink, display: "flex", alignItems: "center", gap: 8 }}>
                💬 WhatsApp
              </a>
              <a href="mailto:soporte@swalquiler.com" style={{ ...footerLink, display: "flex", alignItems: "center", gap: 8 }}>
                📧 soporte@swalquiler.com
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          maxWidth: 1100, margin: "40px auto 0", paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            © 2026 SwAlquiler. Todos los derechos reservados. Villavicencio, Colombia.
          </span>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            Hecho con ❤️ para empresas de eventos
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BOTÓN FLOTANTE WHATSAPP                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <a
        href="https://wa.me/573214909600?text=Hola%2C%20quiero%20información%20sobre%20SwAlquiler"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 60, height: 60, borderRadius: "50%",
          background: "#25D366", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, textDecoration: "none",
          boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
          zIndex: 1000, transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        title="Chatea con nosotros por WhatsApp"
      >
        💬
      </a>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CSS RESPONSIVE                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40% { transform: translateX(-50%) translateY(-10px); }
          60% { transform: translateX(-50%) translateY(-5px); }
        }

        .landing-nav-hamburger { display: none !important; }

        @media (max-width: 768px) {
          .landing-nav-desktop { display: none !important; }
          .landing-nav-hamburger { display: block !important; }
        }

        /* Smooth scroll */
        html { scroll-behavior: smooth; }

        /* Range slider */
        input[type="range"]::-webkit-slider-thumb {
          width: 24px; height: 24px;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ─── Estilos compartidos ────────────────────────────────────────
const navLink = {
  textDecoration: "none", color: "#475569",
  fontSize: 14, fontWeight: 500,
  transition: "color 0.2s",
};

const navBtnPrimario = {
  padding: "9px 22px", fontSize: 14, fontWeight: 600,
  background: "linear-gradient(135deg, #0077B6, #00B4D8)",
  color: "white", border: "none", borderRadius: 8,
  cursor: "pointer",
};

const navBtnSecundario = {
  padding: "9px 22px", fontSize: 14, fontWeight: 500,
  background: "transparent", color: "#0077B6",
  border: "1px solid #0077B6", borderRadius: 8,
  cursor: "pointer",
};

const footerLink = {
  textDecoration: "none", color: "#94a3b8",
  fontSize: 14, transition: "color 0.2s",
};