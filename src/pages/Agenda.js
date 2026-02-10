// C:\Users\pc\frontend-emmita\src\pages\Agenda.js
import React, { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";
import { useNavigationState } from "../context/NavigationContext";

// ✅ NUEVO: Componente IconoPago - Muestra $ verde (pagado) o rojo (pendiente)
const IconoPago = ({ orden }) => {
  const totalNeto = Number(orden.total_neto || orden.total || 0);
  const sumaAbonos = (orden.abonos || []).reduce((acc, ab) => acc + Number(ab.valor || ab || 0), 0);
  const saldo = Math.max(0, totalNeto - sumaAbonos);
  const estaPagado = saldo === 0 && totalNeto > 0;

  return (
    <div
      title={estaPagado ? "Pagado" : `Saldo: $${saldo.toLocaleString()}`}
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: estaPagado ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
        border: `1.5px solid ${estaPagado ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "bold",
        color: estaPagado ? "rgba(22, 163, 74, 0.85)" : "rgba(220, 38, 38, 0.85)",
        cursor: "default",
        flexShrink: 0
      }}
    >
      $
    </div>
  );
};

export default function Agenda() {
  const { saveModuleState, getModuleState } = useNavigationState();
  const navigate = useNavigate();

  // ✅ Cargar estado guardado - SOLO LA FECHA
  const estadoGuardado = getModuleState("/agenda");

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    if (estadoGuardado?.fechaSeleccionada) {
      return new Date(estadoGuardado.fechaSeleccionada);
    }
    return new Date();
  });
  
  const [nuevaNota, setNuevaNota] = useState("");
  const [notas, setNotas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);

  // Guardar cada vez que cambie algo
const handleFechaChange = (fecha) => {
  setFechaSeleccionada(fecha);
  saveModuleState("/agenda", { 
    fechaSeleccionada: fecha.toISOString() 
  });
};

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
      .select("*, clientes(*)")
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

  const editarCotizacion = (cot) => {
    const cliente = cot.clientes || {};
    const documentoCompleto = {
      ...cot,
      nombre_cliente: cliente.nombre || "",
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      email: cliente.email || "",
      fecha_creacion: cot.fecha_creacion || cot.fecha || null,
      abonos: cot.abonos || [],
      garantia: cot.garantia || "",
      fechaGarantia: cot.fechaGarantia || "",
      garantiaRecibida: cot.garantiaRecibida || false,
      estado: cot.estado || "",
      numero: cot.numero || "",
      esEdicion: true,
      idOriginal: cot.id,
    };

    navigate("/crear-documento", {
      state: { documento: documentoCompleto, tipo: "cotizacion" },
    });
  };

  const manejarPDFCotizacion = async (cot) => {
    const doc = {
      ...cot,
      nombre_cliente: cot.clientes?.nombre || "No disponible",
      identificacion: cot.clientes?.identificacion || "-",
      telefono: cot.clientes?.telefono || "-",
      direccion: cot.clientes?.direccion || "-",
      email: cot.clientes?.email || "-",
    };
    await generarPDF(doc, "cotizacion");
  };

  return (
    <Protegido>
      <div className="cd-page" style={{ maxWidth: "1000px" }}>
        {/* ========== HEADER ========== */}
        <div className="cd-header">
          <h1 className="cd-header-titulo" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
            <span className="cd-header-barra"></span>
            📅 Calendario y Agenda
          </h1>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* ========== CALENDARIO ========== */}
          <div style={{ flex: "1", minWidth: "280px" }}>
            <div className="cd-card">
              <div className="cd-card-body" style={{ padding: "12px" }}>
                <Calendar
                  onChange={handleFechaChange}
                  value={fechaSeleccionada}
                  className="react-calendar"
                />
              </div>
            </div>
          </div>

          {/* ========== NOTAS ========== */}
          <div style={{ flex: "2", minWidth: "300px" }}>
            <div className="cd-card">
              <div className="cd-card-header">📝 Notas</div>
              <div className="cd-card-body">
                <textarea
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  placeholder="Escribe una nota o recordatorio..."
                  rows={3}
                  style={{ width: "100%", marginBottom: "10px", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", resize: "vertical" }}
                />
                <button className="cd-btn cd-btn-verde" style={{ width: "100%" }} onClick={guardarNota}>
                  💾 Guardar Nota
                </button>

                <div style={{ marginTop: "16px" }}>
                  {notas.length === 0 && (
                    <div style={{ textAlign: "center", color: "#9ca3af", padding: "16px", fontSize: "13px" }}>
                      No hay notas para este día.
                    </div>
                  )}
                  {notas.map((nota) => (
                    <div
                      key={nota.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#f8fafc",
                        padding: "10px 12px",
                        marginBottom: "6px",
                        borderRadius: "8px",
                        border: "1px solid #f3f4f6",
                        fontSize: "13px"
                      }}
                    >
                      <span>{nota.descripcion}</span>
                      <button
                        onClick={() => borrarNota(nota.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", borderRadius: "4px", minHeight: "auto", color: "#ef4444" }}
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== PEDIDOS Y COTIZACIONES ========== */}
        <div style={{ display: "flex", marginTop: "16px", gap: "16px", flexWrap: "wrap" }}>
          {/* Pedidos */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div className="cd-card">
              <div className="cd-card-header cd-card-header-cyan">📦 Órdenes de Pedido</div>
              <div className="cd-card-body" style={{ padding: ordenes.length === 0 ? "16px" : 0, minHeight: "120px" }}>
                {ordenes.length === 0 && (
                  <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                    No hay pedidos para este día.
                  </div>
                )}
                {ordenes.map((orden) => (
                  <div
                    key={orden.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#0077B6", fontSize: "14px" }}>
                        {orden.numero || "OP-???"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#111827" }}>
                        {orden.clientes?.nombre || "Cliente"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {new Date(orden.fecha_evento).toLocaleDateString("es-CO")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <IconoPago orden={orden} />
                      <button onClick={() => editarOrden(orden)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", minHeight: "auto" }}>✏️</button>
                      <button onClick={() => manejarPDF(orden)} title="PDF" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", minHeight: "auto" }}>📄</button>
                      <button onClick={() => manejarRemision(orden)} title="Remisión" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", minHeight: "auto" }}>🚚</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cotizaciones */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div className="cd-card">
              <div className="cd-card-header cd-card-header-amber">📋 Cotizaciones</div>
              <div className="cd-card-body" style={{ padding: cotizaciones.length === 0 ? "16px" : 0, minHeight: "120px" }}>
                {cotizaciones.length === 0 && (
                  <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                    No hay cotizaciones para este día.
                  </div>
                )}
                {cotizaciones.map((cot) => (
                  <div
                    key={cot.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#b91c1c", fontSize: "14px" }}>
                        {cot.numero || "COT-???"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#111827" }}>
                        {cot.clientes?.nombre || "Cliente"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {cot.fecha_evento ? new Date(cot.fecha_evento).toLocaleDateString("es-CO") : "Sin fecha"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => editarCotizacion(cot)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", minHeight: "auto" }}>✏️</button>
                      <button onClick={() => manejarPDFCotizacion(cot)} title="PDF" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", minHeight: "auto" }}>📄</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protegido>
  );
}