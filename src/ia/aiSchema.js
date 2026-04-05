// src/utils/aiSchema.js
// Definición de herramientas para Groq Tool Calling (formato OpenAI-compatible)

export const aiTools = [
  {
    type: "function",
    function: {
      name: "verificar_disponibilidad",
      description: "Verifica cuántas unidades de un artículo están disponibles para alquilar en una fecha específica, considerando los pedidos que ya existen para esa fecha",
      parameters: {
        type: "object",
        properties: {
          articulo: { type: "string", description: "Nombre del artículo a buscar (ej: silla tiffany, carpa, mesa)" },
          fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        },
        required: ["articulo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_cliente",
      description: "Busca clientes registrados por nombre, teléfono, email o identificación",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Nombre, teléfono, email o cédula del cliente" },
        },
        required: ["texto"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_producto",
      description: "Busca productos o artículos del inventario por nombre. Muestra precio, stock, tipo y valor de adquisición",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre o parte del nombre del producto" },
        },
        required: ["nombre"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_pedidos",
      description: "Consulta los pedidos u órdenes de pedido para una fecha, rango de fechas o por nombre de cliente",
      parameters: {
        type: "object",
        properties: {
          fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD (busca pedidos de ese día)" },
          fecha_desde: { type: "string", description: "Inicio del rango en formato YYYY-MM-DD" },
          fecha_hasta: { type: "string", description: "Fin del rango en formato YYYY-MM-DD" },
          cliente: { type: "string", description: "Nombre del cliente para filtrar" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_agenda",
      description: "Consulta los eventos y pedidos programados para hoy, mañana, esta semana o los próximos días",
      parameters: {
        type: "object",
        properties: {
          periodo: {
            type: "string",
            enum: ["hoy", "manana", "semana", "proximos_7_dias", "proximos_30_dias"],
            description: "Período a consultar",
          },
        },
        required: ["periodo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumen_financiero",
      description: "Muestra un resumen financiero con ingresos, gastos y ganancia para un período. Usa el mes actual si no se especifica",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "integer", description: "Número del mes (1-12)" },
          anio: { type: "integer", description: "Año (ej: 2026)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contar_registros",
      description: "Cuenta cuántos clientes, productos, pedidos o cotizaciones hay registrados en el sistema",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["clientes", "productos", "pedidos", "cotizaciones"],
            description: "Qué tipo de registro contar",
          },
        },
        required: ["tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_cotizaciones",
      description: "Consulta las cotizaciones registradas para una fecha, rango de fechas o por nombre de cliente",
      parameters: {
        type: "object",
        properties: {
          fecha_desde: { type: "string", description: "Inicio del rango en formato YYYY-MM-DD" },
          fecha_hasta: { type: "string", description: "Fin del rango en formato YYYY-MM-DD" },
          cliente: { type: "string", description: "Nombre del cliente para filtrar" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trazabilidad_precio",
      description: "Busca el último precio al que se le alquiló un artículo o producto a un cliente específico. Útil para saber precios preferenciales o históricos de un cliente. También muestra cuántas veces se le ha alquilado ese artículo.",
      parameters: {
        type: "object",
        properties: {
          articulo: { type: "string", description: "Nombre del artículo o producto" },
          cliente: { type: "string", description: "Nombre del cliente" },
        },
        required: ["articulo", "cliente"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ultimo_cliente_articulo",
      description: "Busca cuál fue el último cliente al que se le alquiló un artículo específico, sin necesidad de saber el nombre del cliente. Muestra fecha, precio y cliente.",
      parameters: {
        type: "object",
        properties: {
          articulo: { type: "string", description: "Nombre del artículo" },
        },
        required: ["articulo"],
      },
    },
  },
];