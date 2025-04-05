import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { exportarCSV } from "../utils/exportarCSV";

export default function Exportar() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const exportar = async (tabla, nombre) => {
    let query = supabase.from(tabla).select("*");

    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);

    const { data, error } = await query;
    if (!error) exportarCSV(data, nombre);
  };

  const exportarSinFechas = async (tabla, nombre) => {
    const { data } = await supabase.from(tabla).select("*");
    exportarCSV(data, nombre);
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>📁 Exportar respaldos</h2>

      <p style={{ marginBottom: "0.5rem" }}><strong>Rango de fechas (opcional):</strong></p>
      <input
        type="date"
        value={desde}
        onChange={(e) => setDesde(e.target.value)}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />
      <input
        type="date"
        value={hasta}
        onChange={(e) => setHasta(e.target.value)}
        style={{ width: "100%", marginBottom: "20px", padding: "8px" }}
      />

      <button onClick={() => exportar("cotizaciones", "cotizaciones")} style={btnStyle}>📤 Exportar Cotizaciones</button>
      <button onClick={() => exportar("ordenes_pedido", "ordenes_pedido")} style={btnStyle}>📤 Exportar Órdenes de Pedido</button>
      <button onClick={() => exportarSinFechas("productos", "productos")} style={btnStyle}>📤 Exportar Productos</button>
      <button onClick={() => exportarSinFechas("clientes", "clientes")} style={btnStyle}>📤 Exportar Clientes</button>
      <button onClick={() => exportarSinFechas("usuarios", "usuarios")} style={btnStyle}>📤 Exportar Usuarios</button>
    </div>
  );
}

const btnStyle = {
  width: "100%",
  marginBottom: "10px",
  padding: "10px",
  cursor: "pointer"
};
