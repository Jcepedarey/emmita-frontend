// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { generarPDF } from "../utils/generarPDF";

const CrearDocumento = () => {
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  useEffect(() => {
    const obtenerClientes = async () => {
      const { data, error } = await supabase.from("clientes").select("*");
      if (data) setClientes(data);
      if (error) console.error("Error al obtener clientes:", error);
    };
    obtenerClientes();
  }, []);
  const total = productosAgregados.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.telefono, c.direccion].some((campo) =>
      campo?.toLowerCase().includes(busquedaCliente.toLowerCase())
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

  const obtenerNombreCliente = () => {
    const clienteObj = clientes.find((c) => c.id === clienteId);
    return clienteObj?.nombre || "";
  };
  return (
    <div style={{ padding: "1rem", maxWidth: "1000px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>📝 {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      {/* Tipo de documento */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Tipo de documento: </label>
        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
          <option value="cotizacion">Cotización</option>
          <option value="orden">Orden de pedido</option>
        </select>
      </div>

      {/* Fechas */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <label>📅 Fecha de creación:</label><br />
          <input type="date" value={fechaCreacion} disabled />
        </div>
        <div>
          <label>📆 Fecha del evento:</label><br />
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: "1rem" }}>
        <label>👤 Buscar cliente:</label><br />
        <input
          type="text"
          value={clienteBusqueda}
          onChange={(e) => setClienteBusqueda(e.target.value)}
          placeholder="Nombre, teléfono, ID o código"
          style={{ width: "100%", padding: "8px" }}
        />
        {clientesFiltrados.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, background: "#eee", borderRadius: "5px", marginTop: "5px" }}>
            {clientesFiltrados.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  setClienteId(c.id);
                  setClienteBusqueda(c.nombre);
                }}
                style={{ padding: "8px", borderBottom: "1px solid #ccc", cursor: "pointer" }}
              >
                {c.nombre} - {c.telefono}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Productos agregados */}
      <table style={{ width: "100%", marginBottom: "1rem", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Valor unitario</th>
            <th>Subtotal</th>
            <th>Eliminar</th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((p, i) => (
            <tr key={i}>
              <td>
                <input
                  type="number"
                  value={p.cantidad}
                  min="1"
                  onChange={(e) => actualizarCantidad(i, parseInt(e.target.value))}
                  style={{ width: "60px" }}
                />
              </td>
              <td>{p.nombre}</td>
              <td>
                <input
                  type="number"
                  value={p.precio}
                  min="0"
                  onChange={(e) => actualizarPrecio(i, parseFloat(e.target.value))}
                  style={{ width: "80px" }}
                />
              </td>
              <td>${p.subtotal.toFixed(2)}</td>
              <td>
                <button onClick={() => eliminarProducto(i)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Botones para agregar artículos */}
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setModalOpen(true)}>➕ Agregar producto del inventario</button>
        <button onClick={() => setGrupoOpen(true)} style={{ marginLeft: "10px" }}>🔗 Crear grupo de artículos</button>
      </div>

      {/* Totales, garantía y abonos */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
        <div style={{ flex: 1 }}>
          <h4>💰 Total: ${total.toFixed(2)}</h4>
        </div>
        <div style={{ flex: 1 }}>
          <label>Garantía (no se suma):</label><br />
          <input type="number" value={garantia} onChange={(e) => setGarantia(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Abonos:</label>
          {abonos.map((abono, i) => (
            <div key={i}>
              <input
                type="number"
                value={abono}
                onChange={(e) => actualizarAbono(i, e.target.value)}
                style={{ marginBottom: "5px" }}
              />
            </div>
          ))}
          <button onClick={agregarAbono}>➕ Abono</button>
        </div>
      </div>

      {/* Botones de acción */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={guardarDocumento} style={{ width: "100%" }}>💾 Guardar {tipoDocumento}</button>
        {productosAgregados.length > 0 && (
          <button
            onClick={() =>
              generarPDF({
                cliente_id: clienteId,
                nombre_cliente: obtenerNombreCliente(),
                productos: productosAgregados,
                total,
                abonos,
                saldo,
                garantia,
                fecha: fechaCreacion,
                fecha_evento: fechaEvento,
              }, tipoDocumento)
            }
            style={{ width: "100%", marginTop: "10px" }}
          >
            📄 Descargar PDF
          </button>
        )}
        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button onClick={generarRemisionPDF} style={{ width: "100%", marginTop: "10px" }}>
            📦 Generar Remisión
          </button>
        )}
      </div>

      {/* Modales */}
      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
      {grupoOpen && <AgregarGrupoModal onAgregarGrupo={agregarGrupo} onClose={() => setGrupoOpen(false)} />}
    </div>
  );
};

export default CrearDocumento;
