import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import { useNavigate } from "react-router-dom";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";
import Swal from "sweetalert2";
import { useNavigationState } from "../context/NavigationContext";

export default function BuscarDocumento() {
  const { saveModuleState, getModuleState } = useNavigationState();
  const navigate = useNavigate();

  const estadoGuardado = getModuleState("/buscar-documento");

  const [tipo, setTipo] = useState(estadoGuardado?.tipo || "cotizaciones");
  const [documentos, setDocumentos] = useState(estadoGuardado?.documentos || []);
  const [clientes, setClientes] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState(estadoGuardado?.clienteBusqueda || "");
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(estadoGuardado?.clienteSeleccionado || null);
  const [fechaInicioCreacion, setFechaInicioCreacion] = useState(estadoGuardado?.fechaInicioCreacion || "");
  const [fechaFinCreacion, setFechaFinCreacion] = useState(estadoGuardado?.fechaFinCreacion || "");
  const [fechaInicioEvento, setFechaInicioEvento] = useState(estadoGuardado?.fechaInicioEvento || "");
  const [fechaFinEvento, setFechaFinEvento] = useState(estadoGuardado?.fechaFinEvento || "");
  const [mostrarResultados, setMostrarResultados] = useState(estadoGuardado?.mostrarResultados ?? true);
  const [ordenarPor, setOrdenarPor] = useState(estadoGuardado?.ordenarPor || "fecha_evento");

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const { data } = await supabase.from("clientes").select("*");
    if (data) setClientes(data);
  };

  const manejarCambioCliente = (e) => {
    const valor = e.target.value;
    setClienteBusqueda(valor);
    setClienteSeleccionado(null);

    if (!valor.trim()) {
      setSugerenciasClientes([]);
      return;
    }

    const coincidencias = clientes.filter((c) =>
      (c.nombre || "").toLowerCase().includes(valor.toLowerCase())
    );

    setSugerenciasClientes(coincidencias);
  };

  const cargarDocumentos = async () => {
    let query = supabase.from(tipo).select("*");

    let clienteId = null;

    if (clienteSeleccionado) {
      clienteId = clienteSeleccionado.id;
    } else if (clienteBusqueda.trim()) {
      const coincidencias = clientes.filter((c) =>
        (c.nombre || "").toLowerCase().includes(clienteBusqueda.toLowerCase())
      );

      if (coincidencias.length === 1) {
        clienteId = coincidencias[0].id;
      } else if (coincidencias.length > 1) {
        alert("Por favor selecciona el cliente desde la lista desplegable para evitar confusiones.");
        return;
      }
    }

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    const campoFecha = tipo === "ordenes_pedido" ? "fecha_evento" : "fecha";

    if (fechaInicioCreacion) query = query.gte(campoFecha, fechaInicioCreacion);
    if (fechaFinCreacion) query = query.lte(campoFecha, fechaFinCreacion);
    if (fechaInicioEvento && tipo === "ordenes_pedido") query = query.gte("fecha_evento", fechaInicioEvento);
    if (fechaFinEvento && tipo === "ordenes_pedido") query = query.lte("fecha_evento", fechaFinEvento);

    if (ordenarPor) query = query.order(ordenarPor, { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error("Error al cargar documentos:", error);
    } else {
      setDocumentos(data);
      setMostrarResultados(true);
      
      // ✅ GUARDAR después de la búsqueda
      saveModuleState("/buscar-documento", {
        tipo,
        documentos: data || [],
        clienteBusqueda,
        clienteSeleccionado,
        fechaInicioCreacion,
        fechaFinCreacion,
        fechaInicioEvento,
        fechaFinEvento,
        mostrarResultados: true,
        ordenarPor
      });
    }
  };

  const eliminarDocumento = async (id) => {
    try {
      const { data: movimientos } = await supabase
        .from("movimientos_contables")
        .select("id")
        .eq("orden_id", id);

      const { data: recepcion } = await supabase
        .from("recepcion")
        .select("id")
        .eq("orden_id", id);

      const tieneMovimientos = movimientos && movimientos.length > 0;
      const tieneRecepcion = recepcion && recepcion.length > 0;

      console.log("🔍 Debug borrado:", {
        documentoId: id,
        tipo,
        movimientos: movimientos?.length || 0,
        recepcion: recepcion?.length || 0
      });

      let mensaje = "";
      let listaEliminaciones = "";

      if (tieneMovimientos || tieneRecepcion) {
        mensaje = "⚠️ Este documento tiene registros asociados:";
        listaEliminaciones = "<ul style='text-align: left; margin: 10px 0;'>";
        
        if (tieneMovimientos) {
          listaEliminaciones += `<li><strong>${movimientos.length}</strong> movimiento(s) contable(s) (ingresos/gastos)</li>`;
        }
        if (tieneRecepcion) {
          listaEliminaciones += "<li>Una recepción registrada</li>";
        }
        
        listaEliminaciones += "</ul>";
        listaEliminaciones += "<p style='color: red; font-weight: bold;'>⚠️ TODO será eliminado permanentemente</p>";
      } else {
        mensaje = "¿Estás seguro de eliminar este documento?";
      }

      const resultado = await Swal.fire({
        title: mensaje,
        html: listaEliminaciones,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: tieneMovimientos || tieneRecepcion ? "Sí, eliminar TODO" : "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33",
      });

      if (!resultado.isConfirmed) return;

      if (tieneMovimientos) {
        const { error: errorMov } = await supabase
          .from("movimientos_contables")
          .delete()
          .eq("orden_id", id);

        if (errorMov) {
          console.error("Error borrando movimientos:", errorMov);
          throw new Error("No se pudieron eliminar los movimientos contables");
        }
      }

      if (tieneRecepcion) {
        const { error: errorRec } = await supabase
          .from("recepcion")
          .delete()
          .eq("orden_id", id);

        if (errorRec) {
          console.error("Error borrando recepción:", errorRec);
          throw new Error("No se pudo eliminar la recepción");
        }
      }

      const { error: errorDoc } = await supabase
        .from(tipo)
        .delete()
        .eq("id", id);

      if (errorDoc) {
        console.error("Error borrando documento:", errorDoc);
        throw new Error("No se pudo eliminar el documento");
      }

      Swal.fire({
        title: "✅ Eliminado",
        text: tieneMovimientos || tieneRecepcion 
          ? "El documento y todos sus registros fueron eliminados"
          : "El documento fue eliminado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      cargarDocumentos();

    } catch (error) {
      console.error("Error completo:", error);
      Swal.fire({
        title: "❌ Error",
        text: error.message || "No se pudo completar la eliminación",
        icon: "error",
      });
    }
  };

  const cargarEnCrear = (doc) => {
    const cliente = clientes.find((c) => c.id === doc.cliente_id);

    const documentoCompleto = {
      ...doc,
      nombre_cliente: cliente?.nombre || "",
      identificacion: cliente?.identificacion || "",
      telefono: cliente?.telefono || "",
      direccion: cliente?.direccion || "",
      email: cliente?.email || "",
      fecha_creacion: doc.fecha_creacion || doc.fecha || null,
      abonos: doc.abonos || [],
      garantia: doc.garantia || "",
      fechaGarantia: doc.fechaGarantia || "",
      garantiaRecibida: doc.garantiaRecibida || false,
      estado: doc.estado || "",
      numero: doc.numero || "",
      esEdicion: true,
      idOriginal: doc.id,
    };

    navigate("/crear-documento", {
      state: {
        documento: documentoCompleto,
        tipo,
      },
    });
  };

  const limpiarFiltros = () => {
    setClienteBusqueda("");
    setClienteSeleccionado(null);
    setSugerenciasClientes([]);
    setFechaInicioCreacion("");
    setFechaFinCreacion("");
    setFechaInicioEvento("");
    setFechaFinEvento("");
    setMostrarResultados(false);
    
    // ✅ GUARDAR estado limpio
    saveModuleState("/buscar-documento", {
      tipo,
      documentos: [],
      clienteBusqueda: "",
      clienteSeleccionado: null,
      fechaInicioCreacion: "",
      fechaFinCreacion: "",
      fechaInicioEvento: "",
      fechaFinEvento: "",
      mostrarResultados: false,
      ordenarPor: "fecha_evento"
    });
  };

  return (
    <Protegido>
      <div className="cd-page">
        {/* ========== HEADER ========== */}
        <div className="cd-header">
          <h1 className="cd-header-titulo" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
            <span className="cd-header-barra"></span>
            📂 Buscar Documento
          </h1>
        </div>

        {/* ========== FILTROS ========== */}
        <div className="cd-card">
          <div className="cd-card-header cd-card-header-cyan">🔍 Filtros de búsqueda</div>
          <div className="cd-card-body">
            {/* Tipo documento */}
            <div className="cd-tipo-selector" style={{ marginBottom: "12px" }}>
              <div
                className={`cd-tipo-opcion ${tipo === "cotizaciones" ? "activo" : ""}`}
                onClick={() => setTipo("cotizaciones")}
              >
                <span className="cd-tipo-icono">📋</span>
                Cotización
              </div>
              <div
                className={`cd-tipo-opcion ${tipo === "ordenes_pedido" ? "activo" : ""}`}
                onClick={() => setTipo("ordenes_pedido")}
              >
                <span className="cd-tipo-icono">📦</span>
                Orden de Pedido
              </div>
            </div>

            {/* Cliente */}
            <div className="cd-campo" style={{ marginBottom: "12px" }}>
              <label>Buscar cliente por nombre</label>
              <input
                type="text"
                placeholder="Nombre del cliente..."
                value={clienteBusqueda}
                onChange={manejarCambioCliente}
              />
            </div>
            {sugerenciasClientes.length > 0 && (
              <ul className="cd-sugerencias" style={{ marginBottom: "12px" }}>
                {sugerenciasClientes.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => {
                      setClienteBusqueda(c.nombre);
                      setClienteSeleccionado(c);
                      setSugerenciasClientes([]);
                    }}
                  >
                    <strong>{c.nombre}</strong>
                    {c.identificacion ? ` — ${c.identificacion}` : ""}
                  </li>
                ))}
              </ul>
            )}

            {/* Fechas creación */}
            <div className="cd-fechas-grid" style={{ marginBottom: "12px" }}>
              <div className="cd-campo">
                <label>📅 Fecha creación (inicio)</label>
                <input type="date" value={fechaInicioCreacion} onChange={(e) => setFechaInicioCreacion(e.target.value)} />
              </div>
              <div className="cd-campo">
                <label>📅 Fecha creación (fin)</label>
                <input type="date" value={fechaFinCreacion} onChange={(e) => setFechaFinCreacion(e.target.value)} />
              </div>
            </div>

            {/* Fechas evento (solo órdenes) */}
            {tipo === "ordenes_pedido" && (
              <div className="cd-fechas-grid" style={{ marginBottom: "12px" }}>
                <div className="cd-campo">
                  <label>📅 Fecha evento (inicio)</label>
                  <input type="date" value={fechaInicioEvento} onChange={(e) => setFechaInicioEvento(e.target.value)} />
                </div>
                <div className="cd-campo">
                  <label>📅 Fecha evento (fin)</label>
                  <input type="date" value={fechaFinEvento} onChange={(e) => setFechaFinEvento(e.target.value)} />
                </div>
              </div>
            )}

            {/* Ordenar */}
            <div className="cd-campo" style={{ marginBottom: "16px" }}>
              <label>Ordenar por</label>
              <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)}>
                <option value="fecha_evento">📅 Fecha del evento</option>
                <option value="fecha_creacion">🗓️ Fecha de creación</option>
              </select>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button className="cd-btn cd-btn-cyan" style={{ flex: 1 }} onClick={cargarDocumentos}>
                🔍 Buscar
              </button>
              <button className="cd-btn cd-btn-gris" style={{ flex: 1 }} onClick={limpiarFiltros}>
                🧹 Limpiar
              </button>
              <button
                className="cd-btn cd-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setMostrarResultados(!mostrarResultados)}
              >
                {mostrarResultados ? "👁️ Ocultar" : "👁️ Mostrar"}
              </button>
            </div>
          </div>
        </div>

        {/* ========== RESULTADOS ========== */}
        {mostrarResultados && documentos.length > 0 && (
          <div className="cd-card">
            <div className="cd-card-header">📋 Resultados ({documentos.length})</div>
            <div className="cd-card-body" style={{ padding: 0 }}>
              {documentos.map((doc) => {
                const cliente = clientes.find(c => c.id === doc.cliente_id);
                const docConCliente = {
                  ...doc,
                  nombre_cliente: cliente?.nombre || "",
                  identificacion: cliente?.identificacion || "",
                  telefono: cliente?.telefono || "",
                  direccion: cliente?.direccion || "",
                  email: cliente?.email || "",
                  fecha_creacion: doc.fecha_creacion || doc.fecha || null
                };
                const fechaCreacion = doc.fecha_creacion?.split("T")[0] || "-";
                const fechaEvento = doc.fecha_evento?.split("T")[0] || "-";

                return (
                  <div
                    key={doc.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
                        {docConCliente.nombre_cliente || "Sin cliente"} — ${Number(doc.total).toLocaleString("es-CO")}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                        Creación: {fechaCreacion}
                        {doc.fecha_evento && ` · Evento: ${fechaEvento}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button className="cd-btn cd-btn-azul" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => cargarEnCrear(doc)}>✏️ Editar</button>
                      <button className="cd-btn cd-btn-rojo" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => eliminarDocumento(doc.id)}>🗑️</button>
                      <button className="cd-btn cd-btn-gris" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => generarPDF(docConCliente, tipo === "cotizaciones" ? "cotizacion" : "orden")}>📄 PDF</button>
                      {tipo === "ordenes_pedido" && (
                        <button className="cd-btn cd-btn-verde" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => generarRemision(docConCliente)}>🚚 Remisión</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Protegido>
  );
}