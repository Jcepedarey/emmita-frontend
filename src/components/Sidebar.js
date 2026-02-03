// src/components/Sidebar.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../estilos/Sidebar.css";

const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Lista de módulos con iconos y colores
  const modulos = [
    { id: "inicio", titulo: "Inicio", icono: "🏠", ruta: "/inicio", color: "#00B4D8" },
    { id: "crear", titulo: "Crear documento", icono: "📝", ruta: "/crear-documento", color: "#10b981" },
    { id: "clientes", titulo: "Clientes", icono: "👥", ruta: "/clientes", color: "#3b82f6" },
    { id: "inventario", titulo: "Inventario", icono: "📦", ruta: "/inventario", color: "#f59e0b" },
    { id: "agenda", titulo: "Agenda", icono: "📅", ruta: "/agenda", color: "#ef4444" },
    { id: "proveedores", titulo: "Proveedores", icono: "🚚", ruta: "/proveedores", color: "#8b5cf6" },
    { id: "buscar-doc", titulo: "Buscar documento", icono: "🔍", ruta: "/buscar-documento", color: "#06b6d4" },
    { id: "reportes", titulo: "Reportes", icono: "📊", ruta: "/reportes", color: "#ec4899" },
    { id: "trazabilidad", titulo: "Trazabilidad", icono: "📋", ruta: "/trazabilidad", color: "#14b8a6" },
    { id: "recepcion", titulo: "Recepción", icono: "📥", ruta: "/recepcion", color: "#6366f1" },
    { id: "buscar-recep", titulo: "Buscar recepción", icono: "🔎", ruta: "/buscar-recepcion", color: "#a855f7" },
    { id: "contabilidad", titulo: "Contabilidad", icono: "💰", ruta: "/contabilidad", color: "#22c55e" },
    { id: "usuarios", titulo: "Usuarios", icono: "👤", ruta: "/usuarios", color: "#64748b" },
  ];

  const handleNavegar = (ruta) => {
    navigate(ruta);
    // En móvil, cerrar sidebar al navegar
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  const esActivo = (ruta) => location.pathname === ruta;

  return (
    <>
      {/* Overlay para móvil (solo visible cuando sidebar está abierto en móvil) */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header del sidebar con logo */}
        <div className="sidebar-header">
          <img 
            src="/icons/swalquiler-logo.png" 
            alt="SwAlquiler" 
            className="sidebar-logo"
          />
          {!isCollapsed && (
            <div className="sidebar-brand">
              <span className="sidebar-brand-title">SwAlquiler</span>
              <span className="sidebar-brand-subtitle">Gestión de alquileres</span>
            </div>
          )}
        </div>

        {/* Lista de módulos */}
        <nav className="sidebar-nav">
          {modulos.map((mod) => (
            <button
              key={mod.id}
              className={`sidebar-item ${esActivo(mod.ruta) ? 'active' : ''}`}
              onClick={() => handleNavegar(mod.ruta)}
              title={isCollapsed ? mod.titulo : ''}
              style={{
                '--item-color': mod.color,
                '--item-bg': `${mod.color}15`,
              }}
            >
              <span className="sidebar-item-icon">{mod.icono}</span>
              {!isCollapsed && (
                <span className="sidebar-item-text">{mod.titulo}</span>
              )}
              {esActivo(mod.ruta) && <span className="sidebar-item-indicator" />}
            </button>
          ))}
        </nav>

        {/* Footer del sidebar (solo PC) */}
        <div className="sidebar-footer">
          <button 
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <span>{isCollapsed ? '»' : '«'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;