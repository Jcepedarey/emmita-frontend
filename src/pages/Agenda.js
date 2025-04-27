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
  const [nuevaNota, setNuevaNota] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    cargarNotas();
  }, [fechaSeleccionada]);

  const cargarNotas = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha)
      .order("created_at", { ascending: true });

    if (!error) {
      setNotas(data);
    } else {
      console.error("Error al cargar notas:", error);
    }
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim()) {
      Swal.fire("Campo vacío", "Por favor escribe algo antes de guardar.", "warning");
      return;
    }

    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { error } = await supabase.from("agenda").insert([
      {
        titulo: "Nota",
        descripcion: nuevaNota.trim(),
        fecha,
        documento_id: null,
        tipo: null
      }
    ]);

    if (!error) {
      Swal.fire("Nota guardada", "La nota fue guardada correctamente.", "success");
      setNuevaNota("");
      cargarNotas();
    } else {
      console.error("Error al guardar nota:", error);
      Swal.fire("Error", "No se pudo guardar la nota.", "error");
    }
  };

  const irADocumento = async (nota) => {
    if (!nota.documento_id || !nota.tipo) return;

    const tabla = nota.tipo === "cotizacion" ? "cotizaciones" : "ordenes_pedido";

    const { data, error } = await supabase
      .from(tabla)
      .select(`
        *,
        clientes (
          id,
          nombre,
          identificacion,
          telefono,
          direccion,
          email
        )
      `)
      .eq("id", nota.documento_id)
      .single();

    if (!error && data) {
      navigate("/crear-documento", { state: { documento: data, tipo: nota.tipo } });
    } else {
      console.error("Error al cargar documento:", error);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)", marginBottom: "20px" }}>
        📅 Calendario y Agenda
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ flex: "1 1 300px" }}>
          <Calendar
            onChange={setFechaSeleccionada}
            value={fechaSeleccionada}
            className="react-calendar"
          />
        </div>

        <div style={{ flex: "2 1 600px", display: "flex", flexDirection: "column", gap: "15px" }}>
          <textarea
            placeholder="Escribe una nota o recordatorio..."
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              resize: "none",
            }}
          />
          <button
            onClick={agregarNota}
            style={{
              width: "100%",
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Guardar Nota
          </button>

          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ flex: "1 1 300px", background: "#E3F2FD", padding: "10px", borderRadius: "8px", maxHeight: "300px", overflowY: "auto" }}>
              <h4 style={{ textAlign: "center" }}>📄 Órdenes de Pedido</h4>
              {notas.filter(n => n.tipo === "orden").length === 0 && (
                <p style={{ textAlign: "center", color: "#888" }}>No hay pedidos para este día.</p>
              )}
              {notas.filter(n => n.tipo === "orden").map((nota) => (
                <div key={nota.id} style={{ background: "#BBDEFB", margin: "10px 0", padding: "10px", borderRadius: "6px" }}>
                  <strong>Orden</strong><br />
                  {nota.descripcion}<br />
                  <button onClick={() => irADocumento(nota)} style={{ marginTop: "5px" }}>Ver pedido</button>
                </div>
              ))}
            </div>

            <div style={{ flex: "1 1 300px", background: "#FFEBEE", padding: "10px", borderRadius: "8px", maxHeight: "300px", overflowY: "auto" }}>
              <h4 style={{ textAlign: "center" }}>📝 Cotizaciones</h4>
              {notas.filter(n => n.tipo === "cotizacion").length === 0 && (
                <p style={{ textAlign: "center", color: "#888" }}>No hay cotizaciones para este día.</p>
              )}
              {notas.filter(n => n.tipo === "cotizacion").map((nota) => (
                <div key={nota.id} style={{ background: "#FFCDD2", margin: "10px 0", padding: "10px", borderRadius: "6px" }}>
                  <strong>Cotización</strong><br />
                  {nota.descripcion}<br />
                  <button onClick={() => irADocumento(nota)} style={{ marginTop: "5px" }}>Ver cotización</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
