// CrearDocumento.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../supabaseClient";

import BuscarProductoModal from "../components/BuscarProductoModal";
import AgregarGrupoModal from "../components/AgregarGrupoModal";
import CrearClienteModal from "../components/CrearClienteModal";
import BuscarProveedorYProductoModal from "../components/BuscarProveedorYProductoModal";

import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF } from "../utils/generarRemision";

import Swal from "sweetalert2";
import Protegido from "../components/Protegido";

const CrearDocumento = () => {
  const location = useLocation();
  const { documento, tipo } = location.state || {};
  const esEdicion = documento?.esEdicion || false;
  const idOriginal = documento?.idOriginal || null;

  // 🧠 ESTADOS
  const [tipoDocumento, setTipoDocumento] = useState(tipo || "cotizacion");
  const [fechaCreacion] = useState(new Date().toISOString().slice(0, 10));

  // --- Multi-día ---
  const [multiDias, setMultiDias] = useState(false);
  const [fechaEvento, setFechaEvento] = useState("");         // modo 1 día
  const [fechasEvento, setFechasEvento] = useState([]);       // modo multi-día
  const numeroDias = useMemo(() => (multiDias ? fechasEvento.length : 1), [multiDias, fechasEvento]);

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [productosAgregados, setProductosAgregados] = useState([]);

  // Garantía
  const [garantia, setGarantia] = useState("");
  const [garantiaRecibida, setGarantiaRecibida] = useState(false);
  const [fechaGarantia, setFechaGarantia] = useState("");

  // Abonos con fecha
  const [abonos, setAbonos] = useState([]); // {valor, fecha}

  // Totales opcionales
  const [aplicarDescuento, setAplicarDescuento] = useState(false);
  const [descuento, setDescuento] = useState(0);
  const [aplicarRetencion, setAplicarRetencion] = useState(false);
  const [retencion, setRetencion] = useState(0);

  // Stock y modales
  const [stock, setStock] = useState({});
  const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
  const [modalCrearCliente, setModalCrearCliente] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);

  // Edición de grupo
  const [grupoEnEdicion, setGrupoEnEdicion] = useState(null);
  const [indiceGrupoEnEdicion, setIndiceGrupoEnEdicion] = useState(null);

  // Input refs (pequeñas mejoras UX)
  const inputFechaUnDiaRef = useRef(null);
  // Normalizador de fechas a 'YYYY-MM-DD'
const norm = (d) => (d ? String(d).slice(0, 10) : "");

// Label + checkbox en una sola línea
const labelInline = { display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" };

  // 🔁 Precarga desde documento (edición) — multi-día y 1 día
useEffect(() => {
  const precargarDatos = async () => {
    if (!documento) return;

    setTipoDocumento(documento.tipo || tipo || "cotizacion");

    // ¿El doc es multi-días?
    const esMulti = !!documento.multi_dias;
    setMultiDias(esMulti);

    if (esMulti) {
      // Normalizar el arreglo de días
      const arr = Array.isArray(documento.fechas_evento)
        ? documento.fechas_evento.map(norm).filter(Boolean)
        : [];
      setFechasEvento(arr);     // días múltiples
      setFechaEvento("");       // limpiar fecha 1 día
    } else {
      setFechaEvento(norm(documento.fecha_evento)); // 1 día
      setFechasEvento([]);                          // limpiar múltiples
    }

    // Resto de campos
    setProductosAgregados(documento.productos || []);
    setGarantia(documento.garantia || "");
    setAbonos(Array.isArray(documento.abonos) ? documento.abonos : []);
    setGarantiaRecibida(!!documento?.garantia_recibida);
    setFechaGarantia(documento?.fecha_garantia || "");

    if (documento.nombre_cliente) {
      setClienteSeleccionado({
        nombre: documento.nombre_cliente,
        identificacion: documento.identificacion,
        telefono: documento.telefono,
        direccion: documento.direccion,
        email: documento.email,
        id: documento.cliente_id || null,
      });
    } else if (documento.cliente_id) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", documento.cliente_id)
        .single();
      if (cliente) setClienteSeleccionado(cliente);
    }
  };
  precargarDatos();
}, [documento, tipo]);

  // 🧾 Cargar clientes
  useEffect(() => {
    const cargarClientes = async () => {
      const { data } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
      if (data) setClientes(data);
    };
    cargarClientes();
  }, []);

  // 📦 Stock disponible (1 día o varios días) con traslapes
