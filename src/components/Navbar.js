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
  const isLogin = location.pathname === "/";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("usuario");
    navigate("/");
  };

  // Solo mostramos "Inicio" cuando NO estamos en la pantalla de Login
  const navLinks = !isLogin ? [{ label: "Inicio", path: "/inicio" }] : [];

  return (
    <AppBar position="static" sx={{ background: "#333" }}>
      <Toolbar sx={{ minHeight: { xs: 48, sm: 64 } }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: 16, sm: 20 } }}>
          {isLogin ? "SwAlquiler" : "SwAlquiler - Alquiler y eventos Emmita"}
        </Typography>

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
              display: { xs: "none", sm: "inline-flex" }, // oculta en móvil chico para dar espacio
            }}
          >
            {link.label}
          </Button>
        ))}

        {/* Botones de navegación: solo cuando hay sesión y no estamos en Login */}
        {usuario && !isLogin && (
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            <Tooltip title="Atrás" arrow>
              <IconButton
                color="inherit"
                size="small"
                aria-label="Atrás"
                onClick={() => navigate(-1)}
              >
                <ArrowBack fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Adelante" arrow>
              <IconButton
                color="inherit"
                size="small"
                aria-label="Adelante"
                onClick={() => navigate(1)}
              >
                <ArrowForward fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Inicio" arrow>
              <IconButton
                color="inherit"
                size="small"
                aria-label="Inicio"
                onClick={() => navigate("/inicio")}
              >
                <Home fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        )}

        {usuario && !isLogin && (
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