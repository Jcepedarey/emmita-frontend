// src/utils/aiFunctions.js
// Funciones que el agente IA puede ejecutar contra Supabase
import supabase from "../supabaseClient";

// ─── Helpers ───
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const sinTildes = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ═══════════════════════════════════════════════════════════
// 1. VERIFICAR DISPONIBILIDAD
// ═══════════════════════════════════════════════════════════
export async function verificar_disponibilidad({ articulo, fecha }) {
  const fechaBuscar = fecha || hoyISO();
  const articuloNormal = sinTildes(articulo);
  const { data: productos } = await supabase.from("productos").select("id, nombre, stock, precio, tipo").or(`nombre.ilike.%${articulo}%,nombre.ilike.%${articuloNormal}%`).limit(5);
  if (!productos || productos.length === 0) return `No encontré artículos que coincidan con "${articulo}".`;
  const resultados = [];
  for (const prod of productos) {
    const { data: ordenes } = await supabase.from("ordenes_pedido").select("productos, fecha_entrega, fecha_devolucion").or(`fecha_evento.eq.${fechaBuscar},and(fecha_entrega.lte.${fechaBuscar},fecha_devolucion.gte.${fechaBuscar})`);
    let comprometidos = 0;
    for (const orden of ordenes || []) {
      const walk = (list, factor = 1) => { for (const it of list) { if (it.es_grupo && Array.isArray(it.productos)) { walk(it.productos, factor * (Number(it.cantidad) || 1)); } else if ((it.id === prod.id || it.producto_id === prod.id) && !it.es_servicio) { comprometidos += (Number(it.cantidad) || 0) * factor; } } };
      walk(orden.productos || []);
    }
    const stockTotal = Number(prod.stock || 0);
    resultados.push({ nombre: prod.nombre, tipo: prod.tipo || "articulo", stock_total: stockTotal, comprometidos, disponible: Math.max(0, stockTotal - comprometidos), precio_alquiler: Number(prod.precio || 0) });
  }
  return JSON.stringify(resultados);
}

// ═══════════════════════════════════════════════════════════
// 2. BUSCAR CLIENTE
// ═══════════════════════════════════════════════════════════
export async function buscar_cliente({ texto }) {
  const textoNormal = sinTildes(texto);
  const { data, error } = await supabase.from("clientes").select("id, nombre, telefono, email, identificacion, direccion").or(`nombre.ilike.%${texto}%,nombre.ilike.%${textoNormal}%,telefono.ilike.%${texto}%,email.ilike.%${texto}%,identificacion.ilike.%${texto}%`).limit(5);
  if (error || !data || data.length === 0) return `No se encontraron clientes que coincidan con "${texto}".`;
  return JSON.stringify(data.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono || "—", email: c.email || "—", identificacion: c.identificacion || "—", direccion: c.direccion || "—" })));
}

// ═══════════════════════════════════════════════════════════
// 3. BUSCAR PRODUCTO
// ═══════════════════════════════════════════════════════════
export async function buscar_producto({ nombre }) {
  const nombreNormal = sinTildes(nombre);
  const { data, error } = await supabase.from("productos").select("nombre, precio, stock, tipo, costo, categoria, valor_adquisicion").or(`nombre.ilike.%${nombre}%,nombre.ilike.%${nombreNormal}%`).order("nombre").limit(10);
  if (error || !data || data.length === 0) return `No se encontraron productos que coincidan con "${nombre}".`;
  return JSON.stringify(data.map((p) => ({ nombre: p.nombre, tipo: p.tipo || "articulo", precio_alquiler: money(p.precio), stock: p.tipo === "servicio" ? "Ilimitado" : Number(p.stock || 0), costo_interno: Number(p.costo || 0) > 0 ? money(p.costo) : "—", valor_adquisicion: Number(p.valor_adquisicion || 0) > 0 ? money(p.valor_adquisicion) : "—", categoria: p.categoria || "—" })));
}

