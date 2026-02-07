// src/components/GastosRecurrentesModal.js — SESIÓN 2
import React, { useEffect, useState, useCallback } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";

/* ─── Categorías (mismas que Contabilidad.js) ─── */
const CATEGORIAS_GASTO = [
  "Arriendo", "Servicios públicos", "Transporte / Flete", "Nómina / Salarios",
  "Mantenimiento", "Compra de inventario", "Publicidad", "Impuestos", "Papelería", "Otro gasto"
];
const CATEGORIAS_INGRESO = [
  "Alquiler de artículos", "Garantía", "Transporte cobrado", "Ingreso adicional", "Otro ingreso"
];

const FRECUENCIAS = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
];

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE MODAL
   ═══════════════════════════════════════════════════════════════ */
const GastosRecurrentesModal = ({ abierto, onCerrar, onRecurrentesGenerados }) => {
  const [recurrentes, setRecurrentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  /* ─── Cargar recurrentes ─── */
  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gastos_recurrentes")
      .select("*")
      .order("activo", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) console.error("❌ Error cargando recurrentes:", error);
    setRecurrentes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (abierto) cargar();
  }, [abierto, cargar]);

  /* ─── Crear/Editar recurrente ─── */
  const abrirFormulario = async (item = null) => {
    const esEdicion = !!item;
    const cats = (item?.tipo || "gasto") === "gasto" ? CATEGORIAS_GASTO : [...CATEGORIAS_GASTO, ...CATEGORIAS_INGRESO];

    const { value } = await Swal.fire({
      title: esEdicion ? "Editar recurrente" : "Nuevo gasto/ingreso recurrente",
      html: `
        <div style="text-align:left;font-size:13px;">
          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo</label>
          <select id="sw-tipo" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            <option value="gasto" ${(item?.tipo || "gasto") === "gasto" ? "selected" : ""}>🔴 Gasto recurrente</option>
            <option value="ingreso" ${item?.tipo === "ingreso" ? "selected" : ""}>💚 Ingreso recurrente</option>
          </select>

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Descripción *</label>
          <input id="sw-desc" type="text" value="${(item?.descripcion || "").replace(/"/g, "&quot;")}" placeholder="Ej: Arriendo bodega" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Monto *</label>
          <input id="sw-monto" type="number" value="${item?.monto || ""}" placeholder="0" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Categoría</label>
          <select id="sw-cat" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            <option value="">— Sin categoría —</option>
            <optgroup label="Gastos">
              ${CATEGORIAS_GASTO.map((c) => `<option value="${c}" ${item?.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
            </optgroup>
            <optgroup label="Ingresos">
              ${CATEGORIAS_INGRESO.map((c) => `<option value="${c}" ${item?.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
            </optgroup>
          </select>

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Frecuencia</label>
          <select id="sw-freq" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;">
            ${FRECUENCIAS.map((f) => `<option value="${f.value}" ${(item?.frecuencia || "mensual") === f.value ? "selected" : ""}>${f.label}</option>`).join("")}
          </select>

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Día de cobro/pago (1-28)</label>
          <input id="sw-dia" type="number" min="1" max="28" value="${item?.dia_cobro || 1}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Fecha inicio</label>
          <input id="sw-inicio" type="date" value="${item?.fecha_inicio || new Date().toISOString().slice(0, 10)}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-weight:600;color:#374151;display:block;margin-bottom:4px;">Fecha fin (dejar vacío si es indefinido)</label>
          <input id="sw-fin" type="date" value="${item?.fecha_fin || ""}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: esEdicion ? "💾 Actualizar" : "💾 Crear",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0077B6",
      width: 480,
      preConfirm: () => {
        const desc = document.getElementById("sw-desc").value.trim();
        const monto = document.getElementById("sw-monto").value;
        if (!desc) { Swal.showValidationMessage("La descripción es obligatoria"); return false; }
        if (!monto || parseFloat(monto) <= 0) { Swal.showValidationMessage("El monto debe ser mayor a 0"); return false; }
        return {
          tipo: document.getElementById("sw-tipo").value,
          descripcion: desc,
          monto: parseFloat(monto),
          categoria: document.getElementById("sw-cat").value,
          frecuencia: document.getElementById("sw-freq").value,
          dia_cobro: parseInt(document.getElementById("sw-dia").value) || 1,
          fecha_inicio: document.getElementById("sw-inicio").value,
          fecha_fin: document.getElementById("sw-fin").value || null,
        };
      },
    });
    if (!value) return;

    if (esEdicion) {
      // Editar: solo afecta movimientos FUTUROS (los pasados no se tocan)
      const { error } = await supabase.from("gastos_recurrentes").update(value).eq("id", item.id);
      if (error) return Swal.fire("Error", "No se pudo actualizar", "error");
      Swal.fire({ icon: "success", title: "Actualizado", text: "Los cambios solo afectan movimientos futuros", timer: 2000, showConfirmButton: false });
    } else {
      const { error } = await supabase.from("gastos_recurrentes").insert([{ ...value, activo: true }]);
      if (error) return Swal.fire("Error", "No se pudo crear", "error");
      Swal.fire({ icon: "success", title: "Creado", timer: 1500, showConfirmButton: false });
    }
    cargar();
  };

  /* ─── Toggle activo/inactivo ─── */
  const toggleActivo = async (item) => {
    const nuevoEstado = !item.activo;
    const { error } = await supabase.from("gastos_recurrentes").update({ activo: nuevoEstado }).eq("id", item.id);
    if (error) return Swal.fire("Error", "No se pudo cambiar estado", "error");
    cargar();
  };

  /* ─── Eliminar recurrente ─── */
  const eliminarRecurrente = async (item) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar este recurrente?",
      text: `"${item.descripcion}" — Los movimientos ya generados NO se borran.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    await supabase.from("gastos_recurrentes").delete().eq("id", item.id);
    Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false });
    cargar();
  };

  /* ─── Generar movimientos pendientes de TODOS los recurrentes activos ─── */
  const generarMovimientosPendientes = async () => {
    setGenerando(true);
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);

    const activos = recurrentes.filter((r) => r.activo);
    if (!activos.length) {
      setGenerando(false);
      return Swal.fire("Sin recurrentes", "No hay gastos/ingresos recurrentes activos", "info");
    }

    let totalGenerados = 0;

    for (const rec of activos) {
      // Verificar que no haya pasado la fecha fin
      if (rec.fecha_fin && rec.fecha_fin < hoyStr) continue;

      // Calcular fechas a generar desde ultimo_generado (o fecha_inicio) hasta hoy
      const fechasAGenerar = calcularFechasPendientes(rec, hoy);

      for (const fecha of fechasAGenerar) {
        // Verificar que no exista ya un movimiento para esta fecha + recurrente
        const { data: existe } = await supabase
          .from("movimientos_contables")
          .select("id")
          .eq("recurrente_id", rec.id)
          .eq("fecha", fecha)
          .limit(1);

        if (existe && existe.length > 0) continue;

        // Crear movimiento
        const { error } = await supabase.from("movimientos_contables").insert([{
          tipo: rec.tipo,
          monto: rec.monto,
          descripcion: rec.descripcion,
          categoria: rec.categoria || "",
          fecha: fecha,
          estado: "activo",
          origen: "recurrente",
          recurrente_id: rec.id,
        }]);

        if (!error) totalGenerados++;
      }

      // Actualizar ultimo_generado
      if (fechasAGenerar.length > 0) {
        await supabase.from("gastos_recurrentes")
          .update({ ultimo_generado: fechasAGenerar[fechasAGenerar.length - 1] })
          .eq("id", rec.id);
      }
    }

    setGenerando(false);
    await cargar();

    if (totalGenerados > 0) {
      Swal.fire({ icon: "success", title: `${totalGenerados} movimiento${totalGenerados > 1 ? "s" : ""} generado${totalGenerados > 1 ? "s" : ""}`, timer: 2000, showConfirmButton: false });
      if (onRecurrentesGenerados) onRecurrentesGenerados();
    } else {
      Swal.fire({ icon: "info", title: "Todo al día", text: "No hay movimientos pendientes por generar", timer: 2000, showConfirmButton: false });
    }
  };

  /* ─── Si el modal no está abierto, no renderizar ─── */
  if (!abierto) return null;

  /* ═══ RENDER ═══ */
  return (
    <div className="sw-modal-fondo" onClick={onCerrar}>
      <div className="sw-modal-contenido sw-recurrentes-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sw-modal-header">
          <h2 className="sw-modal-titulo">🔄 Gastos e ingresos recurrentes</h2>
          <button className="sw-modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button className="sw-btn sw-btn-primario" onClick={() => abrirFormulario()}>
            ＋ Nuevo recurrente
          </button>
          <button
            className="sw-btn sw-btn-secundario"
            onClick={generarMovimientosPendientes}
            disabled={generando}
          >
            {generando ? "⏳ Generando..." : "⚡ Generar pendientes"}
          </button>
        </div>

        {/* Lista */}
        <div className="sw-recurrentes-lista">
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>
          ) : recurrentes.length === 0 ? (
            <div className="sw-empty" style={{ padding: 30 }}>
              <div className="sw-empty-icono">📋</div>
              <div className="sw-empty-texto">No hay recurrentes configurados</div>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                Crea uno para registrar automáticamente gastos fijos como arriendo, servicios, nómina...
              </p>
            </div>
          ) : (
            recurrentes.map((r) => (
              <div key={r.id} className={`sw-recurrente-card ${!r.activo ? "inactivo" : ""}`}>
                <div className={`sw-mov-indicador ${r.tipo}`} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: r.activo ? "#111827" : "#9ca3af" }}>
                      {r.descripcion}
                    </span>
                    {!r.activo && <span className="sw-mov-badge editado">pausado</span>}
                    <span className="sw-mov-badge recurrente">{r.frecuencia}</span>
                    {r.categoria && <span className="sw-mov-badge manual">{r.categoria}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    Día {r.dia_cobro} · Desde {r.fecha_inicio}{r.fecha_fin ? ` hasta ${r.fecha_fin}` : " · Indefinido"}
                    {r.ultimo_generado && <span> · Último: {r.ultimo_generado}</span>}
                  </div>
                </div>

                <div className={`sw-mov-monto ${r.tipo}`} style={{ marginRight: 8 }}>
                  {r.tipo === "gasto" ? "-" : "+"}{money(r.monto)}
                </div>

                <div className="sw-mov-acciones">
                  <button
                    className="sw-mov-btn editar"
                    onClick={() => toggleActivo(r)}
                    title={r.activo ? "Pausar" : "Reactivar"}
                  >
                    {r.activo ? "⏸️" : "▶️"}
                  </button>
                  <button className="sw-mov-btn editar" onClick={() => abrirFormulario(r)} title="Editar">
                    ✏️
                  </button>
                  <button className="sw-mov-btn eliminar" onClick={() => eliminarRecurrente(r)} title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        {recurrentes.length > 0 && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 8,
            background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", fontSize: 12, color: "#4b5563",
          }}>
            💡 <strong>Tip:</strong> El botón "Generar pendientes" crea los movimientos que falten hasta hoy según la frecuencia configurada.
            Editar un recurrente solo afecta movimientos futuros — los ya generados no cambian.
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   FUNCIÓN: Calcular fechas pendientes de generación
   ═══════════════════════════════════════════════════════════════ */
function calcularFechasPendientes(rec, hastaFecha) {
  const fechas = [];
  const hoy = hastaFecha || new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);

  // Punto de inicio: último generado + 1 día, o fecha_inicio
  let cursor;
  if (rec.ultimo_generado) {
    cursor = new Date(rec.ultimo_generado);
    cursor.setDate(cursor.getDate() + 1);
  } else {
    cursor = new Date(rec.fecha_inicio);
  }

  // No generar antes de fecha_inicio
  const inicio = new Date(rec.fecha_inicio);
  if (cursor < inicio) cursor = new Date(inicio);

  // Iterar por períodos
  const maxIteraciones = 365; // seguridad
  let iteraciones = 0;

  while (iteraciones < maxIteraciones) {
    // Calcular la próxima fecha de cobro según frecuencia
    const fechaCobro = calcularProximaFecha(cursor, rec.frecuencia, rec.dia_cobro);

    if (!fechaCobro) break;

    const fechaStr = fechaCobro.toISOString().slice(0, 10);

    // No pasar de hoy
    if (fechaStr > hoyStr) break;

    // No pasar de fecha_fin
    if (rec.fecha_fin && fechaStr > rec.fecha_fin) break;

    // No antes de fecha_inicio
    if (fechaStr >= rec.fecha_inicio) {
      fechas.push(fechaStr);
    }

    // Avanzar cursor al día siguiente del cobro
    cursor = new Date(fechaCobro);
    cursor.setDate(cursor.getDate() + 1);
    iteraciones++;
  }

  return fechas;
}

function calcularProximaFecha(desde, frecuencia, diaCobro) {
  const d = new Date(desde);
  const dia = Math.min(diaCobro || 1, 28);

  switch (frecuencia) {
    case "semanal": {
      // Próximo día de la semana que corresponda (usando dia como día de la semana 1=lunes..7=domingo)
      const target = new Date(d);
      target.setDate(d.getDate() + ((7 - d.getDay() + (dia % 7)) % 7 || 7));
      if (target <= d) target.setDate(target.getDate() + 7);
      // Simplificado: generamos en la fecha del cursor si estamos en el día correcto, o avanzamos
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - 1));
    }
    case "quincenal": {
      // Día del cobro en la quincena actual o siguiente
      const y = d.getFullYear(), m = d.getMonth();
      const opcion1 = new Date(y, m, dia);
      const opcion2 = new Date(y, m, Math.min(dia + 15, 28));
      if (opcion1 >= d) return opcion1;
      if (opcion2 >= d) return opcion2;
      return new Date(y, m + 1, dia);
    }
    case "mensual": {
      const y = d.getFullYear(), m = d.getMonth();
      const enEsteMes = new Date(y, m, dia);
      if (enEsteMes >= d) return enEsteMes;
      return new Date(y, m + 1, dia);
    }
    case "bimestral": {
      const y = d.getFullYear(), m = d.getMonth();
      const enEsteMes = new Date(y, m, dia);
      if (enEsteMes >= d) return enEsteMes;
      return new Date(y, m + 2, dia);
    }
    case "trimestral": {
      const y = d.getFullYear(), m = d.getMonth();
      const enEsteMes = new Date(y, m, dia);
      if (enEsteMes >= d) return enEsteMes;
      return new Date(y, m + 3, dia);
    }
    case "anual": {
      const y = d.getFullYear(), m = d.getMonth();
      const enEsteAnio = new Date(y, m, dia);
      if (enEsteAnio >= d) return enEsteAnio;
      return new Date(y + 1, m, dia);
    }
    default:
      return null;
  }
}

export default GastosRecurrentesModal;