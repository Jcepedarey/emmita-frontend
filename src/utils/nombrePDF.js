export const generarNombreArchivo = (tipo, fecha, nombreCliente) => {
  let fechaLimpia;
  try {
    const fechaValida = new Date(fecha);
    if (isNaN(fechaValida)) throw new Error("Fecha inválida");
    fechaLimpia = fechaValida.toISOString().slice(0, 10);
  } catch {
    fechaLimpia = new Date().toISOString().slice(0, 10);
  }

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