// ═══════════════════════════════════════════════════════════
// 4. CONSULTAR PEDIDOS
// ═══════════════════════════════════════════════════════════
export async function consultar_pedidos({ fecha, fecha_desde, fecha_hasta, cliente }) {
  let query = supabase.from("ordenes_pedido").select("id, numero, fecha_evento, total_neto, estado, clientes(nombre)").order("fecha_evento", { ascending: false }).limit(15);
  if (fecha) query = query.eq("fecha_evento", fecha);
  else if (fecha_desde && fecha_hasta) query = query.gte("fecha_evento", fecha_desde).lte("fecha_evento", fecha_hasta);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return "No se encontraron pedidos para los criterios indicados.";
  let resultado = data;
  if (cliente) { const cn = sinTildes(cliente.toLowerCase()); resultado = resultado.filter((p) => { const nom = (p.clientes?.nombre || "").toLowerCase(); return nom.includes(cliente.toLowerCase()) || sinTildes(nom).includes(cn); }); }
  if (resultado.length === 0) return `No se encontraron pedidos del cliente "${cliente}".`;
  return JSON.stringify(resultado.map((p) => ({ _id: p.id, _tipo: "pedido", numero: p.numero || "—", cliente: p.clientes?.nombre || "—", fecha_evento: p.fecha_evento, total: money(p.total_neto), estado: p.estado || "pendiente" })));
}

// ═══════════════════════════════════════════════════════════
// 5. CONSULTAR AGENDA (periodo)
// ═══════════════════════════════════════════════════════════
export async function consultar_agenda({ periodo }) {
  const hoy = new Date(); let desde = hoyISO(); let hasta = hoyISO();
  if (periodo === "manana") { const m = new Date(hoy); m.setDate(m.getDate() + 1); desde = hasta = m.toISOString().slice(0, 10); }
  else if (periodo === "semana" || periodo === "proximos_7_dias") { const f = new Date(hoy); f.setDate(f.getDate() + 7); hasta = f.toISOString().slice(0, 10); }
  else if (periodo === "proximos_30_dias") { const f = new Date(hoy); f.setDate(f.getDate() + 30); hasta = f.toISOString().slice(0, 10); }
  const { data, error } = await supabase.from("ordenes_pedido").select("id, numero, fecha_evento, fecha_entrega, total_neto, clientes(nombre)").gte("fecha_evento", desde).lte("fecha_evento", hasta).order("fecha_evento", { ascending: true }).limit(20);
  if (error || !data || data.length === 0) return `No hay eventos programados para ${periodo === "hoy" ? "hoy" : periodo === "manana" ? "mañana" : "los próximos " + (periodo === "semana" ? "7" : "30") + " días"}.`;
  return JSON.stringify(data.map((p) => ({ _id: p.id, _tipo: "pedido", numero: p.numero || "—", cliente: p.clientes?.nombre || "—", fecha_evento: p.fecha_evento, fecha_entrega: p.fecha_entrega || "—", total: money(p.total_neto) })));
}

// ═══════════════════════════════════════════════════════════
// 5B. CONSULTAR AGENDA POR FECHA (pedidos + cotizaciones + notas)
// ═══════════════════════════════════════════════════════════
export async function consultar_agenda_fecha({ fecha }) {
  const fechaBuscar = fecha || hoyISO();
  const [{ data: pedidos }, { data: cotizaciones }, { data: notas }] = await Promise.all([
    supabase.from("ordenes_pedido").select("id, numero, fecha_evento, fecha_entrega, total_neto, estado, clientes(nombre)").eq("fecha_evento", fechaBuscar),
    supabase.from("cotizaciones").select("id, numero, fecha_evento, total_neto, clientes(nombre)").eq("fecha_evento", fechaBuscar),
    supabase.from("agenda").select("id, titulo, descripcion, fecha").eq("fecha", fechaBuscar).order("created_at", { ascending: true }),
  ]);
  const resultado = {
    fecha: fechaBuscar,
    pedidos: (pedidos || []).map((p) => ({ _id: p.id, _tipo: "pedido", numero: p.numero || "—", cliente: p.clientes?.nombre || "—", fecha_entrega: p.fecha_entrega || "—", total: money(p.total_neto), estado: p.estado || "pendiente" })),
    cotizaciones: (cotizaciones || []).map((c) => ({ _id: c.id, _tipo: "cotizacion", numero: c.numero || "—", cliente: c.clientes?.nombre || "—", total: money(c.total_neto) })),
    notas: (notas || []).map((n) => ({ id: n.id, descripcion: n.descripcion || n.titulo || "—" })),
    total_pedidos: (pedidos || []).length, total_cotizaciones: (cotizaciones || []).length, total_notas: (notas || []).length,
  };
  if (resultado.total_pedidos === 0 && resultado.total_cotizaciones === 0 && resultado.total_notas === 0) return `No hay nada programado para el ${fechaBuscar}. El día está libre.`;
  return JSON.stringify(resultado);
}

