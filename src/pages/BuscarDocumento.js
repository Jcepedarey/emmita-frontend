import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF"; // ✅ Agregado

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
    <div style={{ padding: "1rem" }}>
      <h2>Buscar Documento</h2>

      <div>
        <label>Tipo:</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="cotizaciones">Cotización</option>
          <option value="ordenes_pedido">Orden de Pedido</option>
        </select>
      </div>

      <div>
        <label>ID de documento:</label>
        <input
          type="text"
          value={filtros.id}
          onChange={(e) => setFiltros({ ...filtros, id: e.target.value })}
        />
      </div>

      <div>
        <label>Cliente:</label>
        <select value={filtros.cliente} onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}>
          <option value="">-- Seleccionar --</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Fecha de creación:</label>
        <input
          type="date"
          value={filtros.fechaCreacion}
          onChange={(e) => setFiltros({ ...filtros, fechaCreacion: e.target.value })}
        />
      </div>

      {tipo === "ordenes_pedido" && (
        <div>
          <label>Fecha del evento:</label>
          <input
            type="date"
            value={filtros.fechaEvento}
            onChange={(e) => setFiltros({ ...filtros, fechaEvento: e.target.value })}
          />
        </div>
      )}

      <button onClick={cargarDocumentos}>Buscar</button>

      <h3>Resultados</h3>
      <ul>
        {documentos.map((doc) => (
          <li key={doc.id}>
            <strong>ID:</strong> {doc.id}<br />
            <strong>Cliente:</strong> {doc.cliente_id}<br />
            <strong>Total:</strong> ${doc.total}<br />
            <strong>Fecha:</strong> {doc.fecha}<br />
            {doc.fecha_evento && <><strong>Evento:</strong> {doc.fecha_evento}<br /></>}
            <button onClick={() => cargarEnCrear(doc)}>Editar</button>
            <button onClick={() => eliminarDocumento(doc.id)}>Eliminar</button>
            <button onClick={() => generarPDF(doc, tipo)}>Descargar PDF</button> {/* ✅ Agregado */}
          </li>
        ))}
      </ul>
    </div>
  );
}
