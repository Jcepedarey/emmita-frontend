// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [tipoDocumento, setTipoDocumento] = useState("cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEvento, setFechaEvento] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  const total = productosAgregados.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  useEffect(() => {
    const cargarClientes = async () => {
      const { data, error } = await supabase.from("clientes").select("*");
      if (error) console.error("Error al cargar clientes:", error);
      else setClientes(data);
    };
    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.email, c.telefono, c.id].some((campo) =>
      campo?.toLowerCase().includes(clienteBusqueda.toLowerCase())
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

  const eliminarProducto = (index) => {
    const actualizados = [...productosAgregados];
    actualizados.splice(index, 1);
    setProductosAgregados(actualizados);
  };

  const actualizarAbono = (index, valor) => {
    const copia = [...abonos];
    copia[index] = valor;
    setAbonos(copia);
  };

  const agregarAbono = () => setAbonos([...abonos, ""]);

  const crearNuevoProducto = async () => {
    const nombre = prompt("Nombre del nuevo producto:");
    const precio = parseFloat(prompt("Precio del producto:"));
    const categoria = prompt("Categoría del producto:");
    if (!nombre || isNaN(precio)) return;

    const { data, error } = await supabase.from("productos").insert([{ nombre, precio, categoria }]).select();
    if (error) {
      Swal.fire("Error", "No se pudo crear el producto", "error");
    } else {
      agregarProducto(data[0]);
    }
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

  const obtenerNombreCliente = () => {
    const c = clientes.find(c => c.id === clienteId);
    return c?.nombre || "Cliente";
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

  return (
    <div style={{ padding: "1rem", maxWidth: "950px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
          <option value="cotizacion">Cotización</option>
          <option value="orden">Orden de Pedido</option>
        </select>
        <span>📅 Fecha de creación: {fechaCreacion}</span>
      </div>

      <input
        type="text"
        placeholder="Buscar cliente por nombre, identificación o código"
        value={clienteBusqueda}
        onChange={(e) => setClienteBusqueda(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      {clientesFiltrados.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {clientesFiltrados.map((cliente) => (
            <li
              key={cliente.id}
              style={{ padding: "5px", borderBottom: "1px solid #ddd", cursor: "pointer" }}
              onClick={() => {
                setClienteId(cliente.id);
                setClienteBusqueda(`${cliente.nombre}`);
              }}
            >
              {cliente.nombre} – {cliente.identificacion || cliente.telefono || ""}
            </li>
          ))}
        </ul>
      )}
      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>Cantidad</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>Descripción</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>Valor Unitario</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "6px" }}>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productosAgregados.map((item, index) => (
            <tr key={index}>
              <td>
                {item.tipo === "producto" ? (
                  <input
                    type="number"
                    value={item.cantidad}
                    min="1"
                    onChange={(e) => actualizarCantidad(index, parseInt(e.target.value))}
                    style={{ width: "60px" }}
                  />
                ) : (
                  "-"
                )}
              </td>
              <td>{item.nombre}</td>
              <td>
                {item.tipo === "producto" ? (
                  <input
                    type="number"
                    value={item.precio}
                    min="0"
                    onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value))}
                    style={{ width: "80px" }}
                  />
                ) : (
                  "-"
                )}
              </td>
              <td>${item.subtotal.toFixed(2)}</td>
              <td>
                <button onClick={() => eliminarProducto(index)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "30%" }}>
          <label>🧾 Garantía ($):</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ width: "100%", marginBottom: "10px" }}
          />
        </div>

        <div style={{ width: "30%" }}>
          <label>💸 Abonos:</label>
          {abonos.map((abono, index) => (
            <input
              key={index}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(index, e.target.value)}
              style={{ width: "100%", marginBottom: "5px" }}
            />
          ))}
          <button onClick={agregarAbono} style={{ marginTop: "5px", width: "100%" }}>➕ Agregar Abono</button>
        </div>

        <div style={{ width: "30%" }}>
          <h3>Total: ${total.toFixed(2)}</h3>
          <h4>Saldo: ${saldo.toFixed(2)}</h4>
          <label>
            <input
              type="checkbox"
              checked={pagado}
              onChange={(e) => setPagado(e.target.checked)}
            /> Pedido pagado
          </label>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={guardarDocumento} style={{ width: "100%", padding: "10px", marginBottom: "10px" }}>
          💾 Guardar Documento
        </button>

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
                  nombre_cliente: obtenerNombreCliente(),
                },
                tipoDocumento
              )
            }
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            📄 Descargar PDF
          </button>
        )}

        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button onClick={generarRemisionPDF} style={{ width: "100%", padding: "10px" }}>
            📦 Generar Remisión
          </button>
        )}
      </div>

      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
      {grupoOpen && <AgregarGrupoModal onAgregarGrupo={agregarGrupo} onClose={() => setGrupoOpen(false)} />}
    </div>
  );
};

export default CrearDocumento;