// ═══════════════════════════════════════════════════════════
// 6. RESUMEN FINANCIERO
// ═══════════════════════════════════════════════════════════
export async function resumen_financiero({ mes, anio }) {
  const ahora = new Date(); const m = mes || (ahora.getMonth() + 1); const a = anio || ahora.getFullYear();
  const desde = `${a}-${String(m).padStart(2, "0")}-01`; const hasta = `${a}-${String(m).padStart(2, "0")}-31`;
  const { data, error } = await supabase.from("movimientos_contables").select("tipo, monto, categoria").gte("fecha", desde).lte("fecha", hasta).neq("estado", "eliminado");
  if (error || !data) return "Error al consultar movimientos contables.";
  const ingresos = data.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0);
  const gastos = data.filter((m) => m.tipo === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);
  const ganancia = ingresos - gastos;
  const catGastos = {}; data.filter((m) => m.tipo === "gasto").forEach((m) => { const cat = m.categoria || "Sin categoría"; catGastos[cat] = (catGastos[cat] || 0) + Number(m.monto || 0); });
  const topGastos = Object.entries(catGastos).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return JSON.stringify({ periodo: `${meses[m - 1]} ${a}`, ingresos: money(ingresos), gastos: money(gastos), ganancia: money(ganancia), margen: ingresos > 0 ? `${Math.round((ganancia / ingresos) * 100)}%` : "0%", movimientos_totales: data.length, top_gastos: topGastos.map(([cat, val]) => `${cat}: ${money(val)}`) });
}

// ═══════════════════════════════════════════════════════════
// 7. CONTAR REGISTROS
// ═══════════════════════════════════════════════════════════
export async function contar_registros({ tipo }) {
  const tablas = { clientes: "clientes", productos: "productos", pedidos: "ordenes_pedido", cotizaciones: "cotizaciones" };
  const tabla = tablas[tipo]; if (!tabla) return `Tipo "${tipo}" no reconocido. Opciones: clientes, productos, pedidos, cotizaciones.`;
  const { count, error } = await supabase.from(tabla).select("id", { count: "exact", head: true });
  if (error) return `Error al contar ${tipo}.`;
  return JSON.stringify({ tipo, total: count });
}

// ═══════════════════════════════════════════════════════════
// 8. CONSULTAR COTIZACIONES
// ═══════════════════════════════════════════════════════════
export async function consultar_cotizaciones({ fecha_desde, fecha_hasta, cliente }) {
  let query = supabase.from("cotizaciones").select("id, numero, fecha_evento, total_neto, clientes(nombre)").order("fecha_evento", { ascending: false }).limit(15);
  if (fecha_desde && fecha_hasta) query = query.gte("fecha_evento", fecha_desde).lte("fecha_evento", fecha_hasta);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return "No se encontraron cotizaciones.";
  let resultado = data;
  if (cliente) { const cn = sinTildes(cliente.toLowerCase()); resultado = resultado.filter((c) => { const nom = (c.clientes?.nombre || "").toLowerCase(); return nom.includes(cliente.toLowerCase()) || sinTildes(nom).includes(cn); }); }
  if (resultado.length === 0) return `No se encontraron cotizaciones del cliente "${cliente}".`;
  return JSON.stringify(resultado.map((c) => ({ _id: c.id, _tipo: "cotizacion", numero: c.numero || "—", cliente: c.clientes?.nombre || "—", fecha_evento: c.fecha_evento, total: money(c.total_neto) })));
}

