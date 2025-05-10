export const exportarCSV = (datos, nombreArchivo) => {
  console.log("📦 Datos recibidos para exportarCSV:", datos);
  if (!Array.isArray(datos) || datos.length === 0) {
    console.warn("No hay datos para exportar.");
    return;
  }

  // ✅ Validar solo que no estén eliminados
  const datosFiltrados = datos.filter(
    (d) => d.estado !== "eliminado"
  );

  if (datosFiltrados.length === 0) {
    console.warn("No hay movimientos válidos para exportar.");
    return;
  }

  const formatearMonto = (valor) => {
    const numero = Number(valor);
    return isNaN(numero) ? "-" : `$${numero.toLocaleString("es-CO")}`;
  };

  const formatearFecha = (fecha) => fecha?.split("T")[0] || "-";

  const encabezados = [
    "Fecha", "Tipo", "Monto", "Descripción",
    "Categoría", "Estado", "Justificación",
    "Modificado", "Usuario"
  ];

  const filas = datosFiltrados.map((m) => [
    m.fecha || "-",
    (m.tipo || "").toUpperCase(),
    formatearMonto(m.monto),
    m.descripcion ?? "-",
    m.categoria ?? "-",
    m.estado ?? "-",
    m.justificacion ?? "-",
    formatearFecha(m.fecha_modificacion),
    m.usuario ?? "Administrador"
  ]);

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.join(";"))
    .join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + contenido], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  const fechaHoy = new Date().toLocaleDateString("es-CO").replaceAll("/", "_");
  link.href = URL.createObjectURL(blob);
  link.download = `${nombreArchivo}_${fechaHoy}.csv`;
  link.click();
};
