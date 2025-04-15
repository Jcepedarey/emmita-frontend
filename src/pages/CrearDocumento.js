import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import { generarPDF } from "../utils/generarPDF";
import Swal from "sweetalert2";

const CrearDocumento = () => {
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState([]);
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
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
      <h2>Crear {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}</h2>

      <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} style={{ width: "100%", marginBottom: "1rem" }}>
        <option value="cotizacion">Cotización</option>
        <option value="orden">Orden de Pedido</option>
      </select>

      <select value={cliente} onChange={(e) => setCliente(e.target.value)} style={{ width: "100%", marginBottom: "1rem" }}>
        <option value="">-- Selecciona Cliente --</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>

      <input
        type="date"
        value={fechaEvento}
        onChange={(e) => setFechaEvento(e.target.value)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />

      <button onClick={() => setModalOpen(true)} style={{ marginBottom: "0.5rem" }}>Agregar producto</button>
      <button onClick={() => setGrupoOpen(true)} style={{ marginLeft: "1rem", marginBottom: "1rem" }}>Agregar grupo</button>

      {productosAgregados.map((p, index) => (
        <div key={index} style={{ marginBottom: "0.5rem", borderBottom: "1px solid #ccc", paddingBottom: "0.5rem" }}>
          <strong>{p.tipo === "grupo" ? `Grupo: ${p.nombre}` : p.nombre}</strong>
          {p.tipo === "producto" && (
            <>
              <div>Precio: <input type="number" value={p.precio} onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value))} /></div>
              <div>Cantidad: <input type="number" value={p.cantidad} onChange={(e) => actualizarCantidad(index, parseFloat(e.target.value))} /></div>
            </>
          )}
          <div>Subtotal: ${p.subtotal}</div>
          <button onClick={() => eliminarProducto(index)}>❌ Eliminar</button>
        </div>
      ))}

      <hr />
      <div>Total: ${total}</div>
      <div>Garantía (no se suma): <input type="number" value={garantia} onChange={(e) => setGarantia(e.target.value)} /></div>
      <div>
        Abonos:
        {abonos.map((a, i) => (
          <input key={i} type="number" value={a} onChange={(e) => actualizarAbono(i, e.target.value)} style={{ marginRight: "0.5rem" }} />
        ))}
        <button onClick={agregarAbono}>+ Abono</button>
      </div>
      <div>Pagado completamente: <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} /></div>
      <div>Saldo restante: ${saldo}</div>

      <button onClick={guardarDocumento} style={{ width: "100%", marginTop: 20 }}>Guardar</button>

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
          style={{ width: "100%", marginTop: 10 }}
        >
          Descargar PDF
        </button>
      )}

      {tipoDocumento === "orden" && productosAgregados.length > 0 && (
        <button onClick={generarRemisionPDF} style={{ width: "100%", marginTop: 10 }}>
          📄 Generar Remisión
        </button>
      )}

      {modalOpen && <BuscarProductoModal onSelect={agregarProducto} onClose={() => setModalOpen(false)} />}
      {grupoOpen && <AgregarGrupoModal onCrearGrupo={agregarGrupo} onCerrar={() => setGrupoOpen(false)} />}
    </div>
  );
};

export default CrearDocumento;
