import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";

export default function BuscarDocumento() {
  const [tipo, setTipo] = useState("cotizaciones");
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente: "",
    fechaCreacion: "",
    fechaEvento: "",
    id: "",
  });

  useEffect(() => {
    cargarClientes();
    cargarDocumentos();
  }, [tipo]);

  const cargarClientes = async () => {
    const { data } = await supabase.from("clientes").select("*");
    if (data) setClientes(data);
  };

  const cargarDocumentos = async () => {
    let query = supabase.from(tipo).select("*");

    if (filtros.id) query = query.eq("id", filtros.id);
    if (filtros.cliente) query = query.eq("cliente_id", filtros.cliente);
    if (filtros.fechaCreacion) query = query.gte("fecha", filtros.fechaCreacion);
    if (filtros.fechaEvento && tipo === "ordenes_pedido") {
      query = query.gte("fecha_evento", filtros.fechaEvento);
    }

    const { data, error } = await query;
    if (!error) setDocumentos(data);
  };

  const eliminarDocumento = async (id) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    await supabase.from(tipo).delete().eq("id", id);
    cargarDocumentos();
  };

  const cargarEnCrear = (doc) => {
    localStorage.setItem("documento_para_editar", JSON.stringify(doc));
    window.location.href = "/crear-documento";
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Buscar Documento</h2>

      <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: "100%", marginBottom: "10px", padding: "8px" }}>
        <option value="cotizaciones">Cotización</option>
        <option value="ordenes_pedido">Orden de Pedido</option>
      </select>

      <input
        type="text"
        placeholder="ID de documento"
        value={filtros.id}
        onChange={(e) => setFiltros({ ...filtros, id: e.target.value })}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

      <select value={filtros.cliente} onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })} style={{ width: "100%", marginBottom: "10px", padding: "8px" }}>
        <option value="">-- Seleccionar Cliente --</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filtros.fechaCreacion}
        onChange={(e) => setFiltros({ ...filtros, fechaCreacion: e.target.value })}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

      {tipo === "ordenes_pedido" && (
        <input
          type="date"
          value={filtros.fechaEvento}
          onChange={(e) => setFiltros({ ...filtros, fechaEvento: e.target.value })}
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />
      )}

      <button onClick={cargarDocumentos} style={{ width: "100%", marginBottom: "1rem", padding: "10px" }}>Buscar</button>

      <h3>Resultados</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {documentos.map((doc) => (
          <li key={doc.id} style={{ marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "10px", padding: "10px" }}>
            <strong>ID:</strong> {doc.id}<br />
            <strong>Cliente:</strong> {doc.cliente_id}<br />
            <strong>Total:</strong> ${doc.total}<br />
            <strong>Fecha:</strong> {doc.fecha}<br />
            {doc.fecha_evento && <><strong>Evento:</strong> {doc.fecha_evento}<br /></>}
            <button onClick={() => cargarEnCrear(doc)} style={{ marginRight: "10px" }}>Editar</button>
            <button onClick={() => eliminarDocumento(doc.id)} style={{ marginRight: "10px" }}>Eliminar</button>
            <button onClick={() => generarPDF(doc, tipo)}>Descargar PDF</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
