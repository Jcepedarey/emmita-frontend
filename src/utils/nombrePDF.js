export const generarNombreArchivo = (tipo, fecha, nombreCliente) => {
  const fechaLimpia = new Date(fecha).toISOString().slice(0, 10); // YYYY-MM-DD
  const nombreLimpio = (nombreCliente || "Cliente").replace(/\s+/g, "_");
  const prefijos = {
    cotizacion: "Cot_",
    orden: "Ord_",
    remision: "Rem_",
    recepcion: "Rcp_"
  };
  const prefijo = prefijos[tipo] || "Doc_";
  return `${prefijo}${fechaLimpia}_${nombreLimpio}.pdf`;
};
