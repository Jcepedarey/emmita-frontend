import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Container } from "@mui/material";
import Navbar from "./components/Navbar";
import ProtegidoPorRol from "./components/ProtegidoPorRol";
import Navegacion from "./components/Navegacion";

import Login from "./pages/Login";
import Registro from "./pages/Registro"; // ✅ NUEVO IMPORT
import Inicio from "./pages/Inicio";
import CrearDocumento from "./pages/CrearDocumento";
import Clientes from "./pages/Clientes";
import BuscarDocumento from "./pages/BuscarDocumento";
import Trazabilidad from "./pages/Trazabilidad";
import Proveedores from "./pages/Proveedores";
import CotizacionesGuardadas from "./pages/CotizacionesGuardadas";
import OrdenesGuardadas from "./pages/OrdenesGuardadas";
import Exportar from "./pages/Exportar";

const Inventario = React.lazy(() => import("./pages/Inventario"));
const Reportes = React.lazy(() => import("./pages/Reportes"));
const Agenda = React.lazy(() => import("./pages/Agenda"));
const Usuarios = React.lazy(() => import("./pages/Usuarios"));

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
              <Route path="/registro" element={<Registro />} /> {/* ✅ NUEVA RUTA */}
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/crear-documento" element={<CrearDocumento />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/buscar" element={<BuscarDocumento />} />
              <Route path="/cotizacionesguardadas" element={<CotizacionesGuardadas />} />
              <Route path="/ordenesguardadas" element={<OrdenesGuardadas />} />
              <Route path="/trazabilidad" element={<Trazabilidad />} />
              <Route path="/proveedores" element={<Proveedores />} />
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
              <Route path="/agenda" element={<Agenda />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </Container>
      </Router>
    </>
  );
}

export default App;
