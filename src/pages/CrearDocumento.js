// CrearDocumento.js
  import React, { useEffect, useMemo, useRef, useState } from "react";
  import { useLocation } from "react-router-dom";
  import supabase from "../supabaseClient";

  import BuscarProductoModal from "../components/BuscarProductoModal";
  import AgregarGrupoModal from "../components/AgregarGrupoModal";
  import CrearClienteModal from "../components/CrearClienteModal";
  import BuscarProveedorYProductoModal from "../components/BuscarProveedorYProductoModal";
  import PagosProveedorModal from "../components/PagosProveedorModal";

  import { generarPDF } from "../utils/generarPDF";
  import { generarRemisionPDF } from "../utils/generarRemision";

  import Swal from "sweetalert2";
  import Protegido from "../components/Protegido";

  const CrearDocumento = () => {
    const location = useLocation();
    const { documento, tipo } = location.state || {};
    
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
    const [mostrarNotas, setMostrarNotas] = useState(false);

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

    // 🔒 Protección contra doble clic
    const [guardando, setGuardando] = useState(false);

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

    // Input refs (pequeñas mejoras UX)
    const inputFechaUnDiaRef = useRef(null);
    // Normalizador de fechas a 'YYYY-MM-DD'
  const norm = (d) => (d ? String(d).slice(0, 10) : "");

  // Label + checkbox en una sola línea
  const labelInline = { display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" };

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

    // 2) Órdenes abiertas
    let ordenesData = [];
    const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const fechaHoy = hoy.toISOString().split('T')[0];

let res = await supabase
  .from("ordenes_pedido")
  .select("productos, fecha_evento, fechas_evento, cerrada")
  .eq("cerrada", false)
  .gte("fecha_evento", fechaHoy);

    if (res.error && String(res.error.message || "").includes("fechas_evento")) {
  res = await supabase
    .from("ordenes_pedido")
    .select("productos, fecha_evento, cerrada")
    .eq("cerrada", false)
    .gte("fecha_evento", fechaHoy);  // ⬅️ AGREGAR ESTA LÍNEA
}
    if (res.data) ordenesData = res.data;

    const reservasPorFecha = {};
    fechasConsulta.forEach((f) => (reservasPorFecha[f] = {}));

    // ✅ CORRECCIÓN: Evitar contar múltiples veces el mismo pedido
    ordenesData.forEach((orden) => {
      const diasOrd = new Set([
        ...(orden.fecha_evento ? [String(orden.fecha_evento).slice(0, 10)] : []),
        ...((orden.fechas_evento || []).map((d) => String(d).slice(0, 10))),
      ]);

      const acumular = (id, cant) => {
        // ✅ Acumular en TODAS las fechas consultadas que traslapen
        fechasConsulta.forEach((f) => {
          if (diasOrd.has(f)) {
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
      // 🔒 Protección contra doble clic
      if (guardando) {
        console.log("⚠️ Ya se está guardando, ignorando clic adicional");
        return;
      }
      setGuardando(true);

      try {
      // ✅ VALIDACIÓN 1: Cliente y productos
      if (!clienteSeleccionado) {
        setGuardando(false);
        return Swal.fire("Falta cliente", "Debes seleccionar un cliente antes de guardar.", "warning");
      }
      
      if (productosAgregados.length === 0) {
        setGuardando(false);
        return Swal.fire("Sin productos", "Debes agregar al menos un producto.", "warning");
      }

      // ✅ VALIDACIÓN 2: Fecha de evento
      const tieneFechaEvento = multiDias 
        ? (fechasEvento && fechasEvento.length > 0)
        : (fechaEvento && fechaEvento.trim() !== "");
      
      if (!tieneFechaEvento) {
        setGuardando(false);
        return Swal.fire("Falta fecha", "Debes seleccionar la fecha del evento antes de guardar.", "warning");
      }

      // ✅ VALIDACIÓN 3: Cantidades mayores a 0
      const productosConCantidadCero = productosAgregados.filter(p => {
        const cantidad = Number(p.cantidad || 0);
        return cantidad <= 0;
      });
      
      if (productosConCantidadCero.length > 0) {
        const nombres = productosConCantidadCero.map(p => p.nombre).join(", ");
        setGuardando(false);
        return Swal.fire("Cantidad inválida", `Los siguientes productos tienen cantidad 0 o vacía: ${nombres}`, "warning");
      }

      const tabla = tipoDocumento === "cotizacion" ? "cotizaciones" : "ordenes_pedido";
      const prefijo = tipoDocumento === "cotizacion" ? "COT" : "OP";
      const d1 = new Date();
  const fecha = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
      const fechaNumerica = fecha.replaceAll("-", "");

      // ✅ MEJORADO: Usar número existente si ya se guardó antes, o generar uno nuevo
      let numeroDocumento = numeroDocumentoActual || documento?.numero;
      if (!esEdicion && !numeroDocumentoActual) {
        // Solo generar nuevo número si es la PRIMERA vez que se guarda
        numeroDocumento = await generarNumeroDocumento(tabla, prefijo, fechaNumerica);
      }

      const redondear = (num) => Math.round(num * 100) / 100;
      const totalAbonos = abonos.reduce((acc, ab) => acc + Number(ab.valor || 0), 0);
      if (redondear(totalAbonos) > redondear(totalNeto)) {
        setGuardando(false);
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
    pagos_proveedores: pagosProveedores,
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
      setGuardando(false); // ✅ Liberar bloqueo si cancela
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

    if (ordenIdFinal) {
      // Si es edición, primero sincronizar cambios
      if (esEdicion) {
        const abonosYaRegistrados = documento?.abonos_registrados_contabilidad || [];
        const abonosActualizados = await sincronizarAbonosContabilidad(
          abonos,
          abonosYaRegistrados
        );
        
        // Actualizar el registro
        await supabase
          .from(tabla)
          .update({ abonos_registrados_contabilidad: abonosActualizados })
          .eq("id", ordenIdFinal);
      }

      // Registrar abonos NUEVOS
      const abonosYaRegistrados = esEdicion 
        ? (documento?.abonos_registrados_contabilidad || [])
        : [];
        
      const movimientosCreados = await registrarAbonosEnContabilidad(
        ordenIdFinal,
        clienteSeleccionado.id,
        abonos,
        abonosYaRegistrados,
        numeroDocumento,
        clienteSeleccionado.nombre
      );

      // Actualizar la columna abonos_registrados_contabilidad
      if (movimientosCreados.length > 0) {
        const nuevosRegistrados = [...abonosYaRegistrados, ...movimientosCreados];
        await supabase
          .from(tabla)
          .update({ abonos_registrados_contabilidad: nuevosRegistrados })
          .eq("id", ordenIdFinal);
      }
    }

    // 🆕 REGISTRAR PAGOS A PROVEEDORES EN CONTABILIDAD
if (pagosProveedores && pagosProveedores.length > 0) {
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
      setGuardando(false);
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
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
  <h3 style={{ margin: 0 }}>Productos o Grupos Agregados</h3>
  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "13px", whiteSpace: "nowrap" }}>
    <input
      type="checkbox"
      checked={mostrarNotas}
      onChange={(e) => setMostrarNotas(e.target.checked)}
    />
    Añadir nota
  </label>
</div>
          {/* Tabla productos */}
  <table style={{ width: "100%", marginBottom: "20px", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th style={{ borderBottom: "1px solid #ccc" }}>Cant</th>
      <th style={{ borderBottom: "1px solid #ccc" }}>Stock</th>
      <th style={{ borderBottom: "1px solid #ccc" }}>Descripción</th>
      {mostrarNotas && <th style={{ borderBottom: "1px solid #ccc" }}>Notas</th>}
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

      const usaDias = item.multiplicarPorDias !== false;
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

          {/* ✅ NUEVA COLUMNA DE NOTAS */}
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
                placeholder="Nota opcional..."
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

          {/* 💰 Botón Pagos a Proveedores (solo si hay productos de proveedor) */}
{tieneProductosProveedor && (
  <button
    onClick={() => setModalPagosProveedor(true)}
    style={{
      padding: "8px 12px",
      backgroundColor: "#7c3aed",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    }}
  >
    💰 Pagos a Proveedores
  </button>
)}

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
    <div
      key={index}
      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
    >
      <label style={{ minWidth: 80 }}>Abono {index + 1}:</label>

      {/* Valor del abono */}
      <input
    type="number"
    min="0"
    value={abono.valor}
    onChange={(e) => {
      const nuevos = [...abonos];
      nuevos[index].valor = e.target.value; // guardamos el texto, permite ""
      setAbonos(nuevos);
    }}
    style={{ width: 120 }}
  />

      {/* Fecha editable (opcional con input date → ISO) */}
      <input
        type="date"
        value={toISO(abono.fecha)}               // el input necesita ISO
        onChange={(e) => {
          const nuevos = [...abonos];
          // guardamos en ISO; si borran la fecha, queda ""
          nuevos[index].fecha = e.target.value || "";
          setAbonos(nuevos);
        }}
        style={{ width: 150 }}
        title="Fecha del abono (opcional). Si no la cambias, queda la de hoy."
      />

      {/* Vista amigable dd/mm/aaaa */}
      <small style={{ opacity: 0.8 }}>
        {toDMY(abono.fecha) !== "-" ? `(${toDMY(abono.fecha)})` : ""}
      </small>

      {/* Eliminar abono */}
      <button onClick={() => eliminarAbono(index)} title="Eliminar abono">🗑️</button>
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
    {(aplicarDescuento || aplicarRetencion) ? (
      <>
        <p><strong>Total (bruto):</strong> ${totalBruto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
        {aplicarDescuento && (
          <p>Descuento: ${Number(descuento || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
        )}
        {aplicarRetencion && (
          <p>Retención: ${Number(retencion || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
        )}
        <p><strong>Total (neto):</strong> ${totalNeto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
      </>
    ) : (
      <p><strong>Total:</strong> ${totalBruto.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
    )}
    <p><strong>Saldo final:</strong> ${saldo.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
  </div>

          {/* Botones finales */}
          <div style={{ marginTop: "30px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
            <button 
              onClick={guardarDocumento} 
              disabled={guardando}
              style={{ 
                padding: "10px 20px",
                opacity: guardando ? 0.6 : 1,
                cursor: guardando ? "not-allowed" : "pointer"
              }}
            >
              {guardando ? "⏳ Guardando..." : "💾 Guardar Documento"}
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
                setPagosProveedores([]);
                setBusquedaCliente("");
                setFechaEvento("");
                setFechasEvento([]);
                setMultiDias(false);
                setAplicarDescuento(false); setDescuento("");
  setAplicarRetencion(false); setRetencion("");
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
      </Protegido>
    );
  };

  export default CrearDocumento;