useEffect(() => {
  const calcularStock = async () => {
    const fechasConsulta = multiDias ? fechasEvento : (fechaEvento ? [fechaEvento] : []);
    if (!fechasConsulta.length) return;

    // 1) inventario
    const { data: productosData } = await supabase.from("productos").select("id, stock");

    // 2) intentamos pedir también fechas_evento; si da 400, reintentamos sin esa columna
    let ordenesData = [];
    let res = await supabase
      .from("ordenes_pedido")
      .select("productos, fecha_evento, fechas_evento, cerrada")
      .eq("cerrada", false);

    if (res.error && String(res.error.message || "").includes("fechas_evento")) {
      res = await supabase
        .from("ordenes_pedido")
        .select("productos, fecha_evento, cerrada")
        .eq("cerrada", false);
    }
    if (res.data) ordenesData = res.data;

    const fechasSel = new Set(fechasConsulta.map((d) => String(d).slice(0, 10)));
    const reservasPorFecha = {};
    fechasConsulta.forEach((f) => (reservasPorFecha[f] = {}));

    ordenesData.forEach((orden) => {
      const diasOrd = new Set([
        ...(orden.fecha_evento ? [String(orden.fecha_evento).slice(0, 10)] : []),
        ...((orden.fechas_evento || []).map((d) => String(d).slice(0, 10))),
      ]);
      const diasQueAplican = [...fechasSel].filter((d) => diasOrd.has(d));
      if (diasQueAplican.length === 0) return;

      const acumular = (id, cant) => {
        diasQueAplican.forEach((f) => {
          reservasPorFecha[f][id] = (reservasPorFecha[f][id] || 0) + cant;
        });
      };

      orden.productos?.forEach((p) => {
        if (p.es_grupo && Array.isArray(p.productos)) {
          p.productos.forEach((sub) => {
            const id = sub.producto_id || sub.id;
            const cant = (sub.cantidad || 0) * (p.cantidad || 1);
            acumular(id, cant);
          });
        } else {
          const id = p.producto_id || p.id;
          acumular(id, (p.cantidad || 0));
        }
      });
    });

    const stockCalculado = {};
    (productosData || []).forEach((prod) => {
      const stockReal = parseInt(prod.stock ?? 0);
      const disponiblesPorDia = fechasConsulta.map((f) => {
        const reservado = reservasPorFecha[f]?.[prod.id] || 0;
        return stockReal - reservado;
      });
      stockCalculado[prod.id] = disponiblesPorDia.length ? Math.min(...disponiblesPorDia) : stockReal;
    });

    setStock(stockCalculado);
  };

  calcularStock();
}, [multiDias, fechaEvento, fechasEvento]);

useEffect(() => {
  if (!multiDias) {
    setProductosAgregados((prev) => recomputarSubtotales(prev));
  }
}, [fechaEvento, multiDias]);

  // 🧮 Helpers de cálculo
const calcularSubtotal = (item) => {
  const precio = Number(item.precio || 0);
  const cantidad = Number(item.cantidad || 0);

  // Si NO es multi-día => siempre 1 día
  // Si SÍ es multi-día => por ítem puedes apagar la multiplicación
  const diasEfectivos = !multiDias
    ? 1
    : (item.multiplicarPorDias === false ? 1 : (numeroDias || 1));

  return Math.max(0, precio * cantidad * diasEfectivos);
};

