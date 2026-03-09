// src/utils/generarRecurrentes.js
// Función reutilizable para generar movimientos recurrentes pendientes.
// Se usa desde Contabilidad.js (automático al abrir) y GastosRecurrentesModal.js (botón manual).

import supabase from "../supabaseClient";

/* ═══════════════════════════════════════════════════════════════
   Calcular fechas pendientes de generación para un recurrente
   ═══════════════════════════════════════════════════════════════ */
function calcularFechasPendientes(rec, hastaFecha) {
  const fechas = [];
  const hoy = hastaFecha || new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);

  let cursor;
  if (rec.ultimo_generado) {
    cursor = new Date(rec.ultimo_generado);
    cursor.setDate(cursor.getDate() + 1);
  } else {
    const fi = new Date(rec.fecha_inicio);
    cursor = new Date(fi.getFullYear(), fi.getMonth(), 1);
  }

  const maxIteraciones = 365;
  let iteraciones = 0;

  while (iteraciones < maxIteraciones) {
    const fechaCobro = calcularProximaFecha(cursor, rec.frecuencia, rec.dia_cobro);
    if (!fechaCobro) break;

    const fechaStr = fechaCobro.toISOString().slice(0, 10);
    if (fechaStr > hoyStr) break;
    if (rec.fecha_fin && fechaStr > rec.fecha_fin) break;

    const fechaCobroDate = new Date(fechaStr);
    const inicioDate = new Date(rec.fecha_inicio);
    const mismoMesOPosterior =
      fechaCobroDate.getFullYear() > inicioDate.getFullYear() ||
      (fechaCobroDate.getFullYear() === inicioDate.getFullYear() &&
       fechaCobroDate.getMonth() >= inicioDate.getMonth());

    if (mismoMesOPosterior) {
      fechas.push(fechaStr);
    }

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
      const target = new Date(d);
      target.setDate(d.getDate() + ((7 - d.getDay() + (dia % 7)) % 7 || 7));
      if (target <= d) target.setDate(target.getDate() + 7);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - 1));
    }
    case "quincenal": {
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

/* ═══════════════════════════════════════════════════════════════
   Función principal: generar movimientos pendientes
   - tenantId: ID del tenant actual (obligatorio para INSERT)
   - silent: si es true, no muestra Swal (modo automático)
   Retorna: { totalGenerados: number }
   ═══════════════════════════════════════════════════════════════ */
export async function generarMovimientosRecurrentes(tenantId, silent = false) {
  if (!tenantId) return { totalGenerados: 0 };

  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);

  // Cargar recurrentes activos
  const { data: recurrentes, error: errorCarga } = await supabase
    .from("gastos_recurrentes")
    .select("*")
    .eq("activo", true);

  if (errorCarga || !recurrentes || recurrentes.length === 0) {
    return { totalGenerados: 0 };
  }

  let totalGenerados = 0;

  for (const rec of recurrentes) {
    if (rec.fecha_fin && rec.fecha_fin < hoyStr) continue;

    const fechasAGenerar = calcularFechasPendientes(rec, hoy);

    for (const fecha of fechasAGenerar) {
      // Verificar que no exista ya
      const { data: existe } = await supabase
        .from("movimientos_contables")
        .select("id")
        .eq("recurrente_id", rec.id)
        .eq("fecha", fecha)
        .limit(1);

      if (existe && existe.length > 0) continue;

      const { error } = await supabase.from("movimientos_contables").insert([{
        tipo: rec.tipo,
        monto: rec.monto,
        descripcion: rec.descripcion,
        categoria: rec.categoria || "",
        fecha: fecha,
        estado: "activo",
        origen: "recurrente",
        recurrente_id: rec.id,
        tenant_id: tenantId,
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

  return { totalGenerados };
}

// Exportar también las funciones helper para que el modal las use si necesita
export { calcularFechasPendientes, calcularProximaFecha };