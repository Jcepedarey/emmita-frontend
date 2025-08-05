import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";

export default function Trazabilidad() {
  const [productoBuscar, setProductoBuscar] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [resultados, setResultados] = useState([]);

  const [productosLista, setProductosLista] = useState([]);
  const [clientesLista, setClientesLista] = useState([]);

  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: productos } = await supabase.from("productos").select("nombre");
      const { data: clientes } = await supabase.from("clientes").select("*");

      setProductosLista(productos || []);
      setClientesLista(clientes || []);
    };
    cargarDatos();
  }, []);

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

    const resultadosFiltrados = todos.filter((doc) => {
      const productos = doc.productos || [];
      const contieneProducto = productos.some((p) =>
        p.nombre.toLowerCase().includes(productoBuscar.toLowerCase())
      );
      if (!contieneProducto) return false;

      const fechaBase = doc.fecha_evento || doc.fecha || doc.fecha_creacion;
      if (fechaDesde && fechaBase < fechaDesde) return false;
      if (fechaHasta && fechaBase > fechaHasta) return false;

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
      const fechaA = new Date(a.fecha || a.fecha_creacion);
      const fechaB = new Date(b.fecha || b.fecha_creacion);
      return fechaB - fechaA;
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