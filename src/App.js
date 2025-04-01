import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { CssBaseline, CircularProgress, Container } from "@mui/material";
import Navbar from "./components/Navbar"; // Importamos el menú
import ProtegidoPorRol from "./components/ProtegidoPorRol"; // ✅ Agregado

import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import CrearDocumento from "./pages/CrearDocumento";
import Clientes from "./pages/Clientes";
import BuscarDocumento from "./pages/BuscarDocumento";
import Trazabilidad from "./pages/Trazabilidad";
import Proveedores from "./pages/Proveedores";

// Carga diferida de las páginas (CORRECTO)
const Cotizaciones = React.lazy(() => import("./pages/Cotizaciones"));
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
        <Container>
          <Suspense fallback={<CircularProgress style={{ display: "block", margin: "50px auto" }} />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/crear-documento" element={<CrearDocumento />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/buscar" element={<BuscarDocumento />} />
              <Route path="/trazabilidad" element={<Trazabilidad />} />
              <Route path="/proveedores" element={<Proveedores />} />
              <Route path="/cotizaciones" element={<Cotizaciones />} />
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
              <Route path="/agenda" element={<Agenda />} />
            </Routes>
          </Suspense>
        </Container>
      </Router>
    </>
  );
}

export default App;
