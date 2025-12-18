import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import { useNavigationState } from "../context/NavigationContext";

export default function Trazabilidad() {
  const { saveModuleState, getModuleState } = useNavigationState();
  const navigate = useNavigate();

  // ✅ Cargar estado guardado solo una vez
  const estadoGuardado = useRef(getModuleState("/trazabilidad")).current;

  const [productoBuscar, setProductoBuscar] = useState(estadoGuardado?.productoBuscar || "");
  const [clienteFiltro, setClienteFiltro] = useState(estadoGuardado?.clienteFiltro || "");
  const [fechaDesde, setFechaDesde] = useState(estadoGuardado?.fechaDesde || "");
  const [fechaHasta, setFechaHasta] = useState(estadoGuardado?.fechaHasta || "");
  const [resultados, setResultados] = useState(estadoGuardado?.resultados || []);
  const [ordenDescendente, setOrdenDescendente] = useState(estadoGuardado?.ordenDescendente ?? true);
  const [tipoDocumento, setTipoDocumento] = useState(estadoGuardado?.tipoDocumento || "todos");
  const [usarFechaEvento, setUsarFechaEvento] = useState(estadoGuardado?.usarFechaEvento ?? true);
  const [mostrarResultados, setMostrarResultados] = useState(estadoGuardado?.mostrarResultados ?? true);

  const [productosLista, setProductosLista] = useState([]);
  const [clientesLista, setClientesLista] = useState([]);
  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);

  // ✅ GUARDAR ESTADO - Usar un useEffect separado sin incluir arrays/objetos
  useEffect(() => {
    const estadoActual = {
      productoBuscar,
      clienteFiltro,
      fechaDesde,
      fechaHasta,
      resultados,
      ordenDescendente,
      tipoDocumento,
      usarFechaEvento,
      mostrarResultados
    };
    
    saveModuleState("/trazabilidad", estadoActual);
  }, [
    productoBuscar,
    clienteFiltro,
    fechaDesde,
    fechaHasta,
    JSON.stringify(resultados), // ✅ Convertir a string para evitar comparación por referencia
    ordenDescendente,
    tipoDocumento,
    usarFechaEvento,
    mostrarResultados,
    saveModuleState
  ]);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: productos } = await supabase.from("productos").select("id, nombre");
      const { data: clientes } = await supabase.from("clientes").select("*");

      setProductosLista(productos || []);
      setClientesLista(clientes || []);
    };
    cargarDatos();
  }, []);

  const normalizarFecha = (fecha) => {
    if (!fecha) return null;
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const buscarDocumentos = async () => {
    if (!productoBuscar.trim()) {
      alert("Escriba el nombre de un producto.");
      return;
    }

    const [cotRes, ordRes] = await Promise.all([
      supabase.from("cotizaciones").select("*"),
      supabase.from("ordenes_pedido").select("*")
    ]);

    const todos = [...(cotRes.data || []), ...(ordRes.data || [])];

    let clienteIdsFiltrados = [];
    if (clienteFiltro.trim()) {
      clienteIdsFiltrados = clientesLista
        .filter((c) => c.nombre.toLowerCase().includes(clienteFiltro.toLowerCase()))
        .map((c) => c.id);
    }

    const coincideEnDoc = (doc, idsCoinciden, nombreBuscado) => {
      const productos = doc.productos || [];
      for (const p of productos) {
        const pId = p.producto_id || p.id;
        const matchNivel1 =
          ((p.nombre || "").toLowerCase().includes(nombreBuscado)) ||
          (pId && idsCoinciden.has(pId));
        if (matchNivel1) return true;

        if (p.es_grupo && Array.isArray(p.productos)) {
          for (const sub of p.productos) {
            const subId = sub.producto_id || sub.id;
            const matchSub =
              ((sub.nombre || "").toLowerCase().includes(nombreBuscado)) ||
              (subId && idsCoinciden.has(subId));
            if (matchSub) return true;
          }
        }
      }
      return false;
    };

    const nombreBuscado = productoBuscar.trim().toLowerCase();
    const idsCoinciden = new Set(
      (productosLista || [])
        .filter((p) => (p.nombre || "").toLowerCase().includes(nombreBuscado))
        .map((p) => p.id)
    );

    const resultadosFiltrados = todos.filter((doc) => {
      if (tipoDocumento !== "todos") {
        const esCotizacion = doc.numero?.startsWith("COT");
        if (tipoDocumento === "cotizacion" && !esCotizacion) return false;
        if (tipoDocumento === "orden" && esCotizacion) return false;
      }

      const contieneProducto = coincideEnDoc(doc, idsCoinciden, nombreBuscado);
      if (!contieneProducto) return false;

      const fechaBase = usarFechaEvento 
        ? (doc.fecha_evento || doc.fecha)
        : (doc.fecha_creacion || doc.fecha);

      const fechaDocNormalizada = normalizarFecha(fechaBase);
      const fechaDesdeLimite = normalizarFecha(fechaDesde);
      const fechaHastaLimite = normalizarFecha(fechaHasta);

      if (fechaDesdeLimite && fechaDocNormalizada < fechaDesdeLimite) return false;
      if (fechaHastaLimite && fechaDocNormalizada > fechaHastaLimite) return false;

      if (clienteFiltro && clienteIdsFiltrados.length > 0) {
        return clienteIdsFiltrados.includes(doc.cliente_id);
      }

      return true;
    });

    resultadosFiltrados.forEach((doc) => {
      const cliente = clientesLista.find((c) => c.id === doc.cliente_id);
      if (cliente) {
        doc.nombre_cliente = cliente.nombre;
        doc.identificacion = cliente.identificacion;
        doc.telefono = cliente.telefono;
        doc.direccion = cliente.direccion;
        doc.email = cliente.email;
      }
    });

    resultadosFiltrados.sort((a, b) => {
      const getF = (x) => {
        return usarFechaEvento 
          ? (x.fecha_evento || x.fecha || x.fecha_creacion || "")
          : (x.fecha_creacion || x.fecha || x.fecha_evento || "");
      };
      const dateA = new Date(getF(a));
      const dateB = new Date(getF(b));
      return ordenDescendente ? dateB - dateA : dateA - dateB;
    });

    setResultados(resultadosFiltrados);
    setMostrarResultados(true);
  };

  const limpiar = () => {
    setProductoBuscar("");
    setClienteFiltro("");
    setFechaDesde("");
    setFechaHasta("");
    setResultados([]);
    setSugerenciasProductos([]);
    setSugerenciasClientes([]);
    setMostrarResultados(false);
  };

  const editarDocumento = (doc, tipoDoc) => {
    const documentoParaEditar = {
      ...doc,
      tipo: tipoDoc,
      esEdicion: true,
      idOriginal: doc.id
    };
    
    navigate("/crear-documento", { 
      state: { 
        documento: documentoParaEditar,
        tipo: tipoDoc
      } 
    });
  };

  const manejarCambioProducto = (e) => {
    const valor = e.target.value;
    setProductoBuscar(valor);
    setSugerenciasProductos(
      valor.length > 0
        ? productosLista.filter((p) =>
            p.nombre.toLowerCase().includes(valor.toLowerCase())
          )
        : []
    );
  };

  const manejarCambioCliente = (e) => {
    const valor = e.target.value;
    setClienteFiltro(valor);
    setSugerenciasClientes(
      valor.length > 0
        ? clientesLista.filter((c) =>
            c.nombre.toLowerCase().includes(valor.toLowerCase())
          )
        : []
    );
  };

  return (
    <Protegido>
      <div style={{ padding: "1rem", maxWidth: "750px", margin: "auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
          Trazabilidad de Artículos
        </h2>

        <label style={{ fontSize: "12px" }}>Nombre del producto:</label>
        <input
          type="text"
          value={productoBuscar}
          onChange={manejarCambioProducto}
          placeholder="Ej: silla rimax"
          style={{ width: "100%", marginBottom: "4px", padding: "8px" }}
        />
        {sugerenciasProductos.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              padding: 4,
              border: "1px solid #ccc",
              borderRadius: 4,
              maxHeight: 120,
              overflowY: "auto",
              marginBottom: 10
            }}
          >
            {sugerenciasProductos.map((p, index) => (
              <li
                key={index}
                onClick={() => {
                  setProductoBuscar(p.nombre);
                  setSugerenciasProductos([]);
                }}
                style={{ padding: 4, cursor: "pointer" }}
              >
                {p.nombre}
              </li>
            ))}
          </ul>
        )}

        <label style={{ fontSize: "12px" }}>Filtrar por cliente (opcional):</label>
        <input
          type="text"
          value={clienteFiltro}
          onChange={manejarCambioCliente}
          placeholder="Nombre del cliente"
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
              marginBottom: 10
            }}
          >
            {sugerenciasClientes.map((c, index) => (
              <li
                key={index}
                onClick={() => {
                  setClienteFiltro(c.nombre);
                  setSugerenciasClientes([]);
                }}
                style={{ padding: 4, cursor: "pointer" }}
              >
                {c.nombre}
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontSize: "12px" }}>Tipo de documento:</label>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="todos">📄 Todos los documentos</option>
            <option value="cotizacion">💰 Solo cotizaciones</option>
            <option value="orden">📦 Solo órdenes de pedido</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
            padding: "10px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            flexWrap: "wrap"
          }}
        >
          <label style={{ fontSize: "12px", fontWeight: "500" }}>Filtrar por:</label>
          <button
            onClick={() => setUsarFechaEvento(!usarFechaEvento)}
            style={{
              padding: "6px 12px",
              background: usarFechaEvento ? "#3b82f6" : "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            {usarFechaEvento ? "📅 Fecha del evento" : "🗓️ Fecha de creación"}
          </button>
          <small style={{ color: "#6b7280", fontSize: "12px" }}>
            {usarFechaEvento
              ? "(Día del alquiler/servicio)"
              : "(Cuándo se registró el documento)"}
          </small>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px" }}>Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px" }}>Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontSize: "12px" }}>Ordenar por:</label>
          <select
            value={ordenDescendente ? "desc" : "asc"}
            onChange={(e) => setOrdenDescendente(e.target.value === "desc")}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="desc">⬇️ Más reciente primero</option>
            <option value="asc">⬆️ Más antiguo primero</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button onClick={buscarDocumentos} style={{ flex: 1 }}>
            🔍 Buscar
          </button>
          <button onClick={limpiar} style={{ flex: 1 }}>
            🧹 Limpiar
          </button>
          <button
            onClick={() => setMostrarResultados(!mostrarResultados)}
            style={{ flex: 1 }}
          >
            {mostrarResultados ? "Ocultar Resultados" : "Mostrar Resultados"}
          </button>
        </div>

        {mostrarResultados && resultados.length > 0 && (
          <>
            <h3>Resultados</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {resultados.map((doc) => {
                const tipo = doc.numero?.startsWith("COT") ? "cotizacion" : "orden";
                const fecha = doc.fecha || doc.fecha_creacion || "-";
                const fechaEvento = doc.fecha_evento?.split("T")[0] || "-";

                return (
                  <li
                    key={doc.id}
                    style={{
                      marginBottom: "1rem",
                      border: "1px solid #ccc",
                      borderRadius: "10px",
                      padding: "10px",
                      background: "#fdfdfd"
                    }}
                  >
                    <strong>Documento:</strong> {doc.numero || "-"}<br />
                    <strong>Cliente:</strong> {doc.nombre_cliente || "Sin cliente"}<br />
                    <strong>Total:</strong> ${Number(doc.total || 0).toLocaleString("es-CO")}<br />
                    <strong>Fecha creación:</strong> {fecha?.split("T")[0] || "-"}<br />
                    {doc.fecha_evento && (
                      <>
                        <strong>Fecha evento:</strong> {fechaEvento}<br />
                      </>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                      <button onClick={() => editarDocumento(doc, tipo)}>Editar</button>
                      <button onClick={() => generarPDF(doc, tipo)}>📄 PDF</button>
                      {tipo === "orden" && (
                        <button onClick={() => generarRemision(doc)}>🚚 Remisión</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {mostrarResultados && resultados.length === 0 && (
          <p>No se encontraron documentos con ese producto.</p>
        )}
      </div>
    </Protegido>
  );
}