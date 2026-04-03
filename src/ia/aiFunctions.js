// src/utils/aiFunctions.js
// Funciones que el agente IA puede ejecutar contra Supabase
import supabase from "../supabaseClient";

// ─── Helpers ───
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ═══════════════════════════════════════════════════════════
// 1. VERIFICAR DISPONIBILIDAD (stock real por fecha)
// ═══════════════════════════════════════════════════════════
export async function verificar_disponibilidad({ articulo, fecha }) {
  const fechaBuscar = fecha || hoyISO();

  // Buscar el producto
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock, precio, tipo")
    .ilike("nombre", `%${articulo}%`)
    .limit(5);

  if (!productos || productos.length === 0) {
    return `No encontré artículos que coincidan con "${articulo}".`;
  }

  // Para cada producto, calcular cuántos están comprometidos en esa fecha
  const resultados = [];
  for (const prod of productos) {
    const { data: ordenes } = await supabase
      .from("ordenes_pedido")
      .select("productos, fecha_entrega, fecha_devolucion")
      .or(`fecha_evento.eq.${fechaBuscar},and(fecha_entrega.lte.${fechaBuscar},fecha_devolucion.gte.${fechaBuscar})`);

    let comprometidos = 0;
    for (const orden of ordenes || []) {
      const items = orden.productos || [];
      const walk = (list, factor = 1) => {
        for (const it of list) {
          if (it.es_grupo && Array.isArray(it.productos)) {
            walk(it.productos, factor * (Number(it.cantidad) || 1));
          } else if ((it.id === prod.id || it.producto_id === prod.id) && !it.es_servicio) {
            comprometidos += (Number(it.cantidad) || 0) * factor;
          }
        }
      };
      walk(items);
    }

    const stockTotal = Number(prod.stock || 0);
    const disponible = Math.max(0, stockTotal - comprometidos);
    resultados.push({
      nombre: prod.nombre,
      tipo: prod.tipo || "articulo",
      stock_total: stockTotal,
      comprometidos,
      disponible,
      precio_alquiler: Number(prod.precio || 0),
    });
  }

  return JSON.stringify(resultados);
}

// ═══════════════════════════════════════════════════════════
// 2. BUSCAR CLIENTE
// ═══════════════════════════════════════════════════════════
export async function buscar_cliente({ texto }) {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre, telefono, email, identificacion, direccion")
    .or(`nombre.ilike.%${texto}%,telefono.ilike.%${texto}%,email.ilike.%${texto}%,identificacion.ilike.%${texto}%`)
    .limit(5);

  if (error || !data || data.length === 0) {
    return `No se encontraron clientes que coincidan con "${texto}".`;
  }

  return JSON.stringify(data.map((c) => ({
    nombre: c.nombre,
    telefono: c.telefono || "—",
    email: c.email || "—",
    identificacion: c.identificacion || "—",
    direccion: c.direccion || "—",
  })));
}

// ═══════════════════════════════════════════════════════════
// 3. BUSCAR PRODUCTO
// ═══════════════════════════════════════════════════════════
export async function buscar_producto({ nombre }) {
  const { data, error } = await supabase
    .from("productos")
    .select("nombre, precio, stock, tipo, costo, categoria, valor_adquisicion")
    .ilike("nombre", `%${nombre}%`)
    .order("nombre")
    .limit(10);

  if (error || !data || data.length === 0) {
    return `No se encontraron productos que coincidan con "${nombre}".`;
  }

  return JSON.stringify(data.map((p) => ({
    nombre: p.nombre,
    tipo: p.tipo || "articulo",
    precio_alquiler: money(p.precio),
    stock: p.tipo === "servicio" ? "Ilimitado" : Number(p.stock || 0),
    costo_interno: Number(p.costo || 0) > 0 ? money(p.costo) : "—",
    valor_adquisicion: Number(p.valor_adquisicion || 0) > 0 ? money(p.valor_adquisicion) : "—",
    categoria: p.categoria || "—",
  })));
}

