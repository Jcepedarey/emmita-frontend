// src/pages/Reportes.js
import React, { useEffect, useMemo, useState } from "react";
import supabase from "../supabaseClient";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { exportarCSV } from "../utils/exportarCSV";
import Protegido from "../components/Protegido";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ym = (d) => (d ? String(d).slice(0, 7) : "");
const nombreMes = (k) => {
  const [y, m] = (k || "").split("-").map(Number);
  const f = new Date(y, (m || 1) - 1, 1);
  return f.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
};

// paleta suave
const PALETA = [
  "rgba(59,130,246,0.5)",  // azul
  "rgba(16,185,129,0.5)",  // verde
  "rgba(244,114,182,0.5)", // rosado
  "rgba(234,179,8,0.5)",   // amarillo
  "rgba(147,197,253,0.5)", // azul claro
  "rgba(167,139,250,0.5)", // violeta
  "rgba(252,165,165,0.5)", // rojo suave
  "rgba(110,231,183,0.5)", // verde menta
  "rgba(251,191,36,0.5)",  // ámbar
  "rgba(196,181,253,0.5)", // lavanda
];

// Descompone una lista de items (de una orden) en una lista plana
// respetando grupos: multiplica cantidades de sub-ítems por la cantidad del grupo.
function flattenItems(items = []) {
  const out = [];
  const walk = (list, factor = 1) => {
    for (const it of list || []) {
      // grupo
      if (it?.es_grupo && Array.isArray(it.productos)) {
        const grupoCant = Number(it.cantidad || 0) || 0;
        const nuevoFactor = factor * (grupoCant || 1);
        walk(it.productos, nuevoFactor);
      } else {
        // ítem suelto (propio o proveedor)
        const cantOriginal = Number(it?.cantidad || 0);
        const precio = Number(it?.precio || 0);
        const baseSubtotal = Number(
          it?.subtotal != null ? it.subtotal : (precio * cantOriginal)
        );
        out.push({
          nombre: it?.nombre || "Artículo",
          cantidad: isFinite(cantOriginal * factor) ? cantOriginal * factor : 0,
          recaudo: isFinite(baseSubtotal * factor) ? baseSubtotal * factor : 0,
          es_proveedor: !!it?.es_proveedor,
        });
      }
    }
  };
  walk(items, 1);
  return out;
}