// ═══════════════════════════════════════════════════════════
// 9. TRAZABILIDAD DE PRECIO
// ═══════════════════════════════════════════════════════════
export async function trazabilidad_precio({ articulo, cliente }) {
  const clienteNormal = sinTildes(cliente);
  const { data: clientes } = await supabase.from("clientes").select("id, nombre").or(`nombre.ilike.%${cliente}%,nombre.ilike.%${clienteNormal}%`).limit(3);
  if (!clientes || clientes.length === 0) return `No se encontró el cliente "${cliente}".`;
  const clienteEncontrado = clientes[0];
  const [{ data: pedidos }, { data: cotizaciones }] = await Promise.all([
    supabase.from("ordenes_pedido").select("id, numero, fecha_evento, productos").eq("cliente_id", clienteEncontrado.id).order("fecha_evento", { ascending: false }).limit(50),
    supabase.from("cotizaciones").select("id, numero, fecha_evento, productos").eq("cliente_id", clienteEncontrado.id).order("fecha_evento", { ascending: false }).limit(50),
  ]);
  const todos = [...(pedidos || []), ...(cotizaciones || [])].sort((a, b) => new Date(b.fecha_evento || 0) - new Date(a.fecha_evento || 0));
  const nombreBuscado = sinTildes(articulo.toLowerCase()); const coincidencias = [];
  for (const doc of todos) {
    const esPedido = (pedidos || []).some((p) => p.id === doc.id);
    const walk = (list, factor = 1) => { for (const it of list) { if (it.es_grupo && Array.isArray(it.productos)) { walk(it.productos, factor * (Number(it.cantidad) || 1)); } else { const nomItem = sinTildes((it.nombre || "").toLowerCase()); if (nomItem.includes(nombreBuscado)) { coincidencias.push({ _id: doc.id, _tipo: esPedido ? "pedido" : "cotizacion", documento: doc.numero || "—", fecha: doc.fecha_evento, articulo: it.nombre, precio_unitario: Number(it.precio || 0), cantidad: (Number(it.cantidad) || 0) * factor }); } } } };
    walk(doc.productos || []);
  }
  if (coincidencias.length === 0) return `No se encontró "${articulo}" en los documentos de ${clienteEncontrado.nombre}.`;
  const ultimo = coincidencias[0];
  return JSON.stringify({ cliente: clienteEncontrado.nombre, articulo_buscado: articulo, ultimo_precio: money(ultimo.precio_unitario), ultimo_documento: ultimo.documento, ultima_fecha: ultimo.fecha, ultima_cantidad: ultimo.cantidad, total_veces_alquilado: coincidencias.length, _acciones: coincidencias.slice(0, 3).map((c) => ({ _id: c._id, _tipo: c._tipo, numero: c.documento })), historial: coincidencias.slice(0, 5).map((c) => ({ documento: c.documento, fecha: c.fecha, precio: money(c.precio_unitario), cantidad: c.cantidad })) });
}

// ═══════════════════════════════════════════════════════════
// 10. ÚLTIMO CLIENTE QUE ALQUILÓ UN ARTÍCULO
// ═══════════════════════════════════════════════════════════
export async function ultimo_cliente_articulo({ articulo }) {
  const nombreBuscado = sinTildes(articulo.toLowerCase());
  const { data: pedidos } = await supabase.from("ordenes_pedido").select("id, numero, fecha_evento, productos, cliente_id, clientes(nombre)").order("fecha_evento", { ascending: false }).limit(100);
  if (!pedidos || pedidos.length === 0) return "No hay pedidos registrados.";
  for (const ped of pedidos) {
    const walk = (list, factor = 1) => { for (const it of list) { if (it.es_grupo && Array.isArray(it.productos)) { const f = walk(it.productos, factor * (Number(it.cantidad) || 1)); if (f) return f; } else { const nomItem = sinTildes((it.nombre || "").toLowerCase()); if (nomItem.includes(nombreBuscado)) return { cliente: ped.clientes?.nombre || "Desconocido", fecha: ped.fecha_evento, documento: ped.numero, articulo: it.nombre, precio: Number(it.precio || 0), cantidad: (Number(it.cantidad) || 0) * factor, _id: ped.id }; } } return null; };
    const encontrado = walk(ped.productos || []);
    if (encontrado) return JSON.stringify({ mensaje: `El último cliente fue ${encontrado.cliente}`, cliente: encontrado.cliente, fecha: encontrado.fecha, articulo: encontrado.articulo, precio_unitario: money(encontrado.precio), cantidad: encontrado.cantidad, documento: encontrado.documento, _acciones: [{ _id: encontrado._id, _tipo: "pedido", numero: encontrado.documento }] });
  }
  return `No se encontró "${articulo}" en ningún pedido reciente.`;
}

