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
import Protegido from "../components/Protegido"; // 🔐 Protección

const CrearDocumento = () => {
  <Protegido />; // ⛔ Redirige si no hay sesión activa

  const location = useLocation();
  const { documento, tipo } = location.state || {};
  const esEdicion = documento?.esEdicion || false;
  const idOriginal = documento?.idOriginal || null;

  // 🧠 ESTADOS INICIALES
  const [tipoDocumento, setTipoDocumento] = useState(tipo || "cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [productosAgregados, setProductosAgregados] = useState([]);
  const [garantia, setGarantia] = useState("");

  // Nuevo estado para check de garantía
  const [garantiaRecibida, setGarantiaRecibida] = useState(false);

  // Abonos con fecha
  const [abonos, setAbonos] = useState([
    // Cada abono será un objeto: { valor: 0, fecha: "19-06-2025" }
  ]);

  const agregarAbono = () => {
    const nuevaFecha = new Date().toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    setAbonos([...abonos, { valor: 0, fecha: nuevaFecha }]);
  };

// Fecha de entrega de la garantía
const [fechaGarantia, setFechaGarantia] = useState("");

  const [stock, setStock] = useState({});
  const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
  const [modalCrearCliente, setModalCrearCliente] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);

  // ✅ NUEVOS ESTADOS PARA EDITAR GRUPO
  const [grupoEnEdicion, setGrupoEnEdicion] = useState(null);
  const [indiceGrupoEnEdicion, setIndiceGrupoEnEdicion] = useState(null);

 // 🔁 PRECARGA DESDE DOCUMENTO (edición)
useEffect(() => {
  const precargarDatos = async () => {
    if (!documento) return;

    setTipoDocumento(documento.tipo || tipo || "cotizacion");
    setFechaEvento(documento.fecha_evento?.split("T")[0] || "");
    setProductosAgregados(documento.productos || []);
    setGarantia(documento.garantia || "");
    setAbonos(documento.abonos || [""]);
    setGarantiaRecibida(!!documento?.garantiaRecibida);

    if (documento.nombre_cliente) {
      setClienteSeleccionado({
        nombre: documento.nombre_cliente,
        identificacion: documento.identificacion,
        telefono: documento.telefono,
        direccion: documento.direccion,
        email: documento.email,
        id: documento.cliente_id || null
      });
    } else if (documento.cliente_id) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", documento.cliente_id)
        .single();

      if (cliente) setClienteSeleccionado(cliente);
    }
  };

  precargarDatos();
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
        .eq("fecha_evento", fechaEvento)
        .eq("cerrada", false);

      const reservas = {};
      ordenesData?.forEach((orden) => {
  orden.productos?.forEach((p) => {
    if (p.es_grupo && Array.isArray(p.productos)) {
      p.productos.forEach((sub) => {
        const id = sub.producto_id || sub.id;
        const cantidadTotal = (sub.cantidad || 0) * (p.cantidad || 1);
        reservas[id] = (reservas[id] || 0) + cantidadTotal;
      });
    } else {
      const id = p.producto_id || p.id;
      reservas[id] = (reservas[id] || 0) + (p.cantidad || 0);
    }
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
  const sumaAbonos = abonos.reduce((acc, abono) => acc + parseFloat(abono.valor || 0), 0);
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
  };

  // ✅ Agregar producto temporal (llamado desde BuscarProductoModal)
const agregarProductoTemporal = (producto) => {
  setProductosAgregados((prev) => [...prev, producto]);
  setModalBuscarProducto(false); // opcional: cierra el modal al agregar
};

// ✅ Editar grupo 
const editarGrupo = (index) => {
  const grupo = productosAgregados[index];
  if (grupo && grupo.es_grupo) {
    setGrupoEnEdicion(grupo);
    setIndiceGrupoEnEdicion(index);
    setModalGrupo(true);
  }
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

  // ✅ Guardar documento
  const guardarDocumento = async () => {
  if (!clienteSeleccionado || productosAgregados.length === 0) {
    return Swal.fire("Faltan datos", "Debes seleccionar un cliente y agregar al menos un producto.", "warning");
  }

  const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
  const prefijo = tipoDocumento === "cotizacion" ? "COT" : "OP";
  const fecha = new Date().toISOString().slice(0, 10);
  const fechaNumerica = fecha.replaceAll("-", "");

  let numeroDocumento = documento?.numero;

if (!esEdicion) {
  const { data: existentes } = await supabase
    .from(tabla)
    .select("id")
    .like("numero", `${prefijo}-${fechaNumerica}-%`);

  const consecutivo = (existentes?.length || 0) + 1;
  numeroDocumento = `${prefijo}-${fechaNumerica}-${consecutivo}`;
}

  const totalPedido = total;
  const totalAbonos = abonos.reduce((acc, ab) => acc + Number(ab.valor || 0), 0);

  const redondear = (num) => Math.round(num * 100) / 100;

  if (redondear(totalAbonos) > redondear(totalPedido)) {
    return Swal.fire("Error", "El total de abonos no puede superar el valor del pedido.", "warning");
  }

  const estadoFinal = redondear(totalAbonos) === redondear(totalPedido) ? "pagado" : "pendiente";

  // 🔍 Mostrar en consola los valores antes de guardar
console.log("🧾 Total pedido:", totalPedido);
console.log("💵 Total abonos:", totalAbonos);
console.log("📦 Estado final:", estadoFinal);

  const dataGuardar = {
    cliente_id: clienteSeleccionado.id,
    productos: productosAgregados,
    total: totalPedido,
    abonos,
    garantia: parseFloat(garantia || 0),
    garantia_recibida: garantiaRecibida,
    fecha_garantia: fechaGarantia,
    estado: estadoFinal,
    tipo: tipoDocumento,
    numero: numeroDocumento,
    ...(tipoDocumento === "cotizacion"
      ? { fecha: fechaCreacion }
      : { fecha_creacion: fechaCreacion }),
    fecha_evento: fechaEvento || null
  };

  let error;

  console.log("📄 Documento original:", documento);

if (esEdicion && idOriginal) {
  const confirmar = await Swal.fire({
    title: "¿Actualizar documento?",
    text: "Este documento ya existe. ¿Deseas actualizarlo?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, actualizar",
    cancelButtonText: "Cancelar",
  });

  if (confirmar.isConfirmed) {
    const tablaOriginal = documento?.numero?.startsWith("COT")
  ? "cotizaciones"
  : "ordenes_pedido";

if (tablaOriginal !== tabla) {
      // 🗑️ Eliminar documento anterior
      await supabase.from(tablaOriginal).delete().eq("id", idOriginal);

      // 🆕 Crear nuevo número de documento para la tabla nueva
      const { data: existentes } = await supabase
        .from(tabla)
        .select("id")
        .like("numero", `${prefijo}-${fechaNumerica}-%`);

      const consecutivo = (existentes?.length || 0) + 1;
      numeroDocumento = `${prefijo}-${fechaNumerica}-${consecutivo}`;
      dataGuardar.numero = numeroDocumento;

      // 📥 Insertar en nueva tabla
      const res = await supabase.from(tabla).insert([dataGuardar]);
      error = res.error;
    } else {
      // ✏️ Si el tipo no cambió, actualizar normalmente
      const res = await supabase.from(tabla).update(dataGuardar).eq("id", idOriginal);
      error = res.error;
    }
  } else {
    return; // Usuario canceló
  }
} else {
  const res = await supabase.from(tabla).insert([dataGuardar]);
  error = res.error;
}

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

// 👇 Aquí empieza el retorno visual
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
  🧑 {clienteSeleccionado.nombre || "N/A"}<br />
  🆔 {clienteSeleccionado.identificacion || "N/A"}<br />
  📞 {clienteSeleccionado.telefono || "N/A"}<br />
  📍 {clienteSeleccionado.direccion || "N/A"}<br />
  ✉️ {clienteSeleccionado.email || "N/A"}
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
              />
          </td>
          <td style={{ textAlign: "center", color: sobrepasado ? "red" : "black" }}>
            {stockDisp}
          </td>
          <td>{item.nombre}</td>
          <td>
  {item.es_grupo ? (
    "$" + item.precio.toLocaleString("es-CO", { maximumFractionDigits: 0 })
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
            ${(item.subtotal ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
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
            {item.es_grupo && (
              <button onClick={() => editarGrupo(index)} title="Editar grupo">✏️</button>
            )}
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
  <label>Monto de garantía:</label>
  <input
    type="number"
    min="0"
    value={garantia}
    onChange={(e) => {
      setGarantia(e.target.value);

      const hoy = new Date().toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      setFechaGarantia(hoy);
    }}
    style={{ width: "100%" }}
  />

  <div style={{ marginTop: "10px" }}>
    <label>
      <input
        type="checkbox"
        checked={garantiaRecibida}
        onChange={(e) => setGarantiaRecibida(e.target.checked)}
      />
      ¿Cliente ya entregó la garantía?
    </label>
  </div>
</div>

      <div style={{ flex: "2" }}>
  <label>Abonos ($):</label>
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    {abonos.map((abono, index) => (
      <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <label style={{ minWidth: "80px" }}>Abono {index + 1}:</label>
        <input
          type="number"
          min="0"
          value={abono.valor}
          onChange={(e) => {
            const nuevosAbonos = [...abonos];
            nuevosAbonos[index].valor = parseFloat(e.target.value || 0);
            setAbonos(nuevosAbonos);
          }}
          style={{ width: "100px" }}
        />
        <span style={{ fontStyle: "italic", color: "gray" }}>
          Fecha: {abono.fecha}
        </span>
      </div>
    ))}
    <button onClick={agregarAbono}>
  ➕ Agregar abono
</button>
  </div>
</div>
</div> {/* ← este cierre faltaba */}

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
    onAgregarProducto={agregarProductoTemporal} // ✅ agregada
  />
)}


    {modalGrupo && (
  <AgregarGrupoModal
    onAgregarGrupo={(grupo) => {
      if (indiceGrupoEnEdicion !== null) {
        const nuevos = [...productosAgregados];
        nuevos[indiceGrupoEnEdicion] = grupo;
        setProductosAgregados(nuevos);
      } else {
        setProductosAgregados([...productosAgregados, grupo]);
      }
      setModalGrupo(false);
      setGrupoEnEdicion(null);
      setIndiceGrupoEnEdicion(null);
    }}
    onClose={() => {
      setModalGrupo(false);
      setGrupoEnEdicion(null);
      setIndiceGrupoEnEdicion(null);
    }}
    stockDisponible={stock}
    grupoEnEdicion={grupoEnEdicion}
  />
)}

    {modalProveedor && (
  <BuscarProveedorYProductoModal
  onSelect={(producto) => {
    agregarProductoProveedor(producto); // ✅ ejecuta sin cerrar el modal
    // ❌ No pongas: setModalProveedor(false)
  }}
  onClose={() => setModalProveedor(false)} // ✅ Solo este botón cerrará el modal
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
};
export default CrearDocumento;