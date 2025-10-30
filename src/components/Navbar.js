// src/components/Navbar.js
import React from "react";
import { AppBar, Toolbar, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowBack, ArrowForward, Home } from "@mui/icons-material";
import supabase from "../supabaseClient";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const esLogin = location.pathname === "/" || location.pathname === "/login";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("usuario");
    navigate("/");
  };

  // Solo mostramos "Inicio" cuando NO estamos en la pantalla de Login
  const navLinks = !esLogin ? [{ label: "Inicio", path: "/inicio" }] : [];

  return (
    <AppBar position="static" sx={{ background: "#333" }}>
      <Toolbar sx={{ minHeight: { xs: 48, sm: 64 } }}>
        {/* === Marca con logo (solo si hay sesión y no estamos en login) === */}
        <div style={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          {!esLogin && usuario && (
  <img
    src="/icons/swalquiler-logo.png"
    alt="SwAlquiler"
    className="app-logo-nav"
    style={{
  height: "1.8em",    // antes 1.1em → un ~20% más grande
  maxHeight: "30px",  // antes 22px → da un poquito más de margen
  width: "auto",
  marginRight: "6px",
  verticalAlign: "middle",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,.08))"
}}
  />
)}
          <Typography variant="h6" sx={{ fontSize: { xs: 16, sm: 20 } }}>
            {esLogin ? "SwAlquiler" : "SwAlquiler - Alquiler y eventos Emmita"}
          </Typography>
        </div>

        {/* === Links === */}
        {navLinks.map((link) => (
          <Button
            key={link.path}
            color="inherit"
            component={Link}
            to={link.path}
            sx={{
              textDecoration: location.pathname === link.path ? "underline" : "none",
              fontWeight: location.pathname === link.path ? "bold" : "normal",
              borderBottom: location.pathname === link.path ? "2px solid white" : "none",
              display: { xs: "none", sm: "inline-flex" }, // oculta en móvil chico
            }}
          >
            {link.label}
          </Button>
        ))}

        {/* === Navegación rápida (solo si hay sesión y no es login) === */}
        {usuario && !esLogin && (
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            <Tooltip title="Atrás" arrow>
              <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
                <ArrowBack fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Adelante" arrow>
              <IconButton color="inherit" size="small" onClick={() => navigate(1)}>
                <ArrowForward fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Inicio" arrow>
              <IconButton color="inherit" size="small" onClick={() => navigate("/inicio")}>
                <Home fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        )}

        {/* === Botón Cerrar sesión === */}
        {usuario && !esLogin && (
          <Button
            color="inherit"
            onClick={handleLogout}
            size="small"
            sx={{ ml: 1, px: { xs: 1, sm: 2 }, whiteSpace: "nowrap" }}
          >
            Cerrar sesión
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
