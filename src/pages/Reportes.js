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

export default function Reportes() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [movs, setMovs] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clientesMap, setClientesMap] = useState({});
  const [active, setActive] = useState("ingresos_gastos"); // tabs

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
      nombre: clientesMap[id] || id.slice(0, 6),
      valor,
    }));
    return lista.sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [ordenes, clientesMap]);

  // Artículos: top por cantidad y por recaudo
  const resumenArticulos = useMemo(() => {
    const uso = {};     // nombre -> cantidad
    const recaudo = {}; // nombre -> $
    for (const o of ordenes || []) {
      (o.productos || []).forEach((p) => {
        const nombre = p.nombre || "Artículo";
        const cant = Number(p.cantidad || 0);
        const subtotal = Number(p.subtotal || (p.precio || 0) * cant);
        uso[nombre] = (uso[nombre] || 0) + cant;
        recaudo[nombre] = (recaudo[nombre] || 0) + subtotal;
      });
    }
    const topUso = Object.entries(uso).map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
    const topRecaudo = Object.entries(recaudo).map(([nombre, valor]) => ({ nombre, valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 10);
    return { topUso, topRecaudo };
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
    } else if (active === "top_articulos") {
      exportarCSV(resumenArticulos.topUso.map((t) => ({ Artículo: t.nombre, Cantidad: t.cantidad })), "top_articulos_cantidad");
    } else if (active === "recaudo_articulos") {
      exportarCSV(resumenArticulos.topRecaudo.map((t) => ({ Artículo: t.nombre, Recaudo: t.valor })), "top_articulos_recaudo");
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
    } else if (active === "top_articulos") {
      titulo = "Artículos más alquilados";
      rows = resumenArticulos.topUso.map((t) => [t.nombre, t.cantidad]);
    } else if (active === "recaudo_articulos") {
      titulo = "Recaudo por artículo";
      rows = resumenArticulos.topRecaudo.map((t) => [t.nombre, t.valor]);
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
            : active === "top_articulos"
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
  const dataTopUso = {
    labels: resumenArticulos.topUso.map((t) => t.nombre),
    datasets: [{ label: "Cantidad", data: resumenArticulos.topUso.map((t) => t.cantidad), backgroundColor: PALETA.slice(0, resumenArticulos.topUso.length) }],
  };
  const dataTopRecaudo = {
    labels: resumenArticulos.topRecaudo.map((t) => t.nombre),
    datasets: [{ label: "Recaudo ($)", data: resumenArticulos.topRecaudo.map((t) => t.valor), backgroundColor: PALETA.slice(0, resumenArticulos.topRecaudo.length) }],
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
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["ingresos_gastos", "Ingresos vs Gastos"],
            ["top_clientes", "Top clientes (recaudo)"],
            ["top_articulos", "Top artículos (cantidad)"],
            ["recaudo_articulos", "Top artículos (recaudo)"],
          ].map(([k, t]) => (
            <button
              key={k}
              onClick={() => setActive(k)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: active === k ? "#e5e7eb" : "#f9fafb",
              }}
            >
              {t}
            </button>
          ))}
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
          {active === "top_articulos" && (
            <>
              <h3 style={{ textAlign: "center" }}>Artículos más alquilados</h3>
              <Bar data={dataTopUso} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </>
          )}
          {active === "recaudo_articulos" && (
            <>
              <h3 style={{ textAlign: "center" }}>Recaudo por artículo</h3>
              <Bar data={dataTopRecaudo} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </>
          )}
        </div>
      </div>
    </Protegido>
  );
}
