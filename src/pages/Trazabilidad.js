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
      usarFechaEvento
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
  };

  const limpiar = () => {
    setProductoBuscar("");
    setClienteFiltro("");
    setFechaDesde("");
    setFechaHasta("");
    setResultados([]);
    setSugerenciasProductos([]);
    setSugerenciasClientes([]);
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
      <div style={{ maxWidth: "900px", margin: "auto", padding: "1rem" }}>
        <h2 style={{ textAlign: "center" }}>Trazabilidad de Artículos</h2>

        <label>Nombre del producto:</label>
        <input
          type="text"
          value={productoBuscar}
          onChange={manejarCambioProducto}
          placeholder="Ej: silla rimax"
          style={{ width: "100%", marginBottom: 4 }}
        />
        {sugerenciasProductos.length > 0 && (
          <ul style={{ listStyle: "none", padding: 4, border: "1px solid #ccc", borderRadius: 4, maxHeight: 100, overflowY: "auto" }}>
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

        <label>Filtrar por cliente (opcional):</label>
        <input
          type="text"
          value={clienteFiltro}
          onChange={manejarCambioCliente}
          placeholder="Nombre del cliente"
          style={{ width: "100%", marginBottom: 4 }}
        />
        {sugerenciasClientes.length > 0 && (
          <ul style={{ listStyle: "none", padding: 4, border: "1px solid #ccc", borderRadius: 4, maxHeight: 100, overflowY: "auto" }}>
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

        <div style={{ marginBottom: "10px", marginTop: "15px" }}>
          <label style={{ fontWeight: "500", display: "block", marginBottom: "6px" }}>
            Tipo de documento:
          </label>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc"
            }}
          >
            <option value="todos">📄 Todos los documentos</option>
            <option value="cotizacion">💰 Solo cotizaciones</option>
            <option value="orden">📦 Solo órdenes de pedido</option>
          </select>
        </div>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "10px", 
          marginBottom: "10px",
          padding: "10px",
          backgroundColor: "#f3f4f6",
          borderRadius: "6px",
          flexWrap: "wrap"
        }}>
          <label style={{ fontWeight: "500" }}>Filtrar por:</label>
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
          <small style={{ color: "#6b7280" }}>
            {usarFechaEvento 
              ? "(Día del alquiler/servicio)" 
              : "(Cuándo se registró el documento)"}
          </small>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <label style={{ fontWeight: "500" }}>Ordenar resultados:</label>
          <button
            onClick={() => setOrdenDescendente(!ordenDescendente)}
            style={{
              padding: "8px 16px",
              background: "#374151",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {ordenDescendente ? "⬇️ Más reciente primero" : "⬆️ Más antiguo primero"}
          </button>
        </div>

        <button
          onClick={buscarDocumentos}
          style={{ width: "100%", padding: "10px", background: "#1f2937", color: "white", marginBottom: "20px" }}
        >
          Buscar movimientos
        </button>

        {resultados.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {resultados.map((doc) => {
              const tipo = doc.numero?.startsWith("COT") ? "cotizacion" : "orden";
              const fecha = doc.fecha || doc.fecha_creacion || "-";
              const nombrePDF = `${tipo === "cotizacion" ? "COT" : "Ord"}_${fecha?.split("T")[0]}_${doc.nombre_cliente?.replace(/\s+/g, "_")}.pdf`;

              return (
                <li key={doc.id} style={{ borderBottom: "1px solid #ccc", padding: "10px 0" }}>
                  <strong>Documento:</strong> {doc.numero || "-"}<br />
                  <strong>Cliente:</strong> {doc.nombre_cliente || "Sin cliente"}<br />
                  <strong>Fecha:</strong> {fecha?.split("T")[0] || "-"}<br />
                  <strong>Archivo:</strong> {nombrePDF}
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{ cursor: "pointer", marginRight: 10 }}
                      onClick={() => editarDocumento(doc, tipo)}
                      title="Editar documento"
                    >
                      ✏️
                    </span>
                    <span
                      style={{ cursor: "pointer", marginRight: 10 }}
                      onClick={() => generarPDF(doc, tipo)}
                      title="Descargar PDF"
                    >
                      📄
                    </span>
                    {tipo === "orden" && (
                      <span
                        style={{ cursor: "pointer" }}
                        onClick={() => generarRemision(doc)}
                        title="Descargar Remisión"
                      >
                        🚚
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No se encontraron documentos con ese producto.</p>
        )}

        <button
          onClick={limpiar}
          style={{ width: "100%", marginTop: 30, backgroundColor: "#e53935", color: "white", padding: "10px", borderRadius: "6px" }}
        >
          🧹 Limpiar módulo
        </button>
      </div>
    </Protegido>
  );
}