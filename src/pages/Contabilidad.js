// src/pages/Contabilidad.js — SESIÓN 1+2+3: Estructura + Recurrentes + Proveedores
import React, { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "../supabaseClient";
import { exportarCSV } from "../utils/exportarCSV";
import { generarPDFContable } from "../utils/generarPDFContable";
import GastosRecurrentesModal from "../components/GastosRecurrentesModal";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido";
import "../estilos/EstilosGlobales.css";
import "../estilos/ReportesContabilidad.css";

/* ─── Utilidades de fecha ─── */
const soloFecha = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const limitesMes = (date = new Date()) => {
  const y = date.getFullYear(), m = date.getMonth();
  const toYMD = (d) => d.toISOString().slice(0, 10);
  return { desde: toYMD(new Date(y, m, 1)), hasta: toYMD(new Date(y, m + 1, 0)) };
};

const limitesTrimestre = () => {
  const h = new Date(), q = Math.floor(h.getMonth() / 3);
  const toYMD = (d) => d.toISOString().slice(0, 10);
  return { desde: toYMD(new Date(h.getFullYear(), q * 3, 1)), hasta: toYMD(new Date(h.getFullYear(), q * 3 + 3, 0)) };
};

const limitesAnio = () => {
  const y = new Date().getFullYear();
  return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
};

const claveMes = (ymd) => (ymd ? ymd.slice(0, 7) : "");

const nombreMes = (k) => {
  const [y, m] = (k || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-CO", { year: "numeric", month: "long" });
};

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const fechaCorta = (ymd) => {
  if (!ymd) return { dia: "--", mes: "" };
  const parts = ymd.split("-");
  return { dia: parseInt(parts[2], 10), mes: MESES_CORTOS[parseInt(parts[1], 10) - 1] || "" };
};

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

const getPreset = (desde, hasta) => {
  const { desde: ma, hasta: ha } = limitesMes();
  if (desde === ma && hasta === ha) return "mes";
  const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
  const { desde: mp, hasta: hp } = limitesMes(prev);
  if (desde === mp && hasta === hp) return "mesAnt";
  const { desde: td, hasta: th } = limitesTrimestre();
  if (desde === td && hasta === th) return "trimestre";
  const { desde: ad, hasta: ah } = limitesAnio();
  if (desde === ad && hasta === ah) return "anio";
  if (!desde && !hasta) return "todo";
  return "";
};

/* ─── Categorías predefinidas ─── */
const CATEGORIAS_GASTO = [
  "Arriendo", "Servicios públicos", "Transporte / Flete", "Nómina / Salarios",
  "Mantenimiento", "Compra de inventario", "Publicidad", "Impuestos", "Papelería", "Otro gasto"
];
const CATEGORIAS_INGRESO = [
  "Alquiler de artículos", "Garantía", "Transporte cobrado", "Ingreso adicional", "Otro ingreso"
];

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
const Contabilidad = () => {
  const { desde: d0, hasta: h0 } = limitesMes();
  const [desde, setDesde] = useState(d0);
  const [hasta, setHasta] = useState(h0);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroOrigen, setFiltroOrigen] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mesesAbiertos, setMesesAbiertos] = useState({});

  // Resumen de proveedores (pagos pendientes)
  const [proveedoresResumen, setProveedoresResumen] = useState([]);

  // Modal recurrentes
  const [modalRecurrentes, setModalRecurrentes] = useState(false);

  // Datos del período anterior (KPI comparativa)
  const [movsPeriodoAnterior, setMovsPeriodoAnterior] = useState([]);

  /* ─── Cargar movimientos ─── */
  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("movimientos_contables").select("*");
      if (desde) q = q.gte("fecha", desde);
      if (hasta) q = q.lte("fecha", hasta);
      q = q.order("fecha", { ascending: false });
      const { data, error } = await q;
      if (error) { console.error("❌ Error cargando movimientos:", error); setMovimientos([]); setLoading(false); return; }
      const base = data || [];

      // Enriquecer con nombres de cliente y número de orden
      const ordenIds = [...new Set(base.map((m) => m.orden_id).filter(Boolean))];
      let ordenesMap = {};
      if (ordenIds.length) {
        const { data: ordenes } = await supabase.from("ordenes_pedido").select("id, numero, cliente_id").in("id", ordenIds);
        (ordenes || []).forEach((o) => { ordenesMap[o.id] = o; });
      }
      const clienteIds = [...new Set([
        ...base.map((m) => m.cliente_id).filter(Boolean),
        ...Object.values(ordenesMap).map((o) => o.cliente_id).filter(Boolean)
      ])];
      let clientesMap = {};
      if (clienteIds.length) {
        const { data: clientes } = await supabase.from("clientes").select("id, nombre").in("id", clienteIds);
        (clientes || []).forEach((c) => (clientesMap[c.id] = c.nombre));
      }

      const enriquecidos = base.map((m) => {
        const ord = m.orden_id ? ordenesMap[m.orden_id] : null;
        return {
          ...m,
          fecha: soloFecha(m.fecha),
          cliente_nombre: (m.cliente_id && clientesMap[m.cliente_id]) || (ord?.cliente_id && clientesMap[ord.cliente_id]) || "",
          op_numero: ord?.numero || null,
        };
      });
      setMovimientos(enriquecidos);

      // Abrir primer mes por defecto
      if (enriquecidos.length) {
        const primer = claveMes(enriquecidos[0]?.fecha);
        if (primer) setMesesAbiertos((prev) => ({ ...prev, [primer]: true }));
      }
    } catch (err) {
      console.error("❌ Error inesperado:", err);
      setMovimientos([]);
    }
    setLoading(false);
  }, [desde, hasta]);

  useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

  /* ─── Cargar resumen de proveedores (pagos_proveedores de órdenes) ─── */
  useEffect(() => {
    (async () => {
      try {
        let q = supabase.from("ordenes_pedido").select("id, numero, pagos_proveedores, fecha_evento");
        if (desde) q = q.gte("fecha_evento", desde);
        if (hasta) q = q.lte("fecha_evento", hasta);
        const { data } = await q;
        if (!data) { setProveedoresResumen([]); return; }

        // Consolidar por proveedor
        const mapa = {};
        for (const ord of data) {
          for (const pago of (ord.pagos_proveedores || [])) {
            const key = pago.proveedor_nombre || "Sin proveedor";
            if (!mapa[key]) mapa[key] = { nombre: key, total: 0, abonado: 0, ordenes: [] };
            const abonado = (pago.abonos || []).reduce((s, a) => s + Number(a.valor || 0), 0);
            mapa[key].total += Number(pago.total || 0);
            mapa[key].abonado += abonado;
            mapa[key].ordenes.push(ord.numero || ord.id);
          }
        }
        const lista = Object.values(mapa).map((p) => ({ ...p, pendiente: p.total - p.abonado }));
        lista.sort((a, b) => b.pendiente - a.pendiente);
        setProveedoresResumen(lista);
      } catch (err) {
        console.error("❌ Error cargando proveedores:", err);
        setProveedoresResumen([]);
      }
    })();
  }, [desde, hasta]);

  /* ─── Período anterior para comparativa ─── */
  useEffect(() => {
    if (!desde || !hasta) { setMovsPeriodoAnterior([]); return; }
    const d1 = new Date(desde), d2 = new Date(hasta);
    const diff = d2 - d1;
    const antDesde = new Date(d1.getTime() - diff - 86400000);
    const antHasta = new Date(d1.getTime() - 86400000);
    const toYMD = (d) => d.toISOString().slice(0, 10);

    supabase
      .from("movimientos_contables")
      .select("tipo, monto")
      .gte("fecha", toYMD(antDesde))
      .lte("fecha", toYMD(antHasta))
      .then(({ data }) => setMovsPeriodoAnterior(data || []));
  }, [desde, hasta]);

  /* ─── Categorías dinámicas (extraídas de los datos) ─── */
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    for (const m of movimientos) {
      if (m.categoria && m.categoria.trim()) set.add(m.categoria.trim());
    }
    return Array.from(set).sort();
  }, [movimientos]);

  /* ─── Filtros aplicados ─── */
  const movsFiltrados = useMemo(() => {
    let lista = movimientos;
    if (filtroTipo !== "todos") lista = lista.filter((m) => m.tipo === filtroTipo);
    if (filtroCategoria !== "todas") lista = lista.filter((m) => (m.categoria || "").trim() === filtroCategoria);
    if (filtroOrigen !== "todos") lista = lista.filter((m) => (m.origen || "manual") === filtroOrigen);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((m) =>
        (m.cliente_nombre || "").toLowerCase().includes(q) ||
        (m.descripcion || "").toLowerCase().includes(q) ||
        (m.categoria || "").toLowerCase().includes(q) ||
        (m.proveedor_nombre || "").toLowerCase().includes(q) ||
        (m.op_numero || "").toString().toLowerCase().includes(q)
      );
    }
    return lista;
  }, [movimientos, filtroTipo, filtroCategoria, filtroOrigen, busqueda]);

  /* ─── Conteo de filtros activos ─── */
  const filtrosActivos = [
    filtroTipo !== "todos" && { label: filtroTipo === "ingreso" ? "Ingresos" : "Gastos", reset: () => setFiltroTipo("todos") },
    filtroCategoria !== "todas" && { label: filtroCategoria, reset: () => setFiltroCategoria("todas") },
    filtroOrigen !== "todos" && { label: filtroOrigen, reset: () => setFiltroOrigen("todos") },
    busqueda.trim() && { label: `"${busqueda}"`, reset: () => setBusqueda("") },
  ].filter(Boolean);

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const activos = movimientos.filter((m) => m.estado !== "eliminado");
    const ingresos = activos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const gastos = activos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const balance = ingresos - gastos;
    const totalMovs = activos.length;

    const antIng = movsPeriodoAnterior.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const antGas = movsPeriodoAnterior.filter((m) => m.tipo === "gasto").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const antBal = antIng - antGas;

    const pct = (actual, anterior) => {
      if (!anterior) return actual > 0 ? 100 : 0;
      return Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
    };

    return { ingresos, gastos, balance, totalMovs, pctIng: pct(ingresos, antIng), pctGas: pct(gastos, antGas), pctBal: pct(balance, antBal) };
  }, [movimientos, movsPeriodoAnterior]);

  /* ─── Agrupados por mes ─── */
  const agrupados = useMemo(() => {
    const map = {};
    for (const m of movsFiltrados) {
      const k = claveMes(m.fecha);
      if (!map[k]) map[k] = [];
      map[k].push(m);
    }
    return { ordenMeses: Object.keys(map).sort((a, b) => b.localeCompare(a)), porMes: map };
  }, [movsFiltrados]);

  const resumenMes = (lista) => {
    const activos = lista.filter((m) => m.estado !== "eliminado");
    const ingresos = activos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    const gastos = activos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + (Number(m.monto) || 0), 0);
    return { ingresos, gastos, balance: ingresos - gastos };
  };

  /* ─── Toggle mes ─── */
  const toggleMes = (k) => setMesesAbiertos((prev) => ({ ...prev, [k]: !prev[k] }));

  /* ─── Presets ─── */
  const aplicarPreset = (tipo) => {
    switch (tipo) {
      case "mes": { const r = limitesMes(); setDesde(r.desde); setHasta(r.hasta); break; }
      case "mesAnt": { const h = new Date(); h.setMonth(h.getMonth() - 1); const r = limitesMes(h); setDesde(r.desde); setHasta(r.hasta); break; }
      case "trimestre": { const r = limitesTrimestre(); setDesde(r.desde); setHasta(r.hasta); break; }
      case "anio": { const r = limitesAnio(); setDesde(r.desde); setHasta(r.hasta); break; }
      case "todo": { setDesde(""); setHasta(""); break; }
      default: break;
    }
  };

  const presetActivo = getPreset(desde, hasta);

  /* ─── AGREGAR movimiento (modal SweetAlert2) ─── */
  const agregarMovimiento = async () => {
    const { value } = await Swal.fire({
      title: "Nuevo movimiento",
      html: `
        <div style="text-align:left;font-size:13px;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo</label>
          <select id="sw-tipo" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            <option value="ingreso">💚 Ingreso</option>
            <option value="gasto">🔴 Gasto</option>
          </select>
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Monto *</label>
          <input id="sw-monto" type="number" placeholder="0" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Descripción</label>
          <input id="sw-desc" type="text" placeholder="Ej: Pago arriendo local" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Categoría</label>
          <select id="sw-cat" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            <option value="">— Sin categoría —</option>
            <optgroup label="Gastos">
              ${CATEGORIAS_GASTO.map((c) => `<option value="${c}">${c}</option>`).join("")}
            </optgroup>
            <optgroup label="Ingresos">
              ${CATEGORIAS_INGRESO.map((c) => `<option value="${c}">${c}</option>`).join("")}
            </optgroup>
          </select>
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Fecha</label>
          <input id="sw-fecha" type="date" value="${soloFecha(new Date())}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "💾 Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0077B6",
      preConfirm: () => {
        const monto = document.getElementById("sw-monto").value;
        const tipo = document.getElementById("sw-tipo").value;
        const desc = document.getElementById("sw-desc").value;
        const cat = document.getElementById("sw-cat").value;
        const fecha = document.getElementById("sw-fecha").value;
        if (!monto || parseFloat(monto) <= 0) { Swal.showValidationMessage("El monto debe ser mayor a 0"); return false; }
        if (!fecha) { Swal.showValidationMessage("La fecha es obligatoria"); return false; }
        return { tipo, monto: parseFloat(monto), desc, cat, fecha };
      },
    });
    if (!value) return;

    const { error } = await supabase.from("movimientos_contables").insert([{
      tipo: value.tipo,
      monto: value.monto,
      descripcion: value.desc || "",
      categoria: value.cat || "",
      fecha: value.fecha,
      estado: "activo",
      origen: "manual",
    }]);
    if (error) return Swal.fire("Error", "No se pudo guardar el movimiento", "error");
    Swal.fire({ icon: "success", title: "Registrado", timer: 1500, showConfirmButton: false });
    cargarMovimientos();
  };

  /* ─── EDITAR movimiento ─── */
  const editarMovimiento = async (m) => {
    const cats = m.tipo === "gasto" ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;
    const { value: v } = await Swal.fire({
      title: "Editar movimiento",
      html: `
        <div style="text-align:left;font-size:13px;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo</label>
          <select id="sw-tipo" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            <option value="ingreso" ${m.tipo === "ingreso" ? "selected" : ""}>💚 Ingreso</option>
            <option value="gasto" ${m.tipo === "gasto" ? "selected" : ""}>🔴 Gasto</option>
          </select>
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Monto *</label>
          <input id="sw-monto" type="number" value="${m.monto}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Descripción</label>
          <input id="sw-desc" type="text" value="${(m.descripcion || "").replace(/"/g, "&quot;")}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Categoría</label>
          <select id="sw-cat" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            <option value="">— Sin categoría —</option>
            <optgroup label="Gastos">
              ${CATEGORIAS_GASTO.map((c) => `<option value="${c}" ${m.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
            </optgroup>
            <optgroup label="Ingresos">
              ${CATEGORIAS_INGRESO.map((c) => `<option value="${c}" ${m.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
            </optgroup>
          </select>
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Justificación de edición *</label>
          <textarea id="sw-just" placeholder="¿Por qué se edita?" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;min-height:60px;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "💾 Actualizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0077B6",
      preConfirm: () => {
        const monto = document.getElementById("sw-monto").value;
        const just = document.getElementById("sw-just").value;
        if (!monto || !just) { Swal.showValidationMessage("Monto y justificación son obligatorios"); return false; }
        return {
          monto: parseFloat(monto),
          tipo: document.getElementById("sw-tipo").value,
          desc: document.getElementById("sw-desc").value,
          cat: document.getElementById("sw-cat").value,
          just,
        };
      },
    });
    if (!v) return;

    const { error } = await supabase.from("movimientos_contables").update({
      monto: v.monto, descripcion: v.desc, categoria: v.cat, tipo: v.tipo,
      justificacion: v.just, fecha_modificacion: new Date().toISOString(), estado: "editado",
    }).eq("id", m.id);
    if (error) return Swal.fire("Error", "No se pudo editar", "error");
    Swal.fire({ icon: "success", title: "Actualizado", timer: 1500, showConfirmButton: false });
    cargarMovimientos();
  };

  /* ─── ELIMINAR movimiento ─── */
  const borrarMovimiento = async (m) => {
    const { value: code } = await Swal.fire({
      title: "Autorización requerida",
      text: "Ingresa el código para eliminar este movimiento",
      input: "password",
      inputPlaceholder: "Código",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      confirmButtonColor: "#ef4444",
    });
    if (code !== "4860") {
      if (code) Swal.fire("Código incorrecto", "No se autorizó", "error");
      return;
    }
    await supabase.from("movimientos_contables").delete().eq("id", m.id);
    Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false });
    cargarMovimientos();
  };

  /* ─── Exportar CSV (usa el exportarCSV existente con datos raw) ─── */
  const exportarCSVPeriodo = (lista) => {
    const activos = lista.filter((m) => m.estado !== "eliminado");
    if (!activos.length) return Swal.fire("Sin datos", "No hay movimientos para exportar", "info");
    exportarCSV(activos, `contabilidad_${desde || "todo"}_${hasta || "todo"}`);
  };

  /* ─── Exportar PDF ─── */
  const exportarPDF = () => {
    const activos = movimientos.filter((m) => m.estado !== "eliminado");
    if (!activos.length) return Swal.fire("Sin datos", "No hay movimientos para exportar", "info");
    generarPDFContable(activos);
  };

  /* ─── Render trend indicator ─── */
  const renderTrend = (pct) => {
    if (pct === 0) return <span className="sw-kpi-trend neutro">— 0%</span>;
    const clase = pct > 0 ? "positivo" : "negativo";
    const flecha = pct > 0 ? "▲" : "▼";
    return <span className={`sw-kpi-trend ${clase}`}>{flecha} {Math.abs(pct)}%</span>;
  };

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 1000 }}>

          {/* ═══ HEADER ═══ */}
          <div className="sw-header" style={{ marginBottom: 20 }}>
            <h1 className="sw-header-titulo">💰 Panel de Contabilidad</h1>
          </div>

          {/* ═══ KPI CARDS ═══ */}
          {loading ? (
            <div className="sw-kpi-grid">
              {[1, 2, 3, 4].map((i) => <div key={i} className="sw-skeleton sw-skeleton-kpi" />)}
            </div>
          ) : (
            <div className="sw-kpi-grid">
              <div className="sw-kpi-card kpi-ingreso">
                <div className="sw-kpi-label">Ingresos</div>
                <div className="sw-kpi-valor ingreso">{money(kpis.ingresos)}</div>
                {desde && hasta && renderTrend(kpis.pctIng)}
              </div>
              <div className="sw-kpi-card kpi-gasto">
                <div className="sw-kpi-label">Gastos</div>
                <div className="sw-kpi-valor gasto">{money(kpis.gastos)}</div>
                {desde && hasta && renderTrend(kpis.pctGas)}
              </div>
              <div className="sw-kpi-card kpi-balance">
                <div className="sw-kpi-label">Balance neto</div>
                <div className="sw-kpi-valor" style={{ color: kpis.balance >= 0 ? "var(--sw-verde)" : "var(--sw-rojo)" }}>
                  {money(kpis.balance)}
                </div>
                {desde && hasta && renderTrend(kpis.pctBal)}
              </div>
              <div className="sw-kpi-card kpi-pendiente">
                <div className="sw-kpi-label">Movimientos</div>
                <div className="sw-kpi-valor">{kpis.totalMovs}</div>
                <span className="sw-kpi-trend neutro">en el período</span>
              </div>
            </div>
          )}

          {/* ═══ FILTROS ═══ */}
          <div className="sw-filtros-bar">
            {/* Presets */}
            <div className="sw-presets">
              {[
                { id: "mes", label: "Mes actual" },
                { id: "mesAnt", label: "Mes anterior" },
                { id: "trimestre", label: "Trimestre" },
                { id: "anio", label: "Año" },
                { id: "todo", label: "Todo" },
              ].map((p) => (
                <button key={p.id} className={`sw-preset-btn ${presetActivo === p.id ? "activo" : ""}`} onClick={() => aplicarPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="sw-filtro-sep" />

            {/* Fechas */}
            <div className="sw-filtro-grupo">
              <span className="sw-filtro-label">Desde</span>
              <input type="date" className="sw-filtro-input" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 135 }} />
            </div>
            <div className="sw-filtro-grupo">
              <span className="sw-filtro-label">Hasta</span>
              <input type="date" className="sw-filtro-input" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 135 }} />
            </div>

            <div className="sw-filtro-sep" />

            {/* Tipo */}
            <select className="sw-filtro-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="gasto">Solo gastos</option>
            </select>

            {/* Categoría */}
            <select className="sw-filtro-select" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="todas">Todas las categorías</option>
              {categoriasDisponibles.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Origen */}
            <select className="sw-filtro-select" value={filtroOrigen} onChange={(e) => setFiltroOrigen(e.target.value)}>
              <option value="todos">Todo origen</option>
              <option value="manual">Manual</option>
              <option value="automatico">Automático</option>
              <option value="recurrente">Recurrente</option>
              <option value="recepcion">Recepción</option>
            </select>

            {/* Búsqueda */}
            <div className="sw-busqueda">
              <span className="sw-busqueda-icono">🔍</span>
              <input
                type="text"
                placeholder="Buscar cliente, proveedor, descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* ═══ CHIPS DE FILTROS ACTIVOS ═══ */}
          {filtrosActivos.length > 0 && (
            <div className="sw-chips-bar">
              {filtrosActivos.map((f, i) => (
                <span key={i} className="sw-chip">
                  {f.label}
                  <button className="sw-chip-x" onClick={f.reset}>✕</button>
                </span>
              ))}
              <button className="sw-chip-limpiar" onClick={() => {
                setFiltroTipo("todos"); setFiltroCategoria("todas"); setFiltroOrigen("todos"); setBusqueda("");
              }}>
                Limpiar filtros
              </button>
            </div>
          )}

          {/* ═══ ACCIONES ═══ */}
          <div className="sw-acciones-bar" style={{ marginBottom: 16 }}>
            <div className="sw-acciones-grupo">
              <button className="sw-btn sw-btn-primario" onClick={agregarMovimiento}>
                ＋ Agregar movimiento
              </button>
              <button className="sw-btn sw-btn-secundario" onClick={() => setModalRecurrentes(true)} style={{ borderColor: "#8b5cf6", color: "#6d28d9" }}>
                🔄 Recurrentes
              </button>
            </div>
            <div className="sw-acciones-grupo">
              <button className="sw-btn sw-btn-secundario" onClick={() => exportarCSVPeriodo(movimientos)}>
                📥 CSV
              </button>
              <button className="sw-btn sw-btn-secundario" onClick={exportarPDF}>
                📄 PDF
              </button>
            </div>
          </div>

          {/* ═══ RESUMEN DE PROVEEDORES ═══ */}
          {proveedoresResumen.length > 0 && (
            <div className="sw-proveedores-resumen">
              <div className="sw-prov-header" onClick={() => setMesesAbiertos((prev) => ({ ...prev, "__proveedores__": !prev["__proveedores__"] }))}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`sw-mes-flecha ${mesesAbiertos["__proveedores__"] ? "abierto" : ""}`}>▼</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>🏢 Pagos a proveedores</span>
                  <span className="sw-mes-count">{proveedoresResumen.length}</span>
                </div>
                <div className="sw-mes-resumen">
                  <span className="sw-mes-stat" style={{ color: "#4b5563" }}>
                    Total: {money(proveedoresResumen.reduce((s, p) => s + p.total, 0))}
                  </span>
                  <span className="sw-mes-stat ingreso">
                    Pagado: {money(proveedoresResumen.reduce((s, p) => s + p.abonado, 0))}
                  </span>
                  {proveedoresResumen.some((p) => p.pendiente > 0) && (
                    <span className="sw-mes-stat gasto">
                      Pendiente: {money(proveedoresResumen.reduce((s, p) => s + Math.max(0, p.pendiente), 0))}
                    </span>
                  )}
                </div>
              </div>
              {mesesAbiertos["__proveedores__"] && (
                <div className="sw-prov-body">
                  {proveedoresResumen.map((p) => (
                    <div key={p.nombre} className="sw-prov-card">
                      <div className="sw-prov-nombre">{p.nombre}</div>
                      <div className="sw-prov-detalle">
                        <span>{p.ordenes.length} orden{p.ordenes.length !== 1 ? "es" : ""}</span>
                        <span className="sw-prov-monto">Total: {money(p.total)}</span>
                        <span className="sw-prov-monto pagado">Pagado: {money(p.abonado)}</span>
                        {p.pendiente > 0 ? (
                          <span className="sw-prov-monto pendiente">Pendiente: {money(p.pendiente)}</span>
                        ) : (
                          <span className="sw-prov-badge-pagado">✓ Pagado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ LISTADO AGRUPADO POR MES ═══ */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => <div key={i} className="sw-skeleton" style={{ height: 100 }} />)}
            </div>
          ) : agrupados.ordenMeses.length === 0 ? (
            <div className="sw-empty">
              <div className="sw-empty-icono">📭</div>
              <div className="sw-empty-texto">
                {busqueda ? `No hay resultados para "${busqueda}"` : "No hay movimientos en este período"}
              </div>
            </div>
          ) : (
            agrupados.ordenMeses.map((k) => {
              const lista = (agrupados.porMes[k] || []).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
              const r = resumenMes(lista);
              const abierto = !!mesesAbiertos[k];

              return (
                <div key={k} className="sw-mes-grupo sw-animate-in">
                  {/* Header del mes */}
                  <div className="sw-mes-header" onClick={() => toggleMes(k)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`sw-mes-flecha ${abierto ? "abierto" : ""}`}>▼</span>
                      <span className="sw-mes-titulo">{nombreMes(k)}</span>
                      <span className="sw-mes-count">{lista.length}</span>
                    </div>
                    <div className="sw-mes-resumen">
                      <span className="sw-mes-stat ingreso">+{money(r.ingresos)}</span>
                      <span className="sw-mes-stat gasto">-{money(r.gastos)}</span>
                      <span className="sw-mes-stat" style={{ color: r.balance >= 0 ? "var(--sw-verde)" : "var(--sw-rojo)" }}>
                        ={money(r.balance)}
                      </span>
                    </div>
                  </div>

                  {/* Body del mes */}
                  <div className={`sw-mes-body ${abierto ? "abierto" : ""}`}>
                    {lista.map((m) => {
                      const fc = fechaCorta(m.fecha);
                      const esGasto = m.tipo === "gasto";

                      return (
                        <div key={m.id} className="sw-mov-card">
                          <div className={`sw-mov-indicador ${m.tipo}`} />

                          <div className="sw-mov-fecha">
                            <div className="sw-mov-fecha-dia">{fc.dia}</div>
                            <div className="sw-mov-fecha-mes">{fc.mes}</div>
                          </div>

                          <div className="sw-mov-info">
                            <div className="sw-mov-titulo">
                              {m.cliente_nombre || m.descripcion || m.categoria || "Movimiento"}
                            </div>
                            <div className="sw-mov-desc">
                              {m.cliente_nombre && m.descripcion ? m.descripcion
                                : m.categoria ? m.categoria
                                : m.op_numero ? `Orden #${m.op_numero}`
                                : ""}
                            </div>
                            <div className="sw-mov-badges">
                              {m.categoria && <span className="sw-mov-badge categoria">{m.categoria}</span>}
                              {m.estado === "editado" && <span className="sw-mov-badge editado">editado</span>}
                              {m.origen === "automatico" && <span className="sw-mov-badge auto">automático</span>}
                              {m.origen === "recurrente" && <span className="sw-mov-badge recurrente">🔄 recurrente</span>}
                              {m.origen === "recepcion" && <span className="sw-mov-badge recepcion">📦 recepción</span>}
                              {m.proveedor_nombre && <span className="sw-mov-badge proveedor">🏢 {m.proveedor_nombre}</span>}
                              {m.op_numero && <span className="sw-mov-badge auto">OP-{m.op_numero}</span>}
                            </div>
                          </div>

                          <div className={`sw-mov-monto ${m.tipo}`}>
                            {esGasto ? "-" : "+"}{money(Math.abs(Number(m.monto || 0)))}
                          </div>

                          <div className="sw-mov-acciones">
                            {m.estado !== "eliminado" && (
                              <button className="sw-mov-btn editar" onClick={() => editarMovimiento(m)} title="Editar">
                                ✏️
                              </button>
                            )}
                            <button className="sw-mov-btn eliminar" onClick={() => borrarMovimiento(m)} title="Eliminar">
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ MODAL RECURRENTES ═══ */}
      <GastosRecurrentesModal
        abierto={modalRecurrentes}
        onCerrar={() => setModalRecurrentes(false)}
        onRecurrentesGenerados={cargarMovimientos}
      />
    </Protegido>
  );
};

export default Contabilidad;