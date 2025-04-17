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
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", descripcion: "", precio: 0 });
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" });
  
  const actualizarCantidad = (index, cantidad) => {
    const nuevos = [...productosAgregados];
    nuevos[index].cantidad = cantidad;
    nuevos[index].subtotal = cantidad * nuevos[index].precio;
    setProductosAgregados(nuevos);
  };
  
  const eliminarProducto = (index) => {
    const nuevos = [...productosAgregados];
    nuevos.splice(index, 1);
    setProductosAgregados(nuevos);
  };
  
  const agregarAbono = () => {
    if (!abonos[abonos.length - 1] || isNaN(abonos[abonos.length - 1])) return;
    setAbonos([...abonos, ""]);
  };
  
  const generarRemisionPDF = () => {
    Swal.fire("📄 Remisión", "Esta función se encuentra en desarrollo o fue llamada sin datos.", "info");
  };
  
  const crearClienteDesdeDocumento = async (clienteData) => {
    setClienteId(clienteData.id);
    setModalCrearCliente(false);
    setNuevoCliente({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" });
  };
  useEffect(() => {
    const cargarClientes = async () => {
      const { data } = await supabase.from("clientes").select("*");
      if (data) setClientes(data);
    };
    cargarClientes();
  }, []);
  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.identificacion, c.telefono, c.codigo].some((campo) =>
      campo?.toLowerCase().includes(busquedaCliente.toLowerCase())
    )
  );

  const agregarProducto = (producto) => {
    const item = {
      tipo: "producto",
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      subtotal: producto.precio,
    };
    setProductosAgregados([...productosAgregados, item]);
    setModalBuscarProducto(false);
  };

  const crearNuevoProducto = async (producto) => {
    const { data, error } = await supabase.from("productos").insert([producto]).select();
    if (error) {
      Swal.fire("Error", "No se pudo crear el producto.", "error");
    } else {
      agregarProducto(data[0]);
    }
    setModalCrearProducto(false);
  };

  const agregarGrupo = (grupo) => {
    const subtotal = grupo.detalleGrupo.reduce((acc, a) => acc + a.precio * a.cantidad, 0);
    const item = {
      tipo: "grupo",
      nombre: grupo.nombre,
      articulos: grupo.detalleGrupo,
      subtotal,
    };
    setProductosAgregados([...productosAgregados, item]);
    setModalGrupo(false);
  };

  const actualizarAbono = (index, valor) => {
    const copia = [...abonos];
    copia[index] = valor;
    setAbonos(copia);
  };

  const guardarDocumento = async () => {
    if (!clienteId) return Swal.fire("Falta cliente", "Selecciona un cliente.", "warning");
    if (productosAgregados.length === 0) return Swal.fire("Sin productos", "Agrega productos.", "info");
    if (!fechaEvento) return Swal.fire("Fecha faltante", "Selecciona la fecha del evento.", "warning");

    const datos = {
      cliente_id: clienteId,
      productos: productosAgregados,
      total,
      abonos,
      pagado,
      saldo,
      garantia,
      fecha_evento: fechaEvento,
    };

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { error } = await supabase.from(tabla).insert([datos]);

    if (error) {
      Swal.fire("Error", "No se pudo guardar el documento.", "error");
    } else {
      Swal.fire("Guardado", `${tipoDocumento === "cotizacion" ? "Cotización" : "Orden"} guardada con éxito`, "success");
      setProductosAgregados([]);
      setClienteId("");
      setGarantia("");
      setAbonos([""]);
    }
  };
  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Crear Documento</h2>

      {/* Tipo de documento */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Tipo de documento:</label>
        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
          <option value="cotizacion">Cotización</option>
          <option value="orden">Orden de Pedido</option>
        </select>
      </div>

      {/* Fechas */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label>Fecha de creación:</label>
          <input type="text" value={fechaCreacion} readOnly style={{ width: "100%" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Fecha del evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>

      {/* Buscar o crear cliente */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Buscar cliente:</label>
        <input
          type="text"
          placeholder="Nombre, identificación o teléfono"
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        {clientesFiltrados.length > 0 && (
          <ul style={{ maxHeight: "100px", overflowY: "auto", listStyle: "none", padding: 0 }}>
            {clientesFiltrados.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  setClienteId(c.id);
                  setBusquedaCliente("");
                }}
                style={{ padding: "5px", borderBottom: "1px solid #ddd", cursor: "pointer" }}
              >
                {c.nombre} - {c.identificacion} - {c.telefono}
              </li>
            ))}
          </ul>
        )}
        <button onClick={() => setModalCrearCliente(true)} style={{ marginTop: "0.5rem" }}>
          ➕ Crear nuevo cliente
        </button>
      </div>

      {/* Tabla de productos */}
      <div>
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th>Cantidad</th>
              <th>Descripción</th>
              <th>Valor Unitario</th>
              <th>Subtotal</th>
              <th>❌</th>
            </tr>
          </thead>
          <tbody>
            {productosAgregados.map((item, index) => (
              <tr key={index}>
                <td>
                  {item.tipo === "producto" ? (
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(index, parseInt(e.target.value))}
                      style={{ width: "60px" }}
                    />
                  ) : item.articulos.reduce((acc, a) => acc + a.cantidad, 0)}
                </td>
                <td>{item.nombre}</td>
                <td>${item.precio}</td>
                <td>${item.subtotal}</td>
                <td>
                  <button onClick={() => eliminarProducto(index)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Totales, garantía y abonos */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
        <div style={{ width: "30%" }}>
          <label>Garantía:</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ width: "30%" }}>
          <label>Abonos:</label>
          {abonos.map((abono, index) => (
            <input
              key={index}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(index, e.target.value)}
              style={{ width: "100%", marginBottom: "5px" }}
            />
          ))}
          <button onClick={agregarAbono}>➕ Otro abono</button>
        </div>

        <div style={{ width: "30%" }}>
          <h4>Total: ${total}</h4>
          <h4>Saldo: ${saldo}</h4>
        </div>
      </div>

      {/* Botones principales */}
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={guardarDocumento}>💾 Guardar documento</button>
        <button
          onClick={() =>
            generarPDF({
              cliente_id: clienteId,
              productos: productosAgregados,
              total,
              abonos,
              saldo,
              garantia,
              fecha: fechaCreacion,
              fecha_evento: fechaEvento,
            }, tipoDocumento)
          }
        >
          📄 Descargar PDF
        </button>
        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button onClick={generarRemisionPDF}>🚚 Generar remisión</button>
        )}
      </div>

      {/* Botones de agregar artículos */}
      <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
        <button onClick={() => setModalOpen(true)}>📦 Agregar producto del inventario</button>
        <button onClick={() => setGrupoOpen(true)}>🧩 Crear grupo (set)</button>
        <button onClick={() => setCrearProductoOpen(true)}>➕ Crear nuevo producto</button>
      </div>

      {/* Modales */}
      {modalOpen && (
        <BuscarProductoModal
          onSelect={agregarProducto}
          onClose={() => setModalOpen(false)}
        />
      )}

      {grupoOpen && (
        <AgregarGrupoModal
          onCrearGrupo={agregarGrupo}
          onCerrar={() => setGrupoOpen(false)}
        />
      )}

      {crearProductoOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Crear nuevo producto</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoProducto.nombre}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
            />
            <input
              type="text"
              placeholder="Descripción"
              value={nuevoProducto.descripcion}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
            />
            <input
              type="number"
              placeholder="Precio"
              value={nuevoProducto.precio}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: parseFloat(e.target.value) })}
            />
            <button onClick={crearNuevoProducto}>Guardar producto</button>
            <button onClick={() => setCrearProductoOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal para crear cliente */}
      {modalCrearCliente && (
        <div className="modal">
          <div className="modal-content">
            <h3>Crear nuevo cliente</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoCliente.nombre}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
            />
            <input
              type="text"
              placeholder="Identificación"
              value={nuevoCliente.identificacion}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, identificacion: e.target.value })}
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={nuevoCliente.telefono}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
            />
            <input
              type="text"
              placeholder="Dirección"
              value={nuevoCliente.direccion}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
            />
            <input
              type="email"
              placeholder="Correo"
              value={nuevoCliente.correo}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
            />
            <button onClick={crearClienteDesdeDocumento}>Guardar cliente</button>
            <button onClick={() => setModalCrearCliente(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearDocumento;
