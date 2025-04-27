// C:\Users\pc\frontend-emmita\src\pages\Agenda.js
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Agenda() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [pedidos, setPedidos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const cargarDatos = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { data: pedidosData } = await supabase
      .from("ordenes_pedido")
      .select("id, total, fecha_evento, clientes (nombre)")
      .eq("fecha_evento", fecha);

    const { data: cotizacionesData } = await supabase
      .from("cotizaciones")
      .select("id, total, fecha_evento, clientes (nombre)")
      .eq("fecha_evento", fecha);

    const { data: notasData } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha);

    setPedidos(pedidosData || []);
    setCotizaciones(cotizacionesData || []);
    setNotas(notasData || []);
  };

  const agregarNota = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];
    if (!nuevaNota) return;

    const { error } = await supabase.from("agenda").insert([
      {
        titulo: "Nota",
        descripcion: nuevaNota,
        fecha,
        documento_id: null,
        tipo: null
      },
    ]);

    if (!error) {
      setNuevaNota("");
      cargarDatos();
    }
  };

  const irADocumento = async (id, tipo) => {
    const tabla = tipo === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { data, error } = await supabase.from(tabla).select("*").eq("id", id).single();

    if (!error && data) {
      navigate("/crear-documento", { state: { documento: data, tipo } });
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "700px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Calendario y Agenda</h2>

      <Calendar
        onChange={setFechaSeleccionada}
        value={fechaSeleccionada}
        className="react-calendar"
      />

      <h3 style={{ marginTop: "1rem" }}>Pedidos para el {fechaSeleccionada.toLocaleDateString()}</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {pedidos.map((pedido) => (
          <li key={pedido.id} style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
            <strong>Pedido</strong> - {pedido.clientes?.nombre || "Cliente desconocido"}<br />
            Total: ${pedido.total?.toLocaleString("es-CO")}<br />
            <button onClick={() => irADocumento(pedido.id, "orden")} style={{ marginTop: "5px" }}>
              Ver Pedido
            </button>
          </li>
        ))}
      </ul>

      <h3 style={{ marginTop: "1rem" }}>Cotizaciones para el {fechaSeleccionada.toLocaleDateString()}</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {cotizaciones.map((cotizacion) => (
          <li key={cotizacion.id} style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
            <strong>Cotización</strong> - {cotizacion.clientes?.nombre || "Cliente desconocido"}<br />
            Total: ${cotizacion.total?.toLocaleString("es-CO")}<br />
            <button onClick={() => irADocumento(cotizacion.id, "cotizacion")} style={{ marginTop: "5px" }}>
              Ver Cotización
            </button>
          </li>
        ))}
      </ul>

      <h3 style={{ marginTop: "1rem" }}>Notas</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notas.map((nota) => (
          <li key={nota.id} style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
            <strong>{nota.titulo}</strong><br />
            {nota.descripcion}
          </li>
        ))}
      </ul>

      <textarea
        placeholder="Agregar nota o recordatorio"
        value={nuevaNota}
        onChange={(e) => setNuevaNota(e.target.value)}
        rows={3}
        style={{ width: "100%", marginTop: "10px", padding: "8px" }}
      /><br />
      <button onClick={agregarNota} style={{ width: "100%", marginTop: "8px", padding: "10px" }}>
        Guardar Nota
      </button>
    </div>
  );
}
