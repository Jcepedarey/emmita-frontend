export const exportarCSV = (datos, nombreArchivo) => {
  if (!Array.isArray(datos) || datos.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const datosFiltrados = datos.filter((d) => d.fecha && d.tipo && !isNaN(d.monto));

  const encabezados = [
    "Fecha", "Tipo", "Monto", "Descripción",
    "Categoría", "Estado", "Justificación",
    "Modificado", "Usuario"
  ];

  const filas = datosFiltrados.map((m) => [
    m.fecha,
    m.tipo.toUpperCase(),
    `$${m.monto.toLocaleString("es-CO")}`,
    m.descripcion || "-",
    m.categoria || "-",
    m.estado || "-",
    m.justificacion || "-",
    m.fecha_modificacion?.split("T")[0] || "-",
    m.usuario || "Administrador"
  ]);

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.join(";")) // ← usamos punto y coma
    .join("\n");

  // ⚠️ Agregar BOM para que Excel lo lea correctamente
  const BOM = "\uFEFF";

  const blob = new Blob([BOM + contenido], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${nombreArchivo}_${new Date().toLocaleDateString("es-CO").replaceAll("/", "_")}.csv`;
  link.click();
};
