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
    const { data, error } = await supabase.from("productos").select("id, nombre").order("nombre");
    if (data) setProductos(data);
  };

  const buscarTrazabilidad = async () => {
    if (!productoSeleccionado) {
      alert("Selecciona un producto");
      return;
    }

    let query = supabase
      .from("trazabilidad")
      .select("*, producto_id, cliente_id")
      .eq("producto_id", productoSeleccionado);

    if (fecha) {
      query = query.gte("fecha", fecha);
    }

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
    <div style={{ padding: "1rem" }}>
      <h2>Trazabilidad de Artículos</h2>

      <div>
        <label>Producto:</label>
        <select
          value={productoSeleccionado}
          onChange={(e) => setProductoSeleccionado(e.target.value)}
        >
          <option value="">-- Seleccionar --</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Filtrar por fecha desde:</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      <button onClick={buscarTrazabilidad}>Buscar</button>

      <h3>Resultados</h3>
      <ul>
        {movimientos.map((m) => (
          <li key={m.id}>
            <strong>Fecha:</strong> {m.fecha?.split("T")[0]}<br />
            <strong>Cliente:</strong> {m.cliente}<br />
            <strong>Detalle:</strong> {m.descripcion}
          </li>
        ))}
      </ul>
    </div>
  );
}
