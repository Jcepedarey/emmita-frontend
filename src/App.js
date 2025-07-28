import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Container } from "@mui/material";
import Navbar from "./components/Navbar";
import Navegacion from "./components/Navegacion";
import BotonIAFlotante from "./components/BotonIAFlotante";
import AsistenteModal from "./components/AsistenteModal";

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
          alert("Sesión cerrada por inactividad.");
          window.location.href = "/";
        }
      }, MAX_INACTIVIDAD);
    };

    // Detectar actividad del usuario
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer(); // iniciar el temporizador

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, []);

  return (
    <>
      <CssBaseline />
      <Router>
        <Navbar />
        <Navegacion />
        <Container>
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

        {/* ✅ Asistente IA: modal y botón flotante */}
        <AsistenteModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        <BotonIAFlotante onClick={() => setModalVisible(true)} />
      </Router>
    </>
  );
}

export default App;