// CrearDocumento.js
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../supabaseClient";

import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import CrearClienteModal from "../components/CrearClienteModal";
import BuscarProveedorYProductoModal from "../components/BuscarProveedorYProductoModal";

import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF } from "../utils/generarRemision";

import Swal from "sweetalert2";

const CrearDocumento = () => {
  const location = useLocation();
  const { documento, tipo } = location.state || {};

  // 🧠 ESTADOS INICIALES
  const [tipoDocumento, setTipoDocumento] = useState(tipo || "cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [productosAgregados, setProductosAgregados] = useState([]);
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);

  const [stock, setStock] = useState({});
  const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
  const [modalCrearCliente, setModalCrearCliente] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);

  // 🔁 PRECARGA DESDE DOCUMENTO (edición)
  useEffect(() => {
    if (documento) {
      setTipoDocumento(documento.tipo || tipo || "cotizacion");
      setFechaEvento(documento.fecha_evento?.split("T")[0] || "");
      setProductosAgregados(documento.productos || []);
      setGarantia(documento.garantia || "");
      setAbonos(documento.abonos || [""]);
      setClienteSeleccionado({
        nombre: documento.nombre_cliente,
        identificacion: documento.identificacion,
        telefono: documento.telefono,
        direccion: documento.direccion,
        email: documento.email,
        id: documento.cliente_id || null
      });
    }
  }, [documento, tipo]);

  // 🧾 CARGAR CLIENTES AL ABRIR
  useEffect(() => {
    const cargarClientes = async () => {
      const { data } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
      if (data) setClientes(data);
    };
    cargarClientes();
  }, []);

  // 📦 CALCULAR STOCK DISPONIBLE PARA LA FECHA DEL EVENTO
  useEffect(() => {
    const calcularStock = async () => {
      if (!fechaEvento) return;

      const { data: productosData } = await supabase.from("productos").select("id, stock");
      const { data: ordenesData } = await supabase
        .from("ordenes_pedido")
        .select("productos, fecha_evento")
        .eq("fecha_evento", fechaEvento);

      const reservas = {};
      ordenesData?.forEach((orden) => {
        orden.productos?.forEach((p) => {
          const id = p.producto_id || p.id;
          reservas[id] = (reservas[id] || 0) + (p.cantidad || 0);
        });
      });

      const stockCalculado = {};
      productosData.forEach((producto) => {
        const stockReal = parseInt(producto.stock ?? 0);
        const reservado = reservas[producto.id] || 0;
        stockCalculado[producto.id] = stockReal - reservado;
      });

      setStock(stockCalculado);
    };

    calcularStock();
  }, [fechaEvento]);
  // 🧾 Total y saldo
  const total = productosAgregados.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  // ✅ Seleccionar cliente
  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    Swal.fire("Cliente seleccionado", `${cliente.nombre} (${cliente.identificacion})`, "success");
  };

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.identificacion, c.telefono, c.email, c.direccion]
      .some((campo) => campo?.toLowerCase().includes(busquedaCliente.toLowerCase()))
  );

  // ✅ Agregar producto desde inventario
  const agregarProducto = (producto) => {
    const nuevo = {
      id: producto.id,
      nombre: producto.nombre,
      cantidad: 1,
      precio: parseFloat(producto.precio),
      subtotal: parseFloat(producto.precio),
      es_grupo: false,
      temporal: false
    };
    setProductosAgregados([...productosAgregados, nuevo]);
    setModalBuscarProducto(false);
  };

  // ✅ Agregar producto desde proveedor
  const agregarProductoProveedor = (producto) => {
    const nuevo = {
      nombre: producto.nombre,
      cantidad: 1,
      precio: parseFloat(producto.precio_venta),
      subtotal: parseFloat(producto.precio_venta),
      es_grupo: false,
      es_proveedor: true,
      temporal: true
    };
    setProductosAgregados([...productosAgregados, nuevo]);
    setModalProveedor(false);
  };

  // ✅ Agregar grupo de artículos
  const agregarGrupo = (grupo) => {
    setProductosAgregados([
      ...productosAgregados,
      {
        nombre: grupo.nombre,
        cantidad: 1,
        precio: grupo.subtotal,
        subtotal: grupo.subtotal,
        es_grupo: true,
        productos: grupo.articulos,
        temporal: false
      }
    ]);
    setModalGrupo(false);
  };

  // ✅ Actualizar cantidad en tabla
  const actualizarCantidad = (index, cantidad) => {
    const nuevos = [...productosAgregados];
    nuevos[index].cantidad = parseInt(cantidad || 0);
    nuevos[index].subtotal = nuevos[index].cantidad * nuevos[index].precio;
    setProductosAgregados(nuevos);
  };

  // ✅ Eliminar producto de la tabla
  const eliminarProducto = (index) => {
    const nuevos = [...productosAgregados];
    nuevos.splice(index, 1);
    setProductosAgregados(nuevos);
  };

  // ✅ Marcar producto como temporal
  const marcarTemporal = (index, value) => {
    const nuevos = [...productosAgregados];
    nuevos[index].temporal = value;
    setProductosAgregados(nuevos);
  };

  // ✅ Manejo de abonos
  const agregarAbono = () => setAbonos([...abonos, ""]);

  const actualizarAbono = (index, valor) => {
    const nuevos = [...abonos];
    nuevos[index] = valor;
    setAbonos(nuevos);
  };

  // ✅ Guardar documento
  const guardarDocumento = async () => {
    if (!clienteSeleccionado || productosAgregados.length === 0) {
      return Swal.fire("Faltan datos", "Debes seleccionar un cliente y agregar al menos un producto.", "warning");
    }

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const prefijo = tipoDocumento === "cotizacion" ? "COT" : "OP";
    const fecha = new Date().toISOString().slice(0, 10);
    const fechaNumerica = fecha.replaceAll("-", "");

    const { data: existentes } = await supabase
      .from(tabla)
      .select("id")
      .like("numero", `${prefijo}-${fechaNumerica}-%`);

    const consecutivo = (existentes?.length || 0) + 1;
    const numeroDocumento = `${prefijo}-${fechaNumerica}-${consecutivo}`;

    const dataGuardar = {
      cliente_id: clienteSeleccionado.id,
      productos: productosAgregados,
      total,
      abonos,
      garantia: parseFloat(garantia || 0),
      estado: saldo === 0 ? "pagado" : "pendiente",
      tipo: tipoDocumento,
      numero: numeroDocumento,
      ...(tipoDocumento === "cotizacion"
        ? { fecha: fechaCreacion }
        : { fecha_creacion: fechaCreacion }),
      fecha_evento: fechaEvento || null
    };

    const { error } = await supabase.from(tabla).insert([dataGuardar]);

    if (!error) {
      Swal.fire("Guardado", `La ${tipoDocumento} fue guardada correctamente.`, "success");
    } else {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el documento", "error");
    }
  };

  // ✅ Obtener datos para PDF o remisión
