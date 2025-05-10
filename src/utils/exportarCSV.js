import { saveAs } from "file-saver";

export const exportarCSV = (datos, nombreArchivo = "movimientos_contables") => {
  if (!Array.isArray(datos) || datos.length === 0) {
    console.warn("No hay datos para exportar.");
    return;
  }

  // ✅ Corregido: Asegurar que monto es numérico con coerción +parseFloat()
  const datosFiltrados = datos.filter(
    (d) => d.fecha && d.tipo && !isNaN(parseFloat(d.monto)) && d.estado !== "eliminado"
  );

  if (datosFiltrados.length === 0) {
    console.warn("No hay movimientos válidos para exportar.");
    return;
  }

  const formatearMonto = (valor) => `$${parseInt(valor).toLocaleString("es-CO")}`;
  const formatearFecha = (fecha) => fecha?.split("T")[0] || "-";

  const encabezados = [
    "Fecha", "Tipo", "Monto", "Descripción",
    "Categoría", "Estado", "Justificación",
    "Modificado", "Usuario"
  ];

  const filas = datosFiltrados.map((m) => [
    m.fecha || "-",
    m.tipo?.toUpperCase() || "-",
    formatearMonto(m.monto),
    m.descripcion || "-",
    m.categoria || "-",
    m.estado || "-",
    m.justificacion || "-",
    formatearFecha(m.fecha_modificacion),
    m.usuario || "Administrador"
  ]);

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.join(";"))
    .join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + contenido], { type: "text/csv;charset=utf-8;" });

  const fechaHoy = new Date().toLocaleDateString("es-CO").replaceAll("/", "_");
  saveAs(blob, `${nombreArchivo}_${fechaHoy}.csv`);
};
