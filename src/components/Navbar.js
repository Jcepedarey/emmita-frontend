// src/components/Navbar.js
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { useNavigationState } from "../context/NavigationContext";
import "../estilos/EstilosGlobales.css";
import { useTenant } from "../context/TenantContext";
import { limpiarCacheTenant } from "../utils/tenantPDF";

const Navbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const esLogin = location.pathname === "/" || location.pathname === "/login";
  const { clearAllStates } = useNavigationState();
  const { tenant } = useTenant();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("usuario");
    localStorage.removeItem("sesion");
    limpiarCacheTenant();
    clearAllStates();
    navigate("/");
  };

  // 🆕 Handler para el botón hamburguesa con console.log
  const handleHamburgerClick = () => {
    console.log("Botón hamburguesa clickeado!");
    if (onMenuClick) {
      onMenuClick();
    } else {
      console.log("onMenuClick no está definido!");
    }
  };

  return (
    <nav className="sw-navbar">
      <div className="sw-navbar-contenido">
        {/* Sección izquierda: Hamburguesa + Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* 🆕 Botón hamburguesa (solo si está logueado) */}
          {usuario && !esLogin && (
            <button
              onClick={handleHamburgerClick}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                width: 36,
                height: 36,
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                padding: 8,
                gap: 4,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
              title="Menú"
              aria-label="Abrir menú"
            >
              <span style={{ display: "block", width: 18, height: 2, background: "white", borderRadius: 1 }} />
              <span style={{ display: "block", width: 18, height: 2, background: "white", borderRadius: 1 }} />
              <span style={{ display: "block", width: 18, height: 2, background: "white", borderRadius: 1 }} />
            </button>
          )}

          {/* Logo y título */}
          <Link to={esLogin ? "/" : "/inicio"} className="sw-navbar-marca" style={{ textDecoration: "none" }}>
            {!esLogin && usuario && (
              <img
                src="/icons/swalquiler-logo.png"
                alt="SwAlquiler"
                className="sw-navbar-logo"
              />
            )}
            <div>
              <h1 className="sw-navbar-titulo">SwAlquiler</h1>
              {!esLogin && (
                <p className="sw-navbar-subtitulo">{tenant?.nombre || "Cargando..."}</p>
              )}
            </div>
          </Link>
        </div>

        {/* Acciones */}
        {usuario && !esLogin && (
          <div className="sw-navbar-acciones">
            {/* Navegación rápida (solo PC) */}
            <button
              className="sw-navbar-btn-icon"
              onClick={() => navigate(-1)}
              title="Atrás"
              style={{ display: window.innerWidth > 768 ? "flex" : "none" }}
            >
              ←
            </button>
            <button
              className="sw-navbar-btn-icon"
              onClick={() => navigate(1)}
              title="Adelante"
              style={{ display: window.innerWidth > 768 ? "flex" : "none" }}
            >
              →
            </button>
            <button
              className="sw-navbar-btn-icon"
              onClick={() => navigate("/inicio")}
              title="Inicio"
              style={{ display: window.innerWidth > 768 ? "flex" : "none" }}
            >
              🏠
            </button>

            {/* Cerrar sesión */}
            <button
              className="sw-navbar-btn"
              onClick={handleLogout}
              style={{ marginLeft: 8 }}
            >
              <span style={{ fontSize: 14 }}>🚪</span>
              <span className="ocultar-movil">Salir</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .ocultar-movil {
          display: inline;
        }
        @media (max-width: 480px) {
          .ocultar-movil {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;