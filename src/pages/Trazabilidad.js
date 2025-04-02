import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";

export default function Trazabilidad() {
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data } = await supabase.from("productos").select("id, nombre").order("nombre");
    if (data) setProductos(data);
  };

  const buscarTrazabilidad = async () => {
    if (!productoSeleccionado) return alert("Selecciona un producto");

    let query = supabase
      .from("trazabilidad")
      .select("*, producto_id, cliente_id")
      .eq("producto_id", productoSeleccionado);

    if (fecha) query = query.gte("fecha", fecha);

    const { data, error } = await query;

    if (!error) {
      const conClientes = await Promise.all(
        data.map(async (mov) => {
          const cliente = await supabase.from("clientes").select("nombre").eq("id", mov.cliente_id).single();
          return {
            ...mov,
            cliente: cliente.data?.nombre || "No identificado",
          };
        })
      );
      setMovimientos(conClientes);
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Trazabilidad de Artículos</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>Producto:</label>
        <select
          value={productoSeleccionado}
          onChange={(e) => setProductoSeleccionado(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: 4 }}
        >
          <option value="">-- Seleccionar --</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Filtrar por fecha desde:</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: 4 }}
        />
      </div>

      <button onClick={buscarTrazabilidad} style={{ width: "100%", padding: "10px" }}>
        Buscar
      </button>

      <h3 style={{ marginTop: "2rem" }}>Resultados</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {movimientos.map((m) => (
          <li key={m.id} style={{ borderBottom: "1px solid #ccc", padding: "10px 0" }}>
            <strong>Fecha:</strong> {m.fecha?.split("T")[0]}<br />
            <strong>Cliente:</strong> {m.cliente}<br />
            <strong>Detalle:</strong> {m.descripcion}
          </li>
        ))}
      </ul>
    </div>
  );
}