const obtenerDatosPDF = () => ({
  nombre_cliente: clienteSeleccionado?.nombre,
  identificacion: clienteSeleccionado?.identificacion,
  telefono: clienteSeleccionado?.telefono,
  direccion: clienteSeleccionado?.direccion,
  email: clienteSeleccionado?.email,
  productos: productosAgregados,
  total,
  abonos,
  garantia,
  fecha_creacion: fechaCreacion,
  fecha_evento: fechaEvento
});

// ✅ Calcular stock disponible por producto para la fecha seleccionada
const stockDisponible = {};
productosAgregados.forEach((item) => {
  const disponible = stock[item.producto_id || item.id] ?? "—";
  stockDisponible[item.id] = disponible;
});

return (
  <div style={{ padding: "20px", maxWidth: "900px", margin: "auto" }}>
    <h2 style={{ textAlign: "center" }}>
      📄 {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}
    </h2>

    <div style={{ marginBottom: "15px" }}>
      <label>Tipo de documento: </label>
      <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
        <option value="cotizacion">Cotización</option>
        <option value="orden">Orden de Pedido</option>
      </select>
    </div>

    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
      <div style={{ flex: 1 }}>
        <label>Fecha de creación:</label>
        <input type="date" value={fechaCreacion} disabled style={{ width: "100%" }} />
      </div>
      <div style={{ flex: 1 }}>
        <label>Fecha del evento:</label>
        <input
          type="date"
          value={fechaEvento}
          onChange={(e) => setFechaEvento(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>
    </div>

    <hr style={{ margin: "20px 0" }} />

    <label>Buscar cliente:</label>
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <input
        type="text"
        placeholder="Nombre, identificación o teléfono"
        value={busquedaCliente}
        onChange={(e) => setBusquedaCliente(e.target.value)}
        style={{ flex: 1 }}
      />
      <button onClick={() => setModalCrearCliente(true)}>➕ Crear cliente</button>
    </div>

    {busquedaCliente && clientesFiltrados.length > 0 && (
      <ul style={{ marginTop: "10px", listStyle: "none", padding: 0 }}>
        {clientesFiltrados.map((cliente) => (
          <li key={cliente.id}>
            <button
              onClick={() => seleccionarCliente(cliente)}
              style={{ width: "100%", textAlign: "left" }}
            >
              {cliente.nombre} - {cliente.identificacion} - {cliente.telefono}
            </button>
          </li>
        ))}
      </ul>
    )}

    {clienteSeleccionado && (
      <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f1f1f1", borderRadius: "6px" }}>
        <strong>Cliente seleccionado:</strong><br />
        🧑 {clienteSeleccionado.nombre}<br />
        🆔 {clienteSeleccionado.identificacion}<br />
        📞 {clienteSeleccionado.telefono}<br />
        📍 {clienteSeleccionado.direccion}<br />
        ✉️ {clienteSeleccionado.email}
      </div>
    )}

    <hr style={{ margin: "30px 0" }} />
    <h3>Productos o Grupos Agregados</h3>
    {/* TABLA DE PRODUCTOS */}
    <table style={{ width: "100%", marginBottom: "20px", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ borderBottom: "1px solid #ccc" }}>Cant</th>
          <th style={{ borderBottom: "1px solid #ccc" }}>Stock</th>
          <th style={{ borderBottom: "1px solid #ccc" }}>Descripción</th>
          <th style={{ borderBottom: "1px solid #ccc" }}>V. Unit</th>
          <th style={{ borderBottom: "1px solid #ccc" }}>Subtotal</th>
          <th>Temporal</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {productosAgregados.map((item, index) => {
          const idProducto = item.producto_id || item.id;
          const stockDisp = stock?.[idProducto] ?? "—";
          const sobrepasado = stockDisp !== "—" && item.cantidad > stockDisp;

          return (
            <tr key={index}>
              <td>
                <input
                  type="number"
                  value={item.cantidad}
                  min="1"
                  onChange={(e) => actualizarCantidad(index, e.target.value)}
                  style={{ width: "60px" }}
                  disabled={item.es_grupo}
                />
              </td>
              <td style={{ textAlign: "center", color: sobrepasado ? "red" : "black" }}>
                {stockDisp}
              </td>
              <td>{item.nombre}</td>
              <td>
                {item.es_grupo ? (
                  `$${item.precio.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
                ) : (
                  <input
                    type="number"
                    value={item.precio}
                    min="0"
                    onChange={(e) => {
                      const nuevos = [...productosAgregados];
                      nuevos[index].precio = parseFloat(e.target.value || 0);
                      nuevos[index].subtotal = nuevos[index].cantidad * nuevos[index].precio;
                      setProductosAgregados(nuevos);
                    }}
                    style={{ width: "100px" }}
                  />
                )}
              </td>
              <td>
                ${item.subtotal.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </td>
              <td>
                {!item.es_grupo && (
                  <input
                    type="checkbox"
                    checked={item.temporal}
                    onChange={(e) => marcarTemporal(index, e.target.checked)}
                    title="¿Producto temporal?"
                  />
                )}
              </td>
              <td>
                <button onClick={() => eliminarProducto(index)}>🗑️</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {/* BOTONES PARA AGREGAR ARTÍCULOS */}
    <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <button onClick={() => setModalBuscarProducto(true)} style={{ padding: "8px 12px" }}>
        🔍 Agregar desde Inventario
      </button>

      <button onClick={() => setModalGrupo(true)} style={{ padding: "8px 12px" }}>
        📦 Crear Grupo de Artículos
      </button>

      <button onClick={() => setModalProveedor(true)} style={{ padding: "8px 12px" }}>
        📥 Agregar desde Proveedor
      </button>
    </div>

    {/* GARANTÍA Y ABONOS */}
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

    {/* TOTALES */}
    <div style={{ marginTop: "20px", textAlign: "right" }}>
      <p><strong>Total:</strong> ${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
      <p><strong>Saldo final:</strong> ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
    </div>

    {/* BOTONES FINALES */}
   <div style={{
  marginTop: "30px",
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "center"
}}>
  <button onClick={guardarDocumento} style={{ padding: "10px 20px" }}>
    💾 Guardar Documento
  </button>

  <button onClick={() => generarPDF(obtenerDatosPDF(), tipoDocumento)} style={{ padding: "10px 20px" }}>
    📄 Descargar PDF
  </button>

  {tipoDocumento === "orden" && productosAgregados.length > 0 && (
    <button
      onClick={() => generarRemisionPDF(obtenerDatosPDF())}
      style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white" }}
    >
      📦 Generar Remisión
    </button>
  )}

  <button
    onClick={() => {
      setClienteSeleccionado(null);
      setProductosAgregados([]);
      setGarantia("");
      setAbonos([""]);
      setBusquedaCliente("");
      setFechaEvento(""); // <-- Asegúrate de limpiar también la fecha del evento (tema del punto 4)
    }}
    style={{
      padding: "10px 20px",
      marginLeft: "10px",
      backgroundColor: "#e53935",
      color: "white"
    }}
  >
    🧹 Limpiar módulo
  </button>
</div>

    {/* MODALES */}
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

    {modalProveedor && (
  <BuscarProveedorYProductoModal
    onSelect={agregarProductoProveedor}
    onClose={() => setModalProveedor(false)}
  />
)}

    {modalCrearCliente && (
      <CrearClienteModal
        onClienteCreado={(cliente) => {
          setClientes([...clientes, cliente]);
          setClienteSeleccionado(cliente);
          setModalCrearCliente(false);
        }}
        onClose={() => setModalCrearCliente(false)}
      />
    )}
  </div>
);
}
export default CrearDocumento;