export const aiFunctionsSchema = [
  {
    name: "consultar_stock",
    description: "Consulta stock disponible de un artículo en una fecha",
    parameters: {
      type: "object",
      properties: {
        articulo: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["articulo", "fecha"]
    }
  },
  {
    name: "consultar_agenda",
    description: "Consulta pedidos para una fecha o rango",
    parameters: {
      type: "object",
      properties: {
        fecha: { type: "string" },
        rango: { type: "string", enum: ["dia", "fin_de_semana"] }
      }
    }
  },
  {
    name: "buscar_cliente",
    description: "Busca clientes por nombre, teléfono o identificación",
    parameters: {
      type: "object",
      properties: {
        texto: { type: "string" }
      },
      required: ["texto"]
    }
  }
];
