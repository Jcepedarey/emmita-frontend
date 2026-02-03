// src/components/BottomNav.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../estilos/BottomNav.css";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 5 módulos para la barra inferior
  const items = [
    { id: "inicio", titulo: "Inicio", icono: "🏠", ruta: "/inicio" },
    { id: "agenda", titulo: "Agenda", icono: "📅", ruta: "/agenda" },
    { id: "crear", titulo: "Crear", icono: "+", ruta: "/crear-documento", escentral: true },
    { id: "inventario", titulo: "Inventario", icono: "📦", ruta: "/inventario" },
    { id: "trazabilidad", titulo: "Trazabilidad", icono: "📋", ruta: "/trazabilidad" },
  ];

  const esActivo = (ruta) => location.pathname === ruta;

  // No mostrar en login
  if (location.pathname === "/" || location.pathname === "/login") {
    return null;
  }

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${esActivo(item.ruta) ? 'active' : ''} ${item.escentral ? 'central' : ''}`}
          onClick={() => navigate(item.ruta)}
        >
          {item.escentral ? (
            // Botón central más grande con +
            <div className="bottom-nav-fab">
              <span className="bottom-nav-fab-icon">+</span>
            </div>
          ) : (
            <>
              <span className="bottom-nav-icon">{item.icono}</span>
              <span className="bottom-nav-label">{item.titulo}</span>
            </>
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;