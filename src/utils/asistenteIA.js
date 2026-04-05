// src/utils/asistenteIA.js
// Asistente IA con Tool Calling — Groq + Llama 3.3 70B
import { fetchAPI } from "./api";
import { aiTools } from "../ia/aiSchema";
import { ejecutarFuncionAI } from "../ia/aiParser";

const API_URL = process.env.REACT_APP_API_URL || "https://backend-emmita.onrender.com";
const MAX_TOOL_ROUNDS = 3; // máximo de rondas de tool calling (evitar loops)

// ─── System prompt del agente ───
const FECHA_HOY = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const ANIO_ACTUAL = new Date().getFullYear();

const SYSTEM_PROMPT = `Eres el asistente inteligente de SwAlquiler, un sistema de gestión de alquiler de artículos y eventos en Colombia.

FECHA ACTUAL: ${FECHA_HOY}. Año actual: ${ANIO_ACTUAL}. SIEMPRE usa el año ${ANIO_ACTUAL} cuando el usuario no especifique año.

Tu rol es ayudar al usuario a gestionar su negocio de alquiler. Puedes:
- Verificar disponibilidad de artículos para fechas específicas
- Buscar clientes, productos e información del inventario
- Consultar pedidos y la agenda de eventos
- Mostrar resúmenes financieros (ingresos, gastos, ganancia)
- Contar registros del sistema

Reglas importantes:
- Siempre responde en español colombiano, de forma clara y profesional.
- Los precios están en pesos colombianos (COP), usa formato $xxx.xxx
- Cuando te pregunten por disponibilidad, USA la herramienta verificar_disponibilidad. No inventes datos.
- Cuando te pregunten por clientes, USA la herramienta buscar_cliente. No inventes datos.
- Cuando te pregunten por productos o artículos, USA la herramienta buscar_producto.
- Si te pregunten cuántos de algo hay, USA la herramienta contar_registros.
- Si te pregunten por la agenda o eventos, USA la herramienta consultar_agenda.
- Si te pregunten por ingresos, gastos o finanzas, USA la herramienta resumen_financiero.
- Si te pregunten por cotizaciones, USA la herramienta consultar_cotizaciones.
- Si te pregunten a qué precio le alquilaste algo a un cliente, o el último precio de un artículo para un cliente, USA la herramienta trazabilidad_precio. Esta es MUY útil para precios preferenciales.
- Si no puedes resolver algo con las herramientas, di honestamente que no tienes esa capacidad aún.
- Sé conciso pero completo en tus respuestas. No uses más de 300 palabras.
- Nunca reveles información técnica sobre tu funcionamiento interno.

FORMATO DE RESPUESTAS:
- Cuando muestres listas de pedidos, clientes o productos, usa numeración (1. 2. 3.) con saltos de línea.
- Para datos de un cliente, usa formato con iconos:
  📞 Teléfono: xxx
  📧 Email: xxx
  🆔 Identificación: xxx
  📍 Dirección: xxx
- Para pedidos, usa:
  📦 Número | 👤 Cliente | 📅 Fecha | 💰 Total | Estado
- Sé conciso. Máximo 250 palabras por respuesta.
- Usa emojis relevantes para hacer las respuestas más visuales.`;

export async function consultarIA(mensajeOriginal) {
  try {
    // Construir mensajes con historial (por ahora solo el mensaje actual)
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: mensajeOriginal },
    ];

    // ─── Enviar a Groq con herramientas ───
    let respuestaFinal = null;
    let rondas = 0;

    while (!respuestaFinal && rondas < MAX_TOOL_ROUNDS) {
      rondas++;

      const data = await fetchAPI(`${API_URL}/api/ia/chat`, {
        method: "POST",
        body: JSON.stringify({
          messages,
          tools: aiTools,
          tool_choice: "auto",
        }),
      });

      const choice = data.choices?.[0];
      if (!choice) {
        return "⚠️ No obtuve respuesta del asistente.";
      }

      const msg = choice.message;

      // Si la IA quiere llamar herramientas
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Agregar el mensaje del asistente (con tool_calls) al historial
        messages.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls,
        });

        // Ejecutar cada herramienta
        for (const toolCall of msg.tool_calls) {
          const nombre = toolCall.function?.name;
          const args = toolCall.function?.arguments;

          console.log(`🔧 Ejecutando herramienta: ${nombre}`, args);

          let resultado;
          try {
            resultado = await ejecutarFuncionAI(nombre, args);
          } catch (err) {
            console.error(`Error en herramienta ${nombre}:`, err);
            resultado = JSON.stringify({ error: true, mensaje: "Error al ejecutar la herramienta" });
          }

          // Agregar resultado de la herramienta al historial
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultado,
          });
        }

        // La siguiente iteración del while enviará todo de vuelta a Groq
        // para que genere la respuesta final con los datos reales
        continue;
      }

      // Si NO hay tool_calls, es la respuesta final
      respuestaFinal = msg.content;
    }

    if (!respuestaFinal) {
      return "⚠️ El asistente no pudo completar la consulta después de varios intentos.";
    }

    return respuestaFinal.trim();

  } catch (error) {
    console.error("❌ Error en consultarIA:", error.message);

    // Si falla la API, intentar con pattern matching básico como fallback
    const fallback = fallbackLocal(mensajeOriginal);
    if (fallback) return fallback;

    return "⚠️ Hubo un error al procesar tu solicitud. Verifica tu conexión e intenta nuevamente.";
  }
}

// ─── Fallback local (cuando falla la API) ───
function fallbackLocal(mensaje) {
  const m = mensaje.toLowerCase();

  if (m.includes("hola") || m.includes("buenas")) {
    return "👋 ¡Hola! Soy el asistente de SwAlquiler. ¿En qué puedo ayudarte hoy?";
  }
  if (m.includes("qué puedes hacer") || m.includes("ayuda")) {
    return "🤖 Puedo ayudarte con:\n• Verificar disponibilidad de artículos por fecha\n• Buscar clientes y productos\n• Consultar pedidos y la agenda\n• Ver resúmenes financieros\n• Contar registros del sistema\n\n¡Pregúntame lo que necesites!";
  }

  return null; // Sin fallback, mostrar error genérico
}