import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";
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
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>
          {/* ========== HEADER ========== */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">🔎 Trazabilidad de Artículos</h1>
          </div>

        {/* ========== FILTROS ========== */}
        <div className="cd-card">
          <div className="cd-card-header cd-card-header-cyan">🔍 Filtros de búsqueda</div>
          <div className="cd-card-body">
            {/* Producto */}
            <div className="cd-campo" style={{ marginBottom: "12px" }}>
              <label>Nombre del producto</label>
              <input
                type="text"
                value={productoBuscar}
                onChange={manejarCambioProducto}
                placeholder="Ej: silla rimax"
              />
            </div>
            {sugerenciasProductos.length > 0 && (
              <ul className="cd-sugerencias" style={{ marginBottom: "12px" }}>
                {sugerenciasProductos.map((p, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setProductoBuscar(p.nombre);
                      setSugerenciasProductos([]);
                    }}
                  >
                    {p.nombre}
                  </li>
                ))}
              </ul>
            )}

            {/* Cliente */}
            <div className="cd-campo" style={{ marginBottom: "12px" }}>
              <label>Filtrar por cliente (opcional)</label>
              <input
                type="text"
                value={clienteFiltro}
                onChange={manejarCambioCliente}
                placeholder="Nombre del cliente"
              />
            </div>
            {sugerenciasClientes.length > 0 && (
              <ul className="cd-sugerencias" style={{ marginBottom: "12px" }}>
                {sugerenciasClientes.map((c, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setClienteFiltro(c.nombre);
                      setSugerenciasClientes([]);
                    }}
                  >
                    {c.nombre}
                  </li>
                ))}
              </ul>
            )}

            {/* Tipo documento */}
            <div className="cd-campo" style={{ marginBottom: "12px" }}>
              <label>Tipo de documento</label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
              >
                <option value="todos">📄 Todos los documentos</option>
                <option value="cotizacion">💰 Solo cotizaciones</option>
                <option value="orden">📦 Solo órdenes de pedido</option>
              </select>
            </div>

            {/* Toggle fecha */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.3px" }}>Filtrar por:</span>
              <button
                className={`cd-btn ${usarFechaEvento ? "cd-btn-azul" : "cd-btn-gris"}`}
                onClick={() => setUsarFechaEvento(!usarFechaEvento)}
                style={{ padding: "6px 14px", fontSize: "13px", minHeight: "auto" }}
              >
                {usarFechaEvento ? "📅 Fecha del evento" : "🗓️ Fecha de creación"}
              </button>
              <small style={{ color: "#9ca3af", fontSize: "12px" }}>
                {usarFechaEvento ? "(Día del alquiler/servicio)" : "(Cuándo se registró el documento)"}
              </small>
            </div>

            {/* Fechas */}
            <div className="cd-fechas-grid" style={{ marginBottom: "12px" }}>
              <div className="cd-campo">
                <label>Desde</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="cd-campo">
                <label>Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
            </div>

            {/* Ordenar */}
            <div className="cd-campo" style={{ marginBottom: "16px" }}>
              <label>Ordenar por</label>
              <select
                value={ordenDescendente ? "desc" : "asc"}
                onChange={(e) => setOrdenDescendente(e.target.value === "desc")}
              >
                <option value="desc">⬇️ Más reciente primero</option>
                <option value="asc">⬆️ Más antiguo primero</option>
              </select>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button className="cd-btn cd-btn-cyan" style={{ flex: 1 }} onClick={buscarDocumentos}>
                🔍 Buscar
              </button>
              <button className="cd-btn cd-btn-gris" style={{ flex: 1 }} onClick={limpiar}>
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
        {mostrarResultados && resultados.length > 0 && (
          <div className="cd-card">
            <div className="cd-card-header">📋 Resultados ({resultados.length})</div>
            <div className="cd-card-body" style={{ padding: 0 }}>
              {resultados.map((doc) => {
                const tipo = doc.numero?.startsWith("COT") ? "cotizacion" : "orden";
                const fecha = doc.fecha || doc.fecha_creacion || "-";
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
                      <div style={{ fontWeight: 600, color: tipo === "cotizacion" ? "#b91c1c" : "#1d4ed8", fontSize: "14px" }}>
                        {doc.numero || "-"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#111827" }}>
                        {doc.nombre_cliente || "Sin cliente"} — ${Number(doc.total || 0).toLocaleString("es-CO")}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                        Creación: {fecha?.split("T")[0] || "-"}
                        {doc.fecha_evento && ` · Evento: ${fechaEvento}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button className="cd-btn cd-btn-azul" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => editarDocumento(doc, tipo)}>✏️ Editar</button>
                      <button className="cd-btn cd-btn-gris" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => generarPDF(doc, tipo)}>📄 PDF</button>
                      {tipo === "orden" && (
                        <button className="cd-btn cd-btn-verde" style={{ padding: "6px 12px", fontSize: "12px", minHeight: "auto" }} onClick={() => generarRemision(doc)}>🚚 Remisión</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mostrarResultados && resultados.length === 0 && (
          <div className="cd-card">
            <div className="cd-card-body" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>
              No se encontraron documentos con ese producto.
            </div>
          </div>
        )}
      </div>
      </div>
    </Protegido>
  );
}