const recomputarSubtotales = (items) =>
  items.map((it) => ({ ...it, subtotal: calcularSubtotal(it) }));
  // 🧾 Totales
  const totalBruto = productosAgregados.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const totalNeto = Math.max(
    0,
    totalBruto - (aplicarDescuento ? Number(descuento || 0) : 0) - (aplicarRetencion ? Number(retencion || 0) : 0)
  );
  const sumaAbonos = abonos.reduce((acc, abono) => acc + Number(abono.valor || 0), 0);
  const saldo = Math.max(0, totalNeto - sumaAbonos);

  // ✅ Seleccionar cliente
  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    Swal.fire("Cliente seleccionado", `${cliente.nombre} (${cliente.identificacion})`, "success");
  };

  const clientesFiltrados = clientes.filter((c) =>
    [c.nombre, c.identificacion, c.telefono, c.email, c.direccion]
      .some((campo) => campo?.toLowerCase().includes(busquedaCliente.toLowerCase()))
  );

  // ✅ Agregar producto desde inventario (NO cerrar modal)
  const agregarProducto = (producto) => {
    const nuevo = {
  id: producto.id,
  nombre: producto.nombre,
  cantidad: 1,
  precio: parseFloat(producto.precio),
  es_grupo: false,
  temporal: false,
  multiplicarPorDias: multiDias ? true : undefined, // 👈 nuevo
};
    const items = [...productosAgregados, nuevo];
    setProductosAgregados(recomputarSubtotales(items));
    // no cerrar modal; el propio modal limpiará el buscador
  };

  // ✅ Agregar producto desde proveedor (modal proveedor permanece abierto)
  const agregarProductoProveedor = (producto) => {
  const nuevo = {
  id: `prov-${producto.id ?? producto.proveedor_id ?? (crypto?.randomUUID?.() || Math.random().toString(36).slice(2))}`,
  nombre: producto.nombre,
  cantidad: 1,
  precio: Number(producto.precio_venta || 0),
  es_grupo: false,
  es_proveedor: true,
  temporal: true,
  multiplicarPorDias: multiDias ? true : undefined, // 👈 nuevo
};
  const items = [...productosAgregados, nuevo];
  setProductosAgregados(recomputarSubtotales(items));
};


  // ✅ Agregar producto creado en el modal (puede ser temporal o no)
