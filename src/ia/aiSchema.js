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
      description: "Consulta los eventos y pedidos programados para hoy, mañana, esta semana o los próximos días. Usa esto para preguntas genéricas como '¿qué tengo esta semana?'",
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
      name: "consultar_agenda_fecha",
      description: "Consulta TODA la agenda de una fecha específica: pedidos, cotizaciones Y notas del calendario. Usa esta herramienta cuando el usuario pregunte por una fecha exacta como '¿qué tengo el 18 de abril?' o 'mi agenda del 20/04'.",
      parameters: {
        type: "object",
        properties: {
          fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        },
        required: ["fecha"],
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
      description: "Busca el último precio al que se le alquiló un artículo a un cliente específico. Útil para precios preferenciales o históricos.",
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
      description: "Busca cuál fue el último cliente al que se le alquiló un artículo específico, sin necesidad de saber el nombre del cliente.",
      parameters: {
        type: "object",
        properties: {
          articulo: { type: "string", description: "Nombre del artículo" },
        },
        required: ["articulo"],
      },
    },
  },
  // ─── NUEVAS HERRAMIENTAS DE ACCIÓN ───
  {
    type: "function",
    function: {
      name: "crear_nota",
      description: "Crea una nota en el calendario/agenda para una fecha específica. Úsala cuando el usuario diga cosas como 'créame una nota para el 7 de junio de comprar madera' o 'recuérdame el 15 de mayo llamar al proveedor'.",
      parameters: {
        type: "object",
        properties: {
          fecha: { type: "string", description: "Fecha de la nota en formato YYYY-MM-DD" },
          descripcion: { type: "string", description: "Texto/contenido de la nota" },
        },
        required: ["fecha", "descripcion"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pagos_pendientes",
      description: "Muestra los pedidos que tienen saldo pendiente (total - abonos > 0). Puede filtrar por cliente. Úsala cuando pregunten '¿quién me debe?', '¿qué pagos tengo pendientes?', o 'saldo de María'.",
      parameters: {
        type: "object",
        properties: {
          cliente: { type: "string", description: "Nombre del cliente para filtrar (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_cliente",
      description: "Crea un nuevo cliente en el sistema. Verifica primero si ya existe uno similar. Úsala cuando digan 'crea el cliente Juan Pérez con teléfono 310...'.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre completo del cliente" },
          telefono: { type: "string", description: "Número de teléfono" },
          identificacion: { type: "string", description: "Cédula o NIT" },
          email: { type: "string", description: "Correo electrónico" },
          direccion: { type: "string", description: "Dirección" },
        },
        required: ["nombre"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "actualizar_precio_producto",
      description: "Actualiza el precio de alquiler de un producto. Úsala cuando digan 'sube el precio de la silla tiffany a 8000' o 'cambia el precio de X a Y'.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre del producto a actualizar" },
          nuevo_precio: { type: "number", description: "Nuevo precio en pesos colombianos (solo el número, sin $ ni puntos)" },
        },
        required: ["nombre", "nuevo_precio"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "articulos_mas_alquilados",
      description: "Muestra un ranking de los artículos más alquilados basado en el historial de pedidos. Úsala para '¿cuál es mi producto estrella?' o '¿qué se alquila más?'.",
      parameters: {
        type: "object",
        properties: {
          limite: { type: "integer", description: "Cantidad de artículos a mostrar (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clientes_mas_frecuentes",
      description: "Muestra un ranking de los clientes con más pedidos y mayor facturación. Úsala para '¿quién me alquila más?' o 'mis mejores clientes'.",
      parameters: {
        type: "object",
        properties: {
          limite: { type: "integer", description: "Cantidad de clientes a mostrar (default: 10)" },
        },
      },
    },
  },
];