// C:\Users\pc\frontend-emmita\src\pages\Agenda.js
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";

export default function Agenda() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [nuevaNota, setNuevaNota] = useState("");
  const [notas, setNotas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const cargarDatos = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { data: notasData } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha)
      .order("created_at", { ascending: true });

    const { data: ordenesData } = await supabase
      .from("ordenes_pedido")
      .select("*")
      .eq("fecha_evento", fecha);

    const { data: cotizacionesData } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("fecha_evento", fecha);

    setNotas(notasData || []);
    setOrdenes(ordenesData || []);
    setCotizaciones(cotizacionesData || []);
  };

  const guardarNota = async () => {
    if (!nuevaNota.trim()) return;

    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { error } = await supabase.from("agenda").insert([
      {
        titulo: "Nota",
        descripcion: nuevaNota,
        fecha,
        documento: null,
        tipo: null,
      },
    ]);

    if (!error) {
      setNuevaNota("");
      cargarDatos();
      Swal.fire("Nota guardada", "", "success");
    } else {
      console.error("Error al guardar nota:", error);
      Swal.fire("Error", "No se pudo guardar la nota", "error");
    }
  };

  const borrarNota = async (id) => {
    const { error } = await supabase.from("agenda").delete().eq("id", id);

    if (!error) {
      cargarDatos();
      Swal.fire("Nota eliminada", "", "success");
    } else {
      console.error("Error al borrar nota:", error);
      Swal.fire("Error", "No se pudo eliminar la nota", "error");
    }
  };

  const irADocumento = async (tipo, id) => {
    const tabla = tipo === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
  
    const { data: documento, error: errorDocumento } = await supabase
      .from(tabla)
      .select("*")
      .eq("id", id)
      .single();
  
    if (errorDocumento || !documento) {
      console.error("Error al cargar documento:", errorDocumento);
      return Swal.fire("Error", "No se pudo cargar el documento", "error");
    }
  
    const { data: cliente, error: errorCliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", documento.cliente_id)
      .single();
  
    if (errorCliente || !cliente) {
      console.error("Error al cargar cliente:", errorCliente);
      return Swal.fire("Error", "No se pudo cargar el cliente", "error");
    }
  
    navigate("/crear-documento", { state: { documento, tipo, cliente } });
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "1000px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>📅 Calendario y Agenda</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Calendario */}
        <div style={{ flex: "1" }}>
          <Calendar
            onChange={setFechaSeleccionada}
            value={fechaSeleccionada}
            className="react-calendar"
          />
        </div>

        {/* Notas */}
        <div style={{ flex: "2" }}>
          <textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribe una nota o recordatorio..."
            rows={3}
            style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
          />
          <button
            onClick={guardarNota}
            style={{ width: "100%", backgroundColor: "#388e3c", color: "white", padding: "10px", borderRadius: "6px" }}
          >
            Guardar Nota
          </button>

          <div style={{ backgroundColor: "#f1f1f1", padding: "10px", marginTop: "20px", borderRadius: "6px" }}>
            <h4>📝 Notas</h4>
            {notas.length === 0 && <p>No hay notas para este día.</p>}
            {notas.map((nota) => (
              <div key={nota.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px", marginTop: "5px", borderRadius: "4px" }}>
                <span>{nota.descripcion}</span>
                <div>
                  <button onClick={() => borrarNota(nota.id)} style={{ marginLeft: "10px", color: "red", border: "none", background: "none", cursor: "pointer" }}>
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pedidos y Cotizaciones */}
      <div style={{ display: "flex", marginTop: "30px", gap: "20px", flexWrap: "wrap" }}>
        {/* Pedidos */}
        <div style={{ flex: "1", backgroundColor: "#e3f2fd", padding: "10px", borderRadius: "8px", minHeight: "200px", overflowY: "auto" }}>
          <h4>📦 Órdenes de Pedido</h4>
          {ordenes.length === 0 && <p>No hay pedidos para este día.</p>}
          {ordenes.map((orden) => (
            <div
              key={orden.id}
              onClick={() => irADocumento("orden", orden.id)}
              style={{ backgroundColor: "#bbdefb", padding: "8px", margin: "5px 0", borderRadius: "6px", cursor: "pointer" }}
            >
              {orden.numero}
            </div>
          ))}
        </div>

        {/* Cotizaciones */}
        <div style={{ flex: "1", backgroundColor: "#ffebee", padding: "10px", borderRadius: "8px", minHeight: "200px", overflowY: "auto" }}>
          <h4>📄 Cotizaciones</h4>
          {cotizaciones.length === 0 && <p>No hay cotizaciones para este día.</p>}
          {cotizaciones.map((cotizacion) => (
            <div
              key={cotizacion.id}
              onClick={() => irADocumento("cotizacion", cotizacion.id)}
              style={{ backgroundColor: "#ffcdd2", padding: "8px", margin: "5px 0", borderRadius: "6px", cursor: "pointer" }}
            >
              {cotizacion.numero}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
