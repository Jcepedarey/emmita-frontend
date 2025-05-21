import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import { useNavigate } from "react-router-dom";

export default function BuscarDocumento() {
  const [tipo, setTipo] = useState("cotizaciones");
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
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

  const obtenerNombreCliente = (id) => {
    const cliente = clientes.find((c) => c.id === id);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  const cargarDocumentos = async () => {
    let query = supabase.from(tipo).select("*");

    if (clienteBusqueda) {
      const clienteEncontrado = clientes.find((c) =>
        c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())
      );
      if (clienteEncontrado) query = query.eq("cliente_id", clienteEncontrado.id);
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
    if (!window.confirm("¿Eliminar este documento?")) return;
    await supabase.from(tipo).delete().eq("id", id);
    cargarDocumentos();
  };

  const cargarEnCrear = (doc) => {
    const cliente = clientes.find((c) => c.id === doc.cliente_id);
    const documentoConCliente = {
      ...doc,
      nombre_cliente: cliente?.nombre || "",
      identificacion: cliente?.identificacion || "",
      telefono: cliente?.telefono || "",
      direccion: cliente?.direccion || "",
      email: cliente?.email || ""
    };
    navigate("/crear-documento", { state: { documento: documentoConCliente, tipo } });
  };

  const limpiarFiltros = () => {
    setClienteBusqueda("");
    setFechaInicioCreacion("");
    setFechaFinCreacion("");
    setFechaInicioEvento("");
    setFechaFinEvento("");
    setMostrarResultados(false);
  };

  return (
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
        onChange={(e) => setClienteBusqueda(e.target.value)}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

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
        <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)} style={{ width: "100%", padding: "8px" }}>
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
  );
}
