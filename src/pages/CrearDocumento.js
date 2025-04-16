// Parte 1 de 4 - CrearDocumento.js

import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [clientes, setClientes] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    email: "",
  });

  const [productosAgregados, setProductosAgregados] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaEvento, setFechaEvento] = useState("");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  const total = productosAgregados.reduce((acc, p) => acc + p.subtotal, 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  useEffect(() => {
    const obtenerClientes = async () => {
      const { data, error } = await supabase.from("clientes").select("*");
      if (data) setClientes(data);
      if (error) console.error("Error cargando clientes:", error);
    };
    obtenerClientes();
  }, []);
  const agregarProducto = (producto) => {
    const item = {
      tipo: "producto",
      id: producto.id,
      nombre: producto.nombre || producto.descripcion,
      precio: producto.precio,
      cantidad: 1,
      subtotal: producto.precio,
    };
    setProductosAgregados([...productosAgregados, item]);
    setModalOpen(false);
  };

  const agregarGrupo = (grupo) => {
    const subtotal = grupo.articulos.reduce((acc, a) => acc + a.precio * a.cantidad, 0);
    const item = {
      tipo: "grupo",
      nombre: grupo.nombre,
      articulos: grupo.articulos,
      subtotal,
    };
    setProductosAgregados([...productosAgregados, item]);
    setGrupoOpen(false);
  };

  const eliminarProducto = (index) => {
    const actualizados = [...productosAgregados];
    actualizados.splice(index, 1);
    setProductosAgregados(actualizados);
  };

  const actualizarCantidad = (index, nuevaCantidad) => {
    const actualizados = [...productosAgregados];
    actualizados[index].cantidad = nuevaCantidad;
    actualizados[index].subtotal = actualizados[index].precio * nuevaCantidad;
    setProductosAgregados(actualizados);
  };

  const actualizarPrecio = (index, nuevoPrecio) => {
    const actualizados = [...productosAgregados];
    actualizados[index].precio = nuevoPrecio;
    actualizados[index].subtotal = nuevoPrecio * actualizados[index].cantidad;
    setProductosAgregados(actualizados);
  };

  const actualizarAbono = (index, valor) => {
    const copia = [...abonos];
    copia[index] = valor;
    setAbonos(copia);
  };

  const agregarAbono = () => setAbonos([...abonos, ""]);

  const crearClienteDesdeFormulario = async () => {
    const { nombre, telefono, direccion, email } = nuevoCliente;
    if (!nombre || !telefono) return Swal.fire("Campos requeridos", "Nombre y teléfono son obligatorios", "warning");

    const { data, error } = await supabase.from("clientes").insert([{ nombre, telefono, direccion, email }]).select("*");
    if (error) {
      Swal.fire("Error", "No se pudo guardar el cliente", "error");
    } else {
      setClientes([...clientes, ...data]);
      setClienteSeleccionado(data[0].id);
      setMostrarFormularioCliente(false);
      Swal.fire("Guardado", "Cliente creado exitosamente", "success");
    }
  };
  return (
    <div style={{ padding: "1rem", maxWidth: "1200px", margin: "auto" }}>
      <h2>📝 Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      {/* Selección tipo de documento y fechas */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <label>
            <input type="radio" value="cotizacion" checked={tipoDocumento === "cotizacion"} onChange={() => setTipoDocumento("cotizacion")} />
            Cotización
          </label>
          {"  "}
          <label style={{ marginLeft: "10px" }}>
            <input type="radio" value="orden" checked={tipoDocumento === "orden"} onChange={() => setTipoDocumento("orden")} />
            Orden de Pedido
          </label>
        </div>
        <div>
          <label style={{ marginRight: 5 }}>📅 Fecha creación:</label>
          <span>{fechaCreacion}</span>
        </div>
        <div>
          <label style={{ marginRight: 5 }}>📅 Fecha evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: 10 }}>
        <label>👤 Cliente: </label>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono, código..."
          value={clienteBusqueda}
          onChange={(e) => setClienteBusqueda(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {clientesFiltrados.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre} - {c.telefono}</option>
          ))}
        </select>
        <button onClick={() => setMostrarFormularioCliente(!mostrarFormularioCliente)} style={{ marginLeft: 10 }}>
          {mostrarFormularioCliente ? "Cerrar" : "➕ Nuevo cliente"}
        </button>
      </div>

      {mostrarFormularioCliente && (
        <div style={{ marginBottom: 15 }}>
          <input type="text" placeholder="Nombre" value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
          <input type="text" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
          <input type="text" placeholder="Dirección" value={nuevoCliente.direccion} onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} />
          <input type="text" placeholder="Email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
          <button onClick={crearClienteDesdeFormulario}>Guardar cliente</button>
        </div>
      )}

      {/* Tabla de productos */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid gray" }}>Cantidad</th>
            <th style={{ borderBottom: "1px solid gray" }}>Descripción</th>
            <th style={{ borderBottom: "1px solid gray" }}>Valor Unitario</th>
            <th style={{ borderBottom: "1px solid gray" }}>Subtotal</th>
            <th style={{ borderBottom: "1px solid gray" }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((item, index) => (
            <tr key={index}>
              <td>
                {item.tipo === "producto" ? (
                  <input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) => actualizarCantidad(index, parseInt(e.target.value))}
                    style={{ width: "60px" }}
                  />
                ) : item.articulos.reduce((acc, art) => acc + art.cantidad, 0)}
              </td>
              <td>{item.nombre}</td>
              <td>
                {item.tipo === "producto" ? (
                  <input
                    type="number"
                    value={item.precio}
                    onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value))}
                    style={{ width: "80px" }}
                  />
                ) : "$" + item.subtotal}
              </td>
              <td>${item.subtotal}</td>
              <td>
                <button onClick={() => eliminarProducto(index)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totales y abonos */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <label>💰 Garantía:</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ marginLeft: "10px", width: "150px" }}
          />
        </div>

        <div>
          <label>🪙 Abonos:</label>
          {abonos.map((a, i) => (
            <input
              key={i}
              type="number"
              value={a}
              onChange={(e) => actualizarAbono(i, e.target.value)}
              style={{ marginLeft: "5px", width: "100px" }}
            />
          ))}
          <button onClick={agregarAbono} style={{ marginLeft: 10 }}>➕ Agregar Abono</button>
        </div>

        <div>
          <h3>Total: ${total}</h3>
          <p>Saldo: ${saldo}</p>
        </div>
      </div>

      {/* Botones principales */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setModalOpen(true)} style={{ width: "100%", marginBottom: 8 }}>➕ Agregar artículo existente</button>
        <button onClick={() => setGrupoOpen(true)} style={{ width: "100%", marginBottom: 8 }}>🍱 Crear grupo de artículos</button>
        <button onClick={guardarDocumento} style={{ width: "100%", marginBottom: 8 }}>📥 Guardar documento</button>

        {productosAgregados.length > 0 && (
          <>
            <button
              onClick={() =>
                generarPDF(
                  {
                    cliente_id: clienteSeleccionado,
                    nombre_cliente: obtenerNombreCliente(),
                    productos: productosAgregados,
                    total,
                    abonos,
                    saldo,
                    garantia,
                    fecha: fechaCreacion,
                    fecha_evento: fechaEvento,
                  },
                  tipoDocumento
                )
              }
              style={{ width: "100%", marginBottom: 8 }}
            >
              🖨️ Descargar PDF
            </button>

            {tipoDocumento === "orden" && (
              <button onClick={generarRemisionPDF} style={{ width: "100%", marginBottom: 8 }}>
                📄 Generar Remisión
              </button>
            )}
          </>
        )}
      </div>

      {/* MODALES */}
      {modalOpen && (
        <BuscarProductoModal
          onSelect={agregarProducto}
          onClose={() => setModalOpen(false)}
        />
      )}

      {grupoOpen && (
        <AgregarGrupoModal
          onAgregarGrupo={agregarGrupo}
          onClose={() => setGrupoOpen(false)}
        />
      )}
    </div>
  );
};

export default CrearDocumento;
