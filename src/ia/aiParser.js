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
  resumen_financiero: funciones.resumen_financiero,
  contar_registros: funciones.contar_registros,
  consultar_cotizaciones: funciones.consultar_cotizaciones,
  trazabilidad_precio: funciones.trazabilidad_precio,
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