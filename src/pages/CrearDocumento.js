// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import CrearClienteModal from "../components/CrearClienteModal";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [productosAgregados, setProductosAgregados] = useState([]);

  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
  const [modalCrearProducto, setModalCrearProducto] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalCrearCliente, setModalCrearCliente] = useState(false);

  const total = productosAgregados.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);
  useEffect(() => {
    const cargarClientes = async () => {
      const { data } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
      if (data) setClientes(data);
    };
    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.identificacion, c.telefono, c.email, c.direccion]
      .some((campo) => campo?.toLowerCase().includes(busquedaCliente.toLowerCase()))
  );

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    Swal.fire("Cliente seleccionado", `${cliente.nombre} (${cliente.identificacion})`, "success");
  };

  const agregarProducto = (producto) => {
    const nuevo = {
      nombre: producto.nombre,
      cantidad: 1,
      precio: parseFloat(producto.precio),
      subtotal: parseFloat(producto.precio),
      es_grupo: false
    };
    setProductosAgregados([...productosAgregados, nuevo]);
    setModalBuscarProducto(false);
  };

  const actualizarCantidad = (index, cantidad) => {
    const nuevos = [...productosAgregados];
    nuevos[index].cantidad = parseInt(cantidad || 0);
    nuevos[index].subtotal = nuevos[index].cantidad * nuevos[index].precio;
    setProductosAgregados(nuevos);
  };

  const eliminarProducto = (index) => {
    const nuevos = [...productosAgregados];
    nuevos.splice(index, 1);
    setProductosAgregados(nuevos);
  };

  const agregarAbono = () => {
    setAbonos([...abonos, ""]);
  };

  const actualizarAbono = (index, valor) => {
    const nuevos = [...abonos];
    nuevos[index] = valor;
    setAbonos(nuevos);
  };
  const guardarDocumento = async () => {
    if (!clienteSeleccionado || productosAgregados.length === 0) {
      return Swal.fire("Faltan datos", "Debes seleccionar un cliente y agregar al menos un producto.", "warning");
    }

    const datos = {
      cliente_id: clienteSeleccionado.id,
      productos: productosAgregados,
      total,
      fecha_evento: fechaEvento || null,
      garantia: parseFloat(garantia || 0),
      abonos,
      estado: "pendiente"
    };

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";

    const { error } = await supabase.from(tabla).insert([datos]);
    if (!error) {
      Swal.fire("Documento guardado", `La ${tipoDocumento} fue guardada exitosamente.`, "success");
    } else {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el documento", "error");
    }
  };

  const obtenerDatosPDF = () => ({
    tipo: tipoDocumento,
    nombre_cliente: clienteSeleccionado?.nombre,
    telefono: clienteSeleccionado?.telefono,
    direccion: clienteSeleccionado?.direccion,
    email: clienteSeleccionado?.email,
    fecha: new Date().toISOString().split("T")[0],
    fecha_evento: fechaEvento,
    productos: productosAgregados,
    garantia,
    abonos,
    total
  });

  const crearClienteDesdeDocumento = async (clienteNuevo) => {
    setClientes([...clientes, clienteNuevo]);
    setClienteSeleccionado(clienteNuevo);
    setModalCrearCliente(false);
    Swal.fire("Cliente creado", "El cliente fue agregado y seleccionado correctamente.", "success");
  };
  return (
    <div style={{ maxWidth: "1100px", margin: "auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center" }}>Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button onClick={() => setTipoDocumento("cotizacion")} style={{ backgroundColor: tipoDocumento === "cotizacion" ? "#1976d2" : "#e0e0e0", color: tipoDocumento === "cotizacion" ? "white" : "black", padding: "10px 20px" }}>Cotización</button>
        <button onClick={() => setTipoDocumento("orden")} style={{ backgroundColor: tipoDocumento === "orden" ? "#1976d2" : "#e0e0e0", color: tipoDocumento === "orden" ? "white" : "black", padding: "10px 20px" }}>Orden de Pedido</button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <label>Fecha creación:</label>
          <input type="text" value={fechaCreacion} disabled style={{ width: "100%" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Fecha evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label>Buscar cliente (nombre, teléfono, identificación):</label>
        <input
          type="text"
          placeholder="Buscar..."
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
        <button onClick={() => setModalCrearCliente(true)} style={{ marginTop: "5px" }}>➕ Crear Cliente</button>
      </div>
      {clientesFiltrados.length > 0 && (
        <ul style={{ border: "1px solid #ccc", padding: "10px", marginTop: "10px", borderRadius: "6px" }}>
          {clientesFiltrados.map((cliente) => (
            <li key={cliente.id} style={{ marginBottom: "8px", cursor: "pointer" }} onClick={() => seleccionarCliente(cliente)}>
              {cliente.nombre} - {cliente.identificacion} - {cliente.telefono}
            </li>
          ))}
        </ul>
      )}

      {clienteSeleccionado && (
        <div style={{ background: "#f5f5f5", padding: "10px", marginTop: "10px", borderRadius: "6px" }}>
          <strong>Cliente seleccionado:</strong>
          <p>📛 {clienteSeleccionado.nombre}</p>
          <p>🆔 {clienteSeleccionado.identificacion}</p>
          <p>📞 {clienteSeleccionado.telefono}</p>
          <p>📍 {clienteSeleccionado.direccion}</p>
          <p>📧 {clienteSeleccionado.email}</p>
        </div>
      )}

      <hr />

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => setModalBuscarProducto(true)} style={{ marginRight: "10px" }}>📦 Agregar Producto</button>
        <button onClick={() => setModalGrupo(true)}>📦 Crear Grupo</button>
      </div>

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#1976d2", color: "white" }}>
            <th style={{ padding: "10px" }}>Cantidad</th>
            <th style={{ padding: "10px" }}>Descripción</th>
            <th style={{ padding: "10px" }}>Valor unitario</th>
            <th style={{ padding: "10px" }}>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((p, i) => (
            <tr key={i}>
              <td style={{ padding: "6px", textAlign: "center" }}>{p.cantidad}</td>
              <td style={{ padding: "6px" }}>{p.nombre}</td>
              <td style={{ padding: "6px", textAlign: "right" }}>${p.precio.toLocaleString("es-CO")}</td>
              <td style={{ padding: "6px", textAlign: "right" }}>${p.subtotal.toLocaleString("es-CO")}</td>
              <td style={{ padding: "6px" }}><button onClick={() => eliminarProducto(i)}>❌</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
        <div style={{ flex: "1" }}>
          <label>Garantía ($):</label>
          <input
            type="number"
            min="0"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flex: "2" }}>
          <label>Abonos ($):</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {abonos.map((abono, index) => (
              <input
                key={index}
                type="number"
                min="0"
                value={abono}
                onChange={(e) => actualizarAbono(index, e.target.value)}
                style={{ width: "100px" }}
              />
            ))}
            <button onClick={agregarAbono}>➕</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "20px", textAlign: "right" }}>
        <p><strong>Total:</strong> ${total.toLocaleString("es-CO")}</p>
        <p><strong>Saldo final:</strong> ${saldo.toLocaleString("es-CO")}</p>
      </div>

      <div style={{ marginTop: "30px" }}>
        <button onClick={guardarDocumento} style={{ padding: "10px 20px", marginRight: "10px" }}>
          💾 Guardar Documento
        </button>

        <button onClick={() => generarPDF(obtenerDatosPDF(), tipoDocumento)} style={{ padding: "10px 20px" }}>
          📄 Descargar PDF
        </button>

        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button
            onClick={() => generarRemision(obtenerDatosPDF())}
            style={{ padding: "10px 20px", marginLeft: "10px", backgroundColor: "#4CAF50", color: "white" }}
          >
            📦 Generar Remisión
          </button>
        )}
      </div>

      {modalBuscarProducto && (
        <BuscarProductoModal
          onSelect={agregarProducto}
          onClose={() => setModalBuscarProducto(false)}
        />
      )}

      {modalGrupo && (
        <AgregarGrupoModal
          onAgregarGrupo={agregarGrupo}
          onClose={() => setModalGrupo(false)}
        />
      )}

      {modalCrearCliente && (
        <CrearClienteModal
          onClienteCreado={(cliente) => {
            setClienteSeleccionado(cliente);
            setClientes([...clientes, cliente]);
            setModalCrearCliente(false);
          }}
          onClose={() => setModalCrearCliente(false)}
        />
      )}
    </div>
  );
};

const agregarGrupo = (grupo) => {
  setProductosAgregados([...productosAgregados, {
    nombre: grupo.nombre,
    cantidad: 1,
    precio: grupo.subtotal,
    subtotal: grupo.subtotal,
    es_grupo: true,
    productos: grupo.articulos
  }]);
  setModalGrupo(false);
};

export default CrearDocumento;
