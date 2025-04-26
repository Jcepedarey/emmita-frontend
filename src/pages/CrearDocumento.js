// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import CrearClienteModal from "../components/CrearClienteModal";
import BuscarProductoProveedorModal from "../components/BuscarProductoProveedorModal";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const location = useLocation();
  const documento = location.state?.documento;
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [stock, setStock] = useState([]); // Este será el stock calculado por producto y fecha

  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  const [productosAgregados, setProductosAgregados] = useState([]);
  const [modalGrupo, setModalGrupo] = useState(false);

  const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
  const [modalCrearProducto, setModalCrearProducto] = useState(false);
  const [modalCrearCliente, setModalCrearCliente] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false); // ✅ Nuevo estado para proveedores

  useEffect(() => {
    const cargarClientes = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });
      if (data) setClientes(data);
    };
    cargarClientes();
  }, []);

  useEffect(() => {
    const calcularStockDisponible = async () => {
      if (!fechaEvento) return;

      // 1. Traer productos desde Supabase
      const { data: productosData, error: errorProductos } = await supabase
        .from("productos")
        .select("id, stock");

      if (errorProductos) {
        console.error("❌ Error obteniendo productos:", errorProductos);
        return;
      }

      // 2. Traer órdenes confirmadas para la misma fecha
      const { data: ordenes, error: errorOrdenes } = await supabase
        .from("ordenes_pedido")
        .select("productos, fecha_evento")
        .eq("fecha_evento", fechaEvento);

      if (errorOrdenes) {
        console.error("❌ Error obteniendo órdenes:", errorOrdenes);
        return;
      }

      // 3. Sumar reservas por producto
      const reservas = {};

      ordenes?.forEach((orden) => {
        if (Array.isArray(orden.productos)) {
          orden.productos.forEach((p) => {
            const id = p.producto_id || p.id;
            if (!reservas[id]) reservas[id] = 0;
            reservas[id] += p.cantidad || 0;
          });
        }
      });

      // 4. Calcular disponibilidad
      const stockFinal = {};
      productosData.forEach((producto) => {
        const stockReal = parseInt(producto.stock ?? 0); // ✅ conversión segura
        const reservado = reservas[producto.id] || 0;
        stockFinal[producto.id] = stockReal - reservado;
      });

      console.log("📦 Stock disponible calculado:", stockFinal);
      setStock(stockFinal);
    };

    calcularStockDisponible();
  }, [fechaEvento]);

  useEffect(() => {
    if (documento) {
      setTipoDocumento(documento.tipo || "cotizacion");
      setFechaEvento(documento.fecha_evento?.split("T")[0] || "");
      setClienteSeleccionado(documento.cliente || documento.clientes || null);
      setProductosAgregados(documento.productos || []);
      setGarantia(documento.garantia || "");
      setAbonos(documento.abonos || [""]);
      setPagado(documento.pagado || false);
    }
  }, [documento]);

  const total = productosAgregados.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    Swal.fire("Cliente seleccionado", `${cliente.nombre} (${cliente.identificacion})`, "success");
  };

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.identificacion, c.telefono, c.email, c.direccion]
      .some((campo) => campo?.toLowerCase().includes(busquedaCliente.toLowerCase()))
  );

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

  const agregarProductoProveedor = (producto) => {
    const nuevo = {
      nombre: producto.nombre,
      cantidad: 1,
      precio: parseFloat(producto.precio_venta),
      subtotal: parseFloat(producto.precio_venta),
      es_grupo: false,
      es_proveedor: true // ✅ para diferenciar los productos de proveedores
    };
    setProductosAgregados([...productosAgregados, nuevo]);
    setModalProveedor(false);
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
  
    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const prefijo = tipoDocumento === "cotizacion" ? "COT" : "OP";
  
    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fechaNumerica = fecha.replaceAll("-", ""); // YYYYMMDD
  
    // 🔍 Consultar cuántos documentos existen ese día
    const { data: existentes, error: errorConsulta } = await supabase
      .from(tabla)
      .select("id")
      .like("numero", `${prefijo}-${fechaNumerica}-%`);
  
    const consecutivo = (existentes?.length || 0) + 1;
    const numeroDocumento = `${prefijo}-${fechaNumerica}-${consecutivo}`;
  
    // 📦 Datos a guardar
    const dataGuardar = {
      cliente_id: clienteSeleccionado.id,
      productos: productosAgregados,
      total,
      fecha_evento: fechaEvento || null, // ✅ si está vacía, se envía como null
      garantia: parseFloat(garantia || 0),
      abonos,
      estado: pagado ? "pagado" : "pendiente",
      tipo: tipoDocumento,
      numero: numeroDocumento,
      ...(tipoDocumento === "cotizacion"
        ? { fecha: fechaCreacion || null }
        : { fecha_creacion: fechaCreacion || null }) // ✅ mismo tratamiento
    };
  
    const { error } = await supabase.from(tabla).insert([dataGuardar]);
  
    if (!error) {
      Swal.fire("Guardado", `La ${tipoDocumento} fue guardada correctamente.`, "success");
    } else {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el documento", "error");
    }
  };

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
    fecha: fechaCreacion,
    fecha_evento: fechaEvento
  });
  
  const agregarGrupo = (grupo) => {
    setProductosAgregados([
      ...productosAgregados,
      {
        nombre: grupo.nombre,
        cantidad: 1,
        precio: grupo.subtotal,
        subtotal: grupo.subtotal,
        es_grupo: true,
        productos: grupo.articulos
      }
    ]);
    setModalGrupo(false);
  };
  
  const crearClienteDesdeDocumento = (cliente) => {
    setClientes([...clientes, cliente]);
    setClienteSeleccionado(cliente);
    setModalCrearCliente(false);
  };
  
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

