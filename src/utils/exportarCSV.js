export const exportarCSV = (data, nombreArchivo) => {
  const encabezado = [
    "Fecha",
    "Tipo",
    "Monto",
    "Descripción",
    "Categoría",
    "Estado",
    "Justificación",
    "Modificado",
    "Usuario",
  ];

  const filas = data.map((m) => [
    m.fecha || "-",
    m.tipo?.toUpperCase() || "-",
    `$${parseInt(m.monto).toLocaleString("es-CO")}`,
    m.descripcion || "-",
    m.categoria || "-",
    m.estado || "-",
    m.justificacion || "-",
    m.fecha_modificacion?.split("T")[0] || "-",
    m.usuario || "Administrador",
  ]);

  let contenido = [encabezado, ...filas]
    .map((fila) => fila.join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `${nombreArchivo}_${new Date().toLocaleDateString("es-CO")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
