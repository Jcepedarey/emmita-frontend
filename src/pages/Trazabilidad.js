// src/pages/Trazabilidad.js (actualizado)
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";

export default function Trazabilidad() {
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data } = await supabase.from("productos").select("id, nombre, categoria").order("nombre");
    if (data) {
      setProductos(data);
      const unicas = [...new Set(data.map(p => p.categoria).filter(Boolean))];
      setCategorias(unicas);
    }
  };

  const buscarTrazabilidad = async () => {
    if (!productoSeleccionado) return alert("Selecciona un producto válido");

    let query = supabase
      .from("trazabilidad")
      .select("*, producto_id, cliente_id")
      .eq("producto_id", productoSeleccionado);

    if (fechaDesde) query = query.gte("fecha", fechaDesde);
    if (fechaHasta) query = query.lte("fecha", fechaHasta);

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

  const productosFiltrados = productos.filter((p) => {
    return (
      p.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) &&
      (!categoriaSeleccionada || p.categoria === categoriaSeleccionada)
    );
  });

  return (
    <div style={{ padding: "1rem", maxWidth: "700px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "20px", marginBottom: "1rem" }}>Trazabilidad de Artículos</h2>

      {/* Buscador de producto por nombre */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Buscar producto por nombre:</label>
        <input
          type="text"
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          placeholder="Ej: silla"
          style={{ width: "100%", padding: "8px", marginTop: 4 }}
        />
      </div>

      {/* Lista de productos filtrados */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Seleccionar producto:</label>
        <select
          value={productoSeleccionado || ""}
          onChange={(e) => setProductoSeleccionado(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: 4 }}
        >
          <option value="">-- Seleccionar --</option>
          {productosFiltrados.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {/* Filtro por categoría */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Filtrar por categoría:</label>
        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: 4 }}
        >
          <option value="">Todas</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label>Desde:</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: 4 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Hasta:</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: 4 }}
          />
        </div>
      </div>

      <button
        onClick={buscarTrazabilidad}
        style={{ width: "100%", padding: "10px", fontWeight: "bold", backgroundColor: "#1f2937", color: "white", border: "none", borderRadius: "6px" }}
      >
        Buscar
      </button>

      {/* Resultados */}
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
