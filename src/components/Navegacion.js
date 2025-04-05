// src/components/Navegacion.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack, ArrowForward, Home } from "@mui/icons-material";

const Navegacion = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      position: "fixed",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 1000,
      display: "flex",
      gap: "10px",
      background: "#fff",
      padding: "5px 10px",
      borderRadius: "8px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
    }}>
      <button onClick={() => navigate(-1)} title="Atrás" style={botonEstilo}><ArrowBack /></button>
      <button onClick={() => navigate(1)} title="Adelante" style={botonEstilo}><ArrowForward /></button>
      <button onClick={() => navigate("/inicio")} title="Inicio" style={botonEstilo}><Home /></button>
    </div>
  );
};

const botonEstilo = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "1.2rem"
};

export default Navegacion;