export default function Reportes() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [movs, setMovs] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clientesMap, setClientesMap] = useState({});
  const [active, setActive] = useState("ingresos_gastos"); // disponibles: ingresos_gastos | top_clientes | top_articulos_propios | top_articulos_proveedor | recaudo_articulos_propios | recaudo_articulos_proveedor


  // Carga datos filtrados por fecha
  useEffect(() => {
    (async () => {
      // movimientos contables (ingresos/gastos por mes)
      let q = supabase.from("movimientos_contables").select("*");
      if (desde) q = q.gte("fecha", desde);
      if (hasta) q = q.lte("fecha", hasta);
      q = q.order("fecha", { ascending: true });
      const { data: m } = await q;
      setMovs(m || []);

      // órdenes (para top clientes/arts y recaudo)
      let q2 = supabase.from("ordenes_pedido").select("id, cliente_id, fecha_evento, total_neto, productos");
      if (desde) q2 = q2.gte("fecha_evento", desde);
      if (hasta) q2 = q2.lte("fecha_evento", hasta);
      q2 = q2.order("fecha_evento", { ascending: true });
      const { data: o } = await q2;
      setOrdenes(o || []);
    })();
  }, [desde, hasta]);

  // nombres de clientes
  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set((ordenes || []).map((o) => o.cliente_id).filter(Boolean)));
      if (!ids.length) return setClientesMap({});
      const { data: clientes } = await supabase.from("clientes").select("id,nombre").in("id", ids);
      const m = {}; (clientes || []).forEach((c) => (m[c.id] = c.nombre));
      setClientesMap(m);
    })();
  }, [ordenes]);

  // Serie: Ingresos vs Gastos por mes (barras)
  const serieMes = useMemo(() => {
    const map = {};
    for (const m of movs || []) {
      const k = ym(m.fecha);
      if (!k) continue;
      if (!map[k]) map[k] = { ingresos: 0, gastos: 0 };
      if (m.tipo === "ingreso") map[k].ingresos += Number(m.monto || 0);
      if (m.tipo === "gasto") map[k].gastos += Number(m.monto || 0);
    }
    const meses = Object.keys(map).sort(); // asc
    return {
      meses,
      labels: meses.map(nombreMes),
      ingresos: meses.map((k) => map[k].ingresos),
      gastos: meses.map((k) => map[k].gastos),
    };
  }, [movs]);

  // Top clientes por recaudo ($)
  const topClientesRecaudo = useMemo(() => {
    const acum = {};
    for (const o of ordenes || []) {
      const id = o.cliente_id;
      if (!id) continue;
      acum[id] = (acum[id] || 0) + Number(o.total_neto || 0);
    }
    const lista = Object.entries(acum).map(([id, valor]) => ({
      nombre: (clientesMap[id] && String(clientesMap[id]).trim()) ? clientesMap[id] : "(Sin nombre)",
      valor,
    }));
    return lista.sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [ordenes, clientesMap]);

  // Artículos: top por cantidad y por recaudo (propios vs proveedor)
const resumenArticulos = useMemo(() => {
  const usoPropios = {};     // nombre -> cantidad
  const usoProveedor = {};   // nombre -> cantidad
  const recPropios = {};     // nombre -> $
  const recProveedor = {};   // nombre -> $

  for (const o of ordenes || []) {
    const flat = flattenItems(o.productos || []);
    for (const it of flat) {
      const key = it.nombre;
      if (!key) continue;
      if (it.es_proveedor) {
        usoProveedor[key] = (usoProveedor[key] || 0) + Number(it.cantidad || 0);
        recProveedor[key] = (recProveedor[key] || 0) + Number(it.recaudo || 0);
      } else {
        usoPropios[key] = (usoPropios[key] || 0) + Number(it.cantidad || 0);
        recPropios[key] = (recPropios[key] || 0) + Number(it.recaudo || 0);
      }
    }
  }

  const toTop = (map, campo) =>
    Object.entries(map)
      .map(([nombre, v]) => ({ nombre, [campo]: v }))
      .sort((a, b) => (b[campo] - a[campo]))
      .slice(0, 10);

  const topUsoPropios     = toTop(usoPropios, "cantidad");
  const topUsoProveedor   = toTop(usoProveedor, "cantidad");
  const topRecaudoPropios = toTop(recPropios, "valor");
  const topRecaudoProv    = toTop(recProveedor, "valor");

  return {
    topUsoPropios,
    topUsoProveedor,
    topRecaudoPropios,
    topRecaudoProv,
  };
}, [ordenes]);

  // Helpers export
  const exportarCSVActual = () => {
    if (active === "ingresos_gastos") {
      const rows = (serieMes.meses || []).map((k, i) => ({
        Mes: nombreMes(k),
        Ingresos: serieMes.ingresos[i],
        Gastos: serieMes.gastos[i],
        Balance: serieMes.ingresos[i] - serieMes.gastos[i],
      }));
      exportarCSV(rows, "ingresos_gastos");
    } else if (active === "top_clientes") {
      exportarCSV(topClientesRecaudo.map((t) => ({ Cliente: t.nombre, Recaudo: t.valor })), "top_clientes_recaudo");
    } else if (active === "top_articulos_propios") {
  exportarCSV(
    resumenArticulos.topUsoPropios.map((t) => ({ Artículo: t.nombre, Cantidad: t.cantidad })),
    "top_articulos_propios"
  );
} else if (active === "top_articulos_proveedor") {
  exportarCSV(
    resumenArticulos.topUsoProveedor.map((t) => ({ Artículo: t.nombre, Cantidad: t.cantidad })),
    "top_articulos_proveedor"
  );
} else if (active === "recaudo_articulos_propios") {
  exportarCSV(
    resumenArticulos.topRecaudoPropios.map((t) => ({ Artículo: t.nombre, Recaudo: t.valor })),
    "recaudo_articulos_propios"
  );
} else if (active === "recaudo_articulos_proveedor") {
  exportarCSV(
    resumenArticulos.topRecaudoProv.map((t) => ({ Artículo: t.nombre, Recaudo: t.valor })),
    "recaudo_articulos_proveedor"
  );
}
  };
  const exportarPDFActual = () => {
  let titulo = "";
  let rows = [];
  if (active === "ingresos_gastos") {
    titulo = "Ingresos vs Gastos por mes";
    rows = (serieMes.meses || []).map((k, i) => [nombreMes(k), serieMes.ingresos[i], serieMes.gastos[i], serieMes.ingresos[i] - serieMes.gastos[i]]);
  } else if (active === "top_clientes") {
    titulo = "Top clientes por recaudo";
    rows = topClientesRecaudo.map((t) => [t.nombre, t.valor]);
  } else if (active === "top_articulos_propios") {
    titulo = "Artículos más alquilados (Propios)";
    rows = resumenArticulos.topUsoPropios.map((t) => [t.nombre, t.cantidad]);
  } else if (active === "top_articulos_proveedor") {
    titulo = "Artículos más alquilados (Proveedor)";
    rows = resumenArticulos.topUsoProveedor.map((t) => [t.nombre, t.cantidad]);
  } else if (active === "recaudo_articulos_propios") {
    titulo = "Recaudo por artículo (Propios)";
    rows = resumenArticulos.topRecaudoPropios.map((t) => [t.nombre, t.valor]);
  } else if (active === "recaudo_articulos_proveedor") {
    titulo = "Recaudo por artículo (Proveedor)";
    rows = resumenArticulos.topRecaudoProv.map((t) => [t.nombre, t.valor]);
  }

  // Si no hay filas, poner un placeholder legible por tipo de reporte
  if (!rows.length) {
    if (active === "ingresos_gastos") {
      rows = [["Sin datos", "—", "—", "—"]];
    } else if (active === "top_clientes") {
      rows = [["Sin datos", "—"]];
    } else if (active === "top_articulos_propios" || active === "top_articulos_proveedor") {
      rows = [["Sin datos", "—"]]; // Artículo | Cantidad
    } else {
      // recaudo_articulos_propios | recaudo_articulos_proveedor
      rows = [["Sin datos", "—"]]; // Artículo | Recaudo ($)
    }
  }

  const w = window.open("", "print"); 
  if (!w) return;
  w.document.write(`
    <html><head><title>${titulo}</title>
    <style>
      body{font-family:Arial; padding:12px;}
      h2{margin:0 0 10px 0}
      table{width:100%; border-collapse:collapse;}
      th,td{border:1px solid #ddd; padding:6px; text-align:left;}
      th{background:#eef2ff}
    </style></head><body>
    <h2>${titulo}</h2>
    <div>Rango: ${desde || "—"} a ${hasta || "—"}</div>
    <table>
      <thead>${
        active === "ingresos_gastos"
          ? "<tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr>"
          : active === "top_clientes"
          ? "<tr><th>Cliente</th><th>Recaudo ($)</th></tr>"
          : (active === "top_articulos_propios" || active === "top_articulos_proveedor")
          ? "<tr><th>Artículo</th><th>Cantidad</th></tr>"
          : "<tr><th>Artículo</th><th>Recaudo ($)</th></tr>"
      }</thead>
      <tbody>
        ${rows.map((r) => `<tr>${r.map((c) => `<td>${typeof c === "number" ? c.toLocaleString("es-CO") : c}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
    <script>window.print(); setTimeout(()=>window.close(), 300);</script>
    </body></html>
  `);
  w.document.close();
};

  // datasets por pestaña
  const dataIngresosGastos = {
    labels: serieMes.labels,
    datasets: [
      { label: "Ingresos", data: serieMes.ingresos, backgroundColor: PALETA[0] },
      { label: "Gastos", data: serieMes.gastos, backgroundColor: PALETA[2] },
    ],
  };
  const dataTopClientes = {
    labels: topClientesRecaudo.map((t) => t.nombre),
    datasets: [{ label: "Recaudo ($)", data: topClientesRecaudo.map((t) => t.valor), backgroundColor: PALETA.slice(0, topClientesRecaudo.length) }],
  };
  const dataTopUsoPropios = {
  labels: resumenArticulos.topUsoPropios.map((t) => t.nombre),
  datasets: [{ label: "Cantidad (propios)", data: resumenArticulos.topUsoPropios.map((t) => t.cantidad), backgroundColor: PALETA.slice(0, resumenArticulos.topUsoPropios.length) }],
};

const dataTopUsoProveedor = {
  labels: resumenArticulos.topUsoProveedor.map((t) => t.nombre),
  datasets: [{ label: "Cantidad (proveedor)", data: resumenArticulos.topUsoProveedor.map((t) => t.cantidad), backgroundColor: PALETA.slice(0, resumenArticulos.topUsoProveedor.length) }],
};

const dataTopRecaudoPropios = {
  labels: resumenArticulos.topRecaudoPropios.map((t) => t.nombre),
  datasets: [{ label: "Recaudo ($) propios", data: resumenArticulos.topRecaudoPropios.map((t) => t.valor), backgroundColor: PALETA.slice(0, resumenArticulos.topRecaudoPropios.length) }],
};

const dataTopRecaudoProv = {
  labels: resumenArticulos.topRecaudoProv.map((t) => t.nombre),
  datasets: [{ label: "Recaudo ($) proveedor", data: resumenArticulos.topRecaudoProv.map((t) => t.valor), backgroundColor: PALETA.slice(0, resumenArticulos.topRecaudoProv.length) }],
};

  // presets
  const setMesActual = () => {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    setDesde(new Date(y, m, 1).toISOString().slice(0, 10));
    setHasta(new Date(y, m + 1, 0).toISOString().slice(0, 10));
  };

  return (
    <Protegido>
      <div style={{ padding: "1rem", maxWidth: 1100, margin: "auto" }}>
        <h2 style={{ textAlign: "center" }}>Reportes y Estadísticas</h2>

        {/* Filtro global */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginTop: 12 }}>
          <div><label>Desde</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
          <div><label>Hasta</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          <button onClick={() => { setDesde(""); setHasta(""); }}>Ver todo</button>
          <button onClick={setMesActual}>Mes actual</button>
        </div>

        {/* Pestañas */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
  <button onClick={() => setActive("ingresos_gastos")}>Ingresos vs Gastos</button>
  <button onClick={() => setActive("top_clientes")}>Top clientes</button>
  <button onClick={() => setActive("top_articulos_propios")}>Top artículos (Propios)</button>
  <button onClick={() => setActive("top_articulos_proveedor")}>Top artículos (Proveedor)</button>
  <button onClick={() => setActive("recaudo_articulos_propios")}>Recaudo por artículo (Propios)</button>
  <button onClick={() => setActive("recaudo_articulos_proveedor")}>Recaudo por artículo (Proveedor)</button>

  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
    <button onClick={exportarCSVActual}>Exportar CSV</button>
    <button onClick={exportarPDFActual}>Exportar PDF</button>
  </div>
</div>

        {/* Contenido de pestaña */}
        <div style={{ marginTop: 12, background: "#f8f8f8", padding: 12, borderRadius: 10 }}>
          {active === "ingresos_gastos" && (
            <>
              <h3 style={{ textAlign: "center" }}>Ingresos vs Gastos por mes</h3>
              <Bar data={dataIngresosGastos} options={{ responsive: true }} />
            </>
          )}
          {active === "top_clientes" && (
            <>
              <h3 style={{ textAlign: "center" }}>Top clientes por recaudo</h3>
              <Bar data={dataTopClientes} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </>
          )}
          {active === "top_articulos_propios" && <Bar data={dataTopUsoPropios} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
{active === "top_articulos_proveedor" && <Bar data={dataTopUsoProveedor} options={{ responsive: true, plugins: { legend: { display: false } } }} />}

{active === "recaudo_articulos_propios" && <Bar data={dataTopRecaudoPropios} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
{active === "recaudo_articulos_proveedor" && <Bar data={dataTopRecaudoProv} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
        </div>
      </div>
    </Protegido>
  );
}
