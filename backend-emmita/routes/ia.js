// backend-emmita/routes/ia.js
const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");
const { createClient } = require("@supabase/supabase-js");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODELOS_PERMITIDOS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const MODELO_DEFAULT = "llama-3.3-70b-versatile";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 3000;

// Supabase admin para actualizar contadores (service_role bypasa RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Límites de consultas por plan ───
const LIMITES_POR_PLAN = {
  trial: 5,
  basico: 0,       // Sin IA
  profesional: 30,
  enterprise: 100,
};

// ─── Verificar y actualizar contador de consultas IA por tenant ───
async function verificarLimiteIA(tenantId, plan) {
  const limite = LIMITES_POR_PLAN[plan] ?? 0;

  // Plan sin IA
  if (limite === 0) {
    return { permitido: false, razon: "Tu plan actual no incluye el asistente de IA." };
  }

  // Consultar tenant
  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("consultas_ia_mes, consultas_ia_ultimo_reset")
    .eq("id", tenantId)
    .single();

  if (error || !tenant) {
    console.error("Error consultando tenant para IA:", error);
    return { permitido: true }; // En caso de error, permitir (fail-open)
  }

  // Verificar si hay que resetear el contador (nuevo día)
  const hoy = new Date().toISOString().slice(0, 10);
  const ultimoReset = tenant.consultas_ia_ultimo_reset
    ? new Date(tenant.consultas_ia_ultimo_reset).toISOString().slice(0, 10)
    : null;

  let consultasActuales = Number(tenant.consultas_ia_mes || 0);

  if (ultimoReset !== hoy) {
    // Nuevo día → resetear contador
    consultasActuales = 0;
    await supabaseAdmin
      .from("tenants")
      .update({ consultas_ia_mes: 1, consultas_ia_ultimo_reset: hoy })
      .eq("id", tenantId);
    return { permitido: true, consultas: 1, limite };
  }

  // Verificar si superó el límite
  if (consultasActuales >= limite) {
    return {
      permitido: false,
      razon: `Has alcanzado el límite de ${limite} consultas de IA para hoy. El contador se reinicia a medianoche.`,
      consultas: consultasActuales,
      limite,
    };
  }

  // Incrementar contador
  const nuevasConsultas = consultasActuales + 1;
  await supabaseAdmin
    .from("tenants")
    .update({ consultas_ia_mes: nuevasConsultas })
    .eq("id", tenantId);

  return { permitido: true, consultas: nuevasConsultas, limite };
}

router.post("/chat", verificarToken, async (req, res) => {
  try {
    const { messages, tools, tool_choice } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Se requiere un array de messages" });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Máximo ${MAX_MESSAGES} mensajes por consulta` });
    }

    // 🛡️ Validación de mensajes
    for (const msg of messages) {
      if (!msg.role) {
        return res.status(400).json({ error: "Cada mensaje debe tener un role" });
      }
      if (!["system", "user", "assistant", "tool"].includes(msg.role)) {
        return res.status(400).json({ error: "Rol de mensaje inválido" });
      }
      if (msg.content && typeof msg.content !== "string") {
        return res.status(400).json({ error: "El contenido debe ser texto" });
      }
      if (msg.content && msg.content.length > MAX_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Cada mensaje debe tener máximo ${MAX_CONTENT_LENGTH} caracteres` });
      }
    }

    // 🛡️ Verificar límite de IA por tenant
    const tenantId = req.tenant?.id;
    const plan = req.tenant?.plan || "trial";

    if (tenantId) {
      const check = await verificarLimiteIA(tenantId, plan);
      if (!check.permitido) {
        return res.status(429).json({
          error: check.razon,
          consultas: check.consultas,
          limite: check.limite,
        });
      }
    }

    const payload = {
      model: MODELO_DEFAULT,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    };

    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error Groq:", response.status, errorData);
      return res.status(502).json({ error: "El asistente no pudo procesar tu consulta. Intenta de nuevo." });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Error en /api/ia/chat:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;