// ═══════════════════════════════════════════════════════════
// 4. CONSULTAR PEDIDOS
// ═══════════════════════════════════════════════════════════
export async function consultar_pedidos({ fecha, fecha_desde, fecha_hasta, cliente }) {
  let query = supabase
    .from("ordenes_pedido")
    .select("numero, fecha_evento, total_neto, estado, clientes(nombre)")
    .order("fecha_evento", { ascending: false })
    .limit(15);

  if (fecha) {
    query = query.eq("fecha_evento", fecha);
  } else if (fecha_desde && fecha_hasta) {
    query = query.gte("fecha_evento", fecha_desde).lte("fecha_evento", fecha_hasta);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return "No se encontraron pedidos para los criterios indicados.";
  }

  let resultado = data;
  if (cliente) {
    resultado = resultado.filter((p) =>
      (p.clientes?.nombre || "").toLowerCase().includes(cliente.toLowerCase())
    );
  }

  if (resultado.length === 0) {
    return `No se encontraron pedidos del cliente "${cliente}".`;
  }

  return JSON.stringify(resultado.map((p) => ({
    numero: p.numero || "—",
    cliente: p.clientes?.nombre || "—",
    fecha_evento: p.fecha_evento,
    total: money(p.total_neto),
    estado: p.estado || "pendiente",
  })));
}

// ═══════════════════════════════════════════════════════════
// 5. CONSULTAR AGENDA
// ═══════════════════════════════════════════════════════════
export async function consultar_agenda({ periodo }) {
  const hoy = new Date();
  let desde = hoyISO();
  let hasta = hoyISO();

  if (periodo === "manana") {
    const man = new Date(hoy); man.setDate(man.getDate() + 1);
    desde = hasta = man.toISOString().slice(0, 10);
  } else if (periodo === "semana" || periodo === "proximos_7_dias") {
    const fin = new Date(hoy); fin.setDate(fin.getDate() + 7);
    hasta = fin.toISOString().slice(0, 10);
  } else if (periodo === "proximos_30_dias") {
    const fin = new Date(hoy); fin.setDate(fin.getDate() + 30);
    hasta = fin.toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from("ordenes_pedido")
    .select("numero, fecha_evento, fecha_entrega, total_neto, clientes(nombre)")
    .gte("fecha_evento", desde)
    .lte("fecha_evento", hasta)
    .order("fecha_evento", { ascending: true })
    .limit(20);

  if (error || !data || data.length === 0) {
    return `No hay eventos programados para ${periodo === "hoy" ? "hoy" : periodo === "manana" ? "mañana" : `los próximos ${periodo === "semana" ? "7" : "30"} días`}.`;
  }

  return JSON.stringify(data.map((p) => ({
    numero: p.numero || "—",
    cliente: p.clientes?.nombre || "—",
    fecha_evento: p.fecha_evento,
    fecha_entrega: p.fecha_entrega || "—",
    total: money(p.total_neto),
  })));
}

// ═══════════════════════════════════════════════════════════
// 6. RESUMEN FINANCIERO
// ═══════════════════════════════════════════════════════════
export async function resumen_financiero({ mes, anio }) {
  const ahora = new Date();
  const m = mes || (ahora.getMonth() + 1);
  const a = anio || ahora.getFullYear();
  const desde = `${a}-${String(m).padStart(2, "0")}-01`;
  const hasta = `${a}-${String(m).padStart(2, "0")}-31`;

  const { data, error } = await supabase
    .from("movimientos_contables")
    .select("tipo, monto, categoria")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .neq("estado", "eliminado");

  if (error || !data) return "Error al consultar movimientos contables.";

  const ingresos = data.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0);
  const gastos = data.filter((m) => m.tipo === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);
  const ganancia = ingresos - gastos;

  // Top categorías de gasto
  const catGastos = {};
  data.filter((m) => m.tipo === "gasto").forEach((m) => {
    const cat = m.categoria || "Sin categoría";
    catGastos[cat] = (catGastos[cat] || 0) + Number(m.monto || 0);
  });
  const topGastos = Object.entries(catGastos).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  return JSON.stringify({
    periodo: `${meses[m - 1]} ${a}`,
    ingresos: money(ingresos),
    gastos: money(gastos),
    ganancia: money(ganancia),
    margen: ingresos > 0 ? `${Math.round((ganancia / ingresos) * 100)}%` : "0%",
    movimientos_totales: data.length,
    top_gastos: topGastos.map(([cat, val]) => `${cat}: ${money(val)}`),
  });
}

// ═══════════════════════════════════════════════════════════
// 7. CONTAR REGISTROS
// ═══════════════════════════════════════════════════════════
export async function contar_registros({ tipo }) {
  const tablas = {
    clientes: "clientes",
    productos: "productos",
    pedidos: "ordenes_pedido",
    cotizaciones: "cotizaciones",
  };

  const tabla = tablas[tipo];
  if (!tabla) return `Tipo "${tipo}" no reconocido. Opciones: clientes, productos, pedidos, cotizaciones.`;

  const { count, error } = await supabase
    .from(tabla)
    .select("id", { count: "exact", head: true });

  if (error) return `Error al contar ${tipo}.`;

  return JSON.stringify({ tipo, total: count });
}