const agregarProductoTemporal = (producto) => {
  const nuevo = {
  id: producto.id ?? `tmp-${crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`,
  nombre: producto.nombre,
  cantidad: Number(producto.cantidad || 1),
  precio: Number(producto.precio || 0),
  es_grupo: false,
  temporal: !!producto.temporal,
  es_proveedor: !!producto.es_proveedor,
  multiplicarPorDias: multiDias ? true : undefined, // 👈 nuevo
};
  const items = [...productosAgregados, nuevo];
  setProductosAgregados(recomputarSubtotales(items));
};

  // ✅ Editar grupo
  const editarGrupo = (index) => {
    const grupo = productosAgregados[index];
    if (grupo && grupo.es_grupo) {
      setGrupoEnEdicion(grupo);
      setIndiceGrupoEnEdicion(index);
      setModalGrupo(true);
    }
  };

  // ✅ Actualizar cantidad en tabla (respeta multi-día)
  const actualizarCantidad = (index, cantidad) => {
    const nuevos = [...productosAgregados];
    nuevos[index].cantidad = parseInt(cantidad || 0);
    nuevos[index].subtotal = calcularSubtotal(nuevos[index]);
    setProductosAgregados(nuevos);
  };

  // ✅ Actualizar precio (respeta multi-día)
  const actualizarPrecio = (index, precio) => {
    const nuevos = [...productosAgregados];
    nuevos[index].precio = parseFloat(precio || 0);
    nuevos[index].subtotal = calcularSubtotal(nuevos[index]);
    setProductosAgregados(nuevos);
  };

  const toggleMultiplicarPorDias = (index, checked) => {
  setProductosAgregados((prev) => {
    const n = [...prev];
    n[index] = { ...n[index], multiplicarPorDias: !!(checked) };
    n[index].subtotal = calcularSubtotal(n[index]);
    return n;
  });
};

  // ✅ Eliminar producto
  const eliminarProducto = (index) => {
    const nuevos = [...productosAgregados];
    nuevos.splice(index, 1);
    setProductosAgregados(nuevos);
  };

  // ✅ Abonos
  const agregarAbono = () => {
    const nuevaFecha = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
    setAbonos([...abonos, { valor: 0, fecha: nuevaFecha }]);
  };

  // ✅ Guardar documento
  const guardarDocumento = async () => {
    if (!clienteSeleccionado || productosAgregados.length === 0) {
      return Swal.fire("Faltan datos", "Debes seleccionar un cliente y agregar al menos un producto.", "warning");
    }

    const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
    const prefijo = tipoDocumento === "cotizacion" ? "COT" : "OP";
    const fecha = new Date().toISOString().slice(0, 10);
    const fechaNumerica = fecha.replaceAll("-", "");

    let numeroDocumento = documento?.numero;
    if (!esEdicion) {
      const { data: existentes } = await supabase
        .from(tabla)
        .select("id")
        .like("numero", `${prefijo}-${fechaNumerica}-%`);
      const consecutivo = (existentes?.length || 0) + 1;
      numeroDocumento = `${prefijo}-${fechaNumerica}-${consecutivo}`;
    }

    const redondear = (num) => Math.round(num * 100) / 100;
    const totalAbonos = abonos.reduce((acc, ab) => acc + Number(ab.valor || 0), 0);
    if (redondear(totalAbonos) > redondear(totalNeto)) {
      return Swal.fire("Error", "El total de abonos no puede superar el valor del pedido.", "warning");
    }
    const estadoFinal = redondear(totalAbonos) === redondear(totalNeto) ? "pagado" : "pendiente";

   // Fecha/s del evento — construir payload sin nulls peligrosos
const dataGuardar = {
  cliente_id: clienteSeleccionado.id,
  productos: productosAgregados,
  total: totalBruto,
  total_neto: totalNeto,
  descuento: aplicarDescuento ? Number(descuento || 0) : 0,
  retencion: aplicarRetencion ? Number(retencion || 0) : 0,
  abonos,
  garantia: parseFloat(garantia || 0),
  garantia_recibida: !!garantiaRecibida,
  fecha_garantia: fechaGarantia || null,
  multi_dias: !!multiDias,
  fechas_evento: multiDias ? (fechasEvento || []) : null,
  numero_dias: multiDias ? (numeroDias || (fechasEvento?.length || 1)) : 1,
  estado: estadoFinal,
  tipo: tipoDocumento,
  numero: numeroDocumento,
  ...(tipoDocumento === "cotizacion"
    ? { fecha: fechaCreacion }
    : { fecha_creacion: fechaCreacion }),
};

// 👇 Ajuste especial: NUNCA mandes fecha_evento: null en PATCH/INSERT
if (multiDias) {
  const primerDia = fechasEvento?.[0];
  if (primerDia) {
    dataGuardar.fecha_evento = primerDia;   // si hay 1er día, úsalo
  } else {
    delete dataGuardar.fecha_evento;        // si no, no envíes la clave
  }
} else {
  if (fechaEvento) {
    dataGuardar.fecha_evento = fechaEvento; // día único
  } else {
    delete dataGuardar.fecha_evento;
  }
}

    let error;
    if (esEdicion && idOriginal) {
      const confirmar = await Swal.fire({
        title: "¿Actualizar documento?",
        text: "Este documento ya existe. ¿Deseas actualizarlo?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, actualizar",
        cancelButtonText: "Cancelar"
      });

      if (!confirmar.isConfirmed) return;

      const tablaOriginal = documento?.numero?.startsWith("COT") ? "cotizaciones" : "ordenes_pedido";
      if (tablaOriginal !== tabla) {
        await supabase.from(tablaOriginal).delete().eq("id", idOriginal);
        const { data: existentes } = await supabase
          .from(tabla)
          .select("id")
          .like("numero", `${prefijo}-${fechaNumerica}-%`);
        const consecutivo = (existentes?.length || 0) + 1;
        numeroDocumento = `${prefijo}-${fechaNumerica}-${consecutivo}`;
        dataGuardar.numero = numeroDocumento;
        const res = await supabase.from(tabla).insert([dataGuardar]);
        error = res.error;
      } else {
        const res = await supabase.from(tabla).update(dataGuardar).eq("id", idOriginal);
        error = res.error;
      }
    } else {
      const res = await supabase.from(tabla).insert([dataGuardar]);
      error = res.error;
    }

    if (!error) {
      Swal.fire("Guardado", `La ${tipoDocumento} fue guardada correctamente.`, "success");
    } else {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el documento", "error");
    }
  };

  // ✅ Datos PDF (Fase 3 usará estos nuevos campos)
  const obtenerDatosPDF = () => ({
    nombre_cliente: clienteSeleccionado?.nombre,
    identificacion: clienteSeleccionado?.identificacion,
    telefono: clienteSeleccionado?.telefono,
    direccion: clienteSeleccionado?.direccion,
    email: clienteSeleccionado?.email,
    productos: productosAgregados,
    total_bruto: totalBruto,
    total_neto: totalNeto,
    descuento: aplicarDescuento ? Number(descuento || 0) : 0,
    retencion: aplicarRetencion ? Number(retencion || 0) : 0,
    abonos,
    garantia,
    garantia_recibida: garantiaRecibida,
    fecha_garantia: fechaGarantia,
    fecha_creacion: fechaCreacion,
    multi_dias: multiDias,
    fechas_evento: multiDias ? fechasEvento : [],
    numero_dias: numeroDias,
    fecha_evento: multiDias ? (fechasEvento[0] || null) : (fechaEvento || null)
  });

  // Handlers multi-día
  const agregarDia = (nuevo) => {
    if (!nuevo) return;
    if (fechasEvento.includes(nuevo)) return;
    setFechasEvento((prev) => [...prev, nuevo].sort());
    setProductosAgregados((prev) => recomputarSubtotales(prev));
  };
  const eliminarDia = (dia) => {
    setFechasEvento((prev) => prev.filter((d) => d !== dia));
    setProductosAgregados((prev) => recomputarSubtotales(prev));
  };
  
  // Cuando el usuario activa/desactiva "Alquiler por varios días"