// ═══════════════════════════════════════════════════════════
// 11. CREAR NOTA EN CALENDARIO
// ═══════════════════════════════════════════════════════════
export async function crear_nota({ fecha, descripcion }) {
  if (!descripcion || !descripcion.trim()) return "Necesito una descripción para la nota.";
  const fechaNota = fecha || hoyISO();
  const { error } = await supabase.from("agenda").insert([{ titulo: "Nota", descripcion: descripcion.trim(), fecha: fechaNota, documento: null, tipo: null }]);
  if (error) { console.error("Error creando nota:", error); return "Error al crear la nota en el calendario."; }
  return JSON.stringify({ exito: true, mensaje: `✅ Nota creada para el ${fechaNota}`, fecha: fechaNota, descripcion: descripcion.trim() });
}

// ═══════════════════════════════════════════════════════════
// 12. PAGOS PENDIENTES
// ═══════════════════════════════════════════════════════════
export async function pagos_pendientes({ cliente }) {
  const { data: ordenes, error } = await supabase.from("ordenes_pedido").select("id, numero, fecha_evento, total_neto, abonos, clientes(nombre)").order("fecha_evento", { ascending: false }).limit(100);
  if (error || !ordenes) return "Error al consultar pagos pendientes.";
  let pendientes = ordenes.map((o) => { const total = Number(o.total_neto || 0); const abonado = (o.abonos || []).reduce((s, a) => s + Number(a.valor || a || 0), 0); return { ...o, abonado, saldo: Math.max(0, total - abonado) }; }).filter((o) => o.saldo > 0);
  if (cliente) { const cn = sinTildes(cliente.toLowerCase()); pendientes = pendientes.filter((o) => { const nom = (o.clientes?.nombre || "").toLowerCase(); return nom.includes(cliente.toLowerCase()) || sinTildes(nom).includes(cn); }); }
  if (pendientes.length === 0) return cliente ? `No se encontraron pagos pendientes del cliente "${cliente}".` : "No hay pagos pendientes. ¡Todo al día!";
  const totalPendiente = pendientes.reduce((s, o) => s + o.saldo, 0);
  return JSON.stringify({ total_pendiente: money(totalPendiente), cantidad_pedidos: pendientes.length, pedidos: pendientes.slice(0, 10).map((o) => ({ _id: o.id, _tipo: "pedido", numero: o.numero || "—", cliente: o.clientes?.nombre || "—", fecha_evento: o.fecha_evento, total: money(o.total_neto), abonado: money(o.abonado), saldo: money(o.saldo) })) });
}

// ═══════════════════════════════════════════════════════════
// 13. CREAR CLIENTE
// ═══════════════════════════════════════════════════════════
export async function crear_cliente({ nombre, telefono, identificacion, email, direccion }) {
  if (!nombre || !nombre.trim()) return "Necesito al menos el nombre del cliente para crearlo.";
  const nombreNormal = sinTildes(nombre.trim());
  const { data: existentes } = await supabase.from("clientes").select("id, nombre").or(`nombre.ilike.%${nombre.trim()}%,nombre.ilike.%${nombreNormal}%`).limit(3);
  if (existentes && existentes.length > 0) return JSON.stringify({ exito: false, mensaje: `Ya existe un cliente similar: ${existentes.map((c) => c.nombre).join(", ")}. ¿Deseas crearlo de todas formas?`, clientes_similares: existentes.map((c) => c.nombre) });
  const { data, error } = await supabase.from("clientes").insert([{ nombre: nombre.trim(), telefono: telefono || null, identificacion: identificacion || null, email: email || null, direccion: direccion || null }]).select("id, nombre").single();
  if (error) { console.error("Error creando cliente:", error); return "Error al crear el cliente."; }
  return JSON.stringify({ exito: true, mensaje: `✅ Cliente "${data.nombre}" creado exitosamente.`, id: data.id, nombre: data.nombre });
}

