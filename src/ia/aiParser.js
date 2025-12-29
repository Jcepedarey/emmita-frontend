import * as funciones from "./aiFunctions";

export async function ejecutarFuncionAI(nombre, argumentos) {
  if (!funciones[nombre]) {
    return {
      tipo: "error",
      mensaje: "Función no soportada"
    };
  }

  return await funciones[nombre](argumentos);
}
