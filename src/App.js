// src/App.js
import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Container } from "@mui/material";
import Navbar from "./components/Navbar";
import ProtegidoPorRol from "./components/ProtegidoPorRol";
import Navegacion from "./components/Navegacion";

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

// Carga diferida
const Inventario = React.lazy(() => import("./pages/Inventario"));
const Reportes = React.lazy(() => import("./pages/Reportes"));
const Agenda = React.lazy(() => import("./pages/Agenda"));
const Usuarios = React.lazy(() => import("./pages/Usuarios"));
const Recepcion = React.lazy(() => import("./pages/Recepcion")); // futuro
const Contabilidad = React.lazy(() => import("./pages/Contabilidad")); // futuro

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
              
              <Route
                path="/inventario"
                element={
                  <ProtegidoPorRol rolRequerido="admin">
                    <Inventario />
                  </ProtegidoPorRol>
                }
              />
              <Route
                path="/reportes"
                element={
                  <ProtegidoPorRol rolRequerido="admin">
                    <Reportes />
                  </ProtegidoPorRol>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtegidoPorRol rolRequerido="admin">
                    <Usuarios />
                  </ProtegidoPorRol>
                }
              />
              <Route
                path="/exportar"
                element={
                  <ProtegidoPorRol rolRequerido="admin">
                    <Exportar />
                  </ProtegidoPorRol>
                }
              />
              <Route
                path="/recepcion"
                element={
                  <ProtegidoPorRol rolRequerido="admin">
                    <Recepcion />
                  </ProtegidoPorRol>
                }
              />
              <Route
                path="/contabilidad"
                element={
                  <ProtegidoPorRol rolRequerido="admin">
                    <Contabilidad />
                  </ProtegidoPorRol>
                }
              />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </Container>
      </Router>
    </>
  );
}

export default App;
