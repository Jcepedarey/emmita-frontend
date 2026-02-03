// src/App.js
import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Container } from "@mui/material";
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

function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const { clearAllStates } = useNavigationState();
  
  // 🆕 Estados para el sidebar
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);

  // 🔐 Cierre de sesión por inactividad
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
  }, [clearAllStates]);

  // 🆕 Función para el botón hamburguesa
  const toggleSidebar = () => {
    const esMobile = window.innerWidth <= 768;
    console.log("Toggle sidebar - esMobile:", esMobile, "sidebarAbierto:", sidebarAbierto);
    
    if (esMobile) {
      setSidebarAbierto(prev => !prev);
    } else {
      setSidebarColapsado(prev => !prev);
    }
  };

  // 🆕 Función para cerrar sidebar
  const cerrarSidebar = () => {
    console.log("Cerrando sidebar");
    setSidebarAbierto(false);
  };

  return (
    <>
      <CssBaseline />
      <Router>
        {/* Navbar con botón hamburguesa */}
        <Navbar onMenuClick={toggleSidebar} />
        
        {/* 🆕 Sidebar */}
        <Sidebar 
          isOpen={sidebarAbierto}
          isCollapsed={sidebarColapsado}
          onClose={cerrarSidebar}
          onToggleCollapse={() => setSidebarColapsado(prev => !prev)}
        />

        {/* Contenido principal */}
        <Container style={{ 
          marginLeft: window.innerWidth > 768 ? (sidebarColapsado ? 68 : 240) : 0,
          transition: 'margin-left 0.25s ease',
          paddingBottom: window.innerWidth <= 768 ? 80 : 20,
        }}>
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
        </Container>

        {/* 🆕 Barra inferior (solo móvil) */}
        <BottomNav />

        {/* Asistente IA */}
        <AsistenteModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        <BotonIAFlotante onClick={() => setModalVisible(true)} />
      </Router>
    </>
  );
}

export default App;