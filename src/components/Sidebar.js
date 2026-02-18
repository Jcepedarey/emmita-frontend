// src/components/Sidebar.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTenant } from "../context/TenantContext"; // ✅ IMPORT NUEVO

const Sidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const sidebarRef = useRef(null);
  
  // 🆕 Para mostrar tooltip cuando está colapsado
  const [hoveredModulo, setHoveredModulo] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  // ✅ CONEXIÓN AL TENANT (Para saber el nombre de la empresa)
  const { tenant } = useTenant();

  // Detectar cambio de tamaño
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lista de módulos
  const modulos = [
    { id: "inicio", titulo: "Inicio", icono: "🏠", ruta: "/inicio", color: "#00B4D8" },
    { id: "crear", titulo: "Crear documento", icono: "📝", ruta: "/crear-documento", color: "#10b981" },
    { id: "clientes", titulo: "Clientes", icono: "👥", ruta: "/clientes", color: "#3b82f6" },
    { id: "inventario", titulo: "Inventario", icono: "📦", ruta: "/inventario", color: "#f59e0b" },
    { id: "agenda", titulo: "Agenda", icono: "📅", ruta: "/agenda", color: "#ef4444" },
    { id: "proveedores", titulo: "Proveedores", icono: "🚚", ruta: "/proveedores", color: "#8b5cf6" },
    { id: "buscar-doc", titulo: "Buscar documento", icono: "🔍", ruta: "/buscar-documento", color: "#06b6d4" },
    { id: "reportes", titulo: "Dashboard", icono: "📊", ruta: "/reportes", color: "#ec4899" },
    { id: "trazabilidad", titulo: "Trazabilidad", icono: "📋", ruta: "/trazabilidad", color: "#14b8a6" },
    { id: "contabilidad", titulo: "Contabilidad", icono: "💰", ruta: "/contabilidad", color: "#22c55e" },
    { id: "recepcion", titulo: "Recepción", icono: "📥", ruta: "/recepcion", color: "#6366f1" },
    { id: "buscar-recep", titulo: "Buscar recepción", icono: "🔎", ruta: "/buscar-recepcion", color: "#a855f7" },
    { id: "usuarios", titulo: "Usuarios", icono: "👤", ruta: "/usuarios", color: "#64748b" },
  ];

  const handleNavegar = (ruta) => {
    navigate(ruta);
    if (isMobile) {
      onClose();
    }
  };

  const esActivo = (ruta) => location.pathname === ruta;

  // 🆕 Mostrar tooltip al pasar el mouse (solo cuando está colapsado en PC)
  const handleMouseEnter = (e, modulo) => {
    if (isCollapsed && !isMobile) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipTop(rect.top + rect.height / 2);
      setHoveredModulo(modulo);
    }
  };

  const handleMouseLeave = () => {
    setHoveredModulo(null);
  };

  // No mostrar en login
  if (location.pathname === "/" || location.pathname === "/login") {
    return null;
  }

  // No mostrar si no hay usuario
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (!usuario) {
    return null;
  }

  // Calcular el ancho del sidebar
  const sidebarWidth = isMobile ? 280 : (isCollapsed ? 68 : 240);

  return (
    <>
      {/* ========== OVERLAY (solo móvil) ========== */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 998,
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? "visible" : "hidden",
            transition: "opacity 0.3s ease, visibility 0.3s ease",
          }}
        />
      )}

      {/* ========== TOOLTIP FLOTANTE (solo PC colapsado) ========== */}
      {hoveredModulo && isCollapsed && !isMobile && (
        <div
          style={{
            position: "fixed",
            left: 76,
            top: tooltipTop,
            transform: "translateY(-50%)",
            backgroundColor: "#1f2937",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            zIndex: 1100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {hoveredModulo.titulo}
          {/* Flecha del tooltip */}
          <div
            style={{
              position: "absolute",
              left: "-6px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderRight: "6px solid #1f2937",
            }}
          />
        </div>
      )}

      {/* ========== SIDEBAR ========== */}
      <aside
        ref={sidebarRef}
        style={{
          position: "fixed",
          top: isMobile ? 0 : 56,
          left: 0,
          bottom: 0,
          width: sidebarWidth,
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          zIndex: 999,
          transform: isMobile 
            ? (isOpen ? "translateX(0)" : "translateX(-100%)")
            : "translateX(0)",
          transition: "transform 0.3s ease, width 0.25s ease",
          boxShadow: isMobile && isOpen ? "4px 0 25px rgba(0, 0, 0, 0.15)" : "none",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        {/* ========== HEADER ========== */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px",
            borderBottom: "1px solid #e5e7eb",
            minHeight: 64,
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Botón cerrar (solo móvil) */}
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 22,
                cursor: "pointer",
                padding: "4px 8px",
                color: "#6b7280",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          )}

          {/* Logo */}
          <img
            src="/icons/swalquiler-logo.png"
            alt="SwAlquiler"
            style={{
              width: 36,
              height: 36,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />

          {/* ✅ TEXTO DINÁMICO (Cambia según la empresa logueada) */}
          {(!isCollapsed || isMobile) && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>
                {tenant?.nombre || "SwAlquiler"}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                {tenant ? "Panel de gestión" : "Cargando..."}
              </div>
            </div>
          )}
        </div>

        {/* ========== LISTA DE MÓDULOS ========== */}
        <nav style={{ flex: 1, padding: 8, overflowY: "auto" }}>
          {modulos.map((mod) => {
            const activo = esActivo(mod.ruta);
            const isHovered = hoveredModulo?.id === mod.id;
            
            return (
              <button
                key={mod.id}
                onClick={() => handleNavegar(mod.ruta)}
                onMouseEnter={(e) => handleMouseEnter(e, mod)}
                onMouseLeave={handleMouseLeave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: isCollapsed && !isMobile ? "12px" : "10px 12px",
                  marginBottom: 4,
                  backgroundColor: activo 
                    ? `${mod.color}15` 
                    : (isHovered ? "#f3f4f6" : "transparent"),
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  gap: 12,
                  justifyContent: isCollapsed && !isMobile ? "center" : "flex-start",
                  position: "relative",
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* Indicador activo */}
                {activo && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 20,
                      backgroundColor: mod.color,
                      borderRadius: "0 3px 3px 0",
                    }}
                  />
                )}

                {/* Icono */}
                <span
                  style={{
                    fontSize: 20,
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transform: activo ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  {mod.icono}
                </span>

                {/* Texto (ocultar si colapsado en PC) */}
                {(!isCollapsed || isMobile) && (
                  <span
                    style={{
                      fontSize: 14,
                      color: activo ? mod.color : "#374151",
                      fontWeight: activo ? 600 : 400,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {mod.titulo}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ========== FOOTER (solo PC) ========== */}
        {!isMobile && (
          <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
              style={{
                width: "100%",
                padding: 10,
                backgroundColor: "#f3f4f6",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            >
              {isCollapsed ? "»" : "«"}
            </button>
          </div>
        )}
      </aside>

      {/* CSS para animación del tooltip */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-5px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </>
  );
};

export default Sidebar;