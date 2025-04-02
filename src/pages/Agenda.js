import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import supabase from "../supabaseClient";

export default function Agenda() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");

  useEffect(() => {
    cargarNotas();
  }, [fechaSeleccionada]);

  const cargarNotas = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha)
      .order("fecha", { ascending: true });

    if (!error) setNotas(data);
  };

  const agregarNota = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];
    if (!nuevaNota) return;

    const { error } = await supabase.from("agenda").insert([
      {
        titulo: "Nota",
        descripcion: nuevaNota,
        fecha,
      },
    ]);

    if (!error) {
      setNuevaNota("");
      cargarNotas();
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Calendario y Agenda</h2>

      <Calendar
        onChange={setFechaSeleccionada}
        value={fechaSeleccionada}
        className="react-calendar"
      />

      <h3 style={{ marginTop: "1rem" }}>Notas para el {fechaSeleccionada.toLocaleDateString()}</h3>

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
      <button onClick={agregarNota} style={{ width: "100%", marginTop: "8px", padding: "10px" }}>Guardar Nota</button>
    </div>
  );
}
