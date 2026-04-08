// backend-emmita/routes/ia.js
const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODELO_DEFAULT = "meta-llama/llama-4-scout-17b-16e-instruct";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 3000;

router.post("/chat", verificarToken, async (req, res) => {
  try {
    const { messages, tools, tool_choice } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Se requiere un array de messages" });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Máximo ${MAX_MESSAGES} mensajes por consulta` });
    }

    for (const msg of messages) {
      if (!msg.role) return res.status(400).json({ error: "Cada mensaje debe tener un role" });
      if (!["system", "user", "assistant", "tool"].includes(msg.role)) return res.status(400).json({ error: "Rol inválido" });
      if (msg.content && typeof msg.content !== "string") return res.status(400).json({ error: "Contenido debe ser texto" });
      if (msg.content && msg.content.length > MAX_CONTENT_LENGTH) return res.status(400).json({ error: `Máximo ${MAX_CONTENT_LENGTH} chars` });
    }

    const payload = {
      model: MODELO_DEFAULT,
      messages,
      max_tokens: 800,
      temperature: 0.7
    };

    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
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