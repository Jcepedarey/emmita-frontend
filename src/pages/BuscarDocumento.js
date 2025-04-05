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

  const limpiarFiltros = () => {
    setFiltros({ cliente: "", fechaCreacion: "", fechaEvento: "", id: "" });
  };

  const obtenerNombreCliente = (id) => {
    const cliente = clientes.find((c) => c.id === id);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "650px", margin: "auto" }}>
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

      <select
        value={filtros.cliente}
        onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      >
        <option value="">-- Seleccionar Cliente --</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
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

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button onClick={cargarDocumentos} style={{ flex: 1, padding: "10px" }}>
          Buscar
        </button>
        <button onClick={limpiarFiltros} style={{ flex: 1, padding: "10px" }}>
          Limpiar
        </button>
      </div>

      <h3>Resultados</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {documentos.map((doc) => (
          <li key={doc.id} style={{
            marginBottom: "1rem",
            border: "1px solid #ccc",
            borderRadius: "10px",
            padding: "10px",
            background: "#fdfdfd"
          }}>
            <strong>ID:</strong> {doc.id}<br />
            <strong>Cliente:</strong> {obtenerNombreCliente(doc.cliente_id)}<br />
            <strong>Total:</strong> ${doc.total}<br />
            <strong>Fecha creación:</strong> {doc.fecha}<br />
            {doc.fecha_evento && <><strong>Fecha evento:</strong> {doc.fecha_evento}<br /></>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => cargarEnCrear(doc)}>Editar</button>
              <button onClick={() => eliminarDocumento(doc.id)}>Eliminar</button>
              <button onClick={() => generarPDF(doc, tipo)}>Descargar PDF</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
