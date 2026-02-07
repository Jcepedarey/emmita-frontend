// src/pages/Reportes.js — SESIÓN 6: Gráficas avanzadas + drill-down de clientes
// Datos basados en dinero REAL (movimientos_contables)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Filler, Tooltip, Legend,
} from "chart.js";
import { exportarCSV } from "../utils/exportarCSV";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/ReportesContabilidad.css";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Filler, Tooltip, Legend
);

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════ */
const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const ym = (d) => (d ? String(d).slice(0, 7) : "");
const nombreMes = (k) => {
  const [y, m] = (k || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
};

const soloFecha = (f) => {
  if (!f) return "—";
  const s = String(f).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s.slice(0, 10);
};

/* ─── Helpers de período ─── */
const limitesMes = (ref) => {
  const h = ref || new Date();
  return {
    desde: new Date(h.getFullYear(), h.getMonth(), 1).toISOString().slice(0, 10),
    hasta: new Date(h.getFullYear(), h.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
};
const limitesTrimestre = () => {
  const h = new Date(), qS = Math.floor(h.getMonth() / 3) * 3;
  return {
    desde: new Date(h.getFullYear(), qS, 1).toISOString().slice(0, 10),
    hasta: new Date(h.getFullYear(), qS + 3, 0).toISOString().slice(0, 10),
  };
};
const limitesAnio = () => {
  const y = new Date().getFullYear();
  return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
};
const getPreset = (desde, hasta) => {
  const pares = [
    ["mes", limitesMes()],
    ["mesAnt", (() => { const a = new Date(); a.setMonth(a.getMonth() - 1); return limitesMes(a); })()],
    ["trimestre", limitesTrimestre()],
    ["anio", limitesAnio()],
  ];
  for (const [id, r] of pares) if (desde === r.desde && hasta === r.hasta) return id;
  if (!desde && !hasta) return "todo";
  return "";
};

/* ─── Paleta ─── */
const PALETA = [
  "rgba(59,130,246,0.65)", "rgba(16,185,129,0.65)", "rgba(244,114,182,0.65)",
  "rgba(234,179,8,0.65)", "rgba(147,197,253,0.65)", "rgba(167,139,250,0.65)",
  "rgba(252,165,165,0.65)", "rgba(110,231,183,0.65)", "rgba(251,191,36,0.65)",
  "rgba(196,181,253,0.65)",
];
const PALETA_SOLIDA = PALETA.map((c) => c.replace("0.65)", "1)"));

/* ─── Flatten items con soporte de grupos ─── */
function flattenItems(items = []) {
  const out = [];
  const walk = (list, factor = 1) => {
    for (const it of list || []) {
      if (it?.es_grupo && Array.isArray(it.productos)) {
        walk(it.productos, factor * (Number(it.cantidad || 0) || 1));
      } else {
        const cant = Number(it?.cantidad || 0);
        const precio = Number(it?.precio || 0);
        const sub = Number(it?.subtotal != null ? it.subtotal : precio * cant);
        out.push({
          nombre: it?.nombre || "Artículo",
          cantidad: isFinite(cant * factor) ? cant * factor : 0,
          recaudo: isFinite(sub * factor) ? sub * factor : 0,
          es_proveedor: !!it?.es_proveedor,
        });
      }
    }
  };
  walk(items, 1);
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
export default function Reportes() {
  const navigate = useNavigate();
  const { desde: d0, hasta: h0 } = limitesMes();
  const [desde, setDesde] = useState(d0);
  const [hasta, setHasta] = useState(h0);

  const [movs, setMovs] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clientesMap, setClientesMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [movsAnterior, setMovsAnterior] = useState([]);
  const [ordenesAnterior, setOrdenesAnterior] = useState([]);

  const [tab, setTab] = useState("financiero");
  const [subTabArt, setSubTabArt] = useState("propios");

  // Financiero: tipo de gráfica
  const [tipoGrafFin, setTipoGrafFin] = useState("barras"); // barras | lineas | area

  // Drill-down modal de cliente
  const [modalCliente, setModalCliente] = useState(null); // { id, nombre, ordenes }

  /* ─── Cargar datos ─── */
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("movimientos_contables").select("*");
      if (desde) q = q.gte("fecha", desde);
      if (hasta) q = q.lte("fecha", hasta);
      q = q.order("fecha", { ascending: true });
      const { data: m } = await q;
      setMovs(m || []);

      let q2 = supabase.from("ordenes_pedido").select("id, numero, cliente_id, fecha_evento, fecha_creacion, total_neto, productos, pagos_proveedores, estado, abonos, descuento, retencion, multi_dias, fechas_evento, mostrar_notas");
      if (desde) q2 = q2.gte("fecha_evento", desde);
      if (hasta) q2 = q2.lte("fecha_evento", hasta);
      q2 = q2.order("fecha_evento", { ascending: true });
      const { data: o } = await q2;
      setOrdenes(o || []);
    } catch (err) { console.error("Error cargando datos:", err); }
    setLoading(false);
  }, [desde, hasta]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  /* ─── Nombres de clientes ─── */
  useEffect(() => {
    (async () => {
      const idsM = (movs || []).map((m) => m.cliente_id).filter(Boolean);
      const idsO = (ordenes || []).map((o) => o.cliente_id).filter(Boolean);
      const ids = Array.from(new Set([...idsM, ...idsO]));
      if (!ids.length) return setClientesMap({});
      const { data } = await supabase.from("clientes").select("id,nombre,identificacion,telefono,direccion,email").in("id", ids);
      const mapa = {};
      (data || []).forEach((c) => (mapa[c.id] = c));
      setClientesMap(mapa);
    })();
  }, [movs, ordenes]);

  /* ─── Período anterior ─── */
  useEffect(() => {
    if (!desde || !hasta) { setMovsAnterior([]); setOrdenesAnterior([]); return; }
    const d1 = new Date(desde), d2 = new Date(hasta), diff = d2 - d1;
    const antD = new Date(d1.getTime() - diff - 86400000);
    const antH = new Date(d1.getTime() - 86400000);
    const ymd = (d) => d.toISOString().slice(0, 10);
    Promise.all([
      supabase.from("movimientos_contables").select("tipo,monto").gte("fecha", ymd(antD)).lte("fecha", ymd(antH)),
      supabase.from("ordenes_pedido").select("id").gte("fecha_evento", ymd(antD)).lte("fecha_evento", ymd(antH)),
    ]).then(([{ data: ma }, { data: oa }]) => {
      setMovsAnterior(ma || []);
      setOrdenesAnterior(oa || []);
    });
  }, [desde, hasta]);

  /* ─── Presets ─── */
  const aplicarPreset = (tipo) => {
    const fns = {
      mes: limitesMes, mesAnt: () => { const a = new Date(); a.setMonth(a.getMonth() - 1); return limitesMes(a); },
      trimestre: limitesTrimestre, anio: limitesAnio, todo: () => ({ desde: "", hasta: "" }),
    };
    const r = (fns[tipo] || fns.todo)();
    setDesde(r.desde); setHasta(r.hasta);
  };
  const presetActivo = getPreset(desde, hasta);

  /* ═══════════════════════════════════════════════════════════════
     CÁLCULOS CON DINERO REAL
     ═══════════════════════════════════════════════════════════════ */
  const movsActivos = useMemo(() => (movs || []).filter((m) => m.estado !== "eliminado"), [movs]);

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const ing = movsActivos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const gas = movsActivos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const gan = ing - gas;
    const pedSet = new Set(movsActivos.filter((m) => m.tipo === "ingreso" && m.orden_id).map((m) => m.orden_id));
    const ped = pedSet.size;
    const aAct = movsAnterior || [];
    const aIng = aAct.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const aGas = aAct.filter((m) => m.tipo === "gasto").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const aPed = (ordenesAnterior || []).length;
    const pct = (a, b) => { if (!b) return a > 0 ? 100 : 0; return Math.round(((a - b) / Math.abs(b)) * 100); };
    return { ingresos: ing, gastos: gas, ganancia: gan, pedidos: ped, pctIng: pct(ing, aIng), pctGas: pct(gas, aGas), pctGan: pct(gan, aIng - aGas), pctPed: pct(ped, aPed) };
  }, [movsActivos, movsAnterior, ordenesAnterior]);

  /* ─── Financiero por mes ─── */
  const serieMes = useMemo(() => {
    const map = {};
    for (const m of movsActivos) {
      const k = ym(m.fecha); if (!k) continue;
      if (!map[k]) map[k] = { ingresos: 0, gastos: 0 };
      if (m.tipo === "ingreso") map[k].ingresos += Number(m.monto || 0);
      if (m.tipo === "gasto") map[k].gastos += Number(m.monto || 0);
    }
    const meses = Object.keys(map).sort();
    return {
      meses, labels: meses.map(nombreMes),
      ingresos: meses.map((k) => map[k].ingresos),
      gastos: meses.map((k) => map[k].gastos),
      ganancia: meses.map((k) => map[k].ingresos - map[k].gastos),
    };
  }, [movsActivos]);

  /* ─── Distribución de gastos por categoría (Donut) ─── */
  const gastosPorCategoria = useMemo(() => {
    const map = {};
    for (const m of movsActivos) {
      if (m.tipo !== "gasto") continue;
      const cat = m.categoria || "Sin categoría";
      map[cat] = (map[cat] || 0) + Number(m.monto || 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [movsActivos]);

  /* ─── Top clientes (dinero real) ─── */
  const topClientes = useMemo(() => {
    const acum = {};
    for (const m of movsActivos) {
      if (m.tipo !== "ingreso" || !m.cliente_id) continue;
      if (!acum[m.cliente_id]) acum[m.cliente_id] = { recaudo: 0, ordenIds: new Set() };
      acum[m.cliente_id].recaudo += Number(m.monto || 0);
      if (m.orden_id) acum[m.cliente_id].ordenIds.add(m.orden_id);
    }
    return Object.entries(acum)
      .map(([id, v]) => ({
        id,
        nombre: (clientesMap[id]?.nombre && String(clientesMap[id].nombre).trim()) || "(Sin nombre)",
        pedidos: v.ordenIds.size,
        recaudo: v.recaudo,
        promedio: v.ordenIds.size > 0 ? Math.round(v.recaudo / v.ordenIds.size) : 0,
        ordenIds: Array.from(v.ordenIds),
      }))
      .sort((a, b) => b.recaudo - a.recaudo)
      .slice(0, 10);
  }, [movsActivos, clientesMap]);

  /* ─── Artículos ─── */
  const resumenArticulos = useMemo(() => {
    const usP = {}, usV = {}, rcP = {}, rcV = {};
    for (const o of ordenes || []) {
      for (const it of flattenItems(o.productos || [])) {
        const k = it.nombre; if (!k) continue;
        const tgt = it.es_proveedor ? [usV, rcV] : [usP, rcP];
        tgt[0][k] = (tgt[0][k] || 0) + Number(it.cantidad || 0);
        tgt[1][k] = (tgt[1][k] || 0) + Number(it.recaudo || 0);
      }
    }
    const toTop = (m, c) => Object.entries(m).map(([n, v]) => ({ nombre: n, [c]: v })).sort((a, b) => b[c] - a[c]).slice(0, 10);
    return { topUsoPropios: toTop(usP, "cantidad"), topUsoProveedor: toTop(usV, "cantidad"), topRecaudoPropios: toTop(rcP, "valor"), topRecaudoProv: toTop(rcV, "valor") };
  }, [ordenes]);

  /* ─── Proveedores (pagos reales) ─── */
  const resumenProveedores = useMemo(() => {
    const adeud = {};
    for (const ord of ordenes || []) {
      for (const p of (ord.pagos_proveedores || [])) {
        const k = p.proveedor_nombre || "Sin proveedor";
        if (!adeud[k]) adeud[k] = { total: 0, ordenes: new Set() };
        adeud[k].total += Number(p.total || 0);
        adeud[k].ordenes.add(ord.id);
      }
    }
    const pagado = {};
    for (const m of movsActivos) {
      if (m.tipo !== "gasto" || !m.proveedor_nombre) continue;
      pagado[m.proveedor_nombre] = (pagado[m.proveedor_nombre] || 0) + Number(m.monto || 0);
    }
    const all = new Set([...Object.keys(adeud), ...Object.keys(pagado)]);
    return Array.from(all).map((n) => {
      const a = adeud[n] || { total: 0, ordenes: new Set() };
      const p = pagado[n] || 0;
      return { nombre: n, total: a.total, pagado: p, pendiente: Math.max(0, a.total - p), ordenes: a.ordenes?.size || 0 };
    }).sort((a, b) => b.total - a.total);
  }, [ordenes, movsActivos]);

  /* ═══════════════════════════════════════════════════════════════
     DRILL-DOWN: MODAL DE CLIENTE
     ═══════════════════════════════════════════════════════════════ */
  const abrirModalCliente = async (cliente) => {
    // Las órdenes del array local están filtradas por fecha_evento,
    // pero los movimientos pueden referenciar órdenes de otros períodos.
    // Buscamos TODAS las órdenes referenciadas directamente en Supabase.
    const idsLocales = new Set((ordenes || []).map((o) => o.id));
    const idsFaltantes = cliente.ordenIds.filter((id) => !idsLocales.has(id));

    // Órdenes ya en memoria
    const locales = (ordenes || []).filter((o) => cliente.ordenIds.includes(o.id));

    // Buscar órdenes faltantes (de otros períodos)
    let remotas = [];
    if (idsFaltantes.length > 0) {
      const { data } = await supabase
        .from("ordenes_pedido")
        .select("id, numero, cliente_id, fecha_evento, fecha_creacion, total_neto, productos, pagos_proveedores, estado, abonos, descuento, retencion, multi_dias, fechas_evento, mostrar_notas")
        .in("id", idsFaltantes);
      remotas = data || [];
    }

    const todasOrdenesCliente = [...locales, ...remotas];

    // Calcular financiero por orden (solo movimientos del período seleccionado)
    const ordenesConFinanzas = todasOrdenesCliente.map((ord) => {
      const ingresosOrden = movsActivos
        .filter((m) => m.tipo === "ingreso" && m.orden_id === ord.id)
        .reduce((s, m) => s + Number(m.monto || 0), 0);
      const gastosOrden = movsActivos
        .filter((m) => m.tipo === "gasto" && m.orden_id === ord.id)
        .reduce((s, m) => s + Number(m.monto || 0), 0);

      // Marcar si la orden es de otro período
      const fueraDeRango = !idsLocales.has(ord.id);

      return { ...ord, ingresosReales: ingresosOrden, gastosReales: gastosOrden, gananciaReal: ingresosOrden - gastosOrden, fueraDeRango };
    });

    setModalCliente({
      id: cliente.id,
      nombre: cliente.nombre,
      recaudo: cliente.recaudo,
      pedidos: cliente.pedidos,
      ordenes: ordenesConFinanzas,
    });
  };

  const editarOrden = (orden) => {
    const cli = clientesMap[orden.cliente_id] || {};
    navigate("/crear-documento", {
      state: {
        documento: { ...orden, clientes: cli, nombre_cliente: cli.nombre || "N/A", identificacion: cli.identificacion || "N/A", telefono: cli.telefono || "N/A", direccion: cli.direccion || "N/A", email: cli.email || "N/A" },
        tipo: "orden",
      },
    });
  };

  const pdfOrden = async (orden) => {
    const cli = clientesMap[orden.cliente_id] || {};
    await generarPDF({
      ...orden, nombre_cliente: cli.nombre || "N/A", identificacion: cli.identificacion || "N/A",
      telefono: cli.telefono || "N/A", direccion: cli.direccion || "N/A", email: cli.email || "N/A",
      fecha_creacion: soloFecha(orden.fecha_creacion || orden.fecha), fecha_evento: soloFecha(orden.fecha_evento),
    }, "orden");
  };

  const remisionOrden = async (orden) => {
    const cli = clientesMap[orden.cliente_id] || {};
    await generarRemision({
      ...orden, nombre_cliente: cli.nombre || "N/A", identificacion: cli.identificacion || "N/A",
      telefono: cli.telefono || "N/A", direccion: cli.direccion || "N/A", email: cli.email || "N/A",
      fecha_creacion: soloFecha(orden.fecha_creacion), fecha_evento: soloFecha(orden.fecha_evento),
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     CHART DATA & OPTIONS
     ═══════════════════════════════════════════════════════════════ */
  const yTickCallback = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : v;
  const tooltipMoney = { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y || ctx.parsed.x || ctx.raw)}` } };

  const chartOptsBase = { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "top" }, tooltip: tooltipMoney }, scales: { y: { ticks: { callback: yTickCallback } } } };
  const chartOptsNoLegend = { ...chartOptsBase, plugins: { ...chartOptsBase.plugins, legend: { display: false } } };
  const chartOptsH = { ...chartOptsNoLegend, indexAxis: "y", scales: { x: { ticks: { callback: yTickCallback } } } };
  const doughnutOpts = {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { position: "right", labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } } },
    cutout: "60%",
  };

  // ── Financiero ──
  const dsIngresos = { label: "Ingresos", data: serieMes.ingresos, backgroundColor: "rgba(16,185,129,0.5)", borderColor: "rgba(16,185,129,1)", borderWidth: 2, tension: 0.3, fill: tipoGrafFin === "area" };
  const dsGastos = { label: "Gastos", data: serieMes.gastos, backgroundColor: "rgba(239,68,68,0.5)", borderColor: "rgba(239,68,68,1)", borderWidth: 2, tension: 0.3, fill: tipoGrafFin === "area" };
  const dsGanancia = { label: "Ganancia", data: serieMes.ganancia, backgroundColor: "rgba(59,130,246,0.5)", borderColor: "rgba(59,130,246,1)", borderWidth: 2, tension: 0.3, fill: tipoGrafFin === "area" };
  const dataFinanciero = { labels: serieMes.labels, datasets: [dsIngresos, dsGastos, dsGanancia] };

  const dataDonutGastos = {
    labels: gastosPorCategoria.map(([c]) => c),
    datasets: [{ data: gastosPorCategoria.map(([, v]) => v), backgroundColor: PALETA.slice(0, gastosPorCategoria.length), borderColor: PALETA_SOLIDA.slice(0, gastosPorCategoria.length), borderWidth: 1 }],
  };

  // ── Clientes ──
  const dataTopClientes = {
    labels: topClientes.map((t) => t.nombre),
    datasets: [{ label: "Recaudo real ($)", data: topClientes.map((t) => t.recaudo), backgroundColor: PALETA.slice(0, topClientes.length), borderColor: PALETA_SOLIDA.slice(0, topClientes.length), borderWidth: 1 }],
  };

  // ── Artículos ──
  const artD = subTabArt === "propios" ? resumenArticulos.topUsoPropios : resumenArticulos.topUsoProveedor;
  const recD = subTabArt === "propios" ? resumenArticulos.topRecaudoPropios : resumenArticulos.topRecaudoProv;
  const dataArtUso = { labels: artD.map((t) => t.nombre), datasets: [{ label: `Cantidad`, data: artD.map((t) => t.cantidad), backgroundColor: PALETA.slice(0, artD.length), borderColor: PALETA_SOLIDA.slice(0, artD.length), borderWidth: 1 }] };
  const dataArtRec = { labels: recD.map((t) => t.nombre), datasets: [{ label: `Valor cotizado ($)`, data: recD.map((t) => t.valor), backgroundColor: PALETA.slice(0, recD.length), borderColor: PALETA_SOLIDA.slice(0, recD.length), borderWidth: 1 }] };

  // ── Proveedores ──
  const dataProv = {
    labels: resumenProveedores.map((p) => p.nombre),
    datasets: [
      { label: "Adeudado", data: resumenProveedores.map((p) => p.total), backgroundColor: "rgba(100,116,139,0.5)", borderColor: "rgba(100,116,139,1)", borderWidth: 1 },
      { label: "Pagado", data: resumenProveedores.map((p) => p.pagado), backgroundColor: "rgba(16,185,129,0.5)", borderColor: "rgba(16,185,129,1)", borderWidth: 1 },
      { label: "Pendiente", data: resumenProveedores.map((p) => Math.max(0, p.pendiente)), backgroundColor: "rgba(239,68,68,0.5)", borderColor: "rgba(239,68,68,1)", borderWidth: 1 },
    ],
  };
  const dataDonutProv = {
    labels: resumenProveedores.slice(0, 8).map((p) => p.nombre),
    datasets: [{ data: resumenProveedores.slice(0, 8).map((p) => p.pagado), backgroundColor: PALETA.slice(0, 8), borderColor: PALETA_SOLIDA.slice(0, 8), borderWidth: 1 }],
  };

  /* ─── Exportar CSV ─── */
  const exportarCSVActual = () => {
    if (tab === "financiero") exportarCSV(serieMes.meses.map((k, i) => ({ Mes: nombreMes(k), Ingresos: serieMes.ingresos[i], Gastos: serieMes.gastos[i], Ganancia: serieMes.ganancia[i] })), "financiero_por_mes");
    else if (tab === "clientes") exportarCSV(topClientes.map((t) => ({ Cliente: t.nombre, Pedidos: t.pedidos, "Recaudo real": t.recaudo, Promedio: t.promedio })), "top_clientes_real");
    else if (tab === "articulos") exportarCSV(artD.map((t) => ({ Artículo: t.nombre, Cantidad: t.cantidad })), `top_articulos_${subTabArt}`);
    else if (tab === "proveedores") exportarCSV(resumenProveedores.map((p) => ({ Proveedor: p.nombre, Adeudado: p.total, "Pagado real": p.pagado, Pendiente: p.pendiente, Órdenes: p.ordenes })), "proveedores_real");
  };

  /* ─── Trend indicator ─── */
  const renderTrend = (pct, invertir = false) => {
    if (pct === 0) return <span className="sw-kpi-trend neutro">— 0%</span>;
    const ok = invertir ? pct < 0 : pct > 0;
    return <span className={`sw-kpi-trend ${ok ? "positivo" : "negativo"}`}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
  };

  /* Renderizar gráfica financiera según tipo */
  const ChartFinanciero = tipoGrafFin === "barras" ? Bar : Line;

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <Protegido>
      <div className="sw-page">
        <div className="sw-container">
          <h1 className="sw-titulo-pagina">📊 Dashboard</h1>

          {/* ═══ KPIs ═══ */}
          {!loading && (
            <div className="sw-kpi-grid">
              <div className="sw-kpi-card kpi-ingreso">
                <div className="sw-kpi-label">INGRESOS REALES</div>
                <div className="sw-kpi-valor">{money(kpis.ingresos)}</div>
                {renderTrend(kpis.pctIng)}
              </div>
              <div className="sw-kpi-card kpi-gasto">
                <div className="sw-kpi-label">GASTOS REALES</div>
                <div className="sw-kpi-valor">{money(kpis.gastos)}</div>
                {renderTrend(kpis.pctGas, true)}
              </div>
              <div className="sw-kpi-card kpi-balance">
                <div className="sw-kpi-label">GANANCIA NETA</div>
                <div className="sw-kpi-valor">{money(kpis.ganancia)}</div>
                {renderTrend(kpis.pctGan)}
              </div>
              <div className="sw-kpi-card kpi-movimientos">
                <div className="sw-kpi-label">PEDIDOS CON ABONO</div>
                <div className="sw-kpi-valor">{kpis.pedidos}</div>
                {renderTrend(kpis.pctPed)}
              </div>
            </div>
          )}

          {/* ═══ FILTROS ═══ */}
          <div className="sw-filtros-bar">
            <div className="sw-presets">
              {[
                { id: "mes", label: "Mes actual" }, { id: "mesAnt", label: "Mes anterior" },
                { id: "trimestre", label: "Trimestre" }, { id: "anio", label: "Año" }, { id: "todo", label: "Todo" },
              ].map((p) => (
                <button key={p.id} className={`sw-preset-btn ${presetActivo === p.id ? "activo" : ""}`} onClick={() => aplicarPreset(p.id)}>{p.label}</button>
              ))}
            </div>
            <div className="sw-filtro-sep" />
            <div className="sw-filtro-grupo">
              <span className="sw-filtro-label">Desde</span>
              <input type="date" className="sw-filtro-input" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 135 }} />
            </div>
            <div className="sw-filtro-grupo">
              <span className="sw-filtro-label">Hasta</span>
              <input type="date" className="sw-filtro-input" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 135 }} />
            </div>
          </div>

          {/* ═══ TABS ═══ */}
          <div className="sw-tabs-bar">
            <div className="sw-tabs">
              {[
                { id: "financiero", label: "💰 Financiero" }, { id: "clientes", label: "👥 Clientes" },
                { id: "articulos", label: "📦 Artículos" }, { id: "proveedores", label: "🏢 Proveedores" },
              ].map((t) => (
                <button key={t.id} className={`sw-tab ${tab === t.id ? "activo" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
            <div className="sw-acciones-grupo">
              <button className="sw-btn sw-btn-secundario" onClick={exportarCSVActual}>📥 CSV</button>
            </div>
          </div>

          {/* ═══ CONTENIDO ═══ */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {[1, 2].map((i) => <div key={i} className="sw-skeleton" style={{ height: 200 }} />)}
            </div>
          ) : (
            <div className="sw-report-content">

              {/* ── FINANCIERO ── */}
              {tab === "financiero" && (
                <>
                  <div className="sw-chart-wrapper">
                    <div className="sw-chart-header">
                      <h3 className="sw-chart-titulo" style={{ margin: 0 }}>Tendencia financiera por mes</h3>
                      <div className="sw-toggle-grupo">
                        {[
                          { id: "barras", label: "📊 Barras" },
                          { id: "lineas", label: "📈 Líneas" },
                          { id: "area", label: "🏔️ Área" },
                        ].map((t) => (
                          <button key={t.id} className={`sw-toggle-btn ${tipoGrafFin === t.id ? "activo" : ""}`} onClick={() => setTipoGrafFin(t.id)}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {serieMes.meses.length > 0 ? (
                      <ChartFinanciero data={dataFinanciero} options={chartOptsBase} />
                    ) : (
                      <div className="sw-empty"><div className="sw-empty-icono">📭</div><div className="sw-empty-texto">No hay movimientos en este período</div></div>
                    )}
                  </div>

                  {/* Donut gastos por categoría + Tabla mensual */}
                  <div className="sw-charts-duo">
                    {gastosPorCategoria.length > 0 && (
                      <div className="sw-chart-wrapper">
                        <h3 className="sw-chart-titulo">Distribución de gastos</h3>
                        <div style={{ maxWidth: 320, margin: "0 auto" }}>
                          <Doughnut data={dataDonutGastos} options={doughnutOpts} />
                        </div>
                      </div>
                    )}
                    {serieMes.meses.length > 0 && (
                      <div className="sw-tabla-resumen">
                        <table>
                          <thead><tr><th>Mes</th><th style={{ textAlign: "right" }}>Ingresos</th><th style={{ textAlign: "right" }}>Gastos</th><th style={{ textAlign: "right" }}>Ganancia</th></tr></thead>
                          <tbody>
                            {serieMes.meses.map((k, i) => (
                              <tr key={k}>
                                <td>{nombreMes(k)}</td>
                                <td style={{ textAlign: "right", color: "var(--sw-verde)" }}>{money(serieMes.ingresos[i])}</td>
                                <td style={{ textAlign: "right", color: "var(--sw-rojo)" }}>{money(serieMes.gastos[i])}</td>
                                <td style={{ textAlign: "right", fontWeight: 600, color: serieMes.ganancia[i] >= 0 ? "var(--sw-verde)" : "var(--sw-rojo)" }}>{money(serieMes.ganancia[i])}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── CLIENTES ── */}
              {tab === "clientes" && (
                <>
                  <div className="sw-chart-wrapper">
                    <h3 className="sw-chart-titulo">Top 10 clientes — Recaudo real (abonos)</h3>
                    {topClientes.length > 0 ? (
                      <Bar data={dataTopClientes} options={chartOptsH} />
                    ) : (
                      <div className="sw-empty"><div className="sw-empty-icono">👥</div><div className="sw-empty-texto">No hay ingresos de clientes en este período</div></div>
                    )}
                  </div>
                  {topClientes.length > 0 && (
                    <div className="sw-tabla-resumen">
                      <div className="sw-tabla-nota">💡 Click en un cliente para ver el detalle de sus pedidos.</div>
                      <table>
                        <thead>
                          <tr><th>#</th><th>Cliente</th><th style={{ textAlign: "center" }}>Pedidos</th><th style={{ textAlign: "right" }}>Recaudo real</th><th style={{ textAlign: "right" }}>Promedio</th><th></th></tr>
                        </thead>
                        <tbody>
                          {topClientes.map((c, i) => (
                            <tr key={c.id} className="sw-row-clickable" onClick={() => abrirModalCliente(c)}>
                              <td style={{ fontWeight: 600, color: "var(--sw-texto-secundario)" }}>{i + 1}</td>
                              <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                              <td style={{ textAlign: "center" }}>{c.pedidos}</td>
                              <td style={{ textAlign: "right", fontWeight: 600, color: "var(--sw-verde)" }}>{money(c.recaudo)}</td>
                              <td style={{ textAlign: "right", color: "var(--sw-texto-secundario)" }}>{money(c.promedio)}</td>
                              <td style={{ textAlign: "center" }}><span className="sw-btn-detalle">Ver detalle →</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── ARTÍCULOS ── */}
              {tab === "articulos" && (
                <>
                  <div className="sw-subtabs">
                    <button className={`sw-subtab ${subTabArt === "propios" ? "activo" : ""}`} onClick={() => setSubTabArt("propios")}>🏠 Propios</button>
                    <button className={`sw-subtab ${subTabArt === "proveedor" ? "activo" : ""}`} onClick={() => setSubTabArt("proveedor")}>🏢 Proveedor</button>
                  </div>
                  <div className="sw-charts-duo">
                    <div className="sw-chart-wrapper">
                      <h3 className="sw-chart-titulo">Más alquilados ({subTabArt})</h3>
                      {artD.length > 0 ? <Bar data={dataArtUso} options={chartOptsH} /> : <div className="sw-empty"><div className="sw-empty-texto">Sin datos</div></div>}
                    </div>
                    <div className="sw-chart-wrapper">
                      <h3 className="sw-chart-titulo">Mayor valor cotizado ({subTabArt})</h3>
                      {recD.length > 0 ? <Bar data={dataArtRec} options={chartOptsH} /> : <div className="sw-empty"><div className="sw-empty-texto">Sin datos</div></div>}
                    </div>
                  </div>
                </>
              )}

              {/* ── PROVEEDORES ── */}
              {tab === "proveedores" && (
                <>
                  <div className="sw-charts-duo">
                    <div className="sw-chart-wrapper">
                      <h3 className="sw-chart-titulo">Pagos a proveedores — Dinero real</h3>
                      {resumenProveedores.length > 0 ? <Bar data={dataProv} options={chartOptsBase} /> : <div className="sw-empty"><div className="sw-empty-icono">🏢</div><div className="sw-empty-texto">No hay proveedores en este período</div></div>}
                    </div>
                    {resumenProveedores.length > 0 && (
                      <div className="sw-chart-wrapper">
                        <h3 className="sw-chart-titulo">Distribución de pagos</h3>
                        <div style={{ maxWidth: 320, margin: "0 auto" }}>
                          <Doughnut data={dataDonutProv} options={doughnutOpts} />
                        </div>
                      </div>
                    )}
                  </div>
                  {resumenProveedores.length > 0 && (
                    <div className="sw-tabla-resumen">
                      <table>
                        <thead><tr><th>Proveedor</th><th style={{ textAlign: "center" }}>Órdenes</th><th style={{ textAlign: "right" }}>Adeudado</th><th style={{ textAlign: "right" }}>Pagado real</th><th style={{ textAlign: "right" }}>Pendiente</th></tr></thead>
                        <tbody>
                          {resumenProveedores.map((p, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                              <td style={{ textAlign: "center" }}>{p.ordenes}</td>
                              <td style={{ textAlign: "right" }}>{money(p.total)}</td>
                              <td style={{ textAlign: "right", color: "var(--sw-verde)" }}>{money(p.pagado)}</td>
                              <td style={{ textAlign: "right", color: p.pendiente > 0 ? "var(--sw-rojo)" : "var(--sw-verde)", fontWeight: 600 }}>{p.pendiente > 0 ? money(p.pendiente) : "✓ Pagado"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL DRILL-DOWN CLIENTE ═══ */}
      {modalCliente && (
        <div className="sw-modal-overlay" onClick={() => setModalCliente(null)}>
          <div className="sw-modal-drilldown" onClick={(e) => e.stopPropagation()}>
            <div className="sw-modal-dd-header">
              <div>
                <h2 className="sw-modal-dd-titulo">👤 {modalCliente.nombre}</h2>
                <div className="sw-modal-dd-sub">
                  {modalCliente.pedidos} pedido{modalCliente.pedidos !== 1 ? "s" : ""} · Recaudo real: <strong style={{ color: "var(--sw-verde)" }}>{money(modalCliente.recaudo)}</strong>
                </div>
              </div>
              <button className="sw-modal-dd-cerrar" onClick={() => setModalCliente(null)}>✕</button>
            </div>

            <div className="sw-modal-dd-body">
              {modalCliente.ordenes.length === 0 ? (
                <div className="sw-empty" style={{ padding: 20 }}><div className="sw-empty-texto">No se encontraron órdenes en este período</div></div>
              ) : (
                <div className="sw-modal-dd-lista">
                  {modalCliente.ordenes.map((ord) => (
                    <div key={ord.id} className="sw-modal-dd-orden">
                      <div className="sw-modal-dd-orden-header">
                        <div>
                          <span className="sw-modal-dd-op">OP-{ord.numero || "?"}</span>
                          <span className="sw-modal-dd-fecha">{soloFecha(ord.fecha_evento)}</span>
                          {ord.fueraDeRango && (
                            <span className="sw-badge-fuera">📅 Evento fuera del período</span>
                          )}
                        </div>
                        <div className="sw-modal-dd-acciones">
                          <button className="sw-btn-icono" onClick={() => editarOrden(ord)} title="Editar orden">✏️</button>
                          <button className="sw-btn-icono" onClick={() => pdfOrden(ord)} title="Generar PDF">📄</button>
                          <button className="sw-btn-icono" onClick={() => remisionOrden(ord)} title="Generar Remisión">🚚</button>
                        </div>
                      </div>
                      <div className="sw-modal-dd-finanzas">
                        <div className="sw-modal-dd-stat">
                          <span className="sw-modal-dd-stat-label">Cotizado</span>
                          <span className="sw-modal-dd-stat-valor">{money(ord.total_neto)}</span>
                        </div>
                        <div className="sw-modal-dd-stat">
                          <span className="sw-modal-dd-stat-label">Recibido real</span>
                          <span className="sw-modal-dd-stat-valor" style={{ color: "var(--sw-verde)" }}>{money(ord.ingresosReales)}</span>
                        </div>
                        <div className="sw-modal-dd-stat">
                          <span className="sw-modal-dd-stat-label">Gastos prov.</span>
                          <span className="sw-modal-dd-stat-valor" style={{ color: "var(--sw-rojo)" }}>{money(ord.gastosReales)}</span>
                        </div>
                        <div className="sw-modal-dd-stat ganancia">
                          <span className="sw-modal-dd-stat-label">Ganancia real</span>
                          <span className="sw-modal-dd-stat-valor" style={{ fontWeight: 700, color: ord.gananciaReal >= 0 ? "var(--sw-verde)" : "var(--sw-rojo)" }}>
                            {money(ord.gananciaReal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen financiero total */}
            {modalCliente.ordenes.length > 0 && (() => {
              const totCot = modalCliente.ordenes.reduce((s, o) => s + Number(o.total_neto || 0), 0);
              const totRec = modalCliente.ordenes.reduce((s, o) => s + o.ingresosReales, 0);
              const totGas = modalCliente.ordenes.reduce((s, o) => s + o.gastosReales, 0);
              const totGan = totRec - totGas;
              return (
                <div className="sw-modal-dd-footer">
                  <div className="sw-modal-dd-total">
                    <span>Total cotizado: {money(totCot)}</span>
                    <span style={{ color: "var(--sw-verde)" }}>Recibido: {money(totRec)}</span>
                    <span style={{ color: "var(--sw-rojo)" }}>Gastos prov: {money(totGas)}</span>
                    <span style={{ fontWeight: 700, color: totGan >= 0 ? "var(--sw-verde)" : "var(--sw-rojo)" }}>
                      Ganancia real: {money(totGan)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Protegido>
  );
}