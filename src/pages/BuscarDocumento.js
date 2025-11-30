  import React, { useEffect, useState } from "react";
  import supabase from "../supabaseClient";
  import { generarPDF } from "../utils/generarPDF";
  import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
  import { useNavigate } from "react-router-dom";
  import Protegido from "../components/Protegido"; // 🔐 Protección con sesión
  import Swal from "sweetalert2";


  export default function BuscarDocumento() {
    const [tipo, setTipo] = useState("cotizaciones");
    const [documentos, setDocumentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [clienteBusqueda, setClienteBusqueda] = useState("");
    const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [fechaInicioCreacion, setFechaInicioCreacion] = useState("");
    const [fechaFinCreacion, setFechaFinCreacion] = useState("");
    const [fechaInicioEvento, setFechaInicioEvento] = useState("");
    const [fechaFinEvento, setFechaFinEvento] = useState("");
    const [mostrarResultados, setMostrarResultados] = useState(true);
    const [ordenarPor, setOrdenarPor] = useState("fecha_evento");
    const navigate = useNavigate();

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
    setClienteSeleccionado(null); // si vuelve a escribir, “des-seleccionamos” el cliente

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

      // 🔎 Filtro por cliente usando la selección del desplegable
  let clienteId = null;

  if (clienteSeleccionado) {
    // caso ideal: el usuario eligió de la lista
    clienteId = clienteSeleccionado.id;
  } else if (clienteBusqueda.trim()) {
    // por si escribe pero no hace clic en la lista
    const coincidencias = clientes.filter((c) =>
      (c.nombre || "").toLowerCase().includes(clienteBusqueda.toLowerCase())
    );

    if (coincidencias.length === 1) {
      // si solo hay una coincidencia, la tomamos
      clienteId = coincidencias[0].id;
    } else if (coincidencias.length > 1) {
      // varias coincidencias y no seleccionó → le pedimos que elija
      alert("Por favor selecciona el cliente desde la lista desplegable para evitar confusiones.");
      return; // no seguimos con la búsqueda
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
      }
    };

    const eliminarDocumento = async (id) => {
  try {
    // 1️⃣ Verificar si tiene movimientos contables asociados
    const { data: movimientos } = await supabase
      .from("movimientos_contables")
      .select("id")
      .eq("orden_id", id);

    // 2️⃣ Verificar si tiene recepción asociada
    const { data: recepcion } = await supabase
      .from("recepcion")
      .select("id")
      .eq("orden_id", id);

    const tieneMovimientos = movimientos && movimientos.length > 0;
    const tieneRecepcion = recepcion && recepcion.length > 0;

    // 🆕 AGREGAR ESTO PARA DEBUG
console.log("🔍 Debug borrado:", {
  documentoId: id,
  tipo,
  movimientos: movimientos?.length || 0,
  recepcion: recepcion?.length || 0
});

    // 3️⃣ Mensaje según el caso
    let mensaje = "";
    let listaEliminaciones = "";

    if (tieneMovimientos || tieneRecepcion) {
      // Advertencia COMPLETA
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
      // Advertencia SIMPLE
      mensaje = "¿Estás seguro de eliminar este documento?";
    }

    // 4️⃣ Confirmación
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

    // 5️⃣ Borrar en orden correcto
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

    // 6️⃣ Finalmente, borrar el documento
    const { error: errorDoc } = await supabase
      .from(tipo)
      .delete()
      .eq("id", id);

    if (errorDoc) {
      console.error("Error borrando documento:", errorDoc);
      throw new Error("No se pudo eliminar el documento");
    }

    // 7️⃣ Éxito
    Swal.fire({
      title: "✅ Eliminado",
      text: tieneMovimientos || tieneRecepcion 
        ? "El documento y todos sus registros fueron eliminados"
        : "El documento fue eliminado",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });

    cargarDocumentos(); // Recargar lista

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
  };

    return (
      <Protegido>
        <div style={{ padding: "1rem", maxWidth: "750px", margin: "auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Buscar Documento</h2>

          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: "100%", marginBottom: "10px" }}>
            <option value="cotizaciones">Cotización</option>
            <option value="ordenes_pedido">Orden de Pedido</option>
          </select>

          <input
    type="text"
    placeholder="Buscar cliente por nombre"
    value={clienteBusqueda}
    onChange={manejarCambioCliente}
    style={{ width: "100%", marginBottom: "4px", padding: "8px" }}
  />

  {sugerenciasClientes.length > 0 && (
    <ul
      style={{
        listStyle: "none",
        padding: 4,
        border: "1px solid #ccc",
        borderRadius: 4,
        maxHeight: 120,
        overflowY: "auto",
        marginBottom: 10,
      }}
    >
      {sugerenciasClientes.map((c) => (
        <li
          key={c.id}
          onClick={() => {
            setClienteBusqueda(c.nombre);
            setClienteSeleccionado(c);
            setSugerenciasClientes([]);
          }}
          style={{ padding: 4, cursor: "pointer" }}
        >
          {c.nombre}
          {c.identificacion ? ` - ${c.identificacion}` : ""}
        </li>
      ))}
    </ul>
  )}

          {/* Calendarios - Fecha de creación */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12px" }}>📅 Filtrar por fecha de creación (inicio):</label>
              <input
                type="date"
                value={fechaInicioCreacion}
                onChange={(e) => setFechaInicioCreacion(e.target.value)}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12px" }}>📅 Fecha creación (fin):</label>
              <input
                type="date"
                value={fechaFinCreacion}
                onChange={(e) => setFechaFinCreacion(e.target.value)}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          </div>

          {/* Calendarios - Fecha del evento */}
          {tipo === "ordenes_pedido" && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px" }}>📅 Fecha evento (inicio):</label>
                <input
                  type="date"
                  value={fechaInicioEvento}
                  onChange={(e) => setFechaInicioEvento(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px" }}>📅 Fecha evento (fin):</label>
                <input
                  type="date"
                  value={fechaFinEvento}
                  onChange={(e) => setFechaFinEvento(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <button onClick={cargarDocumentos} style={{ flex: 1 }}>🔍 Buscar</button>
            <button onClick={limpiarFiltros} style={{ flex: 1 }}>🧹 Limpiar</button>
            <button onClick={() => setMostrarResultados(!mostrarResultados)} style={{ flex: 1 }}>
              {mostrarResultados ? "Ocultar Resultados" : "Mostrar Resultados"}
            </button>
          </div>

          {/* Ordenar por */}
          <div style={{ marginBottom: "15px" }}>
            <label>Ordenar por:</label>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="fecha_evento">Fecha del evento</option>
              <option value="fecha_creacion">Fecha de creación</option>
            </select>
          </div>

          {/* Resultados */}
          {mostrarResultados && documentos.length > 0 && (
            <>
              <h3>Resultados</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
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
                    <li key={doc.id} style={{
                      marginBottom: "1rem",
                      border: "1px solid #ccc",
                      borderRadius: "10px",
                      padding: "10px",
                      background: "#fdfdfd"
                    }}>
                      <strong>Cliente:</strong> {docConCliente.nombre_cliente}<br />
                      <strong>Total:</strong> ${Number(doc.total).toLocaleString("es-CO")}<br />
                      <strong>Fecha creación:</strong> {fechaCreacion}<br />
                      {doc.fecha_evento && <><strong>Fecha evento:</strong> {fechaEvento}<br /></>}

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                        <button onClick={() => cargarEnCrear(doc)}>Editar</button>
                        <button onClick={() => eliminarDocumento(doc.id)}>Eliminar</button>
                        <button onClick={() =>
                          generarPDF(docConCliente, tipo === "cotizaciones" ? "cotizacion" : "orden")
                        }>
                          📄 PDF
                        </button>
                        {tipo === "ordenes_pedido" && (
                          <button onClick={() => generarRemision(docConCliente)}>
                            🚚 Remisión
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </Protegido>
    );
  }
