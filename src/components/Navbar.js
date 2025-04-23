import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const handleLogout = async () => {
    await supabase.auth.signOut(); // ✅ cierra sesión en Supabase
    localStorage.removeItem("usuario"); // ✅ borra info local
    navigate("/"); // ✅ redirige al login
  };

  const navLinks = [
    { label: "Inicio", path: "/inicio" },
    { label: "Login", path: "/" }
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
            <Typography sx={{ mx: 2 }}>{usuario.email}</Typography>
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
