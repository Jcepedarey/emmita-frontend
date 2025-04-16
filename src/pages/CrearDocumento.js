import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import Swal from "sweetalert2";
import { generarPDF } from "../utils/generarPDF";

const CrearDocumento = () => {
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false);
  const [modalGrupoOpen, setModalGrupoOpen] = useState(false);
  const [modalNuevoProducto, setModalNuevoProducto] = useState(false);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

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
    setModalBuscarOpen(false);
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
    setModalGrupoOpen(false);
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
  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>📄 Crear Cotización u Orden de Pedido</h2>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
        <div>
          <label>Tipo de documento:</label><br />
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            <option value="cotizacion">Cotización</option>
            <option value="orden">Orden de Pedido</option>
          </select>
        </div>

        <div>
          <label>Fecha creación:</label><br />
          <input type="date" value={fechaCreacion} readOnly />
        </div>

        <div>
          <label>Fecha del evento:</label><br />
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label>Cliente:</label><br />
        <select value={cliente} onChange={(e) => setCliente(e.target.value)} style={{ width: "100%" }}>
          <option value="">-- Selecciona un cliente --</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <button onClick={() => window.location.href = "/clientes"} style={{ marginTop: "5px" }}>➕ Crear nuevo cliente</button>
      </div>

      <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
        <button onClick={() => setModalBuscarOpen(true)}>➕ Agregar artículo existente</button>
        <button onClick={() => window.location.href = "/inventario"}>➕ Crear artículo nuevo</button>
        <button onClick={() => setModalGrupoOpen(true)}>➕ Crear grupo de artículos</button>
      </div>

      {productosAgregados.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th>Cantidad</th>
              <th>Descripción</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {productosAgregados.map((item, index) => {
              if (item.tipo === "producto") {
                return (
                  <tr key={index}>
                    <td><input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarCantidad(index, parseInt(e.target.value))} /></td>
                    <td>{item.nombre}</td>
                    <td><input type="number" min="0" value={item.precio} onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value))} /></td>
                    <td>${item.subtotal.toFixed(2)}</td>
                    <td><button onClick={() => eliminarProducto(index)}>❌</button></td>
                  </tr>
                );
              } else if (item.tipo === "grupo") {
                return (
                  <tr key={index}>
                    <td colSpan="3"><strong>Grupo:</strong> {item.nombre}</td>
                    <td>${item.subtotal.toFixed(2)}</td>
                    <td><button onClick={() => eliminarProducto(index)}>❌</button></td>
                  </tr>
                );
              } else {
                return null;
              }
            })}
          </tbody>
        </table>
      )}
      {productosAgregados.length > 0 && (
        <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <label>💰 Total:</label>
            <p><strong>${total.toFixed(2)}</strong></p>
          </div>

          <div style={{ flex: 1 }}>
            <label>💵 Abonos:</label>
            {abonos.map((abono, i) => (
              <input
                key={i}
                type="number"
                placeholder={`Abono ${i + 1}`}
                value={abono}
                onChange={(e) => actualizarAbono(i, e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "5px" }}
              />
            ))}
            <button onClick={agregarAbono}>➕ Agregar abono</button>
          </div>

          <div style={{ flex: 1 }}>
            <label>🔐 Garantía (Depósito):</label>
            <input
              type="number"
              placeholder="Monto de garantía"
              value={garantia}
              onChange={(e) => setGarantia(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label>📉 Saldo final:</label>
            <p><strong>${saldo.toFixed(2)}</strong></p>
            <label>
              <input type="checkbox" checked={pagado} onChange={() => setPagado(!pagado)} />
              Pedido completamente pagado
            </label>
          </div>
        </div>
      )}

      {/* BOTONES DE ACCIÓN */}
      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <button onClick={guardarDocumento} style={{ width: "100%", padding: "10px" }}>💾 Guardar documento</button>

        {productosAgregados.length > 0 && (
          <>
            <button
              onClick={() =>
                generarPDF(
                  {
                    cliente_id: cliente,
                    productos: productosAgregados,
                    total,
                    abonos,
                    saldo,
                    garantia,
                    fecha: fechaCreacion,
                    fecha_evento: fechaEvento,
                    nombre_cliente: clientes.find((c) => c.id === cliente)?.nombre || "cliente"
                  },
                  tipoDocumento
                )
              }
              style={{ width: "100%", marginTop: "10px", padding: "10px" }}
            >
              🖨️ Descargar PDF
            </button>

            {tipoDocumento === "orden" && (
              <button onClick={generarRemisionPDF} style={{ width: "100%", marginTop: "10px", padding: "10px" }}>
                📄 Generar Remisión
              </button>
            )}
          </>
        )}
      </div>

      {/* MODALES */}
      {modalBuscarOpen && (
        <BuscarProductoModal
          onSelect={(producto) => {
            agregarProducto(producto);
            setModalBuscarOpen(false);
          }}
          onClose={() => setModalBuscarOpen(false)}
        />
      )}

      {modalGrupoOpen && (
        <AgregarGrupoModal
          onAgregarGrupo={(grupo) => {
            agregarGrupo(grupo);
            setModalGrupoOpen(false);
          }}
          onClose={() => setModalGrupoOpen(false)}
        />
      )}
    </div>
  );
};

export default CrearDocumento;

