// src/utils/exportarCSV.js — SESIÓN 4: CSV mejorado para contabilidad
// Compatible con Excel en español (BOM + separador punto y coma)

/**
 * Exportar CSV genérico (para Reportes y otros módulos)
 * @param {Array} datos - Array de objetos
 * @param {string} nombreArchivo - Nombre base del archivo
 */
export const exportarCSV = (datos, nombreArchivo) => {
  if (!Array.isArray(datos) || datos.length === 0) {
    console.warn("No hay datos para exportar.");
    return;
  }

  // Filtrar eliminados si tienen estado
  const datosFiltrados = datos.filter((d) => d.estado !== "eliminado");
  if (datosFiltrados.length === 0) {
    console.warn("No hay movimientos válidos para exportar.");
    return;
  }

  // Detectar si son movimientos contables (tienen campo 'tipo' con ingreso/gasto)
  const esContable = datosFiltrados.some((d) => d.tipo === "ingreso" || d.tipo === "gasto");

  if (esContable) {
    exportarCSVContable(datosFiltrados, nombreArchivo);
  } else {
    exportarCSVGenerico(datosFiltrados, nombreArchivo);
  }
};

/**
 * Exportar CSV de movimientos contables (mejorado)
 */
function exportarCSVContable(datos, nombreArchivo) {
  const formatearMonto = (valor) => {
    const numero = Number(valor);
    return isNaN(numero) ? "0" : numero.toLocaleString("es-CO");
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "—";
    const s = String(fecha).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s.split("T")[0] || "—";
  };

  const origenLabel = (origen) => {
    switch (origen) {
      case "automatico": return "Automático";
      case "recurrente": return "Recurrente";
      case "recepcion": return "Recepción";
      default: return "Manual";
    }
  };

  const encabezados = [
    "Fecha",
    "Tipo",
    "Monto ($)",
    "Descripción",
    "Categoría",
    "Cliente",
    "Proveedor",
    "Origen",
    "Orden (OP)",
    "Estado",
    "Justificación",
    "Fecha modificación",
    "Usuario",
  ];

  const filas = datos.map((m) => [
    formatearFecha(m.fecha),
    (m.tipo || "").toUpperCase(),
    formatearMonto(m.monto),
    escaparCSV(m.descripcion || "—"),
    m.categoria || "—",
    escaparCSV(m.cliente_nombre || "—"),
    escaparCSV(m.proveedor_nombre || "—"),
    origenLabel(m.origen),
    m.op_numero ? `OP-${m.op_numero}` : "—",
    m.estado || "activo",
    escaparCSV(m.justificacion || "—"),
    formatearFecha(m.fecha_modificacion),
    m.usuario || "Administrador",
  ]);

  // Resumen al final
  const ingresos = datos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto || 0), 0);
  const gastos = datos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + Number(m.monto || 0), 0);
  const balance = ingresos - gastos;

  filas.push([]); // línea vacía
  filas.push(["RESUMEN", "", "", "", "", "", "", "", "", "", "", "", ""]);
  filas.push(["Total ingresos", "", formatearMonto(ingresos)]);
  filas.push(["Total gastos", "", formatearMonto(gastos)]);
  filas.push(["Balance neto", "", formatearMonto(balance)]);
  filas.push(["Total movimientos", "", datos.length]);

  descargarCSV(encabezados, filas, nombreArchivo);
}

/**
 * Exportar CSV genérico (Reportes: top clientes, artículos, etc.)
 */
function exportarCSVGenerico(datos, nombreArchivo) {
  if (!datos.length) return;

  // Usar las keys del primer objeto como encabezados
  const encabezados = Object.keys(datos[0]);

  const filas = datos.map((d) =>
    encabezados.map((key) => {
      const val = d[key];
      if (typeof val === "number") return val.toLocaleString("es-CO");
      return escaparCSV(String(val ?? "—"));
    })
  );

  descargarCSV(encabezados, filas, nombreArchivo);
}

/**
 * Construir y descargar el archivo CSV
 */
function descargarCSV(encabezados, filas, nombreArchivo) {
  const contenido = [
    encabezados.join(";"),
    ...filas.map((fila) => fila.join(";")),
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + contenido], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const fechaHoy = new Date().toLocaleDateString("es-CO").replaceAll("/", "_");
  link.href = URL.createObjectURL(blob);
  link.download = `${nombreArchivo}_${fechaHoy}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Escapar valores para CSV (manejo de punto y coma, comillas, saltos de línea)
 */
function escaparCSV(valor) {
  if (valor == null) return "—";
  const str = String(valor);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}