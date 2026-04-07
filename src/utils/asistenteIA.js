// src/utils/asistenteIA.js
// Asistente IA con Tool Calling — Groq + Llama 3.3 70B
// ✅ Multi-turn: recibe historial para mantener contexto conversacional
import { fetchAPI } from "./api";
import { aiTools } from "../ia/aiSchema";
import { ejecutarFuncionAI } from "../ia/aiParser";

const API_URL = process.env.REACT_APP_API_URL || "https://backend-emmita.onrender.com";
const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORIAL = 10; // máximo de mensajes previos a enviar (evitar tokens excesivos)

// ─── Nombre del asistente ───
export const NOMBRE_ASISTENTE = "Renty";

// ─── System prompt del agente ───
const FECHA_HOY = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const ANIO_ACTUAL = new Date().getFullYear();

const SYSTEM_PROMPT = `Eres ${NOMBRE_ASISTENTE}, el asistente inteligente de SwAlquiler, un sistema de gestión de alquiler de artículos y eventos en Colombia.

FECHA ACTUAL: ${FECHA_HOY}. Año actual: ${ANIO_ACTUAL}. SIEMPRE usa el año ${ANIO_ACTUAL} cuando el usuario no especifique año.

Tu rol es ayudar al usuario a gestionar su negocio de alquiler. Puedes:
- Verificar disponibilidad de artículos para fechas específicas
- Buscar clientes, productos e información del inventario
- Consultar pedidos, cotizaciones y la agenda de eventos
- Mostrar resúmenes financieros (ingresos, gastos, ganancia)
- Contar registros del sistema
- Consultar la agenda completa de un día (pedidos + cotizaciones + notas)
- Crear notas en el calendario
- Ver pagos pendientes y quién debe
- Crear clientes nuevos
- Actualizar precios de productos
- Mostrar rankings de artículos más alquilados y mejores clientes

REGLAS IMPORTANTES:
- Siempre responde en español colombiano, de forma clara y profesional.
- Los precios están en pesos colombianos (COP), usa formato $xxx.xxx
- USA las herramientas para responder. NUNCA inventes datos.
- Cuando te pregunten por la agenda de una FECHA ESPECÍFICA (ej: "18 de abril", "20/04"), USA consultar_agenda_fecha.
- Cuando te pregunten de forma general ("esta semana", "hoy", "mañana"), USA consultar_agenda.
- Si te piden crear una nota o recordatorio, USA crear_nota con la fecha correcta.
- Si te pregunten por pagos pendientes o quién debe, USA pagos_pendientes.
- Si te piden crear un cliente, USA crear_cliente.
- Si te piden cambiar un precio, USA actualizar_precio_producto.
- Si preguntan cuál es el producto estrella o qué se alquila más, USA articulos_mas_alquilados.
- Si preguntan quiénes son los mejores clientes, USA clientes_mas_frecuentes.
- NUNCA muestres los campos internos _id, _tipo, _acciones en tus respuestas.
- NUNCA muestres código de funciones, JSON, ni tags como <function>.
- Sé conciso pero completo. Máximo 250 palabras por respuesta.
- Eres conversacional: puedes responder varias preguntas, continuar temas previos y recordar lo que se habló en esta conversación.

FORMATO DE RESPUESTAS:
- Listas: usa numeración (1. 2. 3.) con saltos de línea.
- Clientes: 📞 Teléfono | 📧 Email | 🆔 Cédula | 📍 Dirección
- Pedidos: 📦 Número | 👤 Cliente | 📅 Fecha | 💰 Total | Estado
- Usa emojis relevantes para hacer las respuestas más visuales.
- Cuando crees algo (nota, cliente) confirma con ✅.`;

// ─── Extraer acciones de los resultados de herramientas ───
function extraerAcciones(toolResults) {
  const acciones = [];
  const idsVistos = new Set();

  for (const resultado of toolResults) {
    try {
      const datos = typeof resultado === "string" ? JSON.parse(resultado) : resultado;

      if (Array.isArray(datos)) {
        for (const item of datos) {
          if (item._id && item._tipo && !idsVistos.has(item._id)) {
            idsVistos.add(item._id);
            acciones.push({ id: item._id, tipo: item._tipo, numero: item.numero || "—" });
          }
        }
      } else if (datos && datos._acciones && Array.isArray(datos._acciones)) {
        for (const acc of datos._acciones) {
          if (acc._id && acc._tipo && !idsVistos.has(acc._id)) {
            idsVistos.add(acc._id);
            acciones.push({ id: acc._id, tipo: acc._tipo, numero: acc.numero || "—" });
          }
        }
      } else if (datos && datos.pedidos && Array.isArray(datos.pedidos)) {
        // Para pagos_pendientes y consultar_agenda_fecha
        for (const item of datos.pedidos) {
          if (item._id && item._tipo && !idsVistos.has(item._id)) {
            idsVistos.add(item._id);
            acciones.push({ id: item._id, tipo: item._tipo, numero: item.numero || "—" });
          }
        }
        // También cotizaciones de consultar_agenda_fecha
        if (datos.cotizaciones) {
          for (const item of datos.cotizaciones) {
            if (item._id && item._tipo && !idsVistos.has(item._id)) {
              idsVistos.add(item._id);
              acciones.push({ id: item._id, tipo: item._tipo, numero: item.numero || "—" });
            }
          }
        }
      }
    } catch {
      // No era JSON parseable, ignorar
    }
  }

  return acciones;
}

