// src/pages/CrearDocumento.js
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
  const [clienteId, setClienteId] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");

  const [productosAgregados, setProductosAgregados] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);

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
    const subtotal = grupo.articulos.reduce((acc, a) => acc + a.precio * a.cantidad, 0);
    const item = {
      tipo: "grupo",
      nombre: grupo.nombre,
      articulos: grupo.articulos,
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

  const obtenerNombreCliente = () => {
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente ? cliente.nombre : "";
  };
  const guardarDocumento = async () => {
    if (!clienteId) return Swal.fire("Falta cliente", "Selecciona o crea un cliente.", "warning");
    if (!fechaEvento) return Swal.fire("Falta fecha", "Selecciona la fecha del evento.", "warning");
    if (productosAgregados.length === 0) return Swal.fire("Sin productos", "Agrega al menos un artículo.", "warning");

    const datos = {
      cliente_id: clienteId,
      productos: productosAgregados,
      total,
      abonos,
      pagado,
      saldo,
      garantia,
      fecha_evento: fechaEvento,
      fecha: fechaCreacion,
    };

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const { error } = await supabase.from(tabla).insert([datos]);

    if (error) {
      Swal.fire("Error", "No se pudo guardar el documento.", "error");
    } else {
      Swal.fire("Guardado", "Documento guardado exitosamente.", "success");
      setProductosAgregados([]);
      setAbonos([""]);
      setGarantia("");
      setClienteBusqueda("");
      setClienteId("");
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
  return (
    <div style={{ padding: "1rem", maxWidth: "1100px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>📄 Crear Documento</h2>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div>
          <label>Tipo de documento:</label>
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            <option value="cotizacion">Cotización</option>
            <option value="orden">Orden de pedido</option>
          </select>
        </div>

        <div>
          <label>Fecha creación:</label>
          <input type="date" value={fechaCreacion} disabled />
        </div>

        <div>
          <label>Fecha evento:</label>
          <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
        </div>
      </div>

      <hr />

      <div>
        <label>Buscar cliente:</label>
        <input
          type="text"
          value={clienteBusqueda}
          onChange={(e) => setClienteBusqueda(e.target.value)}
          placeholder="Nombre, cédula, teléfono o código"
          style={{ width: "100%", marginBottom: "10px" }}
        />
        {clientesFiltrados.length > 0 && (
          <ul style={{ border: "1px solid #ccc", maxHeight: "100px", overflowY: "auto", padding: "5px" }}>
            {clientesFiltrados.map((cliente) => (
              <li
                key={cliente.id}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setClienteId(cliente.id);
                  setClienteBusqueda(cliente.nombre);
                }}
              >
                {cliente.nombre} - {cliente.telefono}
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr />

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button onClick={() => setModalOpen(true)}>➕ Agregar artículo</button>
        <button onClick={() => setGrupoOpen(true)}>📦 Crear grupo</button>
        <button onClick={crearNuevoProducto}>➕ Nuevo producto</button>
      </div>

      {productosAgregados.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2" }}>
              <th>Cantidad</th>
              <th>Descripción</th>
              <th>Valor unitario</th>
              <th>Subtotal</th>
              <th>Eliminar</th>
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
                      onChange={(e) => actualizarCantidad(index, parseFloat(e.target.value))}
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
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
        <div>
          <label>Abonos:</label>
          {abonos.map((abono, index) => (
            <input
              key={index}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(index, e.target.value)}
              style={{ display: "block", marginBottom: "5px" }}
            />
          ))}
          <button onClick={agregarAbono}>➕ Otro abono</button>
        </div>

        <div>
          <label>Garantía:</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
          />
        </div>

        <div>
          <strong>Total: ${total.toFixed(2)}</strong><br />
          <strong>Saldo: ${saldo.toFixed(2)}</strong>
        </div>
      </div>

      <hr />

      <button onClick={guardarDocumento} style={{ width: "100%", marginTop: 20 }}>💾 Guardar documento</button>

      {productosAgregados.length > 0 && (
        <button
          onClick={() =>
            generarPDF(
              {
                cliente_id: clienteId,
                nombre_cliente: clienteBusqueda,
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
          style={{ width: "100%", marginTop: 10 }}
        >
          📥 Descargar PDF
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

export default CrearDocumento;
