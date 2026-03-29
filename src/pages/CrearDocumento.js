// CrearDocumento.js
  import React, { useEffect, useMemo, useRef, useState } from "react";
  import { useLocation } from "react-router-dom";
  import supabase from "../supabaseClient";

  import useLimites from "../hooks/useLimites";

  import BuscarProductoModal from "../components/BuscarProductoModal";
  import AgregarGrupoModal from "../components/AgregarGrupoModal";
  import CrearClienteModal from "../components/CrearClienteModal";
  import BuscarProveedorYProductoModal from "../components/BuscarProveedorYProductoModal";
  import PagosProveedorModal from "../components/PagosProveedorModal";

  import { generarPDF } from "../utils/generarPDF";
  import { generarRemisionPDF } from "../utils/generarRemision";

  import Swal from "sweetalert2";
  import Protegido from "../components/Protegido";
  import "../estilos/CrearDocumentoEstilo.css";

  const CrearDocumento = () => {
    const location = useLocation();
    const { documento, tipo } = location.state || {};

    const { puedeCrearDocumento, mensajeBloqueo, trialVencido } = useLimites();
    
    // ✅ CONVERTIR A ESTADOS para poder actualizar después de guardar
    const [esEdicion, setEsEdicion] = useState(documento?.esEdicion || false);
    const [idOriginal, setIdOriginal] = useState(documento?.idOriginal || null);
    const [numeroDocumentoActual, setNumeroDocumentoActual] = useState(documento?.numero || null);

    // 🧠 ESTADOS
    const [tipoDocumento, setTipoDocumento] = useState(tipo || "cotizacion");
    const [usuario, setUsuario] = useState(null);
    const [fechaCreacion, setFechaCreacion] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`; // YYYY-MM-DD (local)
  });

    // --- Multi-día ---
    const [multiDias, setMultiDias] = useState(false);
    const [fechaEvento, setFechaEvento] = useState("");         // modo 1 día
    const [fechasEvento, setFechasEvento] = useState([]);       // modo multi-día
    const numeroDias = useMemo(() => (multiDias ? fechasEvento.length : 1), [multiDias, fechasEvento]);
    const [fechaEntrega, setFechaEntrega] = useState("");       // 🆕 fecha entrega mercancía
    const [fechaDevolucion, setFechaDevolucion] = useState(""); // 🆕 fecha devolución mercancía
    const [mostrarNotas, setMostrarNotas] = useState(false);

    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [busquedaCliente, setBusquedaCliente] = useState("");

    const [productosAgregados, setProductosAgregados] = useState([]);

    // 🔧 Sincronizar costos cuando cambian los productos
    useEffect(() => {
      const itemsConCosto = [];
      const recoger = (items) => {
        for (const it of items || []) {
          if (it.es_grupo && Array.isArray(it.productos)) {
            recoger(it.productos);
          } else if (Number(it.costo_interno || 0) > 0 || it.es_servicio) {
            const yaExiste = costosProduccion.find((c) => c.nombre === it.nombre);
            itemsConCosto.push({
              nombre: it.nombre,
              costo: yaExiste?.costo ?? Number(it.costo_interno || 0),
              fecha: yaExiste?.fecha || new Date().toISOString().slice(0, 10),
              es_servicio: !!it.es_servicio,
            });
          }
        }
      };
      recoger(productosAgregados);
      setCostosProduccion(itemsConCosto);
    }, [productosAgregados]); // eslint-disable-line react-hooks/exhaustive-deps

    // Garantía
    const [garantia, setGarantia] = useState("");
    const [garantiaRecibida, setGarantiaRecibida] = useState(false);
    const [fechaGarantia, setFechaGarantia] = useState("");

    // Abonos con fecha
    const [abonos, setAbonos] = useState([]); // {valor, fecha}

    // 🔧 Costos de producción (servicios y artículos con costo)
    const [costosProduccion, setCostosProduccion] = useState([]);

    // 🔒 Protección contra doble clic
    const [guardando, setGuardando] = useState(false);
    const guardandoRef = useRef(false); // ✅ Protección síncrona contra doble clic

    // 👉 Helpers de fecha para abonos
  const hoyISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`; // YYYY-MM-DD (local)
  };

  // "dd/mm/aaaa" (con o sin cero) → "aaaa-mm-dd" (para <input type="date">).
  // Si ya viene ISO o ISO con hora, retornamos los 10 primeros (aaaa-mm-dd).
  const toISO = (s) => {
    if (!s) return "";
    const str = String(s).trim();

    // d/m/aaaa o dd/mm/aaaa
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      const yy = m[3];
      return `${yy}-${mm}-${dd}`;
    }

    // ISO puro o ISO con tiempo -> recorta aaaaa-mm-dd
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    return str.slice(0, 10);
  };

  // ISO (con o sin tiempo) o Date → "dd/mm/aaaa" (sin tocar zona horaria).
  // También acepta d/m/aaaa o dd/mm/aaaa. Si no puede, retorna "-".
  const toDMY = (input) => {
    if (!input) return "-";

    if (input instanceof Date) {
      const dd = String(input.getDate()).padStart(2, "0");
      const mm = String(input.getMonth() + 1).padStart(2, "0");
      const yy = input.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }

    const s = String(input).trim();

    // ISO con o sin tiempo
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const yy = iso[1], mm = iso[2], dd = iso[3];
      return `${dd}/${mm}/${yy}`;
    }

    // d/m/aaaa o dd/mm/aaaa
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      const dd = dmy[1].padStart(2, "0");
      const mm = dmy[2].padStart(2, "0");
      const yy = dmy[3];
      return `${dd}/${mm}/${yy}`;
    }

    // último recurso (evita off-by-one en la mayoría de casos ISO)
    const d = new Date(s);
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    return "-";
  };

  const eliminarAbono = (i) => {
    const nuevos = [...abonos];
    nuevos.splice(i, 1);
    setAbonos(nuevos);
  };

    // Totales opcionales
  const [aplicarDescuento, setAplicarDescuento] = useState(false);
  const [descuento, setDescuento] = useState("");      // sin valor por defecto
  const [aplicarRetencion, setAplicarRetencion] = useState(false);
  const [retencion, setRetencion] = useState("");      // sin valor por defecto
    // Stock y modales
    const [stock, setStock] = useState({});
    const [modalBuscarProducto, setModalBuscarProducto] = useState(false);
    const [modalCrearCliente, setModalCrearCliente] = useState(false);
    const [modalGrupo, setModalGrupo] = useState(false);
    const [modalProveedor, setModalProveedor] = useState(false);

    // Modal de pagos a proveedores
const [modalPagosProveedor, setModalPagosProveedor] = useState(false);
const [pagosProveedores, setPagosProveedores] = useState([]);

    // Edición de grupo
    const [grupoEnEdicion, setGrupoEnEdicion] = useState(null);
    const [indiceGrupoEnEdicion, setIndiceGrupoEnEdicion] = useState(null);
    const [editandoNombreIndex, setEditandoNombreIndex] = useState(null);

    // Input refs (pequeñas mejoras UX)
    const inputFechaUnDiaRef = useRef(null);
    // Normalizador de fechas a 'YYYY-MM-DD'
  const norm = (d) => (d ? String(d).slice(0, 10) : "");

  // Label + checkbox en una sola línea
  // Removed: labelInline (now using CSS classes)

  // ✅ AGREGAR ESTE useEffect