// ═══════════════════════════════════════════════════════════
// 14. ACTUALIZAR PRECIO DE PRODUCTO
// ═══════════════════════════════════════════════════════════
export async function actualizar_precio_producto({ nombre, nuevo_precio }) {
  if (!nombre || !nuevo_precio) return "Necesito el nombre del producto y el nuevo precio.";
  const nombreNormal = sinTildes(nombre);
  const { data: productos } = await supabase.from("productos").select("id, nombre, precio").or(`nombre.ilike.%${nombre}%,nombre.ilike.%${nombreNormal}%`).limit(5);
  if (!productos || productos.length === 0) return `No se encontró el producto "${nombre}".`;
  if (productos.length > 1) return JSON.stringify({ exito: false, mensaje: `Encontré ${productos.length} productos similares. ¿Cuál quieres actualizar?`, productos: productos.map((p) => ({ nombre: p.nombre, precio_actual: money(p.precio) })) });
  const prod = productos[0]; const precioAnterior = Number(prod.precio || 0);
  const { error } = await supabase.from("productos").update({ precio: Number(nuevo_precio) }).eq("id", prod.id);
  if (error) { console.error("Error actualizando precio:", error); return "Error al actualizar el precio."; }
  return JSON.stringify({ exito: true, mensaje: `✅ Precio de "${prod.nombre}" actualizado.`, producto: prod.nombre, precio_anterior: money(precioAnterior), precio_nuevo: money(nuevo_precio) });
}

// ═══════════════════════════════════════════════════════════
// 15. ARTÍCULOS MÁS ALQUILADOS
// ═══════════════════════════════════════════════════════════
export async function articulos_mas_alquilados({ limite }) {
  const { data: ordenes } = await supabase.from("ordenes_pedido").select("productos").limit(200);
  if (!ordenes || ordenes.length === 0) return "No hay pedidos para analizar.";
  const conteo = {};
  for (const orden of ordenes) { const walk = (list, factor = 1) => { for (const it of list || []) { if (it.es_grupo && Array.isArray(it.productos)) { walk(it.productos, factor * (Number(it.cantidad) || 1)); } else if (it.nombre && !it.es_servicio) { const key = it.nombre; if (!conteo[key]) conteo[key] = { nombre: key, veces: 0, unidades: 0 }; conteo[key].veces += 1; conteo[key].unidades += (Number(it.cantidad) || 0) * factor; } } }; walk(orden.productos); }
  const ranking = Object.values(conteo).sort((a, b) => b.unidades - a.unidades).slice(0, limite || 10);
  return JSON.stringify({ total_pedidos_analizados: ordenes.length, ranking: ranking.map((r, i) => ({ posicion: i + 1, nombre: r.nombre, veces_alquilado: r.veces, unidades_totales: r.unidades })) });
}

// ═══════════════════════════════════════════════════════════
// 16. CLIENTES MÁS FRECUENTES
// ═══════════════════════════════════════════════════════════
export async function clientes_mas_frecuentes({ limite }) {
  const { data: ordenes } = await supabase.from("ordenes_pedido").select("total_neto, clientes(nombre)").order("fecha_evento", { ascending: false }).limit(500);
  if (!ordenes || ordenes.length === 0) return "No hay pedidos para analizar.";
  const conteo = {};
  for (const o of ordenes) { const nom = o.clientes?.nombre || "Desconocido"; if (!conteo[nom]) conteo[nom] = { nombre: nom, pedidos: 0, total: 0 }; conteo[nom].pedidos += 1; conteo[nom].total += Number(o.total_neto || 0); }
  const ranking = Object.values(conteo).sort((a, b) => b.pedidos - a.pedidos).slice(0, limite || 10);
  return JSON.stringify({ ranking: ranking.map((r, i) => ({ posicion: i + 1, nombre: r.nombre, total_pedidos: r.pedidos, facturacion: money(r.total) })) });
}