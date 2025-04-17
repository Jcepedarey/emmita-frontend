// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import CrearClienteModal from "../components/CrearClienteModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");

  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [productosAgregados, setProductosAgregados] = useState([]);
  const [gruposAgregados, setGruposAgregados] = useState([]);

  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
  const [modalCrearProducto, setModalCrearProducto] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalCrearCliente, setModalCrearCliente] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria: ""
  });

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    direccion: "",
    email: ""
  });

  const total = productosAgregados.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
    if (data) setClientes(data);
  };

  const clientesFiltrados = clientes.filter((cliente) =>
    [cliente.nombre, cliente.identificacion, cliente.telefono, cliente.codigo]
      .some(campo => campo?.toLowerCase().includes(busquedaCliente.toLowerCase()))
  );

  const agregarProducto = (producto) => {
    const existente = productosAgregados.find(p => p.id === producto.id);
    if (existente) {
      Swal.fire("Ya agregado", "Este producto ya está en la lista", "info");
      return;
    }

    const nuevo = {
      ...producto,
      cantidad: 1,
      subtotal: producto.precio
    };
    setProductosAgregados([...productosAgregados, nuevo]);
  };

  const actualizarCantidad = (index, valor) => {
    const copia = [...productosAgregados];
    copia[index].cantidad = parseFloat(valor);
    copia[index].subtotal = copia[index].cantidad * copia[index].precio;
    setProductosAgregados(copia);
  };

  const eliminarProducto = (index) => {
    const copia = [...productosAgregados];
    copia.splice(index, 1);
    setProductosAgregados(copia);
  };

  const agregarGrupo = (grupo) => {
    setGruposAgregados([...gruposAgregados, grupo]);
  };

  const agregarAbono = () => {
    setAbonos([...abonos, ""]);
  };

  const actualizarAbono = (i, valor) => {
    const copia = [...abonos];
    copia[i] = valor;
    setAbonos(copia);
  };

  const guardarDocumento = async () => {
    if (!clienteId || productosAgregados.length === 0) {
      Swal.fire("Datos incompletos", "Selecciona cliente y al menos un producto", "warning");
      return;
    }

    const productos = [...productosAgregados, ...gruposAgregados.map(g => ({
      nombre: `GRUPO: ${g.nombre}`,
      cantidad: 1,
      precio: g.subtotal,
      subtotal: g.subtotal
    }))];

    const total = productos.reduce((acc, p) => acc + p.subtotal, 0);
    const datos = {
      cliente_id: clienteId,
      productos,
      total,
      fecha_evento: fechaEvento,
      garantia,
      abonos,
      estado: tipoDocumento === "orden" ? "confirmada" : "pendiente"
    };

    const tabla = tipoDocumento === "orden" ? "ordenes_pedido" : "cotizaciones";
    const { error } = await supabase.from(tabla).insert([datos]);

    if (!error) {
      Swal.fire("Guardado", `${tipoDocumento === "orden" ? "Orden" : "Cotización"} guardada correctamente`, "success");
    } else {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el documento", "error");
    }
  };

  const generarRemisionPDF = () => {
    const productosDetalle = [
      ...productosAgregados,
      ...gruposAgregados.flatMap(grupo => grupo.articulos.map(p => ({
        nombre: `[${grupo.nombre}] ${p.nombre}`,
        cantidad: p.cantidad,
        precio: 0,
        subtotal: 0
      })))
    ];

    const documento = {
      nombre_cliente: obtenerNombreCliente(),
      fecha: fechaCreacion,
      fecha_evento: fechaEvento,
      productos: productosDetalle,
      garantia: 0,
      abonos: [],
      total: 0
    };

    generarPDF(documento, "remision");
  };

  const obtenerNombreCliente = () => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : "";
  };

  // ✅ NUEVO: función para generar datos del PDF
  const obtenerDatosPDF = () => ({
    tipo: tipoDocumento,
    nombre_cliente: obtenerNombreCliente(),
    fecha: fechaCreacion,
    fecha_evento: fechaEvento,
    productos: [
      ...productosAgregados,
      ...gruposAgregados.map(g => ({
        nombre: `GRUPO: ${g.nombre}`,
        cantidad: 1,
        precio: g.subtotal,
        subtotal: g.subtotal
      }))
    ],
    garantia,
    abonos,
    total
  });
  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Crear {tipoDocumento === "orden" ? "Orden de Pedido" : "Cotización"}</h2>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <label>Tipo de documento:</label>
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            <option value="cotizacion">Cotización</option>
            <option value="orden">Orden de Pedido</option>
          </select>
        </div>
        <div>
          <label>Fecha de creación:</label>
          <input type="date" value={fechaCreacion} disabled />
        </div>
        <div>
          <label>Fecha del evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
      </div>

      <div>
        <label>Buscar cliente:</label>
        <input
          type="text"
          placeholder="Nombre, identificación o código"
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
        />
        <ul>
          {clientesFiltrados.map((c) => (
            <li key={c.id} style={{ cursor: "pointer" }} onClick={() => setClienteId(c.id)}>
              {c.codigo} - {c.nombre} - {c.identificacion}
            </li>
          ))}
        </ul>
        <button onClick={() => setModalCrearCliente(true)}>➕ Crear cliente</button>
      </div>

      <hr />

      <div>
        <h4>Productos agregados:</h4>
        <table style={{ width: "100%", marginBottom: "1rem" }}>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Valor unitario</th>
              <th>Subtotal</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosAgregados.map((p, index) => (
              <tr key={index}>
                <td>{p.nombre}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={p.cantidad}
                    onChange={(e) => actualizarCantidad(index, e.target.value)}
                  />
                </td>
                <td>${p.precio}</td>
                <td>${p.subtotal.toFixed(2)}</td>
                <td>
                  <button onClick={() => eliminarProducto(index)}>🗑️</button>
                </td>
              </tr>
            ))}
            {gruposAgregados.map((g, i) => (
              <tr key={`grupo-${i}`}>
                <td><strong>GRUPO: {g.nombre}</strong></td>
                <td>1</td>
                <td>${g.subtotal}</td>
                <td>${g.subtotal}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setModalBuscarProducto(true)}>🔍 Agregar Producto desde Inventario</button>
          <button onClick={() => setModalCrearProducto(true)}>➕ Crear Nuevo Producto</button>
          <button onClick={() => setModalGrupo(true)}>📦 Crear Grupo de Artículos</button>
        </div>
      </div>

      <hr />
      <div style={{ marginTop: "1rem" }}>
        <div>
          <label>Garantía ($):</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
          />
        </div>

        <div>
          <label>Abonos:</label>
          {abonos.map((abono, i) => (
            <input
              key={i}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(i, e.target.value)}
              style={{ marginRight: "5px", marginBottom: "5px" }}
            />
          ))}
          <button onClick={agregarAbono}>➕ Abono</button>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={pagado}
              onChange={(e) => setPagado(e.target.checked)}
            />
            Pedido totalmente pagado
          </label>
        </div>

        <h3>Total: ${total.toFixed(2)}</h3>
        <h3>Saldo: ${saldo.toFixed(2)}</h3>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={guardarDocumento}>💾 Guardar</button>
        <button onClick={() => generarPDF(obtenerDatosPDF(), tipoDocumento)}>📄 Descargar PDF</button>
        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button onClick={() => generarRemisionPDF(obtenerDatosPDF())}>📦 Generar Remisión</button>
        )}
      </div>

      {/* Modales */}
      {modalBuscarProducto && (
        <BuscarProductoModal
          onSelect={producto => {
            agregarProducto(producto);
            setModalBuscarProducto(false);
          }}
          onClose={() => setModalBuscarProducto(false)}
        />
      )}

      {modalGrupo && (
        <AgregarGrupoModal
          onAgregarGrupo={grupo => {
            setGruposAgregados([...gruposAgregados, grupo]);
            setModalGrupo(false);
          }}
          onClose={() => setModalGrupo(false)}
        />
      )}

      {modalCrearProducto && (
        <BuscarProductoModal
          onSelect={producto => {
            agregarProducto(producto);
            setModalCrearProducto(false);
          }}
          onClose={() => setModalCrearProducto(false)}
        />
      )}

      {modalCrearCliente && (
        <CrearClienteModal
          onClienteCreado={(nuevoCliente) => {
            setClientes(prev => [...prev, nuevoCliente]);
            setClienteId(nuevoCliente.id);
            setModalCrearCliente(false);
          }}
          onClose={() => setModalCrearCliente(false)}
        />
      )}
    </div>
  );
};

export default CrearDocumento;