useEffect(() => {
  const usuarioLocal = JSON.parse(localStorage.getItem("usuario"));
  if (usuarioLocal) {
    setUsuario(usuarioLocal);
  }
}, []);

    // 🔁 Precarga desde documento (edición) — multi-día y 1 día
  useEffect(() => {
    const precargarDatos = async () => {
      if (!documento) return;

      setTipoDocumento(documento.tipo || tipo || "cotizacion");

        // 🔒 Fijar fecha de creación original
  const fc = documento.fecha || documento.fecha_creacion || documento.created_at || null;
  const soloYYYYMMDD = (d) => (d ? String(d).slice(0, 10) : "");
  setFechaCreacion(
    soloYYYYMMDD(fc) ||
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })()
  );


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
      setPagosProveedores(Array.isArray(documento.pagos_proveedores) ? documento.pagos_proveedores : []);
      setGarantiaRecibida(!!documento?.garantia_recibida);
      setFechaGarantia(documento?.fecha_garantia || "");
      setMostrarNotas(!!documento?.mostrar_notas);

      // 🆕 Cargar fechas de entrega y devolución
      if (documento.fecha_entrega) setFechaEntrega(norm(documento.fecha_entrega));
      if (documento.fecha_devolucion) setFechaDevolucion(norm(documento.fecha_devolucion));

      // 🔧 Cargar costos de producción
      if (Array.isArray(documento.costos_produccion)) {
        setCostosProduccion(documento.costos_produccion);
      }

      // 🔧 FIX: Precargar descuento y retención al editar
      const descVal = Number(documento.descuento || 0);
      if (descVal > 0) {
        setAplicarDescuento(true);
        setDescuento(String(descVal));
      } else {
        setAplicarDescuento(false);
        setDescuento("");
      }

      const retVal = Number(documento.retencion || 0);
      if (retVal > 0) {
        setAplicarRetencion(true);
        setRetencion(String(retVal));
      } else {
        setAplicarRetencion(false);
        setRetencion("");
      }

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

    // 1) Inventario base
    const { data: productosData } = await supabase.from("productos").select("id, stock");

    // 2) Órdenes abiertas (sin filtro de fecha porque usamos rango entrega–devolución)
    let ordenesData = [];
    let res = await supabase
      .from("ordenes_pedido")
      .select("productos, fecha_evento, fechas_evento, fecha_entrega, fecha_devolucion, cerrada")
      .eq("cerrada", false);

    if (res.error && String(res.error.message || "").includes("fechas_evento")) {
      res = await supabase
        .from("ordenes_pedido")
        .select("productos, fecha_evento, fecha_entrega, fecha_devolucion, cerrada")
        .eq("cerrada", false);
    }
    if (res.data) ordenesData = res.data;

    const reservasPorFecha = {};
    fechasConsulta.forEach((f) => (reservasPorFecha[f] = {}));

    // Helper: todos los días entre inicio y fin inclusive
    const diasEnRango = (inicio, fin) => {
      const dias = [];
      const d = new Date(inicio + "T12:00:00");
      const dFin = new Date(fin + "T12:00:00");
      while (d <= dFin) {
        dias.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
      return dias;
    };

    ordenesData.forEach((orden) => {
      if (orden.cerrada) return;

      // Último día del evento (para calcular devolución por defecto)
      const diasEvento = [
        ...(orden.fecha_evento ? [String(orden.fecha_evento).slice(0, 10)] : []),
        ...((orden.fechas_evento || []).map((d) => String(d).slice(0, 10))),
      ].sort();
      const ultimoDiaEvento = diasEvento[diasEvento.length - 1];
      if (!ultimoDiaEvento) return;

      // entrega = fecha_entrega || fecha_evento (fallback)
      const entrega = orden.fecha_entrega
        ? String(orden.fecha_entrega).slice(0, 10)
        : String(orden.fecha_evento).slice(0, 10);

      // devolucion = fecha_devolucion || día siguiente al último día del evento
      let devolucion;
      if (orden.fecha_devolucion) {
        devolucion = String(orden.fecha_devolucion).slice(0, 10);
      } else {
        const d = new Date(ultimoDiaEvento + "T12:00:00");
        d.setDate(d.getDate() + 1);
        devolucion = d.toISOString().slice(0, 10);
      }

      if (!entrega || !devolucion) return;

      // Días ocupados = todos los días desde entrega hasta devolucion inclusive
      const diasOcupados = new Set(diasEnRango(entrega, devolucion));

      const acumular = (id, cant) => {
        fechasConsulta.forEach((f) => {
          if (diasOcupados.has(f)) {
            reservasPorFecha[f][id] = (reservasPorFecha[f][id] || 0) + cant;
          }
        });
      };

      orden.productos?.forEach((p) => {
        if (p.es_grupo && Array.isArray(p.productos)) {
          p.productos.forEach((sub) => {
            const id = sub.producto_id || sub.id;
            const cant = (Number(sub.cantidad) || 0) * (Number(p.cantidad) || 1);
            acumular(id, cant);
          });
        } else {
          const id = p.producto_id || p.id;
          acumular(id, (Number(p.cantidad) || 0));
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
    // ✅ SIEMPRE recomputar subtotales cuando cambian las fechas o número de días
    // Esto arregla el bug de que al editar no se muestran los precios correctos
    setProductosAgregados((prev) => {
      if (prev.length === 0) return prev;
      return recomputarSubtotales(prev);
    });
  }, [fechaEvento, multiDias, numeroDias]);

  // 🆕 Auto-sugerir fechas de entrega y devolución al cambiar fecha del evento
  // Solo para órdenes de pedido. Solo sugiere si el campo está vacío (no sobreescribe ediciones del usuario)
  useEffect(() => {
    if (tipoDocumento === "cotizacion") return;

    const sugerirFechas = (fechaBase) => {
      if (!fechaBase) return;
      const base = new Date(fechaBase + "T12:00:00"); // evitar desfase timezone
      if (isNaN(base.getTime())) return;

      // Sugerir entrega = día anterior al evento
      if (!fechaEntrega) {
        const entrega = new Date(base);
        entrega.setDate(entrega.getDate() - 1);
        setFechaEntrega(entrega.toISOString().slice(0, 10));
      }

      // Sugerir devolución = día siguiente al evento
      if (!fechaDevolucion) {
        const devolucion = new Date(base);
        devolucion.setDate(devolucion.getDate() + 1);
        setFechaDevolucion(devolucion.toISOString().slice(0, 10));
      }
    };

    if (multiDias && fechasEvento.length > 0) {
      const primera = fechasEvento[0];
      const ultima = fechasEvento[fechasEvento.length - 1];
      // Entrega = día anterior a la primera fecha
      if (!fechaEntrega && primera) {
        const base = new Date(primera + "T12:00:00");
        base.setDate(base.getDate() - 1);
        setFechaEntrega(base.toISOString().slice(0, 10));
      }
      // Devolución = día siguiente a la última fecha
      if (!fechaDevolucion && ultima) {
        const base = new Date(ultima + "T12:00:00");
        base.setDate(base.getDate() + 1);
        setFechaDevolucion(base.toISOString().slice(0, 10));
      }
    } else {
      sugerirFechas(fechaEvento);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaEvento, fechasEvento, multiDias, tipoDocumento]);

    // 🧮 Helpers de cálculo
  const calcularSubtotal = (item) => {
    const precio = Number(item.precio || 0);
    const cantidad = Number(item.cantidad || 0);

    // Si NO es multi-día => siempre 1 día
    // Si SÍ es multi-día => por ítem puedes apagar la multiplicación
    const diasEfectivos = !multiDias
      ? 1
      : (item.multiplicarPorDias === false ? 1 : (numeroDias || 1));

    // ✅ NUEVO: Calcular subtotal de grupos considerando checkbox "multiplicar"
    if (item.es_grupo && Array.isArray(item.productos)) {
      const cantidadGrupo = Number(item.cantidad || 1);
      let subtotalGrupo = 0;

      item.productos.forEach((sub) => {
        const precioSub = Number(sub.precio || 0);
        const cantidadSub = Number(sub.cantidad || 0);
        const multiplicarSub = sub.multiplicar !== false; // por defecto true

        if (multiplicarSub) {
          // Se multiplica por la cantidad del grupo
          subtotalGrupo += precioSub * cantidadSub * cantidadGrupo * diasEfectivos;
        } else {
          // NO se multiplica, solo se usa la cantidad fija del sub-item
          subtotalGrupo += precioSub * cantidadSub * diasEfectivos;
        }
      });

      return Math.max(0, subtotalGrupo);
    }

    // Items normales (no grupos)
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

    const agregarProducto = (producto) => {
    const nuevo = {
      id: producto.id,
      nombre: producto.nombre,
      cantidad: "",                            // sin 1 por defecto
      precio: parseFloat(producto.precio),     // mantiene el precio del inventario
      es_grupo: false,
      temporal: false,
      es_servicio: producto.tipo === "servicio",
      costo_interno: Number(producto.costo || 0),
      multiplicarPorDias: multiDias ? true : undefined,
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
    cantidad: "",
    precio: Number(producto.precio_venta || 0),        // 💰 Precio de venta al cliente
    precio_compra: Number(producto.precio_compra || 0), // 🆕 Lo que le pagas al proveedor
    proveedor_id: producto.proveedor_id,                // 🆕 ID del proveedor
    proveedor_nombre: producto.proveedores?.nombre || producto.proveedor_nombre || "", // 🆕 Nombre del proveedor
    es_grupo: false,
    es_proveedor: true,
    temporal: true,
    multiplicarPorDias: multiDias ? true : undefined,
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
    es_servicio: !!producto.es_servicio,
    costo_interno: Number(producto.costo_interno || 0),
    multiplicarPorDias: multiDias ? true : undefined,
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

    // ✅ Actualizar cantidad en tabla (permite quedar vacía "")
  const actualizarCantidad = (index, cantidad) => {
    const nuevos = [...productosAgregados];
    nuevos[index].cantidad = cantidad; // puede ser "", "1", "10"
    nuevos[index].subtotal = calcularSubtotal(nuevos[index]); // internamente usa Number()
    setProductosAgregados(nuevos);
  };

  // ✅ Actualizar precio (permite quedar vacío "")
  const actualizarPrecio = (index, precio) => {
    const nuevos = [...productosAgregados];
    nuevos[index].precio = precio; // puede ser "", "5000", etc.
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

    // ✅ Mover item arriba o abajo en la lista
const moverItem = (index, direccion) => {
  const nuevaPosicion = index + direccion;
  if (nuevaPosicion < 0 || nuevaPosicion >= productosAgregados.length) return;
  
  const nuevos = [...productosAgregados];
  const temp = nuevos[index];
  nuevos[index] = nuevos[nuevaPosicion];
  nuevos[nuevaPosicion] = temp;
  
  setProductosAgregados(nuevos);
};

    // ✅ Abonos
    const agregarAbono = () => {
    setAbonos([...abonos, { valor: "", fecha: hoyISO() }]); // valor vacío, fecha hoy
  };

  // ✅ Verificar si hay productos de proveedor en el pedido
const tieneProductosProveedor = useMemo(() => {
  return productosAgregados.some((item) => {
    if (item.es_proveedor) return true;
    if (item.es_grupo && Array.isArray(item.productos)) {
      return item.productos.some((sub) => sub.es_proveedor);
    }
    return false;
  });
}, [productosAgregados]);

// ✅ Manejar guardado de pagos a proveedores desde el modal
const handleGuardarPagosProveedores = (pagosActualizados) => {
  setPagosProveedores(pagosActualizados);
  setModalPagosProveedor(false);
};

  // 🆕 FUNCIÓN PARA REGISTRAR ABONOS EN CONTABILIDAD
const registrarAbonosEnContabilidad = async (ordenId, clienteId, abonos, abonosYaRegistrados, numeroOrden, nombreCliente) => {
  const movimientosCreados = [];

  for (const abono of abonos) {
    const valorAbono = Number(abono.valor || 0);
    const fechaAbono = abono.fecha || new Date().toISOString().slice(0, 10);

    // Verificar si este abono ya fue registrado
    const yaRegistrado = abonosYaRegistrados.find(
      (reg) => reg.valor === valorAbono && reg.fecha === fechaAbono
    );

    if (!yaRegistrado && valorAbono > 0) {
      // Crear movimiento contable
      const { data, error } = await supabase.from("movimientos_contables").insert([{
        orden_id: ordenId,
        cliente_id: clienteId,
        fecha: fechaAbono,
        tipo: "ingreso",
        monto: valorAbono,
        descripcion: `Abono de ${nombreCliente} - ${numeroOrden}`,
        categoria: "Abonos",
        estado: "activo",
        usuario: usuario?.nombre || "Administrador",
      }]).select();

      if (error) {
        console.error("❌ Error registrando abono:", error);
        throw error;
      }

      // Guardar el ID del movimiento creado
      movimientosCreados.push({
        valor: valorAbono,
        fecha: fechaAbono,
        movimiento_id: data[0].id,
      });
    }
  }

  return movimientosCreados;
};

// 🆕 FUNCIÓN PARA ACTUALIZAR/ELIMINAR ABONOS EN CONTABILIDAD
const sincronizarAbonosContabilidad = async (abonosActuales, abonosRegistrados) => {
  // 1️⃣ Detectar abonos ELIMINADOS
  for (const registrado of abonosRegistrados) {
    const existe = abonosActuales.find(
      (ab) => ab.valor === registrado.valor && ab.fecha === registrado.fecha
    );

    if (!existe) {
      // Este abono fue eliminado → borrar de contabilidad
      await supabase
        .from("movimientos_contables")
        .delete()
        .eq("id", registrado.movimiento_id);
    }
  }

  // 2️⃣ Detectar abonos EDITADOS
  for (const registrado of abonosRegistrados) {
    const actual = abonosActuales.find(
      (ab) => ab.fecha === registrado.fecha
    );

    if (actual && actual.valor !== registrado.valor) {
      // El valor cambió → actualizar en contabilidad
      await supabase
        .from("movimientos_contables")
        .update({
          monto: actual.valor,
          fecha_modificacion: new Date().toISOString(),
          estado: "editado",
        })
        .eq("id", registrado.movimiento_id);

      // Actualizar también en el registro
      registrado.valor = actual.valor;
    }
  }

  // 3️⃣ Filtrar solo los abonos que siguen existiendo
  return abonosRegistrados.filter((reg) =>
    abonosActuales.find((ab) => ab.fecha === reg.fecha)
  );
};

// 🆕 FUNCIÓN PARA REGISTRAR PAGOS A PROVEEDORES EN CONTABILIDAD
const registrarPagosProveedoresEnContabilidad = async (ordenId, pagosProveedores, numeroOrden) => {
  const movimientosCreados = [];

  for (const proveedor of pagosProveedores) {
    for (const abono of proveedor.abonos || []) {
      const valorAbono = Number(abono.valor || 0);
      const fechaAbono = abono.fecha || new Date().toISOString().slice(0, 10);

      // Solo registrar abonos nuevos (sin movimiento_id o marcados como nuevo)
      if ((!abono.movimiento_id || abono.nuevo) && valorAbono > 0) {
        const { data, error } = await supabase.from("movimientos_contables").insert([{
          orden_id: ordenId,
          cliente_id: null, // No aplica para proveedores
          fecha: fechaAbono,
          tipo: "gasto",
          monto: valorAbono,
          descripcion: `[${numeroOrden}] Pago a proveedor: ${proveedor.proveedor_nombre}`,
          categoria: "Pagos a proveedores",
          estado: "activo",
          usuario: usuario?.nombre || "Administrador",
        }]).select();

        if (error) {
          console.error("❌ Error registrando pago a proveedor:", error);
          throw error;
        }

        // Guardar referencia del movimiento creado
        movimientosCreados.push({
          proveedor_nombre: proveedor.proveedor_nombre,
          valor: valorAbono,
          fecha: fechaAbono,
          movimiento_id: data[0].id,
        });

        // Actualizar el abono con el ID del movimiento
        abono.movimiento_id = data[0].id;
        delete abono.nuevo;
      }
    }
  }

  return movimientosCreados;
};

// 🆕 FUNCIÓN PARA SINCRONIZAR PAGOS A PROVEEDORES (eliminar/actualizar)
const sincronizarPagosProveedoresContabilidad = async (pagosActuales, pagosAnteriores) => {
  // Obtener todos los movimientos anteriores
  const movimientosAnteriores = [];
  (pagosAnteriores || []).forEach((prov) => {
    (prov.abonos || []).forEach((ab) => {
      if (ab.movimiento_id) {
        movimientosAnteriores.push({
          movimiento_id: ab.movimiento_id,
          proveedor_nombre: prov.proveedor_nombre,
          valor: ab.valor,
          fecha: ab.fecha,
        });
      }
    });
  });

  // Obtener todos los movimientos actuales
  const movimientosActuales = [];
  (pagosActuales || []).forEach((prov) => {
    (prov.abonos || []).forEach((ab) => {
      if (ab.movimiento_id && !ab.nuevo) {
        movimientosActuales.push({
          movimiento_id: ab.movimiento_id,
          proveedor_nombre: prov.proveedor_nombre,
          valor: ab.valor,
          fecha: ab.fecha,
        });
      }
    });
  });

  // Detectar movimientos ELIMINADOS
  for (const anterior of movimientosAnteriores) {
    const existe = movimientosActuales.find(
      (act) => act.movimiento_id === anterior.movimiento_id
    );

    if (!existe) {
      // Eliminar de contabilidad
      await supabase
        .from("movimientos_contables")
        .delete()
        .eq("id", anterior.movimiento_id);
    }
  }

  // Detectar movimientos EDITADOS
  for (const actual of movimientosActuales) {
    const anterior = movimientosAnteriores.find(
      (ant) => ant.movimiento_id === actual.movimiento_id
    );

    if (anterior && (anterior.valor !== actual.valor || anterior.fecha !== actual.fecha)) {
      // Actualizar en contabilidad
      await supabase
        .from("movimientos_contables")
        .update({
          monto: actual.valor,
          fecha: actual.fecha,
          fecha_modificacion: new Date().toISOString(),
          estado: "editado",
        })
        .eq("id", actual.movimiento_id);
    }
  }
};

    /**
     * ✅ Genera el siguiente número de documento buscando el MAX consecutivo
     * Esto evita el bug de números duplicados cuando hay huecos en la secuencia
     */
    const generarNumeroDocumento = async (tabla, prefijo, fechaNumerica) => {
      const { data: existentes } = await supabase
        .from(tabla)
        .select("numero")
        .like("numero", `${prefijo}-${fechaNumerica}-%`);

      let maxConsecutivo = 0;

      if (existentes && existentes.length > 0) {
        existentes.forEach((row) => {
          const partes = row.numero.split("-");
          const consecutivo = parseInt(partes[2], 10);
          if (!isNaN(consecutivo) && consecutivo > maxConsecutivo) {
            maxConsecutivo = consecutivo;
          }
        });
      }

      return `${prefijo}-${fechaNumerica}-${maxConsecutivo + 1}`;
    };

    // ✅ Guardar documento
    const guardarDocumento = async () => {
      // 🔒 Protección SÍNCRONA contra doble clic (ref se actualiza inmediatamente)
      if (guardandoRef.current) {
        console.log("⚠️ Ya se está guardando, ignorando clic adicional");
        return;
      }
      guardandoRef.current = true;

      // 🛑 AQUÍ PONEMOS LA VERIFICACIÓN DEL PLAN DE PRUEBA 🛑
      // Solo lo bloqueamos si es un documento nuevo (!esEdicion)
      if (!esEdicion && !puedeCrearDocumento()) {
        const msg = mensajeBloqueo("documento");
        return Swal.fire(msg.titulo, msg.mensaje, msg.icono);
      }

      setGuardando(true);

      try {
      // ✅ VALIDACIÓN 1: Cliente y productos
      if (!clienteSeleccionado) {
        guardandoRef.current = false; setGuardando(false);
        return Swal.fire("Falta cliente", "Debes seleccionar un cliente antes de guardar.", "warning");
      }
      
      if (productosAgregados.length === 0) {
        guardandoRef.current = false; setGuardando(false);
        return Swal.fire("Sin productos", "Debes agregar al menos un producto.", "warning");
      }

      // ✅ VALIDACIÓN 2: Fecha de evento
      const tieneFechaEvento = multiDias 
        ? (fechasEvento && fechasEvento.length > 0)
        : (fechaEvento && fechaEvento.trim() !== "");
      
      if (!tieneFechaEvento) {
        guardandoRef.current = false; setGuardando(false);
        return Swal.fire("Falta fecha", "Debes seleccionar la fecha del evento antes de guardar.", "warning");
      }

      // ✅ VALIDACIÓN 3: Cantidades mayores a 0
      const productosConCantidadCero = productosAgregados.filter(p => {
        const cantidad = Number(p.cantidad || 0);
        return cantidad <= 0;
      });
      
      if (productosConCantidadCero.length > 0) {
        const nombres = productosConCantidadCero.map(p => p.nombre).join(", ");
        guardandoRef.current = false; setGuardando(false);
        return Swal.fire("Cantidad inválida", `Los siguientes productos tienen cantidad 0 o vacía: ${nombres}`, "warning");
      }

      const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
      const prefijo = tipoDocumento === "cotizacion" ? "COT" : "OP";
      // 🔧 FIX: Usar fechaCreacion del estado (puede ser editada por el usuario)
      const fechaParaNumero = fechaCreacion || (() => {
        const d1 = new Date();
        return `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
      })();
      const fechaNumerica = fechaParaNumero.replaceAll("-", "");

      // ✅ MEJORADO: Usar número existente si ya se guardó antes, o generar uno nuevo
      let numeroDocumento = numeroDocumentoActual || documento?.numero;
      if (!esEdicion && !numeroDocumentoActual) {
        // Solo generar nuevo número si es la PRIMERA vez que se guarda
        numeroDocumento = await generarNumeroDocumento(tabla, prefijo, fechaNumerica);
      }

      const redondear = (num) => Math.round(num * 100) / 100;
      const totalAbonos = abonos.reduce((acc, ab) => acc + Number(ab.valor || 0), 0);
      if (redondear(totalAbonos) > redondear(totalNeto)) {
        guardandoRef.current = false; setGuardando(false);
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
    // 🔧 CORREGIDO: pagos_proveedores solo existe en ordenes_pedido, NO en cotizaciones
    ...(tipoDocumento !== "cotizacion" && { pagos_proveedores: pagosProveedores }),
    // 🆕 Fechas de entrega y devolución (solo órdenes)
    ...(tipoDocumento !== "cotizacion" && {
      fecha_entrega: fechaEntrega || null,
      fecha_devolucion: fechaDevolucion || null,
    }),
    garantia: parseFloat(garantia || 0),
    garantia_recibida: !!garantiaRecibida,
    fecha_garantia: fechaGarantia || null,
    multi_dias: !!multiDias,
    fechas_evento: multiDias ? (fechasEvento || []) : null,
    numero_dias: multiDias ? (numeroDias || (fechasEvento?.length || 1)) : 1,
    estado: estadoFinal,
    tipo: tipoDocumento,
    numero: numeroDocumento,
    mostrar_notas: mostrarNotas,
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
    // Confirmación
    const confirmar = await Swal.fire({
      title: "¿Actualizar documento?",
      text: "Este documento ya existe. ¿Deseas actualizarlo?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, actualizar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) {
      guardandoRef.current = false; setGuardando(false); // ✅ Liberar bloqueo si cancela
      return;
    }

    // ¿De qué tabla viene? (COT u OP) - Usar numeroDocumentoActual si existe
    const numeroParaVerificar = numeroDocumentoActual || documento?.numero;
    const tablaOriginal = numeroParaVerificar?.startsWith("COT") ? "cotizaciones" : "ordenes_pedido";

    if (tablaOriginal !== tabla) {
      // ↪️ CONVERSIÓN (COT → OP): documento NUEVO con fecha de HOY
      const d2 = new Date();
  const fechaHoy = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
  const fechaHoyNumerica = fechaHoy.replaceAll("-", "");

      // ✅ CORREGIDO: Usar función que busca MAX consecutivo
      numeroDocumento = await generarNumeroDocumento(tabla, prefijo, fechaHoyNumerica);
      dataGuardar.numero = numeroDocumento;

      // 🔄 Nueva fecha de creación (HOY) en el tipo destino
      setFechaCreacion(fechaHoy);
      if (tabla === "cotizaciones") {
        dataGuardar.fecha = fechaHoy;
        delete dataGuardar.fecha_creacion;
      } else {
        dataGuardar.fecha_creacion = fechaHoy;
        delete dataGuardar.fecha;
      }

      // Inserta el nuevo y, si sale bien, elimina el anterior (más seguro)
      const { error: insertError } = await supabase.from(tabla).insert([dataGuardar]);
      error = insertError;
      if (!error) {
        await supabase.from(tablaOriginal).delete().eq("id", idOriginal);
      }
    } else {
      // 🛠️ MISMA TABLA: solo actualizar (NO tocar número ni fecha creación)
      const { error: updateError } = await supabase
        .from(tabla)
        .update(dataGuardar)
        .eq("id", idOriginal);
      error = updateError;
    }
  } else {
    // ➕ CREACIÓN: documento nuevo (usa fechaCreacion del estado, por defecto HOY)
    const fc = fechaCreacion || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
    const fcNumerica = fc.replaceAll("-", "");

    // Generar número si aún no existe
    if (!numeroDocumento) {
      // ✅ CORREGIDO: Usar función que busca MAX consecutivo
      numeroDocumento = await generarNumeroDocumento(tabla, prefijo, fcNumerica);
    }
    dataGuardar.numero = numeroDocumento;

    // Poner la fecha de creación en el campo correcto
    if (tabla === "cotizaciones") {
      dataGuardar.fecha = fc;
      delete dataGuardar.fecha_creacion;
    } else {
      dataGuardar.fecha_creacion = fc;
      delete dataGuardar.fecha;
    }

    const { error: insertError } = await supabase.from(tabla).insert([dataGuardar]);
    error = insertError;
  }

  // ✅ Feedback
  if (!error) {
  // 🆕 REGISTRAR/ACTUALIZAR ABONOS EN CONTABILIDAD
  try {
    let ordenIdFinal = esEdicion && idOriginal ? idOriginal : null;

    // Si es una inserción nueva, necesitamos el ID de la orden recién creada
    if (!esEdicion || !idOriginal) {
      const { data: ordenRecienCreada } = await supabase
        .from(tabla)
        .select("id")
        .eq("numero", numeroDocumento)
        .single();
      
      ordenIdFinal = ordenRecienCreada?.id || null;
      
      // ✅ CRÍTICO: Actualizar estados para que futuros guardados sean ACTUALIZACIONES
      // Esto previene la duplicación si el usuario hace clic en guardar de nuevo
      if (ordenIdFinal) {
        setEsEdicion(true);
        setIdOriginal(ordenIdFinal);
        setNumeroDocumentoActual(numeroDocumento);
        console.log("✅ Documento guardado. Futuros guardados serán actualizaciones:", {
          esEdicion: true,
          idOriginal: ordenIdFinal,
          numero: numeroDocumento
        });
      }
    }

    if (ordenIdFinal && tipoDocumento !== "cotizacion") {
      // ✅ FIX: Siempre leer datos FRESCOS de la BD (no del estado local que puede estar desactualizado)
      const { data: ordenFresca } = await supabase
        .from(tabla)
        .select("abonos_registrados_contabilidad")
        .eq("id", ordenIdFinal)
        .single();

      const abonosYaRegistrados = ordenFresca?.abonos_registrados_contabilidad || [];

      // Sincronizar cambios (eliminar/editar abonos existentes)
      const abonosActualizados = await sincronizarAbonosContabilidad(
        abonos,
        abonosYaRegistrados
      );

      // Registrar solo abonos NUEVOS (que no estén ya registrados)
      const movimientosCreados = await registrarAbonosEnContabilidad(
        ordenIdFinal,
        clienteSeleccionado.id,
        abonos,
        abonosActualizados, // ✅ Usar la lista ya sincronizada, no la vieja
        numeroDocumento,
        clienteSeleccionado.nombre
      );

      // Guardar el registro actualizado completo en la BD
      const registroFinal = [...abonosActualizados, ...movimientosCreados];
      await supabase
        .from(tabla)
        .update({ abonos_registrados_contabilidad: registroFinal })
        .eq("id", ordenIdFinal);
    }

    // 🔧 REGISTRAR COSTOS DE PRODUCCIÓN EN CONTABILIDAD
    if (tipoDocumento !== "cotizacion" && costosProduccion.length > 0 && ordenIdFinal) {
      try {
        // Borrar costos anteriores de esta orden para evitar duplicados
        await supabase
          .from("movimientos_contables")
          .delete()
          .eq("orden_id", ordenIdFinal)
          .eq("categoria", "Costo de producción");

        // Insertar costos actuales
        for (const costo of costosProduccion) {
          const valorCosto = Number(costo.costo || 0);
          if (valorCosto > 0) {
            await supabase.from("movimientos_contables").insert([{
              orden_id: ordenIdFinal,
              cliente_id: clienteSeleccionado?.id || null,
              fecha: costo.fecha || new Date().toISOString().slice(0, 10),
              tipo: "gasto",
              monto: valorCosto,
              descripcion: `[${numeroDocumento}] Costo de producción: ${costo.nombre}`,
              categoria: "Costo de producción",
              estado: "activo",
              usuario: usuario?.nombre || "Administrador",
            }]);
          }
        }

        // Guardar costos en la orden para referencia
        await supabase
          .from(tabla)
          .update({ costos_produccion: costosProduccion })
          .eq("id", ordenIdFinal);
      } catch (errorCostos) {
        console.error("❌ Error registrando costos de producción:", errorCostos);
      }
    }

    // 🆕 REGISTRAR PAGOS A PROVEEDORES EN CONTABILIDAD
    // 🔧 CORREGIDO: Solo para ordenes_pedido (cotizaciones no tienen este campo)
if (tipoDocumento !== "cotizacion" && pagosProveedores && pagosProveedores.length > 0) {
  try {
    // Si es edición, primero sincronizar cambios
    if (esEdicion && documento?.pagos_proveedores) {
      await sincronizarPagosProveedoresContabilidad(
        pagosProveedores,
        documento.pagos_proveedores
      );
    }

    // Registrar pagos nuevos
    await registrarPagosProveedoresEnContabilidad(
      ordenIdFinal,
      pagosProveedores,
      numeroDocumento
    );

    // Actualizar la orden con los pagos actualizados (con movimiento_id)
    await supabase
      .from(tabla)
      .update({ pagos_proveedores: pagosProveedores })
      .eq("id", ordenIdFinal);

  } catch (errorPagos) {
    console.error("❌ Error registrando pagos a proveedores:", errorPagos);
  }
}

    Swal.fire("✅ Guardado", `La ${tipoDocumento} y los abonos fueron registrados en contabilidad.`, "success");
  } catch (error) {
    console.error("❌ Error registrando abonos:", error);
    Swal.fire("⚠️ Advertencia", "El documento se guardó pero hubo un error con los abonos. Revisa la consola.", "warning");
  }
} else {
  console.error(error);
  Swal.fire("Error", "No se pudo guardar el documento", "error");
}
    } finally {
      // 🔓 Siempre liberar el bloqueo al terminar
      guardandoRef.current = false; setGuardando(false);
    }
  }; // 👈 CERRAR guardarDocumento AQUÍ


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
      aplicar_descuento: aplicarDescuento,
      aplicar_retencion: aplicarRetencion,
      abonos,
      garantia,
      garantia_recibida: garantiaRecibida,
      fecha_garantia: fechaGarantia,
      fecha_creacion: fechaCreacion,
      multi_dias: multiDias,
      fechas_evento: multiDias ? fechasEvento : [],
      numero_dias: numeroDias,
      fecha_evento: multiDias ? (fechasEvento[0] || null) : (fechaEvento || null),
      fecha_entrega: fechaEntrega || null,
      fecha_devolucion: fechaDevolucion || null,
mostrar_notas: mostrarNotas
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
        <div className="sw-pagina">
          <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>
            {/* ========== HEADER ========== */}
            <div className="sw-header">
              <h1 className="sw-header-titulo">
                📄 {tipoDocumento === "cotizacion" ? "Cotización" : "Orden de Pedido"}
              </h1>
            </div>
            {esEdicion && (
              <p style={{ color: "#6b7280", fontSize: 14, marginTop: -16, marginBottom: 24 }}>
                Editando: {numeroDocumentoActual}
              </p>
            )}

          {/* ========== TIPO DOCUMENTO ========== */}
          <div className="cd-tipo-selector">
            <div
              className={`cd-tipo-opcion ${tipoDocumento === "cotizacion" ? "activo" : ""}`}
              onClick={() => setTipoDocumento("cotizacion")}
            >
              <span className="cd-tipo-icono">📋</span>
              Cotización
            </div>
            <div
              className={`cd-tipo-opcion ${tipoDocumento === "orden" ? "activo" : ""}`}
              onClick={() => setTipoDocumento("orden")}
            >
              <span className="cd-tipo-icono">📦</span>
              Orden de Pedido
            </div>
          </div>

          {/* ========== FECHAS ========== */}
          <div className="cd-card">
            <div className="cd-card-header">📅 Fechas</div>
            <div className="cd-card-body">
              <label className="cd-multidia-check">
                <input
                  type="checkbox"
                  checked={multiDias}
                  onChange={(e) => onToggleMultiDias(e.target.checked)}
                />
                Alquiler por varios días
              </label>

              <div className="cd-fechas-grid">
                <div className="cd-campo">
                  <label>Fecha de creación</label>
                  <input
                    type="date"
                    value={fechaCreacion}
                    onChange={(e) => setFechaCreacion(e.target.value)}
                    title="Puedes cambiar la fecha de creación del documento si lo necesitas"
                  />
                </div>

                {!multiDias ? (
                  <div className="cd-campo">
                    <label>Fecha del evento</label>
                    <input
                      ref={inputFechaUnDiaRef}
                      type="date"
                      value={fechaEvento}
                      onChange={(e) => setFechaEvento(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="cd-campo">
                    <label>Seleccionar día y añadir</label>
                    <input
                      type="date"
                      onChange={(e) => agregarDia(e.target.value)}
                    />

                    {fechasEvento.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <small style={{ color: "#6b7280" }}>Días seleccionados ({numeroDias}):</small>
                        <div className="cd-dias-lista">
                          {fechasEvento.map((d) => (
                            <span key={d} className="cd-dia-tag">
                              {d}
                              <button onClick={() => eliminarDia(d)} title="Quitar">✕</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 🆕 Fechas de entrega y devolución (solo para órdenes de pedido) */}
              {tipoDocumento !== "cotizacion" && (
                <div className="cd-fechas-grid" style={{ marginTop: 12 }}>
                  <div className="cd-campo">
                    <label>📦 Fecha de entrega</label>
                    <input
                      type="date"
                      value={fechaEntrega}
                      onChange={(e) => setFechaEntrega(e.target.value)}
                      title="Día en que se entrega la mercancía al cliente (opcional)"
                    />
                  </div>
                  <div className="cd-campo">
                    <label>📥 Fecha de devolución</label>
                    <input
                      type="date"
                      value={fechaDevolucion}
                      onChange={(e) => setFechaDevolucion(e.target.value)}
                      title="Día en que el cliente debe devolver la mercancía (opcional)"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== CLIENTE ========== */}
          <div className="cd-card">
            <div className="cd-card-header">👤 Cliente</div>
            <div className="cd-card-body">
              <div className="cd-buscar-cliente">
                <input
                  type="text"
                  placeholder="Buscar por nombre, identificación o teléfono..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                />
                <button className="cd-btn cd-btn-cyan" onClick={() => setModalCrearCliente(true)}>
                  ➕ Nuevo
                </button>
              </div>

              {busquedaCliente && clientesFiltrados.length > 0 && (
                <ul className="cd-sugerencias">
                  {clientesFiltrados.map((cliente) => (
                    <li key={cliente.id} onClick={() => seleccionarCliente(cliente)}>
                      <strong>{cliente.nombre}</strong> — {cliente.identificacion} — 📞 {cliente.telefono}
                    </li>
                  ))}
                </ul>
              )}

              {clienteSeleccionado && (
                <div className="cd-cliente-card">
                  <div className="cd-cliente-card-titulo">✅ Cliente seleccionado</div>
                  <div className="cd-cliente-dato"><span className="icono">🧑</span> {clienteSeleccionado.nombre || "N/A"}</div>
                  <div className="cd-cliente-dato"><span className="icono">🆔</span> {clienteSeleccionado.identificacion || "N/A"}</div>
                  <div className="cd-cliente-dato"><span className="icono">📞</span> {clienteSeleccionado.telefono || "N/A"}</div>
                  <div className="cd-cliente-dato"><span className="icono">📍</span> {clienteSeleccionado.direccion || "N/A"}</div>
                  <div className="cd-cliente-dato" style={{ gridColumn: "1 / -1" }}><span className="icono">✉️</span> {clienteSeleccionado.email || "N/A"}</div>
                </div>
              )}
            </div>
          </div>
          {/* ========== PRODUCTOS ========== */}
          <div className="cd-card">
            <div className="cd-card-header cd-card-header-cyan" style={{ justifyContent: "space-between" }}>
              <span>📦 Productos o Grupos Agregados</span>
              <label className="cd-nota-check" style={{ color: "white" }}>
                <input
                  type="checkbox"
                  checked={mostrarNotas}
                  onChange={(e) => setMostrarNotas(e.target.checked)}
                  style={{ accentColor: "#fff" }}
                />
                Notas
              </label>
            </div>
            <div className="cd-card-body" style={{ padding: 0 }}>
              <div className="cd-tabla-wrap">
  <table className="cd-tabla">
  <thead>
    <tr>
      <th>Cant</th>
      <th>Stock</th>
      <th>Descripción</th>
      {mostrarNotas && <th>Notas</th>}
      <th>V. Unit</th>
      {multiDias && <th>× días</th>}
      {multiDias && <th>V. x Días</th>}
      <th>Subtotal</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    {productosAgregados.map((item, index) => {
      const idProducto = item.producto_id || item.id;
      const stockDisp = stock?.[idProducto] ?? "—";
      const sobrepasado =
        stockDisp !== "—" && Number(item.cantidad || 0) > Number(stockDisp || 0);

      const usaDias = item.multiplicarPorDias !== false;
      const valorPorDias = usaDias
        ? Number(item.precio || 0) * (numeroDias || 1)
        : null;

      const isTemporal = !!item.temporal || !!item.es_proveedor;
      const esServicio = !!item.es_servicio;

      return (
        <tr key={index} className={isTemporal ? "fila-temporal" : ""} style={esServicio ? { background: "linear-gradient(135deg, #f0fdf4f0, #dcfce7a0)" } : undefined}>
          <td>
            <input
              type="number"
              value={item.cantidad}
              min="1"
              onChange={(e) => actualizarCantidad(index, e.target.value)}
              style={{ width: "60px" }}
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <span className={sobrepasado ? "stock-alerta" : "stock-ok"}>{stockDisp}</span>
          </td>
          <td>
                    {editandoNombreIndex === index ? (
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => {
                          const nuevos = [...productosAgregados];
                          nuevos[index] = { ...nuevos[index], nombre: e.target.value };
                          setProductosAgregados(nuevos);
                        }}
                        onBlur={() => setEditandoNombreIndex(null)}
                        onKeyDown={(e) => { if (e.key === "Enter") setEditandoNombreIndex(null); }}
                        autoFocus
                        style={{ width: "100%", padding: "4px 6px", fontSize: "13px" }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditandoNombreIndex(index)}
                        style={{ cursor: "pointer" }}
                        title="Click para editar nombre"
                      >
                        {item.nombre} <span style={{ fontSize: 10, color: "#9ca3af" }}>✏️</span>
                        {esServicio && <span style={{ fontSize: 9, marginLeft: 6, padding: "1px 6px", borderRadius: 10, background: "#dcfce7", color: "#16a34a", fontWeight: 600 }}>🔧 Servicio</span>}
                        {item.es_proveedor && <span style={{ fontSize: 9, marginLeft: 6, padding: "1px 6px", borderRadius: 10, background: "#f3e8ff", color: "#7c3aed", fontWeight: 600 }}>🏢 Proveedor</span>}
                      </span>
                    )}
                  </td>

          {mostrarNotas && (
            <td>
              <input
                type="text"
                value={item.notas || ""}
                onChange={(e) => {
                  const nuevos = [...productosAgregados];
                  nuevos[index].notas = e.target.value;
                  setProductosAgregados(nuevos);
                }}
                placeholder="Nota..."
                style={{ width: "100%", padding: "4px" }}
              />
            </td>
          )}

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

          <td className="td-subtotal">
            ${(item.subtotal ?? 0).toLocaleString("es-CO", {
              maximumFractionDigits: 0
            })}
          </td>
          <td className="td-acciones" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
            <button onClick={() => moverItem(index, -1)} disabled={index === 0} title="Subir">⬆️</button>
            <button onClick={() => moverItem(index, 1)} disabled={index === productosAgregados.length - 1} title="Bajar">⬇️</button>
            <button 
              onClick={() => item.es_grupo && editarGrupo(index)} 
              title="Editar grupo"
              style={{ 
                visibility: item.es_grupo ? "visible" : "hidden",
                cursor: item.es_grupo ? "pointer" : "default"
              }}
            >
              ✏️
            </button>
            <button onClick={() => eliminarProducto(index)} title="Eliminar">🗑️</button>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
              </div>
            </div>
          </div>

          {/* ========== BOTONES AGREGAR ========== */}
          <div className="cd-botones-agregar">
            <button className="cd-btn cd-btn-azul" onClick={() => setModalBuscarProducto(true)}>
              🔍 Agregar desde Inventario
            </button>

            <button className="cd-btn cd-btn-naranja" onClick={() => { setIndiceGrupoEnEdicion(null); setGrupoEnEdicion(null); setModalGrupo(true); }}>
              📦 Crear Grupo de Artículos
            </button>

            <button className="cd-btn cd-btn-rojo" onClick={() => setModalProveedor(true)}>
              🏪 Agregar desde Proveedor
            </button>

            <button className="cd-btn cd-btn-morado" onClick={() => setModalPagosProveedor(true)}>
              💰 Pagos a Proveedores
            </button>
          </div>

          {/* ========== COSTOS DE PRODUCCIÓN ========== */}
          {costosProduccion.length > 0 && tipoDocumento !== "cotizacion" && (
            <div className="cd-card" style={{ marginTop: "16px" }}>
              <div className="cd-card-header" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", borderBottom: "none" }}>
                🔧 Costos de Producción
              </div>
              <div className="cd-card-body">
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                  Costos internos de servicios y artículos con costo de producción. Se registran automáticamente en contabilidad al guardar.
                </div>
                {costosProduccion.map((costo, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    padding: "10px 12px", marginBottom: 8, borderRadius: 8,
                    background: costo.es_servicio ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "#f8fafc",
                    border: "1px solid #e5e7eb",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: "1 1 180px", minWidth: 140, color: "#111827" }}>
                      {costo.es_servicio ? "🔧" : "📦"} {costo.nombre}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Costo:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="$0"
                        value={costo.costo}
                        onChange={(e) => {
                          const nuevos = [...costosProduccion];
                          nuevos[idx] = { ...nuevos[idx], costo: e.target.value };
                          setCostosProduccion(nuevos);
                        }}
                        style={{ width: 110, padding: "6px 8px", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 13 }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Fecha:</span>
                      <input
                        type="date"
                        value={costo.fecha}
                        onChange={(e) => {
                          const nuevos = [...costosProduccion];
                          nuevos[idx] = { ...nuevos[idx], fecha: e.target.value };
                          setCostosProduccion(nuevos);
                        }}
                        style={{ padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 6, fontSize: 12, color: "#991b1b", display: "flex", justifyContent: "space-between" }}>
                  <span>Total costos de producción:</span>
                  <strong>${costosProduccion.reduce((s, c) => s + Number(c.costo || 0), 0).toLocaleString("es-CO")}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ========== GARANTÍA Y ABONOS ========== */}
          <div className="cd-card" style={{ marginTop: "16px" }}>
            <div className="cd-card-header cd-card-header-amber">🛡️ Garantía y Abonos</div>
            <div className="cd-card-body">
              <div className="cd-garantia-abonos">
                {/* Garantía */}
                <div>
                  <div className="cd-campo">
                    <label>Monto de garantía</label>
                    <input
                      type="number"
                      min="0"
                      value={garantia}
                      onChange={(e) => setGarantia(e.target.value)}
                      placeholder="$0"
                    />
                  </div>

                  <div className="cd-garantia-recibida">
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
                    />
                    ¿Ya entregada?
                  </div>

                  {garantiaRecibida && fechaGarantia && (
                    <div className="cd-garantia-fecha">
                      ✅ Recibida el: {fechaGarantia}
                    </div>
                  )}
                </div>

                {/* Abonos */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "8px", display: "block" }}>Abonos ($)</label>
                  {abonos.map((abono, index) => (
                    <div key={index} className="cd-abono-fila">
                      <span className="cd-abono-label">Abono {index + 1}:</span>
                      <input
                        type="number"
                        min="0"
                        value={abono.valor}
                        onChange={(e) => {
                          const nuevos = [...abonos];
                          nuevos[index].valor = e.target.value;
                          setAbonos(nuevos);
                        }}
                        style={{ width: 120 }}
                        placeholder="$0"
                      />
                      <input
                        type="date"
                        value={toISO(abono.fecha)}
                        onChange={(e) => {
                          const nuevos = [...abonos];
                          nuevos[index].fecha = e.target.value || "";
                          setAbonos(nuevos);
                        }}
                        style={{ width: 150 }}
                        title="Fecha del abono (opcional)"
                      />
                      <span className="cd-abono-fecha-display">
                        {toDMY(abono.fecha) !== "-" ? `(${toDMY(abono.fecha)})` : ""}
                      </span>
                      <button onClick={() => eliminarAbono(index)} title="Eliminar abono">🗑️</button>
                    </div>
                  ))}
                  <button className="cd-btn-agregar-abono" onClick={agregarAbono}>➕ Agregar abono</button>
                </div>
              </div>
            </div>
          </div>

          {/* ========== AJUSTES ========== */}
          <div className="cd-card">
            <div className="cd-card-header">⚙️ Ajustes</div>
            <div className="cd-card-body">
              <div className="cd-ajustes-grid">
                <label className="cd-ajuste-check">
                  <input
                    type="checkbox"
                    checked={aplicarDescuento}
                    onChange={(e) => setAplicarDescuento(e.target.checked)}
                  />
                  Aplicar descuento
                </label>
                {aplicarDescuento && (
                  <input
                    className="cd-ajuste-input"
                    type="number"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                    placeholder="Valor del descuento"
                  />
                )}

                <label className="cd-ajuste-check">
                  <input
                    type="checkbox"
                    checked={aplicarRetencion}
                    onChange={(e) => setAplicarRetencion(e.target.checked)}
                  />
                  Aplicar retención
                </label>
                {aplicarRetencion && (
                  <input
                    className="cd-ajuste-input"
                    type="number"
                    min="0"
                    value={retencion}
                    onChange={(e) => setRetencion(e.target.value)}
                    placeholder="Valor de la retención"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ========== TOTALES ========== */}
          <div className="cd-card">
            <div className="cd-card-body">
              <div className="cd-totales">
                {(aplicarDescuento || aplicarRetencion) ? (
                  <>
                    <div className="cd-total-fila">
                      <span>Total (bruto):</span>
                      <span className="cd-total-valor">${totalBruto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                    {aplicarDescuento && (
                      <div className="cd-total-fila" style={{ color: "#ef4444" }}>
                        <span>Descuento:</span>
                        <span className="cd-total-valor">-${Number(descuento || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    {aplicarRetencion && (
                      <div className="cd-total-fila" style={{ color: "#ef4444" }}>
                        <span>Retención:</span>
                        <span className="cd-total-valor">-${Number(retencion || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    <div className="cd-total-fila principal">
                      <span>Total (neto):</span>
                      <span className="cd-total-valor">${totalNeto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="cd-total-fila principal">
                    <span>Total:</span>
                    <span className="cd-total-valor">${totalBruto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
                <div className="cd-total-fila saldo">
                  <span>Saldo final:</span>
                  <span className="cd-total-valor">${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== BOTONES FINALES ========== */}
          <div className="cd-botones-finales">
            <button 
              onClick={guardarDocumento} 
              disabled={guardando}
              className={`cd-btn ${guardando ? "cd-btn-disabled" : "cd-btn-azul"}`}
            >
              {guardando ? "⏳ Guardando..." : "💾 Guardar Documento"}
            </button>

            <button 
              onClick={() => generarPDF(obtenerDatosPDF(), tipoDocumento)} 
              className="cd-btn cd-btn-gris"
            >
              📄 Descargar PDF
            </button>

            {tipoDocumento === "orden" && productosAgregados.length > 0 && (
              <button
                onClick={() => generarRemisionPDF(obtenerDatosPDF())}
                className="cd-btn cd-btn-verde"
              >
                📦 Generar Remisión
              </button>
            )}

            <button
              className="cd-btn cd-btn-rojo"
              onClick={() => {
                setClienteSeleccionado(null);
                setProductosAgregados([]);
                setGarantia("");
                setAbonos([]);
                setPagosProveedores([]);
                setBusquedaCliente("");
                setFechaEvento("");
                setFechasEvento([]);
                setMultiDias(false);
                setFechaEntrega(""); setFechaDevolucion("");
                setAplicarDescuento(false); setDescuento("");
                setAplicarRetencion(false); setRetencion("");
                setGarantiaRecibida(false); setFechaGarantia("");
              }}
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
      persistOpen                  // NO se cierra al guardar; solo con “Cerrar”
      grupoEnEdicion={grupoEnEdicion}
      stockDisponible={stock}
      onAgregarGrupo={(grupo) => {
        const linea = {
          ...grupo,
          // El flag se respeta: si multi-día está activo al agregar, el grupo queda marcado
          multiplicarPorDias: multiDias ? true : undefined,
        };

        if (indiceGrupoEnEdicion !== null) {
          const nuevos = [...productosAgregados];
          // si el grupo ya tenía una configuración previa de multiplicarPorDias, respétala
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
        // Nota: no cerramos el modal aquí porque persistOpen está activo;
        // se cerrará únicamente con el botón "Cerrar".
      }}
      onClose={() => {
        // 👈 ESTA ES LA CLAVE: cerrar el modal y limpiar edición
        setModalGrupo(false);
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

  {/* Modal de Pagos a Proveedores */}
        {modalPagosProveedor && (
          <PagosProveedorModal
            productosAgregados={productosAgregados}
            pagosProveedores={pagosProveedores}
            numeroDias={numeroDias}
            onGuardar={handleGuardarPagosProveedores}
            onClose={() => setModalPagosProveedor(false)}
          />
        )}
          </div>
        </div> {/* <--- ESTE ES EL DIV EXTRA QUE CERRAMOS */}
      </Protegido>
    );
  };

  export default CrearDocumento;