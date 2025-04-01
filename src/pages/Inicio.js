import React from "react";
import { useNavigate } from "react-router-dom";

const usuario = JSON.parse(localStorage.getItem("usuario"));
const esAdmin = usuario?.rol === "admin";

const iconos = [
  { nombre: "Crear documento", ruta: "/cotizaciones" },
  { nombre: "Clientes", ruta: "/clientes" },
  ...(esAdmin ? [{ nombre: "Inventario", ruta: "/inventario" }] : []),
  ...(esAdmin ? [{ nombre: "Usuarios", ruta: "/usuarios" }] : []),
  ...(esAdmin ? [{ nombre: "Reportes", ruta: "/reportes" }] : []),
  { nombre: "Buscar documento", ruta: "/buscar" },
  { nombre: "Trazabilidad", ruta: "/trazabilidad" },
  { nombre: "Calendario y agenda", ruta: "/agenda" },
  { nombre: "Proveedores", ruta: "/proveedores" },
];

export default function Inicio() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Inicio</h1>
      {/* Aquí se colocará tu logo */}
      <div style={{ margin: "20px auto" }}>
        <img src="/logo192.png" alt="logo" width="100" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "20px",
        }}
      >
        {iconos.map((item) => (
          <button
            key={item.nombre}
            onClick={() => navigate(item.ruta)}
            style={{ padding: "20px", fontSize: "16px" }}
          >
            {item.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
