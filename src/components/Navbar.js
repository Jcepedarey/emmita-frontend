// src/components/Navbar.js
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { useNavigationState } from "../context/NavigationContext";
import "../estilos/EstilosGlobales.css";

const Navbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const esLogin = location.pathname === "/" || location.pathname === "/login";
  const { clearAllStates } = useNavigationState();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("usuario");
    clearAllStates();
    navigate("/");
  };

  return (
    <nav className="sw-navbar">
      <div className="sw-navbar-contenido">
        {/* 🆕 Botón hamburguesa + Logo y título */}
        <div className="sw-navbar-izquierda">
          {/* Botón hamburguesa (solo si está logueado) */}
          {usuario && !esLogin && (
            <button 
              className="sw-navbar-hamburger"
              onClick={onMenuClick}
              title="Menú"
              aria-label="Abrir menú"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          )}

          {/* Logo y título */}
          <Link to={esLogin ? "/" : "/inicio"} className="sw-navbar-marca" style={{ textDecoration: 'none' }}>
            {!esLogin && usuario && (
              <img
                src="/icons/swalquiler-logo.png"
                alt="SwAlquiler"
                className="sw-navbar-logo"
              />
            )}
            <div>
              <h1 className="sw-navbar-titulo">
                {esLogin ? "SwAlquiler" : "SwAlquiler"}
              </h1>
              {!esLogin && (
                <p className="sw-navbar-subtitulo">Alquiler y eventos Emmita</p>
              )}
            </div>
          </Link>
        </div>

        {/* Acciones */}
        {usuario && !esLogin && (
          <div className="sw-navbar-acciones">
            {/* Navegación rápida (solo PC) */}
            <button 
              className="sw-navbar-btn-icon nav-pc-only" 
              onClick={() => navigate(-1)}
              title="Atrás"
            >
              ←
            </button>
            <button 
              className="sw-navbar-btn-icon nav-pc-only" 
              onClick={() => navigate(1)}
              title="Adelante"
            >
              →
            </button>
            <button 
              className="sw-navbar-btn-icon nav-pc-only" 
              onClick={() => navigate("/inicio")}
              title="Inicio"
            >
              🏠
            </button>

            {/* Cerrar sesión */}
            <button
              className="sw-navbar-btn"
              onClick={handleLogout}
              style={{ marginLeft: '8px' }}
            >
              <span style={{ fontSize: '14px' }}>🚪</span>
              <span className="ocultar-movil">Salir</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;