// C:\Users\pc\frontend-emmita\src\pages\CrearDocumento.js
import React, { useEffect, useState } from "react";
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
  const [modalProducto, setModalProducto] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [garantia, setGarantia] = useState("");
  const [abonos, setAbonos] = useState([""]);
  const [pagado, setPagado] = useState(false);

  const total = productosAgregados.reduce((acc, p) => acc + p.subtotal, 0);
  const sumaAbonos = abonos.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const saldo = Math.max(0, total - sumaAbonos);

  useEffect(() => {
    const cargarClientes = async () => {
      const { data, error } = await supabase.from("clientes").select("*");
      if (data) setClientes(data);
      if (error) console.error("Error al cargar clientes:", error);
    };
    cargarClientes();
  }, []);
  const agregarProducto = (producto) => {
    const nuevo = {
      tipo: "producto",
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      subtotal: producto.precio,
    };
    setProductosAgregados([...productosAgregados, nuevo]);
  };

  const agregarGrupo = (grupo) => {
    const subtotal = grupo.detalleGrupo.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
    const nuevoGrupo = {
      tipo: "grupo",
      nombre: grupo.nombre,
      articulos: grupo.detalleGrupo,
      subtotal,
    };
    setProductosAgregados([...productosAgregados, nuevoGrupo]);
  };

  const crearNuevoCliente = async () => {
    const { value: nombre } = await Swal.fire({
      title: "Nuevo cliente",
      input: "text",
      inputLabel: "Nombre del cliente",
      showCancelButton: true,
    });

    if (!nombre) return;

    const { data, error } = await supabase
      .from("clientes")
      .insert([{ nombre }])
      .select();

    if (error) {
      Swal.fire("Error", "No se pudo crear el cliente", "error");
      return;
    }

    const nuevo = data[0];
    setClientes([...clientes, nuevo]);
    setClienteId(nuevo.id);
    setClienteBusqueda(nuevo.nombre);
    Swal.fire("Creado", "Cliente creado exitosamente", "success");
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
    actualizados[index].subtotal = actualizados[index].cantidad * nuevoPrecio;
    setProductosAgregados(actualizados);
  };
  const eliminarProducto = (index) => {
    const copia = [...productosAgregados];
    copia.splice(index, 1);
    setProductosAgregados(copia);
  };

  const actualizarAbono = (index, valor) => {
    const copia = [...abonos];
    copia[index] = valor;
    setAbonos(copia);
  };

  const agregarAbono = () => {
    setAbonos([...abonos, ""]);
  };

  const obtenerNombreCliente = (id) => {
    const cliente = clientes.find((c) => c.id === id);
    return cliente?.nombre || "cliente";
  };

  const guardarDocumento = async () => {
    if (!clienteId || !fechaEvento || productosAgregados.length === 0) {
      return Swal.fire("Campos requeridos", "Completa todos los campos", "warning");
    }

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
      Swal.fire("Error", "No se pudo guardar el documento", "error");
      console.error(error);
    } else {
      Swal.fire("Guardado", "Documento guardado exitosamente", "success");
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
  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Crear Cotización u Orden de Pedido</h2>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <label>Tipo de documento:</label>
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            <option value="cotizacion">Cotización</option>
            <option value="orden">Orden de pedido</option>
          </select>
        </div>

        <div>
          <label>Fecha de creación:</label>
          <input type="date" value={fechaCreacion} disabled />
        </div>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Cliente:</label>
        <input
          type="text"
          placeholder="Buscar por nombre, cédula o teléfono"
          value={clienteBusqueda}
          onChange={(e) => setClienteBusqueda(e.target.value)}
          style={{ width: "100%", marginBottom: 5 }}
        />
        {clienteBusqueda && clientesFiltrados.length > 0 && (
          <ul style={{ border: "1px solid #ccc", maxHeight: 120, overflowY: "auto", padding: "5px", listStyle: "none" }}>
            {clientesFiltrados.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  setClienteId(c.id);
                  setClienteBusqueda(`${c.nombre} - ${c.telefono}`);
                }}
                style={{ cursor: "pointer", padding: "2px 0" }}
              >
                {c.nombre} - {c.telefono}
              </li>
            ))}
          </ul>
        )}
        <button onClick={crearNuevoCliente} style={{ marginTop: 5 }}>➕ Crear nuevo cliente</button>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Fecha del evento:</label>
        <input
          type="date"
          value={fechaEvento}
          onChange={(e) => setFechaEvento(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: 10 }}>
        <button onClick={() => setModalOpen(true)} style={{ flex: 1 }}>📦 Agregar producto del inventario</button>
        <button onClick={crearNuevoProducto} style={{ flex: 1 }}>🆕 Crear producto nuevo</button>
        <button onClick={() => setGrupoOpen(true)} style={{ flex: 1 }}>📂 Crear grupo</button>
      </div>

      {productosAgregados.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc" }}>Cantidad</th>
              <th style={{ border: "1px solid #ccc" }}>Descripción</th>
              <th style={{ border: "1px solid #ccc" }}>Valor unitario</th>
              <th style={{ border: "1px solid #ccc" }}>Subtotal</th>
              <th style={{ border: "1px solid #ccc" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosAgregados.map((item, index) => (
              <tr key={index}>
                <td style={{ border: "1px solid #ccc" }}>{item.cantidad}</td>
                <td style={{ border: "1px solid #ccc" }}>{item.nombre}</td>
                <td style={{ border: "1px solid #ccc" }}>${item.precio}</td>
                <td style={{ border: "1px solid #ccc" }}>${item.subtotal}</td>
                <td style={{ border: "1px solid #ccc" }}>
                  <button onClick={() => eliminarProducto(index)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
        <div style={{ flex: 1 }}>
          <label>Garantía:</label>
          <input
            type="number"
            value={garantia}
            onChange={(e) => setGarantia(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label>Abonos:</label>
          {abonos.map((abono, index) => (
            <input
              key={index}
              type="number"
              value={abono}
              onChange={(e) => actualizarAbono(index, e.target.value)}
              style={{ width: "100%", marginBottom: "5px" }}
            />
          ))}
          <button onClick={agregarAbono}>➕ Agregar abono</button>
        </div>
      </div>

      <h3 style={{ textAlign: "right" }}>Total: ${total}</h3>
      <h4 style={{ textAlign: "right" }}>Saldo: ${saldo}</h4>

      <button onClick={guardarDocumento} style={{ width: "100%", padding: "10px", marginBottom: "10px" }}>
        💾 Guardar {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}
      </button>

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
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        >
          📄 Descargar PDF
        </button>
      )}

      {tipoDocumento === "orden" && productosAgregados.length > 0 && (
        <button onClick={generarRemisionPDF} style={{ width: "100%", padding: "10px" }}>
          🧾 Generar Remisión
        </button>
      )}

      {/* MODALES */}
      {modalOpen && (
        <BuscarProductoModal
          onSelect={agregarProducto}
          onClose={() => setModalOpen(false)}
        />
      )}
      {grupoOpen && (
        <AgregarGrupoModal
          onAgregarGrupo={agregarGrupo}
          onClose={() => setGrupoOpen(false)}
        />
      )}
    </div>
  );
};

export default CrearDocumento;
