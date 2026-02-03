// src/App.js
import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { CssBaseline, CircularProgress } from "@mui/material";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import BotonIAFlotante from "./components/BotonIAFlotante";
import AsistenteModal from "./components/AsistenteModal";
import "./swal.css";
import "./App.css";
import { useNavigationState } from "./context/NavigationContext";

// 📦 Páginas principales
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import CrearDocumento from "./pages/CrearDocumento";
import Clientes from "./pages/Clientes";
import BuscarDocumento from "./pages/BuscarDocumento";
import BuscarRecepcion from "./pages/BuscarRecepcion";
import Trazabilidad from "./pages/Trazabilidad";
import Proveedores from "./pages/Proveedores";
import CotizacionesGuardadas from "./pages/CotizacionesGuardadas";
import OrdenesGuardadas from "./pages/OrdenesGuardadas";
import Exportar from "./pages/Exportar";
import Recepcion from "./pages/Recepcion";
import Contabilidad from "./pages/Contabilidad";
import Inventario from "./pages/Inventario";
import Reportes from "./pages/Reportes";
import Agenda from "./pages/Agenda";
import Usuarios from "./pages/Usuarios";

// 🆕 Componente Layout que maneja Sidebar + Contenido
const AppLayout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const esLogin = location.pathname === "/" || location.pathname === "/login";
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  // Detectar cambio de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // En móvil, cerrar sidebar automáticamente
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cerrar sidebar en móvil al cambiar de ruta
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleMenuClick = () => {
    if (isMobile) {
      // En móvil: toggle abrir/cerrar
      setSidebarOpen(!sidebarOpen);
    } else {
      // En PC: toggle colapsar/expandir
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // Si es login, no mostrar sidebar ni bottom nav
  if (esLogin || !usuario) {
    return <>{children}</>;
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={handleCloseSidebar}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Contenido principal */}
      <main className="app-main">
        {children}
      </main>

      {/* Bottom Nav (solo móvil) */}
      <BottomNav />
    </div>
  );
};

function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { clearAllStates } = useNavigationState();

  // 🔐 FASE 1: Cierre de sesión por inactividad
  useEffect(() => {
    let timer;
    const MAX_INACTIVIDAD = 20 * 60 * 1000; // 20 minutos

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const usuario = localStorage.getItem("usuario");
        if (usuario) {
          localStorage.removeItem("usuario");
          clearAllStates();
          alert("Sesión cerrada por inactividad.");
          window.location.href = "/";
        }
      }, MAX_INACTIVIDAD);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, []);

  const handleMenuClick = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <>
      <CssBaseline />
      <Router>
        <Navbar onMenuClick={handleMenuClick} />
        
        <AppLayoutWrapper 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        >
          <Suspense fallback={<CircularProgress style={{ display: "block", margin: "50px auto" }} />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/crear-documento" element={<CrearDocumento />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/buscar-documento" element={<BuscarDocumento />} />
              <Route path="/buscar-recepcion" element={<BuscarRecepcion />} />
              <Route path="/cotizacionesguardadas" element={<CotizacionesGuardadas />} />
              <Route path="/ordenesguardadas" element={<OrdenesGuardadas />} />
              <Route path="/trazabilidad" element={<Trazabilidad />} />
              <Route path="/proveedores" element={<Proveedores />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/recepcion" element={<Recepcion />} />
              <Route path="/contabilidad" element={<Contabilidad />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/exportar" element={<Exportar />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </AppLayoutWrapper>

        {/* ✅ Asistente IA: modal y botón flotante */}
        <AsistenteModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        <BotonIAFlotante onClick={() => setModalVisible(true)} />
      </Router>
    </>
  );
}

// 🆕 Wrapper que usa useLocation (debe estar dentro de Router)
const AppLayoutWrapper = ({ children, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }) => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const esLogin = location.pathname === "/" || location.pathname === "/login";
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile, setSidebarOpen]);

  // Si es login, no mostrar layout especial
  if (esLogin || !usuario) {
    return <div className="app-content-login">{children}</div>;
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default App;