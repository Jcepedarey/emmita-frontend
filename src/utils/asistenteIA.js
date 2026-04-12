// src/utils/asistenteIA.js
// Asistente IA — Groq + Llama 4 Scout (500K tokens/día)
import { fetchAPI } from "./api";
import { aiTools } from "../ia/aiSchema";
import { ejecutarFuncionAI } from "../ia/aiParser";

const API_URL = process.env.REACT_APP_API_URL || "https://backend-emmita.onrender.com";
const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORIAL = 6;

export const NOMBRE_ASISTENTE = "Renty";

const ANIO = new Date().getFullYear();
const FECHA = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const SYSTEM_PROMPT = `Eres ${NOMBRE_ASISTENTE}, asistente de SwAlquiler (alquiler de artículos/eventos, Colombia). Fecha: ${FECHA}. Año: ${ANIO}.
USA las herramientas para responder, NUNCA inventes datos. Precios en COP ($xxx.xxx). Español colombiano, conciso, max 200 palabras.
Para fecha específica usa consultar_agenda_fecha. Para "esta semana/hoy/mañana" usa consultar_agenda.
NUNCA muestres _id, _tipo, _acciones, JSON ni código. Usa emojis y numeración en listas.
Para crear_cliente solo el nombre es obligatorio. No pidas todos los datos, crea con lo que te den.
Fechas futuras son del año actual (${ANIO}). Fechas pasadas también, a menos que el usuario diga otro año.
IMPORTANTE: Si el usuario menciona un ARTÍCULO + un CLIENTE juntos, SIEMPRE usa trazabilidad_precio, NUNCA ultimo_cliente_articulo.
ultimo_cliente_articulo es SOLO cuando NO se menciona un cliente específico.`;

function extraerAcciones(toolResults) {
  const acciones = [], ids = new Set();
  for (const r of toolResults) {
    try {
      const d = typeof r === "string" ? JSON.parse(r) : r;
      const procesar = (items) => {
        for (const it of items || []) {
          if (it._id && it._tipo && !ids.has(it._id)) {
            ids.add(it._id);
            acciones.push({ id: it._id, tipo: it._tipo, numero: it.numero || "—" });
          }
        }
      };
      if (Array.isArray(d)) procesar(d);
      else if (d?._acciones) procesar(d._acciones);
      else if (d?.pedidos) { procesar(d.pedidos); procesar(d.cotizaciones || []); }
    } catch {}
  }
  return acciones;
}

async function llamarAPI(messages) {
  return fetchAPI(`${API_URL}/api/ia/chat`, {
    method: "POST",
    body: JSON.stringify({ messages, tools: aiTools, tool_choice: "auto" }),
  });
}

export async function consultarIA(mensajeOriginal, historial = []) {
  try {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const msg of historial.slice(-MAX_HISTORIAL)) {
      if (msg.tipo === "user") messages.push({ role: "user", content: msg.texto });
      else if (msg.tipo === "ia" && msg.texto) messages.push({ role: "assistant", content: msg.texto });
    }
    messages.push({ role: "user", content: mensajeOriginal });

    let respuestaFinal = null, rondas = 0;
    const toolResults = [];

    while (!respuestaFinal && rondas < MAX_TOOL_ROUNDS) {
      rondas++;

      let data;
      try {
        data = await llamarAPI(messages);
      } catch (err) {
        if (err.message?.includes("502") || err.message?.includes("503")) {
          console.log("🔄 Reintentando tras 502...");
          await new Promise((r) => setTimeout(r, 2500));
          try {
            data = await llamarAPI(messages);
          } catch (err2) {
            console.log("🔄 Segundo reintento...");
            await new Promise((r) => setTimeout(r, 3000));
            data = await llamarAPI(messages);
          }
        } else throw err;
      }

      const msg = data.choices?.[0]?.message;
      if (!msg) return { texto: "⚠️ No obtuve respuesta.", acciones: [] };

      if (msg.tool_calls?.length > 0) {
        messages.push({ role: "assistant", content: msg.content || null, tool_calls: msg.tool_calls });
        for (const tc of msg.tool_calls) {
          const nombre = tc.function?.name;
          console.log(`🔧 Ejecutando: ${nombre}`, tc.function?.arguments);
          let resultado;
          try { resultado = await ejecutarFuncionAI(nombre, tc.function?.arguments); }
          catch { resultado = JSON.stringify({ error: true, mensaje: "Error" }); }
          toolResults.push(resultado);
          messages.push({ role: "tool", tool_call_id: tc.id, content: resultado });
        }
        continue;
      }
      respuestaFinal = msg.content;
    }

    if (!respuestaFinal) return { texto: "⚠️ No pudo completar la consulta.", acciones: [] };
    return { texto: respuestaFinal.trim(), acciones: extraerAcciones(toolResults) };

  } catch (error) {
    console.error("❌ Error en consultarIA:", error.message);
    const fb = fallbackLocal(mensajeOriginal);
    if (fb) return { texto: fb, acciones: [] };
    return { texto: "⚠️ Error al procesar. Verifica tu conexión e intenta nuevamente.", acciones: [] };
  }
}

function fallbackLocal(m) {
  m = m.toLowerCase();
  if (m.includes("hola") || m.includes("buenas")) return `👋 ¡Hola! Soy ${NOMBRE_ASISTENTE}, tu asistente de SwAlquiler. ¿En qué puedo ayudarte?`;
  if (m.includes("qué puedes") || m.includes("ayuda")) return `🤖 Puedo:\n• Disponibilidad de artículos\n• Buscar clientes/productos\n• Pedidos, cotizaciones, agenda\n• Finanzas y reportes\n• Crear notas, clientes\n• Pagos pendientes\n• Rankings\n\n¡Pregúntame!`;
  return null;
}