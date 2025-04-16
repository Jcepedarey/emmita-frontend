import React, { useEffect, useState } from "react";
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
  const [cliente, setCliente] = useState("");
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);

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
    if (!cliente) return Swal.fire("Campo requerido", "Selecciona un cliente.", "warning");
    if (productosAgregados.length === 0) return Swal.fire("Sin productos", "Agrega al menos un producto.", "info");
    if (!fechaEvento) return Swal.fire("Fecha faltante", "Selecciona la fecha del evento.", "warning");

    const datos = {
      cliente_id: cliente,
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
      setCliente("");
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

    const clienteSel = clientes.find((c) => c.id === cliente);
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
    <div style={{ padding: "1rem", maxWidth: "1000px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>📄 Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      {/* Tipo de documento */}
      <div style={{ marginBottom: "10px" }}>
        <label>
          <input
            type="radio"
            name="tipoDocumento"
            value="cotizacion"
            checked={tipoDocumento === "cotizacion"}
            onChange={() => setTipoDocumento("cotizacion")}
          /> Cotización
        </label>
        <label style={{ marginLeft: "20px" }}>
          <input
            type="radio"
            name="tipoDocumento"
            value="orden"
            checked={tipoDocumento === "orden"}
            onChange={() => setTipoDocumento("orden")}
          /> Orden de Pedido
        </label>
      </div>

      {/* Fecha creación y fecha evento */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>📅 Fecha creación: {fechaCreacion}</div>
        <div>
          📅 Fecha evento:{" "}
          <input
            type="date"
            value={fechaEvento}
            onChange={(e) => setFechaEvento(e.target.value)}
          />
        </div>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: "10px" }}>
        <label>👤 Cliente: </label>
        <select value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla de productos */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
        <thead>
          <tr>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Valor Unitario</th>
            <th>Subtotal</th>
            <th>Acción</th>
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
                    onChange={(e) => actualizarCantidad(index, parseInt(e.target.value))}
                    style={{ width: "60px" }}
                  />
                ) : "-"}
              </td>
              <td>{item.tipo === "producto" ? item.nombre : `Grupo: ${item.nombre}`}</td>
              <td>
                {item.tipo === "producto" ? (
                  <input
                    type="number"
                    value={item.precio}
                    onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value))}
                    style={{ width: "80px" }}
                  />
                ) : "-"}
              </td>
              <td>${item.subtotal.toFixed(2)}</td>
              <td><button onClick={() => eliminarProducto(index)}>🗑</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total, garantía y abonos */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
        <div>
          <h4>💰 Garantía:</h4>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            placeholder="Valor de la garantía"
          />
        </div>
        <div>
          <h4>💵 Abonos:</h4>
          {abonos.map((abono, index) => (
            <input
              key={index}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(index, e.target.value)}
              style={{ marginBottom: "5px", display: "block" }}
            />
          ))}
          <button onClick={agregarAbono}>➕ Agregar Abono</button>
        </div>
        <div>
          <h3>Total: ${total}</h3>
          <h4>Saldo: ${saldo}</h4>
        </div>
      </div>

      {/* Botones de acción */}
      <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={() => setModalOpen(true)}>➕ Agregar artículo existente</button>
        <button onClick={() => setGrupoOpen(true)}>📦 Crear grupo de artículos</button>
        <button onClick={guardarDocumento}>💾 Guardar documento</button>

        {productosAgregados.length > 0 && (
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
                },
                tipoDocumento
              )
            }
          >
            🧾 Descargar PDF
          </button>
        )}

        {tipoDocumento === "orden" && productosAgregados.length > 0 && (
          <button onClick={generarRemisionPDF}>📄 Generar Remisión</button>
        )}
      </div>

      {/* Modales */}
      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
      {grupoOpen && <AgregarGrupoModal onAgregarGrupo={agregarGrupo} onClose={() => setGrupoOpen(false)} />}
    </div>
  );
};

export default CrearDocumento;
