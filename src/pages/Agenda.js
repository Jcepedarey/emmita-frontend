// C:\Users\pc\frontend-emmita\src\pages\Agenda.js
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function Agenda() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [notas, setNotas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [notaEditando, setNotaEditando] = useState(null);
  const [textoNota, setTextoNota] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    cargarNotas();
    cargarDocumentos();
  }, [fechaSeleccionada]);

  const cargarNotas = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha)
      .order("created_at", { ascending: true });

    if (!error) setNotas(data);
  };

  const cargarDocumentos = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { data: pedidos } = await supabase
      .from("ordenes_pedido")
      .select("id, cliente_id, total, fecha_evento, numero")
      .eq("fecha_evento", fecha);

    const { data: cotis } = await supabase
      .from("cotizaciones")
      .select("id, cliente_id, total, fecha_evento, numero")
      .eq("fecha_evento", fecha);

    setOrdenes(pedidos || []);
    setCotizaciones(cotis || []);
  };

  const guardarNota = async () => {
    if (!textoNota.trim()) return;

    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    if (notaEditando) {
      const { error } = await supabase
        .from("agenda")
        .update({ descripcion: textoNota })
        .eq("id", notaEditando);

      if (!error) {
        setNotaEditando(null);
        setTextoNota("");
        cargarNotas();
      }
    } else {
      const { error } = await supabase.from("agenda").insert([
        {
          titulo: "Nota",
          descripcion: textoNota,
          fecha,
          documento_id: null,
          tipo: null,
        },
      ]);

      if (!error) {
        setTextoNota("");
        cargarNotas();
      }
    }
  };

  const editarNota = (nota) => {
    setNotaEditando(nota.id);
    setTextoNota(nota.descripcion);
  };

  const eliminarNota = async (id) => {
    const confirmacion = await Swal.fire({
      title: "¿Eliminar nota?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (confirmacion.isConfirmed) {
      await supabase.from("agenda").delete().eq("id", id);
      cargarNotas();
    }
  };

  const irADocumento = (id, tipo) => {
    navigate("/crear-documento", { state: { documentoId: id, tipo } });
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "1200px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
        📅 Calendario y Agenda
      </h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Calendario */}
        <div style={{ flex: "1 1 300px" }}>
          <Calendar
            onChange={setFechaSeleccionada}
            value={fechaSeleccionada}
            className="react-calendar"
          />
        </div>

        {/* Notas */}
        <div style={{ flex: "2 1 500px" }}>
          <textarea
            placeholder="Escribe una nota o recordatorio..."
            value={textoNota}
            onChange={(e) => setTextoNota(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <button
            onClick={guardarNota}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {notaEditando ? "Actualizar Nota" : "Guardar Nota"}
          </button>

          {/* Listado de notas */}
          <div style={{ marginTop: "15px", background: "#f3f3f3", padding: "10px", borderRadius: "8px", maxHeight: "200px", overflowY: "auto" }}>
            <h4>📝 Notas</h4>
            {notas.length === 0 && <p style={{ color: "#999" }}>No hay notas para este día.</p>}
            {notas.map((nota) => (
              <div key={nota.id} style={{ marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{nota.descripcion}</span>
                  <span>
                    <button onClick={() => editarNota(nota)} style={{ marginRight: "5px" }}>✏️</button>
                    <button onClick={() => eliminarNota(nota.id)}>❌</button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pedidos y Cotizaciones */}
      <div style={{ display: "flex", gap: "20px", marginTop: "30px", flexWrap: "wrap" }}>
        {/* Órdenes de Pedido */}
        <div style={{ flex: "1 1 400px", background: "#e3f2fd", padding: "15px", borderRadius: "8px", minHeight: "250px", overflowY: "auto" }}>
          <h4>📦 Órdenes de Pedido</h4>
          {ordenes.length === 0 && <p>No hay pedidos para este día.</p>}
          {ordenes.map((orden) => (
            <div key={orden.id} style={{ marginBottom: "10px", padding: "8px", background: "#bbdefb", borderRadius: "6px", cursor: "pointer" }} onClick={() => irADocumento(orden.id, "orden")}>
              {orden.numero}
            </div>
          ))}
        </div>

        {/* Cotizaciones */}
        <div style={{ flex: "1 1 400px", background: "#ffebee", padding: "15px", borderRadius: "8px", minHeight: "250px", overflowY: "auto" }}>
          <h4>🧾 Cotizaciones</h4>
          {cotizaciones.length === 0 && <p>No hay cotizaciones para este día.</p>}
          {cotizaciones.map((coti) => (
            <div key={coti.id} style={{ marginBottom: "10px", padding: "8px", background: "#ffcdd2", borderRadius: "6px", cursor: "pointer" }} onClick={() => irADocumento(coti.id, "cotizacion")}>
              {coti.numero}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
