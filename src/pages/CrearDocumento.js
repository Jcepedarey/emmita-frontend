// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
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

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.telefono, c.email, c.direccion].some((campo) =>
      campo?.toLowerCase().includes(clienteBusqueda.toLowerCase())
    )
  );
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
    const subtotal = grupo.detalleGrupo.reduce((acc, a) => acc + a.precio * a.cantidad, 0);
    const item = {
      tipo: "grupo",
      nombre: grupo.nombre,
      articulos: grupo.detalleGrupo,
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

  const crearClienteDesdeDocumento = async () => {
    const nombre = prompt("Nombre del cliente:");
    if (!nombre) return;
    const telefono = prompt("Teléfono:");
    const direccion = prompt("Dirección:");
    const email = prompt("Correo (opcional):");

    const { data, error } = await supabase.from("clientes").insert([{ nombre, telefono, direccion, email }]).select();
    if (data && data[0]) {
      setClientes([...clientes, data[0]]);
      setClienteId(data[0].id);
      setClienteBusqueda(data[0].nombre);
    }
    if (error) console.error("Error al crear cliente:", error);
  };
  const guardarDocumento = async () => {
    if (!clienteId) return Swal.fire("Campo requerido", "Selecciona un cliente.", "warning");
    if (productosAgregados.length === 0) return Swal.fire("Sin productos", "Agrega al menos un producto.", "info");
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
      fecha: fechaCreacion
    };

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { error } = await supabase.from(tabla).insert([datos]);

    if (error) {
      Swal.fire("Error", "Ocurrió un error al guardar el documento.", "error");
      console.error(error);
    } else {
      Swal.fire("Guardado", `${tipoDocumento === "cotizacion" ? "Cotización" : "Orden"} guardada correctamente.`, "success");
      setProductosAgregados([]);
      setClienteId("");
      setClienteBusqueda("");
      setGarantia("");
      setAbonos([""]);
    }
  };

  const generarRemisionPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    const logo = await fetch("/logo.png")
      .then((res) => res.blob())
      .then((blob) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }));

    doc.addImage(logo, "PNG", 10, 10, 30, 25);
    doc.setFontSize(16);
    doc.text("REMISIÓN DE PEDIDO", 70, 20);
    doc.setFontSize(10);
    doc.text("Alquiler & Eventos Emmita", 50, 28);
    doc.text("Calle 40A No. 26 - 34 El Emporio - Villavicencio", 50, 33);
    doc.text("Tel: 3166534685 / 3118222934", 50, 38);
    doc.line(10, 42, 200, 42);

    const clienteSel = clientes.find((c) => c.id === clienteId);
    doc.setFontSize(11);
    doc.text(`Cliente: ${clienteSel?.nombre || "-"}`, 10, 50);
    doc.text(`Dirección: ${clienteSel?.direccion || "-"}`, 10, 56);
    doc.text(`Teléfono: ${clienteSel?.telefono || "-"}`, 10, 62);
    doc.text(`Fecha evento: ${fechaEvento || "-"}`, 10, 68);
    doc.text(`Fecha creación: ${fechaCreacion}`, 10, 74);
    doc.text(`N° Remisión: REM-OP_TEMP`, 150, 50);

    const filas = [];
    productosAgregados.forEach((item) => {
      if (item.tipo === "producto") {
        filas.push([item.nombre, item.cantidad]);
      } else if (item.tipo === "grupo") {
        item.articulos.forEach((a) => {
          filas.push([`(Grupo ${item.nombre}) ${a.nombre}`, a.cantidad]);
        });
      }
    });

    autoTable(doc, {
      head: [["Artículo", "Cantidad"]],
      body: filas,
      startY: 80,
    });

    const yFinal = doc.previousAutoTable.finalY + 20;
    doc.line(20, yFinal, 90, yFinal);
    doc.text("Firma transportista/bodega", 25, yFinal + 5);
    doc.line(110, yFinal, 180, yFinal);
    doc.text("Firma cliente", 130, yFinal + 5);

    doc.save("remision.pdf");
  };

  const obtenerNombreCliente = (id) => {
    const cliente = clientes.find((c) => c.id === id);
    return cliente?.nombre || "cliente";
  };
  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      {/* Selección de tipo de documento */}
      <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px" }}>
        <option value="cotizacion">Cotización</option>
        <option value="orden">Orden de Pedido</option>
      </select>

      {/* Fecha creación y evento */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <label>📅 Fecha de creación:</label>
          <input type="text" value={fechaCreacion} disabled style={{ width: "100%", padding: "8px" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>📅 Fecha del evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} style={{ width: "100%", padding: "8px" }} />
        </div>
      </div>

      {/* Buscar cliente */}
      <div style={{ marginBottom: "10px" }}>
        <label>👤 Cliente:</label>
        <input
          type="text"
          placeholder="Buscar por nombre, ID o teléfono..."
          value={clienteBusqueda}
          onChange={(e) => setClienteBusqueda(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
        {clienteBusqueda && clientesFiltrados.length > 0 && (
          <ul style={{ listStyle: "none", padding: "5px 0" }}>
            {clientesFiltrados.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setClienteId(c.id);
                    setClienteBusqueda("");
                  }}
                  style={{ padding: "4px 8px", marginBottom: "5px", width: "100%", textAlign: "left" }}
                >
                  {c.nombre} - {c.telefono}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabla de productos */}
      <table style={{ width: "100%", marginTop: "15px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Valor unitario</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((p, i) => (
            <tr key={i}>
              <td>
                <input
                  type="number"
                  min="1"
                  value={p.cantidad}
                  onChange={(e) => actualizarCantidad(i, parseInt(e.target.value))}
                  style={{ width: "60px" }}
                />
              </td>
              <td>{p.nombre}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={p.precio}
                  onChange={(e) => actualizarPrecio(i, parseFloat(e.target.value))}
                  style={{ width: "80px" }}
                />
              </td>
              <td>${p.subtotal.toFixed(2)}</td>
              <td>
                <button onClick={() => eliminarProducto(i)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales, abonos, garantía */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px" }}>
        <div>
          <label>💰 Abonos:</label>
          {abonos.map((a, i) => (
            <input
              key={i}
              type="number"
              value={a}
              onChange={(e) => actualizarAbono(i, e.target.value)}
              style={{ display: "block", marginBottom: "5px", width: "150px" }}
            />
          ))}
          <button onClick={agregarAbono}>➕ Agregar abono</button>
        </div>
        <div>
          <label>🔒 Garantía:</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ display: "block", marginBottom: "10px", width: "150px" }}
          />
          <p><strong>Total: ${total.toFixed(2)}</strong></p>
          <p><strong>Saldo final: ${saldo.toFixed(2)}</strong></p>
        </div>
      </div>

      {/* Botones de acción */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={guardarDocumento} style={{ width: "100%", padding: "10px" }}>
          💾 Guardar {tipoDocumento === "cotizacion" ? "Cotización" : "Orden"}
        </button>

        {productosAgregados.length > 0 && (
          <>
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
              style={{ width: "100%", marginTop: "10px", padding: "10px" }}
            >
              📄 Descargar PDF
            </button>

            {tipoDocumento === "orden" && (
              <button onClick={generarRemisionPDF} style={{ width: "100%", marginTop: "10px", padding: "10px" }}>
                📝 Generar Remisión
              </button>
            )}
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          <button onClick={() => setModalOpen(true)}>📦 Agregar desde inventario</button>
          <button onClick={() => setGrupoOpen(true)}>🧩 Agregar grupo</button>
        </div>
      </div>

      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
      {grupoOpen && <AgregarGrupoModal onAgregarGrupo={agregarGrupo} onClose={() => setGrupoOpen(false)} />}
    </div>
  );
};

export default CrearDocumento;
