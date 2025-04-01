import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaEvento, setFechaEvento] = useState("");
  const [fechaCreacion, setFechaCreacion] = useState(new Date().toISOString().slice(0, 10));

  const total = productosAgregados.reduce((acc, p) => acc + p.subtotal, 0);

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
      id: producto.id,
      nombre: producto.nombre || producto.descripcion,
      precio: producto.precio,
      cantidad: 1,
      subtotal: producto.precio,
    };
    setProductosAgregados([...productosAgregados, item]);
    setModalOpen(false);
  };

  const eliminarProducto = (index) => {
    const actualizados = [...productosAgregados];
    actualizados.splice(index, 1);
    setProductosAgregados(actualizados);
  };

  const guardarDocumento = async () => {
    // ✅ Validaciones individuales con SweetAlert2
    if (!cliente) return Swal.fire("Campo requerido", "Selecciona un cliente.", "warning");
    if (productosAgregados.length === 0) return Swal.fire("Sin productos", "Agrega al menos un producto.", "info");
    if (!fechaEvento) return Swal.fire("Fecha faltante", "Selecciona la fecha del evento.", "warning");

    const datos = {
      cliente_id: cliente,
      productos: productosAgregados,
      total,
      fecha_evento: fechaEvento,
    };

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { error } = await supabase.from(tabla).insert([datos]);

    if (error) {
      Swal.fire("Error", "Ocurrió un error al guardar el documento.", "error");
      console.error(error);
    } else {
      Swal.fire("Guardado", `${tipoDocumento === "cotizacion" ? "Cotización" : "Orden"} guardada correctamente.`, "success");
      setProductosAgregados([]);
      setCliente("");
    }
  };

  return (
    <div>
      <h2>Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      <div>
        <label>Tipo de documento: </label>
        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
          <option value="cotizacion">Cotización</option>
          <option value="orden">Orden de Pedido</option>
        </select>
      </div>

      <div>
        <label>Cliente:</label>
        <select value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Fecha de creación:</label>
        <input type="date" value={fechaCreacion} readOnly />

        <label>Fecha del evento:</label>
        <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
      </div>

      <button onClick={() => setModalOpen(true)}>Agregar Producto</button>

      <ul>
        {productosAgregados.map((p, i) => (
          <li key={i}>
            {p.nombre} - {p.cantidad} x ${p.precio} = ${p.subtotal}
            <button onClick={() => eliminarProducto(i)}>Eliminar</button>
          </li>
        ))}
      </ul>

      <h3>Total: ${total.toFixed(2)}</h3>
      <button onClick={guardarDocumento}>Guardar</button>

      {productosAgregados.length > 0 && (
        <button
          onClick={() =>
            generarPDF(
              {
                cliente_id: cliente,
                productos: productosAgregados,
                total,
                fecha: fechaCreacion,
                fecha_evento: fechaEvento,
              },
              tipoDocumento === "cotizacion" ? "cotizacion" : "orden"
            )
          }
        >
          Descargar PDF
        </button>
      )}

      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
    </div>
  );
};

export default CrearDocumento;
