import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          Emmita - Gestión de Eventos
        </Typography>
        <Button color="inherit" component={Link} to="/">Cotizaciones</Button>
        <Button color="inherit" component={Link} to="/inventario">Inventario</Button>
        <Button color="inherit" component={Link} to="/reportes">Reportes</Button>
        <Button color="inherit" component={Link} to="/agenda">Agenda</Button>
        <Button color="inherit" component={Link} to="/usuarios">Usuarios</Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

