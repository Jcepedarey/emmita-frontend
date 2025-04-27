// C:\Users\pc\frontend-emmita\src\pages\Agenda.js
import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function Agenda() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [notas, setNotas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    cargarNotasYDocumentos();
  }, [fechaSeleccionada]);

  const cargarNotasYDocumentos = async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error al cargar notas:", error);
      Swal.fire("Error", "No se pudieron cargar las notas", "error");
    } else {
      const notasSimples = data.filter((item) => !item.documento);
      const pedidos = data.filter((item) => item.tipo === "orden");
      const cotizaciones = data.filter((item) => item.tipo === "cotizacion");

      setNotas(notasSimples);
      setPedidos(pedidos);
      setCotizaciones(cotizaciones);
    }
  };

  const guardarNota = async () => {
    if (!nuevaNota.trim()) return;

    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { error } = await supabase.from("agenda").insert([
      {
        titulo: "Nota",
        descripcion: nuevaNota.trim(),
        fecha,
        documento: null,
        tipo: null,
      },
    ]);

    if (error) {
      console.error("Error al guardar nota:", error);
      Swal.fire("Error", "No se pudo guardar la nota", "error");
    } else {
      setNuevaNota("");
      cargarNotasYDocumentos();
      Swal.fire("Guardado", "Nota guardada exitosamente", "success");
    }
  };

  const irADocumento = async (nota) => {
    if (!nota.documento || !nota.tipo) return;

    const tabla = nota.tipo === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .eq("id", nota.documento)
      .single();

    if (!error && data) {
      navigate("/crear-documento", { state: { documento: data, tipo: nota.tipo } });
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>📅 Calendario y Agenda</h2>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <Calendar
            onChange={setFechaSeleccionada}
            value={fechaSeleccionada}
            className="react-calendar"
          />
        </div>

        <div style={{ flex: 1, minWidth: "300px" }}>
          <textarea
            placeholder="Escribe una nota o recordatorio..."
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            rows={3}
            style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
          />
          <button
            onClick={guardarNota}
            style={{ width: "100%", padding: "10px", backgroundColor: "green", color: "white", border: "none", borderRadius: "5px", marginBottom: "20px" }}
          >
            Guardar Nota
          </button>

          {notas.length > 0 && (
            <div style={{ background: "#f9f9f9", padding: "10px", borderRadius: "8px", marginBottom: "20px", maxHeight: "200px", overflowY: "auto" }}>
              <h4>📝 Notas</h4>
              {notas.map((nota) => (
                <div key={nota.id} style={{ borderBottom: "1px solid #ddd", paddingBottom: "5px", marginBottom: "5px" }}>
                  {nota.descripcion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, background: "#e0f7fa", padding: "10px", borderRadius: "10px", minHeight: "150px", overflowY: "auto" }}>
          <h4>📦 Órdenes de Pedido</h4>
          {pedidos.length > 0 ? (
            pedidos.map((pedido) => (
              <div key={pedido.id} style={{ marginBottom: "10px" }}>
                <strong>{pedido.titulo}</strong><br />
                {pedido.descripcion}<br />
                <button onClick={() => irADocumento(pedido)} style={{ marginTop: "5px" }}>Ver pedido</button>
              </div>
            ))
          ) : (
            <p>No hay pedidos para este día.</p>
          )}
        </div>

        <div style={{ flex: 1, background: "#ffebee", padding: "10px", borderRadius: "10px", minHeight: "150px", overflowY: "auto" }}>
          <h4>📝 Cotizaciones</h4>
          {cotizaciones.length > 0 ? (
            cotizaciones.map((coti) => (
              <div key={coti.id} style={{ marginBottom: "10px" }}>
                <strong>{coti.titulo}</strong><br />
                {coti.descripcion}<br />
                <button onClick={() => irADocumento(coti)} style={{ marginTop: "5px" }}>Ver cotización</button>
              </div>
            ))
          ) : (
            <p>No hay cotizaciones para este día.</p>
          )}
        </div>
      </div>
    </div>
  );
}
