// C:\Users\pc\frontend-emmita\src\pages\Agenda.js
import React, { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido"; // 🔐 Protección

export default function Agenda() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [nuevaNota, setNuevaNota] = useState("");
  const [notas, setNotas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const navigate = useNavigate();

  const cargarDatos = useCallback(async () => {
    const fecha = fechaSeleccionada.toISOString().split("T")[0];

    const { data: notasData } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", fecha)
      .order("created_at", { ascending: true });

    const { data: ordenesData } = await supabase
      .from("ordenes_pedido")
      .select("*, clientes(*)")
      .eq("fecha_evento", fecha);

    const { data: cotizacionesData } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("fecha_evento", fecha);

    setNotas(notasData || []);
    setOrdenes(ordenesData || []);
    setCotizaciones(cotizacionesData || []);
  }, [fechaSeleccionada]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

  const editarOrden = (orden) => {
    const cliente = orden.clientes || {};

    const documentoCompleto = {
      ...orden,
      nombre_cliente: cliente.nombre || "",
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      email: cliente.email || "",
      fecha_creacion: orden.fecha_creacion || orden.fecha || null,
      abonos: orden.abonos || [],
      garantia: orden.garantia || "",
      fechaGarantia: orden.fechaGarantia || "",
      garantiaRecibida: orden.garantiaRecibida || false,
      estado: orden.estado || "",
      numero: orden.numero || "",
      esEdicion: true,
      idOriginal: orden.id,
    };

    navigate("/crear-documento", {
      state: {
        documento: documentoCompleto,
        tipo: "ordenes_pedido",
      },
    });
  };

  const manejarPDF = async (orden) => {
    const doc = {
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "No disponible",
      identificacion: orden.clientes?.identificacion || "-",
      telefono: orden.clientes?.telefono || "-",
      direccion: orden.clientes?.direccion || "-",
      email: orden.clientes?.email || "-",
    };

    await generarPDF(doc, "orden");
  };

  const manejarRemision = async (orden) => {
    const doc = {
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "No disponible",
      identificacion: orden.clientes?.identificacion || "-",
      telefono: orden.clientes?.telefono || "-",
      direccion: orden.clientes?.direccion || "-",
      email: orden.clientes?.email || "-",
    };

    await generarRemision(doc);
  };

  const irADocumento = async (tipo, id) => {
    const tabla = tipo === "cotizacion" ? "cotizaciones" : "ordenes_pedido";

    const { data, error } = await supabase
      .from(tabla)
      .select("*, clientes (*)")
      .eq("id", id)
      .single();

    if (!error && data) {
      const cliente = data.clientes || {};

      const documentoCompleto = {
        ...data,
        nombre_cliente: cliente.nombre || "",
        identificacion: cliente.identificacion || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
        email: cliente.email || "",
        fecha_creacion: data.fecha_creacion || data.fecha || null,
        abonos: data.abonos || [],
        garantia: data.garantia || "",
        fechaGarantia: data.fechaGarantia || "",
        garantiaRecibida: data.garantiaRecibida || false,
        estado: data.estado || "",
        numero: data.numero || "",
        esEdicion: true,
        idOriginal: data.id,
      };

      navigate("/crear-documento", {
        state: {
          documento: documentoCompleto,
          tipo,
        },
      });
    } else {
      console.error("Error al cargar documento:", error);
      Swal.fire("Error", "No se pudo cargar el documento", "error");
    }
  };

  return (
    <Protegido>
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
                style={{
                  backgroundColor: "#fff",
                  padding: "10px",
                  margin: "5px 0",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                <div>
                  <p style={{ fontWeight: "bold", color: "#1976d2", margin: 0 }}>
                    {orden.numero || "OP-???"}
                  </p>
                  <p style={{ margin: 0 }}>{orden.clientes?.nombre || "Cliente"}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "gray" }}>
                    {new Date(orden.fecha_evento).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", fontSize: "18px" }}>
                  <button
                    onClick={() => editarOrden(orden)}
                    title="Editar"
                    style={{ border: "none", background: "none", cursor: "pointer" }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => manejarPDF(orden)}
                    title="PDF"
                    style={{ border: "none", background: "none", cursor: "pointer" }}
                  >
                    📄
                  </button>
                  <button
                    onClick={() => manejarRemision(orden)}
                    title="Remisión"
                    style={{ border: "none", background: "none", cursor: "pointer" }}
                  >
                    🚚
                  </button>
                </div>
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
    </Protegido>
  );
}
