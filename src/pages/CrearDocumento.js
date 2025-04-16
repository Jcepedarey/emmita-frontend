import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", email: "", telefono: "", direccion: "" });

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
      const { data, error } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
      if (data) setClientes(data);
      if (error) console.error("Error cargando clientes:", error);
    };
    obtenerClientes();
  }, []);
  const clientesFiltrados = clientes.filter((c) => {
    const texto = busquedaCliente.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(texto) ||
      c.email?.toLowerCase().includes(texto) ||
      c.telefono?.includes(texto) ||
      c.direccion?.toLowerCase().includes(texto)
    );
  });

  const guardarNuevoCliente = async () => {
    const { nombre, email, telefono, direccion } = nuevoCliente;

    if (!nombre || !telefono) {
      return Swal.fire("Campos requeridos", "Nombre y teléfono son obligatorios", "warning");
    }

    const { data, error } = await supabase.from("clientes").insert([{ nombre, email, telefono, direccion }]);

    if (error) {
      Swal.fire("Error", "No se pudo guardar el cliente", "error");
      console.error("Error guardando cliente:", error);
    } else {
      Swal.fire("Guardado", "Cliente creado correctamente", "success");
      setMostrarFormularioCliente(false);
      setNuevoCliente({ nombre: "", email: "", telefono: "", direccion: "" });
      const { data: actualizados } = await supabase.from("clientes").select("*").order("nombre");
      setClientes(actualizados || []);
    }
  };
      {/* 🔍 Buscar cliente */}
      <div style={{ marginBottom: "20px" }}>
        <label><strong>Buscar cliente:</strong></label>
        <input
          type="text"
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
          placeholder="Nombre, correo, teléfono o dirección"
          style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
        />

        <button onClick={() => setMostrarFormularioCliente(!mostrarFormularioCliente)} style={{ marginBottom: "10px" }}>
          {mostrarFormularioCliente ? "Cancelar creación" : "Crear nuevo cliente"}
        </button>

        {mostrarFormularioCliente && (
          <div style={{ marginBottom: "10px", background: "#f3f3f3", padding: "10px", borderRadius: "5px" }}>
            <h4>Nuevo Cliente</h4>
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoCliente.nombre}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
              style={{ width: "100%", padding: "6px", marginBottom: "6px" }}
            />
            <input
              type="email"
              placeholder="Correo (opcional)"
              value={nuevoCliente.email}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
              style={{ width: "100%", padding: "6px", marginBottom: "6px" }}
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={nuevoCliente.telefono}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
              style={{ width: "100%", padding: "6px", marginBottom: "6px" }}
            />
            <input
              type="text"
              placeholder="Dirección (opcional)"
              value={nuevoCliente.direccion}
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
              style={{ width: "100%", padding: "6px", marginBottom: "6px" }}
            />
            <button onClick={guardarNuevoCliente} style={{ marginTop: "5px" }}>Guardar Cliente</button>
          </div>
        )}

        {clientesFiltrados.length > 0 && (
          <div style={{ maxHeight: "100px", overflowY: "auto", marginBottom: "10px" }}>
            {clientesFiltrados.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setClienteId(c.id);
                  setBusquedaCliente(`${c.nombre} (${c.telefono})`);
                }}
                style={{
                  cursor: "pointer",
                  background: "#eee",
                  marginBottom: "4px",
                  padding: "5px",
                  borderRadius: "5px"
                }}
              >
                {c.nombre} - {c.telefono}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 📦 Tabla de productos agregados */}
      <h3>Artículos del documento</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
        <thead>
          <tr>
            <th style={th}>Cantidad</th>
            <th style={th}>Descripción</th>
            <th style={th}>Valor unitario</th>
            <th style={th}>Subtotal</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((item, index) => (
            <tr key={index}>
              <td style={td}>
                {item.tipo === "producto" ? (
                  <input
                    type="number"
                    value={item.cantidad}
                    min="1"
                    onChange={(e) => actualizarCantidad(index, parseInt(e.target.value))}
                    style={{ width: "60px" }}
                  />
                ) : (
                  item.articulos.reduce((acc, a) => acc + a.cantidad, 0)
                )}
              </td>
              <td style={td}>{item.nombre}</td>
              <td style={td}>${item.precio}</td>
              <td style={td}>${item.subtotal.toFixed(2)}</td>
              <td style={td}>
                <button onClick={() => eliminarProducto(index)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 💰 Totales, garantía, abonos */}
      <div style={{ display: "flex", marginTop: "20px", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <label><strong>Garantía (depósito en $):</strong></label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ width: "100%", padding: "6px", marginTop: "4px" }}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label><strong>Abonos:</strong></label>
          {abonos.map((abono, i) => (
            <input
              key={i}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(i, e.target.value)}
              style={{ width: "100%", marginBottom: "6px", padding: "6px" }}
            />
          ))}
          <button onClick={agregarAbono} style={{ marginTop: "5px" }}>+ Agregar abono</button>
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>Total:</strong></label>
          <div>${total}</div>
          <label><strong>Saldo:</strong></label>
          <div>${saldo}</div>
        </div>
      </div>

      {/* 📎 Acciones finales */}
      <button onClick={guardarDocumento} style={{ width: "100%", marginTop: "20px" }}>💾 Guardar documento</button>

      {productosAgregados.length > 0 && (
        <button
          onClick={() =>
            generarPDF(
              {
                cliente_id: clienteId,
                productos: productosAgregados,
                total,
                abonos,
                saldo,
                garantia,
                fecha: fechaCreacion,
                fecha_evento: fechaEvento,
                nombre_cliente: obtenerNombreCliente(clienteId),
              },
              tipoDocumento
            )
          }
          style={{ width: "100%", marginTop: 10 }}
        >
          🧾 Descargar PDF
        </button>
      )}

      {tipoDocumento === "orden" && productosAgregados.length > 0 && (
        <button onClick={generarRemisionPDF} style={{ width: "100%", marginTop: 10 }}>
          📄 Generar Remisión
        </button>
      )}

      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
      {grupoOpen && <AgregarGrupoModal onAgregarGrupo={agregarGrupo} onClose={() => setGrupoOpen(false)} />}
    </div>
  );
};

// 🧩 Estilos tabla
const th = { border: "1px solid #ccc", padding: "6px", background: "#eee", textAlign: "left" };
const td = { border: "1px solid #ccc", padding: "6px" };

export default CrearDocumento;
