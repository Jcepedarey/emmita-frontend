// src/components/Navegacion.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack, ArrowForward, Home } from "@mui/icons-material";

const Navegacion = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        gap: "10px",
        background: "#ffffffee",
        padding: "6px 12px",
        borderRadius: "10px",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
        alignItems: "center"
      }}
    >
      <button onClick={() => navigate(-1)} title="Atrás" style={botonEstilo}>
        <ArrowBack style={iconoEstilo} />
      </button>
      <button onClick={() => navigate(1)} title="Adelante" style={botonEstilo}>
        <ArrowForward style={iconoEstilo} />
      </button>
      <button onClick={() => navigate("/inicio")} title="Inicio" style={botonEstilo}>
        <Home style={iconoEstilo} />
      </button>
    </div>
  );
};

const botonEstilo = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "4px"
};

const iconoEstilo = {
  fontSize: "20px",
  color: "#333" // ✅ Visible en fondo blanco
};

export default Navegacion;
