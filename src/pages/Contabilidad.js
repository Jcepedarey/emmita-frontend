// src/pages/Contabilidad.js
import React, { useEffect, useMemo, useState } from "react";
import supabase from "../supabaseClient";
import { exportarCSV } from "../utils/exportarCSV";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido";

// util fecha
const soloFecha = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const limitesMes = (date = new Date()) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const desde = new Date(y, m, 1);
  const hasta = new Date(y, m + 1, 0);
  const toYMD = (d) => d.toISOString().slice(0, 10);
  return { desde: toYMD(desde), hasta: toYMD(hasta) };
};
const claveMes = (ymd) => (ymd ? ymd.slice(0, 7) : "");
const nombreMes = (k) => {
  const [y, m] = (k || "").split("-").map(Number);
  const f = new Date(y, (m || 1) - 1, 1);
  return f.toLocaleDateString("es-CO", { year: "numeric", month: "long" });
};

const Contabilidad = () => {
  const { desde: d0, hasta: h0 } = limitesMes();
  const [desde, setDesde] = useState(d0);
  const [hasta, setHasta] = useState(h0);
  const [movimientos, setMovimientos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos|ingreso|gasto

  useEffect(() => { cargarMovimientos(); /* eslint-disable-next-line */ }, [desde, hasta]);

  const cargarMovimientos = async () => {
    let q = supabase.from("movimientos_contables").select("*");
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);
    q = q.order("fecha", { ascending: false });
    const { data, error } = await q;
    if (error) { console.error("❌ Error cargando movimientos:", error); setMovimientos([]); return; }
    const base = data || [];

    // Traer nombres de cliente (desde el propio movimiento o desde la orden)
    const ordenIds = Array.from(new Set(base.map((m) => m.orden_id).filter(Boolean)));
    let ordenesMap = {};
    if (ordenIds.length) {
      const { data: ordenes } = await supabase
        .from("ordenes_pedido")
        .select("id, numero, fecha_evento, cliente_id")
        .in("id", ordenIds);
      (ordenes || []).forEach((o) => { ordenesMap[o.id] = { numero: o.numero, cliente_id: o.cliente_id }; });
    }
    const idsMov = base.map((m) => m.cliente_id).filter(Boolean);
    const idsOrd = Object.values(ordenesMap).map((o) => o.cliente_id).filter(Boolean);
    const clienteIds = Array.from(new Set([...idsMov, ...idsOrd]));
    let clientesMap = {};
    if (clienteIds.length) {
      const { data: clientes } = await supabase.from("clientes").select("id, nombre").in("id", clienteIds);
      (clientes || []).forEach((c) => (clientesMap[c.id] = c.nombre));
    }

    const enriquecidos = base.map((m) => {
      const ord = m.orden_id ? ordenesMap[m.orden_id] : null;
      const nombreCliente =
        (m.cliente_id && clientesMap[m.cliente_id]) ||
        (ord && ord.cliente_id && clientesMap[ord.cliente_id]) ||
        null;
      return {
        ...m,
        fecha: soloFecha(m.fecha),
        cliente_nombre: nombreCliente || "—",
        op_numero: ord?.numero || null,
      };
    });
    setMovimientos(enriquecidos);
  };

  // Alta manual
  const [form, setForm] = useState({ tipo: "ingreso", monto: "", descripcion: "", categoria: "" });
  const guardarMovimiento = async () => {
    const monto = parseFloat(form.monto || 0);
    if (!monto || !form.tipo) return alert("Completa el tipo y monto");
    const nuevo = {
      tipo: form.tipo,
      monto,
      descripcion: form.descripcion || "",
      categoria: form.categoria || "",
      fecha: new Date().toISOString().split("T")[0],
      estado: "activo",
    };
    const { error } = await supabase.from("movimientos_contables").insert([nuevo]);
    if (error) return console.error("❌ Error al guardar:", error);
    setForm({ tipo: "ingreso", monto: "", descripcion: "", categoria: "" });
    cargarMovimientos();
  };

  // Editar / Eliminar
  const editarMovimiento = async (m) => {
    const { value: v } = await Swal.fire({
      title: "Editar movimiento",
      html:
        `<input id="monto" class="swal2-input" type="number" value="${m.monto}" placeholder="Monto">` +
        `<input id="desc" class="swal2-input" value="${m.descripcion || ""}" placeholder="Descripción">` +
        `<input id="cat" class="swal2-input" value="${m.categoria || ""}" placeholder="Categoría">` +
        `<select id="tipo" class="swal2-input">
          <option value="ingreso" ${m.tipo === "ingreso" ? "selected" : ""}>Ingreso</option>
          <option value="gasto" ${m.tipo === "gasto" ? "selected" : ""}>Gasto</option>
        </select>` +
        `<textarea id="just" class="swal2-textarea" placeholder="Justificación de la edición"></textarea>`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const monto = document.getElementById("monto").value;
        const desc = document.getElementById("desc").value;
        const cat = document.getElementById("cat").value;
        const tipo = document.getElementById("tipo").value;
        const just = document.getElementById("just").value;
        if (!monto || !just) { Swal.showValidationMessage("Monto y justificación son obligatorios"); return false; }
        return { monto, desc, cat, tipo, just };
      },
    });
    if (!v) return;
    const { error } = await supabase
      .from("movimientos_contables")
      .update({
        monto: parseFloat(v.monto),
        descripcion: v.desc,
        categoria: v.cat,
        tipo: v.tipo,
        justificacion: v.just,
        fecha_modificacion: new Date().toISOString(),
        estado: "editado",
      })
      .eq("id", m.id);
    if (error) return Swal.fire("Error", "No se pudo editar", "error");
    Swal.fire("✅ Editado", "Actualizado correctamente", "success");
    cargarMovimientos();
  };
  const borrarMovimiento = async (m) => {
    const { value: code } = await Swal.fire({
      title: "Código de autorización",
      input: "password",
      inputLabel: "Ingresa el código para borrar definitivamente",
      inputPlaceholder: "Código secreto",
      showCancelButton: true,
    });
    if (code !== "4860") {
      if (code) Swal.fire("❌ Código incorrecto", "No se autorizó el borrado", "error");
      return;
    }
    await supabase.from("movimientos_contables").delete().eq("id", m.id);
    Swal.fire("✅ Borrado", "El movimiento fue eliminado", "success");
    cargarMovimientos();
  };

  const movimientosFiltradosTipo =
    filtroTipo === "todos" ? movimientos : movimientos.filter((m) => m.tipo === filtroTipo);

  const agrupados = useMemo(() => {
    const map = {};
    for (const m of movimientosFiltradosTipo) {
      const k = claveMes(m.fecha);
      if (!map[k]) map[k] = [];
      map[k].push(m);
    }
    const ordenMeses = Object.keys(map).sort((a, b) => (a < b ? 1 : -1));
    return { ordenMeses, porMes: map };
  }, [movimientosFiltradosTipo]);

  const resumenMes = (lista) => {
    const ingresos = lista.filter((m) => m.tipo === "ingreso" && m.estado !== "eliminado")
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const gastos = lista.filter((m) => m.tipo === "gasto" && m.estado !== "eliminado")
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    return { ingresos, gastos, balance: ingresos - gastos };
  };

  const exportarCSVMes = (lista, nombreArchivo) => {
    const rows = lista.filter((m) => m.estado === "activo" || m.estado === "editado")
      .map((m) => ({
        Fecha: m.fecha,
        Cliente: m.cliente_nombre || "",
        Tipo: m.tipo,
        Descripción: m.descripcion || "",
        Monto: (m.tipo === "gasto" ? -1 : 1) * Number(m.monto || 0),
      }));
    exportarCSV(rows, nombreArchivo);
  };

  const setMesActual = () => { const { desde, hasta } = limitesMes(new Date()); setDesde(desde); setHasta(hasta); };
  const setMesAnterior = () => { const h = new Date(); const p = new Date(h.getFullYear(), h.getMonth() - 1, 15); const { desde, hasta } = limitesMes(p); setDesde(desde); setHasta(hasta); };
  const verTodo = () => { setDesde(""); setHasta(""); };

  return (
    <Protegido>
      <div style={{ padding: "1rem", maxWidth: 1000, margin: "auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>💰 Panel de Contabilidad</h2>

        {/* Filtros */}
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div><label>Desde</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
          <div><label>Hasta</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          <button onClick={setMesActual}>Mes actual</button>
          <button onClick={setMesAnterior}>Mes anterior</button>
          <button onClick={verTodo}>Ver todo</button>
        </div>

        {/* Alta manual */}
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Agregar ingreso o gasto</h3>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ width: "100%", marginBottom: 8, padding: 8 }}>
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
          <input type="number" placeholder="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} style={{ width: "100%", marginBottom: 8, padding: 8 }} />
          <input type="text" placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={{ width: "100%", marginBottom: 8, padding: 8 }} />
          <input type="text" placeholder="Categoría (opcional)" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={{ width: "100%", marginBottom: 8, padding: 8 }} />
          <button onClick={guardarMovimiento} style={{ width: "100%", padding: "10px", backgroundColor: "#4caf50", color: "white" }}>Guardar movimiento</button>
        </div>

        {/* Filtro por tipo */}
        <div style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
          <button onClick={() => setFiltroTipo("todos")} style={{ padding: "6px 10px", background: filtroTipo === "todos" ? "#ddd" : "#f2f2f2" }}>Todos</button>
          <button onClick={() => setFiltroTipo("ingreso")} style={{ padding: "6px 10px", background: filtroTipo === "ingreso" ? "#ddd" : "#f2f2f2" }}>Ingresos</button>
          <button onClick={() => setFiltroTipo("gasto")} style={{ padding: "6px 10px", background: filtroTipo === "gasto" ? "#ddd" : "#f2f2f2" }}>Gastos</button>
        </div>

        {/* AGRUPADO POR MES */}
        <div style={{ marginTop: "1.5rem" }}>
          {agrupados.ordenMeses.length === 0 && <p>No hay movimientos en este rango.</p>}

          {agrupados.ordenMeses.map((k) => {
            const lista = (agrupados.porMes[k] || []).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
            const r = resumenMes(lista);

            return (
              <div key={k} style={{ marginBottom: 24, background: "#fafafa", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h3 style={{ margin: 0 }}>{nombreMes(k)}</h3>
                  <div style={{ textAlign: "right" }}>
                    <div><strong>Ingresos:</strong> <span style={{ color: "green" }}>${r.ingresos.toLocaleString("es-CO")}</span></div>
                    <div><strong>Gastos:</strong> <span style={{ color: "red" }}>${r.gastos.toLocaleString("es-CO")}</span></div>
                    <div><strong>Balance:</strong> <span style={{ color: r.balance >= 0 ? "green" : "red" }}>${r.balance.toLocaleString("es-CO")}</span></div>
                    <button style={{ marginTop: 6 }} onClick={() => exportarCSVMes(lista, `extracto_${k}`)}>Exportar CSV del mes</button>
                  </div>
                </div>

                <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#e7eef9" }}>
                      <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Fecha</th>
                      <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Cliente</th>
                      <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Descripción</th>
                      <th style={{ textAlign: "right", padding: 6, borderBottom: "1px solid #ddd" }}>Valor</th>
                      <th style={{ textAlign: "center", padding: 6, borderBottom: "1px solid #ddd", width: 90 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((m) => (
                      <tr key={m.id} style={{ background: m.estado === "eliminado" ? "#ffe6e6" : "white" }}>
                        <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{m.fecha}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{m.cliente_nombre || "—"}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{m.descripcion || "—"}</td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0", textAlign: "right", color: m.tipo === "ingreso" ? "green" : "red" }}>
                          {(m.tipo === "gasto" ? -1 : 1) * Number(m.monto || 0) < 0 ? "-" : ""}${Math.abs(Number(m.monto || 0)).toLocaleString("es-CO")}
                        </td>
                        <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                          {m.estado !== "eliminado" && (
                            <button onClick={() => editarMovimiento(m)} title="Editar" style={{ background: "#2196f3", color: "#fff", border: "none", borderRadius: 5, padding: "3px 8px", marginRight: 6, cursor: "pointer" }}>✏️</button>
                          )}
                          <button onClick={() => borrarMovimiento(m)} title="Eliminar definitivamente" style={{ background: "transparent", color: "#f00", fontSize: "1rem", cursor: "pointer" }}>❌</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </Protegido>
  );
};
export default Contabilidad;