/**
 * Consultar IA con soporte multi-turno
 * @param {string} mensajeOriginal - Mensaje actual del usuario
 * @param {Array} historial - Array de mensajes previos [{tipo: "user"|"ia", texto}]
 */
export async function consultarIA(mensajeOriginal, historial = []) {
  try {
    // Construir mensajes con historial conversacional
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    // Incluir historial previo (últimos N mensajes para contexto)
    const historialReciente = historial.slice(-MAX_HISTORIAL);
    for (const msg of historialReciente) {
      if (msg.tipo === "user") {
        messages.push({ role: "user", content: msg.texto });
      } else if (msg.tipo === "ia" && msg.texto) {
        // Solo enviar texto, no acciones
        messages.push({ role: "assistant", content: msg.texto });
      }
    }

    // Mensaje actual
    messages.push({ role: "user", content: mensajeOriginal });

    let respuestaFinal = null;
    let rondas = 0;
    const toolResults = [];

    while (!respuestaFinal && rondas < MAX_TOOL_ROUNDS) {
      rondas++;

      // ── Retry: si Render devuelve 502, intentar una vez más ──
      let data;
      try {
        data = await fetchAPI(`${API_URL}/api/ia/chat`, {
          method: "POST",
          body: JSON.stringify({ messages, tools: aiTools, tool_choice: "auto" }),
        });
      } catch (err) {
        if (err.message?.includes("502") || err.message?.includes("503")) {
          console.log("🔄 Reintentando tras 502...");
          await new Promise((r) => setTimeout(r, 2000));
          data = await fetchAPI(`${API_URL}/api/ia/chat`, {
            method: "POST",
            body: JSON.stringify({ messages, tools: aiTools, tool_choice: "auto" }),
          });
        } else {
          throw err;
        }
      }

      const choice = data.choices?.[0];
      if (!choice) {
        return { texto: "⚠️ No obtuve respuesta del asistente.", acciones: [] };
      }

      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls,
        });

        for (const toolCall of msg.tool_calls) {
          const nombre = toolCall.function?.name;
          const args = toolCall.function?.arguments;

          console.log(`🔧 Ejecutando: ${nombre}`, args);

          let resultado;
          try {
            resultado = await ejecutarFuncionAI(nombre, args);
          } catch (err) {
            console.error(`Error en ${nombre}:`, err);
            resultado = JSON.stringify({ error: true, mensaje: "Error al ejecutar la herramienta" });
          }

          toolResults.push(resultado);
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: resultado });
        }
        continue;
      }

      respuestaFinal = msg.content;
    }

    if (!respuestaFinal) {
      return { texto: "⚠️ El asistente no pudo completar la consulta después de varios intentos.", acciones: [] };
    }

    const acciones = extraerAcciones(toolResults);
    return { texto: respuestaFinal.trim(), acciones };

  } catch (error) {
    console.error("❌ Error en consultarIA:", error.message);

    const fallback = fallbackLocal(mensajeOriginal);
    if (fallback) return { texto: fallback, acciones: [] };

    return { texto: "⚠️ Hubo un error al procesar tu solicitud. Verifica tu conexión e intenta nuevamente.", acciones: [] };
  }
}

// ─── Fallback local ───
function fallbackLocal(mensaje) {
  const m = mensaje.toLowerCase();
  if (m.includes("hola") || m.includes("buenas")) {
    return `👋 ¡Hola! Soy ${NOMBRE_ASISTENTE}, tu asistente de SwAlquiler. ¿En qué puedo ayudarte hoy?`;
  }
  if (m.includes("qué puedes hacer") || m.includes("ayuda")) {
    return `🤖 Puedo ayudarte con:\n• Verificar disponibilidad de artículos\n• Buscar clientes y productos\n• Consultar pedidos, cotizaciones y agenda\n• Ver resúmenes financieros\n• Crear notas en el calendario\n• Ver pagos pendientes\n• Crear clientes\n• Cambiar precios de productos\n• Ver rankings de artículos y clientes\n\n¡Pregúntame lo que necesites!`;
  }
  return null;
}