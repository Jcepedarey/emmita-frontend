// src/utils/aiParser.js
// Ejecutor de herramientas del agente IA
import * as funciones from "./aiFunctions";

// Mapa de funciones disponibles
const FUNCIONES_DISPONIBLES = {
  verificar_disponibilidad: funciones.verificar_disponibilidad,
  buscar_cliente: funciones.buscar_cliente,
  buscar_producto: funciones.buscar_producto,
  consultar_pedidos: funciones.consultar_pedidos,
  consultar_agenda: funciones.consultar_agenda,
  consultar_agenda_fecha: funciones.consultar_agenda_fecha,
  resumen_financiero: funciones.resumen_financiero,
  contar_registros: funciones.contar_registros,
  consultar_cotizaciones: funciones.consultar_cotizaciones,
  trazabilidad_precio: funciones.trazabilidad_precio,
  ultimo_cliente_articulo: funciones.ultimo_cliente_articulo,
  crear_nota: funciones.crear_nota,
  pagos_pendientes: funciones.pagos_pendientes,
  crear_cliente: funciones.crear_cliente,
  actualizar_precio_producto: funciones.actualizar_precio_producto,
  articulos_mas_alquilados: funciones.articulos_mas_alquilados,
  clientes_mas_frecuentes: funciones.clientes_mas_frecuentes,
  buscar_paquete: funciones.buscar_paquete,
};

export async function ejecutarFuncionAI(nombre, argumentos) {
  const fn = FUNCIONES_DISPONIBLES[nombre];

  if (!fn) {
    return JSON.stringify({
      error: true,
      mensaje: `Función "${nombre}" no está disponible.`,
    });
  }

  try {
    const args = typeof argumentos === "string" ? JSON.parse(argumentos) : argumentos;
    const resultado = await fn(args);
    return typeof resultado === "string" ? resultado : JSON.stringify(resultado);
  } catch (error) {
    console.error(`Error ejecutando ${nombre}:`, error);
    return JSON.stringify({ error: true, mensaje: "Error al ejecutar la consulta." });
  }
}

export function getFuncionesDisponibles() {
  return Object.keys(FUNCIONES_DISPONIBLES);
}