const onToggleMultiDias = (val) => {
  setMultiDias(val);

  if (val) {
    setFechasEvento((prev) => (prev?.length ? prev : (fechaEvento ? [fechaEvento] : [])));
    setFechaEvento("");

    // al entrar a multi-día: por defecto, todos ON (respetamos los que ya estaban en false)
    setProductosAgregados((prev) =>
      recomputarSubtotales(
        prev.map((it) => ({
          ...it,
          multiplicarPorDias: (it.multiplicarPorDias === false) ? false : true,
        }))
      )
    );
  } else {
    const first = (fechasEvento && fechasEvento[0]) || "";
    setFechaEvento(first || "");
    setFechasEvento([]);
    setTimeout(() => inputFechaUnDiaRef.current?.focus(), 0);

    // al salir de multi-día: solo recalc (quedará 1 día)
    setProductosAgregados((prev) => recomputarSubtotales(prev));
  }
};

  return (
    <Protegido>
      <div style={{ padding: "20px", maxWidth: "900px", margin: "auto" }}>
        <h2 style={{ textAlign: "center" }}>
          📄 {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}
        </h2>

        <div style={{ marginBottom: "15px" }}>
          <label>Tipo de documento: </label>
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            <option value="cotizacion">Cotización</option>
            <option value="orden">Orden de Pedido</option>
          </select>
        </div>

        {/* Modo de fechas */}
        <div style={{ margin: "10px 0" }}>
  <label style={labelInline}>
  Alquiler por varios días
  <input
    type="checkbox"
    checked={multiDias}
    onChange={(e) => onToggleMultiDias(e.target.checked)}   // 👈 usar handler
    style={{ marginLeft: 6 }}
  />
</label>
</div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label>Fecha de creación:</label>
            <input type="date" value={fechaCreacion} disabled style={{ width: "100%" }} />
          </div>

          {!multiDias ? (
            <div style={{ flex: 1 }}>
              <label>Fecha del evento:</label>
              <input
                ref={inputFechaUnDiaRef}
                type="date"
                value={fechaEvento}
                onChange={(e) => setFechaEvento(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <label>Seleccionar día y añadir:</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="date"
                  onChange={(e) => agregarDia(e.target.value)}
                  style={{ width: "100%" }}
                />
                {/* botón opcional si prefieres control manual */}
              </div>

              {fechasEvento.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <small>Días seleccionados ({numeroDias}):</small>
                  <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0" }}>
                    {fechasEvento.map((d) => (
                      <li key={d} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{d}</span>
                        <button onClick={() => eliminarDia(d)} title="Quitar">🗑️</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <hr style={{ margin: "20px 0" }} />

        {/* Clientes */}
        <label>Buscar cliente:</label>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Nombre, identificación o teléfono"
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={() => setModalCrearCliente(true)}>➕ Crear cliente</button>
        </div>

        {busquedaCliente && clientesFiltrados.length > 0 && (
          <ul style={{ marginTop: "10px", listStyle: "none", padding: 0 }}>
            {clientesFiltrados.map((cliente) => (
              <li key={cliente.id}>
                <button
                  onClick={() => seleccionarCliente(cliente)}
                  style={{ width: "100%", textAlign: "left" }}
                >
                  {cliente.nombre} - {cliente.identificacion} - {cliente.telefono}
                </button>
              </li>
            ))}
          </ul>
        )}

        {clienteSeleccionado && (
          <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f1f1f1", borderRadius: "6px" }}>
            <strong>Cliente seleccionado:</strong><br />
            🧑 {clienteSeleccionado.nombre || "N/A"}<br />
            🆔 {clienteSeleccionado.identificacion || "N/A"}<br />
            📞 {clienteSeleccionado.telefono || "N/A"}<br />
            📍 {clienteSeleccionado.direccion || "N/A"}<br />
            ✉️ {clienteSeleccionado.email || "N/A"}
          </div>
        )}

        <hr style={{ margin: "30px 0" }} />
        <h3>Productos o Grupos Agregados</h3>

        {/* Tabla productos */}
<table style={{ width: "100%", marginBottom: "20px", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th style={{ borderBottom: "1px solid #ccc" }}>Cant</th>
      <th style={{ borderBottom: "1px solid #ccc" }}>Stock</th>
      <th style={{ borderBottom: "1px solid #ccc" }}>Descripción</th>
      <th style={{ borderBottom: "1px solid #ccc" }}>V. Unit</th>
      {multiDias && <th style={{ borderBottom: "1px solid #ccc" }}>× días</th>}
      {multiDias && <th style={{ borderBottom: "1px solid #ccc" }}>V. x Días</th>}
      <th style={{ borderBottom: "1px solid #ccc" }}>Subtotal</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {productosAgregados.map((item, index) => {
      const idProducto = item.producto_id || item.id;
      const stockDisp = stock?.[idProducto] ?? "—";
      const sobrepasado =
        stockDisp !== "—" && Number(item.cantidad || 0) > Number(stockDisp || 0);

      // control por ítem para multiplicar por días
      const usaDias = item.multiplicarPorDias !== false; // default: true cuando hay multi-día
      const valorPorDias = usaDias
        ? Number(item.precio || 0) * (numeroDias || 1)
        : null;

      const isTemporal = !!item.temporal || !!item.es_proveedor;
      const rowStyle = isTemporal ? { background: "rgba(255, 235, 59, 0.15)" } : undefined;

      return (
        <tr key={index} style={rowStyle}>
          <td>
            <input
              type="number"
              value={item.cantidad}
              min="1"
              onChange={(e) => actualizarCantidad(index, e.target.value)}
              style={{ width: "60px" }}
            />
          </td>
          <td style={{ textAlign: "center", color: sobrepasado ? "red" : "black" }}>
            {stockDisp}
          </td>
          <td>{item.nombre}</td>
          <td>
            {item.es_grupo ? (
              "$" +
              Number(item.precio || 0).toLocaleString("es-CO", {
                maximumFractionDigits: 0
              })
            ) : (
              <input
                type="number"
                value={item.precio}
                min="0"
                onChange={(e) => actualizarPrecio(index, e.target.value)}
                style={{ width: "100px" }}
              />
            )}
          </td>

          {multiDias && (
            <td style={{ textAlign: "center" }}>
              <input
                type="checkbox"
                checked={usaDias}
                onChange={(e) => toggleMultiplicarPorDias(index, e.target.checked)}
                title="Multiplicar este ítem por los días seleccionados"
              />
            </td>
          )}

          {multiDias && (
            <td>
              {usaDias
                ? `$${(valorPorDias || 0).toLocaleString("es-CO", {
                    maximumFractionDigits: 0
                  })}`
                : "—"}
            </td>
          )}

          <td>
            ${(item.subtotal ?? 0).toLocaleString("es-CO", {
              maximumFractionDigits: 0
            })}
          </td>
          <td>
            {item.es_grupo && (
              <button onClick={() => editarGrupo(index)} title="Editar grupo">
                ✏️
              </button>
            )}
            <button onClick={() => eliminarProducto(index)}>🗑️</button>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>

        {/* Botones para agregar */}
        <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setModalBuscarProducto(true)} style={{ padding: "8px 12px" }}>
            🔍 Agregar desde Inventario
          </button>

          <button onClick={() => { setIndiceGrupoEnEdicion(null); setGrupoEnEdicion(null); setModalGrupo(true); }} style={{ padding: "8px 12px" }}>
            📦 Crear Grupo de Artículos
          </button>

          <button onClick={() => setModalProveedor(true)} style={{ padding: "8px 12px" }}>
            📥 Agregar desde Proveedor
          </button>
        </div>

        {/* Garantía y abonos */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
          <div style={{ flex: "1" }}>
            <label>Monto de garantía:</label>
            <input
              type="number"
              min="0"
              value={garantia}
              onChange={(e) => {
                setGarantia(e.target.value);
              }}
              style={{ width: "100%" }}
            />

            <div style={{ marginTop: "10px" }}>
  <label style={labelInline}>
    ¿Cliente ya entregó la garantía?
    <input
      type="checkbox"
      checked={garantiaRecibida}
      onChange={(e) => {
        const checked = e.target.checked;
        setGarantiaRecibida(checked);
        if (checked) {
          const hoy = new Date().toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          });
          setFechaGarantia(hoy);
        } else {
          setFechaGarantia("");
        }
      }}
      style={{ marginLeft: 6 }}
    />
  </label>

  {garantiaRecibida && fechaGarantia && (
    <div style={{ marginTop: 6, fontStyle: "italic", color: "gray" }}>
      Recibida el: {fechaGarantia}
    </div>
  )}
</div>
          </div>

          <div style={{ flex: "2" }}>
            <label>Abonos ($):</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {abonos.map((abono, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label style={{ minWidth: "80px" }}>Abono {index + 1}:</label>
                  <input
                    type="number"
                    min="0"
                    value={abono.valor}
                    onChange={(e) => {
                      const nuevos = [...abonos];
                      nuevos[index].valor = parseFloat(e.target.value || 0);
                      setAbonos(nuevos);
                    }}
                    style={{ width: "120px" }}
                  />
                  <span style={{ fontStyle: "italic", color: "gray" }}>
                    Fecha: {abono.fecha}
                  </span>
                </div>
              ))}
              <button onClick={agregarAbono}>➕ Agregar abono</button>
            </div>
          </div>
        </div>

        {/* Ajustes (Descuento/Retención) */}
        <div style={{ marginTop: 20, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Ajustes:</h4>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
  <label style={labelInline}>
    Aplicar descuento
    <input
      type="checkbox"
      checked={aplicarDescuento}
      onChange={(e) => setAplicarDescuento(e.target.checked)}
      style={{ marginLeft: 6 }}
    />
  </label>

  {aplicarDescuento && (
    <input
      type="number"
      min="0"
      value={descuento}
      onChange={(e) => setDescuento(e.target.value)}
      placeholder="Valor del descuento"
    />
  )}

  <label style={labelInline}>
    Aplicar retención
    <input
      type="checkbox"
      checked={aplicarRetencion}
      onChange={(e) => setAplicarRetencion(e.target.checked)}
      style={{ marginLeft: 6 }}
    />
  </label>

  {aplicarRetencion && (
    <input
      type="number"
      min="0"
      value={retencion}
      onChange={(e) => setRetencion(e.target.value)}
      placeholder="Valor de la retención"
    />
  )}
</div>
        </div>

        {/* Totales */}
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <p><strong>Total (bruto):</strong> ${totalBruto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
          {aplicarDescuento && <p>Descuento: ${Number(descuento || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>}
          {aplicarRetencion && <p>Retención: ${Number(retencion || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>}
          <p><strong>Total (neto):</strong> ${totalNeto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
          <p><strong>Saldo final:</strong> ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Botones finales */}
        <div style={{ marginTop: "30px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          <button onClick={guardarDocumento} style={{ padding: "10px 20px" }}>
            💾 Guardar Documento
          </button>

          <button onClick={() => generarPDF(obtenerDatosPDF(), tipoDocumento)} style={{ padding: "10px 20px" }}>
            📄 Descargar PDF
          </button>

          {tipoDocumento === "orden" && productosAgregados.length > 0 && (
            <button
              onClick={() => generarRemisionPDF(obtenerDatosPDF())}
              style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white" }}
            >
              📦 Generar Remisión
            </button>
          )}

          <button
            onClick={() => {
              setClienteSeleccionado(null);
              setProductosAgregados([]);
              setGarantia("");
              setAbonos([]);
              setBusquedaCliente("");
              setFechaEvento("");
              setFechasEvento([]);
              setMultiDias(false);
              setAplicarDescuento(false); setDescuento(0);
              setAplicarRetencion(false); setRetencion(0);
              setGarantiaRecibida(false); setFechaGarantia("");
            }}
            style={{ padding: "10px 20px", marginLeft: "10px", backgroundColor: "#e53935", color: "white" }}
          >
            🧹 Limpiar módulo
          </button>
        </div>

        {/* MODALES */}
{modalBuscarProducto && (
  <BuscarProductoModal
    persistOpen                  // ⬅️ NO se cierra al elegir; solo con “Cerrar”
    onSelect={agregarProducto}   // agrega desde inventario
    onAgregarProducto={agregarProductoTemporal} // “Nuevo” o “Temporal”
    onClose={() => setModalBuscarProducto(false)}
  />
)}

{modalGrupo && (
  <AgregarGrupoModal
    persistOpen                  // ⬅️ NO se cierra al guardar; solo con “Cerrar”
    grupoEnEdicion={grupoEnEdicion}
    stockDisponible={stock}
    onAgregarGrupo={(grupo) => {
  const linea = {
    ...grupo,
    multiplicarPorDias: multiDias ? true : undefined, // 👈 grupo decide si se multiplica o no
  };
      if (indiceGrupoEnEdicion !== null) {
    const nuevos = [...productosAgregados];
    // Conserva el estado anterior si existía (respeta si ya lo apagaste)
    const prevFlag = nuevos[indiceGrupoEnEdicion]?.multiplicarPorDias;
    nuevos[indiceGrupoEnEdicion] = {
      ...linea,
      ...(prevFlag !== undefined ? { multiplicarPorDias: prevFlag } : {}),
    };
    setProductosAgregados(recomputarSubtotales(nuevos));
  } else {
    setProductosAgregados((prev) => recomputarSubtotales([...prev, linea]));
  }
  setGrupoEnEdicion(null);
  setIndiceGrupoEnEdicion(null);
}}
  />
)}

{modalProveedor && (
  <BuscarProveedorYProductoModal
    onSelect={(producto) => agregarProductoProveedor(producto)} // NO cierra
    onClose={() => setModalProveedor(false)}
  />
)}

{modalCrearCliente && (
  <CrearClienteModal
    onClienteCreado={(cliente) => {
      setClientes([...clientes, cliente]);
      setClienteSeleccionado(cliente);
      setModalCrearCliente(false); // se cierra al guardar
    }}
    onClose={() => setModalCrearCliente(false)}
  />
)}
      </div>
    </Protegido>
  );
};

export default CrearDocumento;
