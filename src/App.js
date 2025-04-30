// src/App.js
import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Container } from "@mui/material";
import Navbar from "./components/Navbar";
import Navegacion from "./components/Navegacion";

// 📦 Páginas principales
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import CrearDocumento from "./pages/CrearDocumento";
import Clientes from "./pages/Clientes";
import BuscarDocumento from "./pages/BuscarDocumento";
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
      </Router>
    </>
  );
}

export default App;
