import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { useLocation } from "react-router-dom";
import { FaSave } from "react-icons/fa";

function CrearDocumento() {
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [nuevoAbono, setNuevoAbono] = useState("");
  const [garantia, setGarantia] = useState("");
  const [pagado, setPagado] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    cargarClientes();
    if (location.state) {
      const { documento, tipo } = location.state;
      cargarDocumentoDesdeAgenda(documento, tipo);
    }
  }, []);

  const cargarClientes = async () => {
    const { data } = await supabase.from("clientes").select("*");
    setClientes(data || []);
  };

  const cargarDocumentoDesdeAgenda = async (id, tipo) => {
    const tabla = tipo === "orden" ? "ordenes_pedido" : "cotizaciones";
    const { data } = await supabase.from(tabla).select("*").eq("id", id).single();
    if (data) {
      setTipoDocumento(tipo);
      setClienteSeleccionado(data.cliente_id);
      setProductosAgregados(data.productos || []);
      setFechaEvento(data.fecha_evento?.slice(0, 10) || "");
    }
  };

  const agregarProducto = (producto) => {
    const yaExiste = productosAgregados.find(p => p.id === producto.id);
    if (yaExiste) {
      Swal.fire("Duplicado", "Este producto ya fue agregado.", "warning");
      return;
    }

    setProductosAgregados(prev => [...prev, { ...producto, cantidad: 1, precio: producto.precio }]);
    setModalOpen(false);
  };

  const guardarGrupo = (grupo) => {
    const subtotal = grupo.articulos.reduce((sum, art) => sum + (art.precio * art.cantidad), 0);
    const nuevoGrupo = {
      id: `grupo-${Date.now()}`,
      nombre: grupo.nombre,
      tipo: "grupo",
      subtotal,
      articulos: grupo.articulos
    };
    setProductosAgregados(prev => [...prev, nuevoGrupo]);
    setGrupoOpen(false);
  };

  const calcularTotal = () => {
    return productosAgregados.reduce((total, item) => {
      if (item.tipo === "grupo") return total + item.subtotal;
      return total + (item.precio * item.cantidad);
    }, 0);
  };

  const calcularSaldo = () => {
    const totalAbonos = abonos.reduce((sum, abono) => sum + parseFloat(abono || 0), 0);
    return calcularTotal() - totalAbonos;
  };

  const agregarAbono = () => {
    if (!nuevoAbono || isNaN(nuevoAbono)) return;
    setAbonos(prev => [...prev, parseFloat(nuevoAbono)]);
    setNuevoAbono("");
  };

  const generarRemisionPDF = () => {
    // Lógica para PDF de remisión — ya explicada previamente
    Swal.fire("✅ Remisión generada", "Aquí iría la lógica de PDF", "info");
  };
  return (
    <div style={{ padding: "1rem", maxWidth: "1200px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>
        {tipoDocumento === "cotizacion" ? "Crear Cotización" : "Crear Orden de Pedido"}
      </h2>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
          <option value="cotizacion">Cotización</option>
          <option value="orden">Orden de Pedido</option>
        </select>

        <div>
          <label>📅 Fecha de creación: {fechaCreacion}</label>
        </div>

        <div>
          <label>📆 Fecha del evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar cliente por nombre, identificación o código"
        value={busquedaCliente}
        onChange={(e) => setBusquedaCliente(e.target.value)}
        style={{ width: "100%", marginTop: "1rem", padding: "8px" }}
      />

      {clientesFiltrados.length > 0 && (
        <ul style={{ background: "#f1f1f1", padding: "5px", borderRadius: "5px" }}>
          {clientesFiltrados.map(cliente => (
            <li key={cliente.id} onClick={() => {
              setClienteSeleccionado(cliente.id);
              setBusquedaCliente("");
            }} style={{ cursor: "pointer", padding: "4px" }}>
              {cliente.nombre} – {cliente.identificacion}
            </li>
          ))}
        </ul>
      )}

      {clienteSeleccionado && (
        <p style={{ marginTop: "0.5rem" }}>
          ✅ Cliente seleccionado: {
            clientes.find(c => c.id === clienteSeleccionado)?.nombre
          } – {clientes.find(c => c.id === clienteSeleccionado)?.identificacion}
        </p>
      )}

      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => setModalOpen(true)}>➕ Agregar Producto desde Inventario</button>
        <button onClick={crearNuevoProducto}>🛠️ Crear Nuevo Producto</button>
        <button onClick={() => setGrupoOpen(true)}>📦 Crear Grupo</button>
      </div>

      <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#ddd" }}>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Valor Unitario</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((item, index) => {
            if (item.tipo === "grupo") {
              return (
                <tr key={index} style={{ background: "#eef" }}>
                  <td colSpan={4}><strong>Grupo: {item.nombre} – Total: ${item.subtotal.toFixed(2)}</strong></td>
                </tr>
              );
            }
            return (
              <tr key={index}>
                <td>
                  <input type="number" min="1" value={item.cantidad}
                    onChange={(e) => {
                      const nuevaCantidad = parseInt(e.target.value);
                      const nuevos = [...productosAgregados];
                      nuevos[index].cantidad = nuevaCantidad;
                      setProductosAgregados(nuevos);
                    }} />
                </td>
                <td>{item.nombre}</td>
                <td>
                  <input type="number" min="0" value={item.precio}
                    onChange={(e) => {
                      const nuevoPrecio = parseFloat(e.target.value);
                      const nuevos = [...productosAgregados];
                      nuevos[index].precio = nuevoPrecio;
                      setProductosAgregados(nuevos);
                    }} />
                </td>
                <td>${(item.cantidad * item.precio).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", gap: "2rem" }}>
        <div style={{ flex: 1 }}>
          <label>💰 Garantía (no se suma al total):</label>
          <input type="number" min="0" value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ width: "100%", padding: "5px" }} />
        </div>

        <div style={{ flex: 2 }}>
          <label>💵 Abonos:</label>
          {abonos.map((abono, i) => (
            <input
              key={i}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(i, e.target.value)}
              placeholder={`Abono ${i + 1}`}
              style={{ width: "100%", marginBottom: "5px", padding: "5px" }}
            />
          ))}
          <button onClick={agregarAbono} style={{ marginTop: "5px" }}>+ Agregar abono</button>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <h3>🧾 Total: ${total.toFixed(2)}</h3>
        <h4>🔻 Saldo restante: ${saldo.toFixed(2)}</h4>
      </div>

      <button onClick={guardarDocumento} style={{ marginTop: "1rem", width: "100%", padding: "10px" }}>
        💾 Guardar {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}
      </button>

      {productosAgregados.length > 0 && clienteSeleccionado && (
        <button
          onClick={() =>
            generarPDF(
              {
                cliente_id: clienteSeleccionado,
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
          style={{ width: "100%", marginTop: "10px", padding: "10px" }}
        >
          🧾 Descargar PDF
        </button>
      )}

      {tipoDocumento === "orden" && productosAgregados.length > 0 && (
        <button onClick={generarRemisionPDF} style={{ width: "100%", marginTop: "10px", padding: "10px" }}>
          📄 Generar Remisión
        </button>
      )}

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
    </div>
  );
}

export default CrearDocumento;
