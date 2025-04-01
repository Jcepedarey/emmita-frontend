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
    <div style={{ padding: "1rem" }}>
      <h2>Calendario y Agenda</h2>
      <Calendar
        onChange={setFechaSeleccionada}
        value={fechaSeleccionada}
      />

      <h3>Notas para el {fechaSeleccionada.toLocaleDateString()}</h3>

      <ul>
        {notas.map((nota) => (
          <li key={nota.id}>
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
      /><br />
      <button onClick={agregarNota}>Guardar Nota</button>
    </div>
  );
}
