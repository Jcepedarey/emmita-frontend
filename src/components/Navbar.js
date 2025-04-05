import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    navigate("/");
  };

  const navLinks = [
    { label: "Inicio", path: "/inicio" },
    { label: "Inventario", path: "/inventario" },
    { label: "Reportes", path: "/reportes" },
    { label: "Agenda", path: "/agenda" },
    { label: "Usuarios", path: "/usuarios" },
  ];

  return (
    <AppBar position="static" sx={{ background: "#333" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          SwAlquiler - Alquiler y eventos Emmita
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
            }}
          >
            {link.label}
          </Button>
        ))}

        {usuario && (
          <>
            <Typography sx={{ mx: 2 }}>{usuario.nombre}</Typography>
            <Button color="inherit" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
