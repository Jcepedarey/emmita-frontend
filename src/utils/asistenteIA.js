// src/utils/asistenteIA.js
// Asistente IA con Tool Calling — Groq + Llama 3.3 70B
import { fetchAPI } from "./api";
import { aiTools } from "../ia/aiSchema";
import { ejecutarFuncionAI } from "../ia/aiParser";

const API_URL = process.env.REACT_APP_API_URL || "https://backend-emmita.onrender.com";
const MAX_TOOL_ROUNDS = 3;

// ─── Nombre del asistente ───
export const NOMBRE_ASISTENTE = "Renty"; // ← cambia aquí si eliges otro

// ─── System prompt del agente ───
const FECHA_HOY = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const ANIO_ACTUAL = new Date().getFullYear();

const SYSTEM_PROMPT = `Eres ${NOMBRE_ASISTENTE}, el asistente inteligente de SwAlquiler, un sistema de gestión de alquiler de artículos y eventos en Colombia.

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
- Si te pregunten a qué precio le alquilaste algo a un cliente, o el último precio de un artículo para un cliente, USA la herramienta trazabilidad_precio.
- Si te pregunten a CUÁL fue el último cliente que se le alquiló un artículo (sin dar nombre de cliente), USA la herramienta ultimo_cliente_articulo.
- NUNCA muestres código de funciones, JSON, ni tags como <function> en tus respuestas.
- NUNCA muestres los campos internos _id, _tipo ni _acciones en tus respuestas. Esos son datos internos del sistema.
- Si no puedes resolver algo con las herramientas, dilo honestamente.
- Sé conciso pero completo. Máximo 250 palabras por respuesta.
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
- Usa emojis relevantes para hacer las respuestas más visuales.`;

// ─── Extraer acciones de los resultados de herramientas ───
function extraerAcciones(toolResults) {
  const acciones = [];
  const idsVistos = new Set();

  for (const resultado of toolResults) {
    try {
      const datos = typeof resultado === "string" ? JSON.parse(resultado) : resultado;

      // Si es un array (consultar_pedidos, consultar_agenda, consultar_cotizaciones)
      if (Array.isArray(datos)) {
        for (const item of datos) {
          if (item._id && item._tipo && !idsVistos.has(item._id)) {
            idsVistos.add(item._id);
            acciones.push({ id: item._id, tipo: item._tipo, numero: item.numero || "—" });
          }
        }
      }
      // Si es un objeto con _acciones (trazabilidad_precio, ultimo_cliente_articulo)
      else if (datos && datos._acciones && Array.isArray(datos._acciones)) {
        for (const acc of datos._acciones) {
          if (acc._id && acc._tipo && !idsVistos.has(acc._id)) {
            idsVistos.add(acc._id);
            acciones.push({ id: acc._id, tipo: acc._tipo, numero: acc.numero || "—" });
          }
        }
      }
    } catch {
      // No era JSON parseable, ignorar
    }
  }

  return acciones;
}

export async function consultarIA(mensajeOriginal) {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: mensajeOriginal },
    ];

    let respuestaFinal = null;
    let rondas = 0;
    const toolResults = []; // acumular resultados de herramientas

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

          console.log(`🔧 Ejecutando herramienta: ${nombre}`, args);

          let resultado;
          try {
            resultado = await ejecutarFuncionAI(nombre, args);
          } catch (err) {
            console.error(`Error en herramienta ${nombre}:`, err);
            resultado = JSON.stringify({ error: true, mensaje: "Error al ejecutar la herramienta" });
          }

          // Guardar resultado para extraer acciones después
          toolResults.push(resultado);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultado,
          });
        }

        continue;
      }

      respuestaFinal = msg.content;
    }

    if (!respuestaFinal) {
      return { texto: "⚠️ El asistente no pudo completar la consulta después de varios intentos.", acciones: [] };
    }

    // Extraer acciones de los resultados de herramientas
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
    return `🤖 Puedo ayudarte con:\n• Verificar disponibilidad de artículos por fecha\n• Buscar clientes y productos\n• Consultar pedidos y la agenda\n• Ver resúmenes financieros\n• Contar registros del sistema\n\n¡Pregúntame lo que necesites!`;
  }

  return null;
}