<table style={{ width: "100%", marginBottom: "20px", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th style={{ borderBottom: "1px solid #ccc", width: "60px" }}>Cant</th>
      <th style={{ borderBottom: "1px solid #ccc", width: "80px" }}>Stock</th>
      <th style={{ borderBottom: "1px solid #ccc", width: "40%" }}>Descripción</th>
      <th style={{ borderBottom: "1px solid #ccc", width: "100px" }}>V. Unit</th>
      <th style={{ borderBottom: "1px solid #ccc", width: "100px" }}>Subtotal</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {productosAgregados.map((item, index) => {
      const stockDisp = stock?.[item.producto_id] ?? "—";
      const sobrepasado = item.cantidad > stockDisp;

      if (sobrepasado && stockDisp !== "—") {
        Swal.fire({
          icon: "info",
          title: "Stock insuficiente",
          text: `Solo hay ${stockDisp} unidades disponibles para la fecha seleccionada.`,
          toast: true,
          timer: 4000,
          position: "top-end",
          showConfirmButton: false,
        });
      }

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
          <td>${item.subtotal.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</td>
          <td><button onClick={() => eliminarProducto(index)}>🗑️</button></td>
        </tr>
      );
    })}
  </tbody>
</table>


<div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
  <button onClick={() => setModalBuscarProducto(true)} style={{ padding: "8px 12px" }}>
    🔍 Agregar Producto desde Inventario
  </button>

  <button onClick={() => setModalCrearProducto(true)} style={{ padding: "8px 12px" }}>
    ➕ Crear Nuevo Producto
  </button>

  <button onClick={() => setModalGrupo(true)} style={{ padding: "8px 12px" }}>
    📦 Crear Grupo de Artículos
  </button>

  <button onClick={() => setModalProveedor(true)} style={{ padding: "8px 12px" }}>
    📥 Agregar desde Proveedor
  </button>
</div>

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
        <p><strong>Total:</strong> ${total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
        <p><strong>Saldo final:</strong> ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
      </div>

      <div style={{ marginTop: "30px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <button onClick={guardarDocumento} style={{ padding: "10px 20px" }}>
          💾 Guardar Documento
        </button>

        <button onClick={() => generarPDF(obtenerDatosPDF(), tipoDocumento)} style={{ padding: "10px 20px" }}>
          📄 Descargar PDF
        </button>

        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button
            onClick={() => generarRemision(obtenerDatosPDF())}
            style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white" }}
          >
            📦 Generar Remisión
          </button>
        )}

                {/* ✅ NUEVO BOTÓN LIMPIAR */}
                <button
          onClick={() => {
            setClienteSeleccionado(null);
            setProductosAgregados([]);
            setGarantia("");
            setAbonos([""]);
            setPagado(false);
            setBusquedaCliente("");
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

           {/* Modales */}
           {modalBuscarProducto && (
        <BuscarProductoModal
          onSelect={agregarProducto}
          onClose={() => setModalBuscarProducto(false)}
        />
      )}

      {modalCrearProducto && (
        <BuscarProductoModal
          onSelect={agregarProducto}
          onClose={() => setModalCrearProducto(false)}
        />
      )}

      {modalGrupo && (
        <AgregarGrupoModal
          onAgregarGrupo={agregarGrupo}
          onClose={() => setModalGrupo(false)}
        />
      )}

      {modalProveedor && (
        <BuscarProductoProveedorModal
          onSelect={agregarProductoProveedor}
          onClose={() => setModalProveedor(false)}
        />
      )}

      {modalCrearCliente && (
        <CrearClienteModal
          onClienteCreado={(cliente) => {
            setClientes([...clientes, cliente]);
            setClienteSeleccionado(cliente); // ✅ Correcto
            setModalCrearCliente(false);
          }}
          onClose={() => setModalCrearCliente(false)}
        />
      )}
    </div>
  );
};

export default CrearDocumento;
