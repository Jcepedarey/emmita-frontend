// backend-emmita/routes/ia.js
const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// 🔒 Modelos permitidos (evitar que el frontend elija modelos caros)
const MODELOS_PERMITIDOS = ["gpt-4o", "gpt-4o-mini"];
const MODELO_DEFAULT = "gpt-4o";

// 🔒 Límites de entrada
const MAX_MESSAGES = 20;        // máximo mensajes en conversación
const MAX_CONTENT_LENGTH = 3000; // máximo caracteres por mensaje

// POST /api/ia/chat — Proxy seguro para OpenAI
router.post("/chat", verificarToken, async (req, res) => {
  try {
    const { messages } = req.body;

    // ── Validación estricta ──────────────────────────
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Se requiere un array de messages" });
    }

    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Máximo ${MAX_MESSAGES} mensajes por consulta` });
    }

    // Validar cada mensaje
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({ error: "Cada mensaje debe tener role y content" });
      }
      if (!["system", "user", "assistant"].includes(msg.role)) {
        return res.status(400).json({ error: "Rol de mensaje inválido" });
      }
      if (typeof msg.content !== "string") {
        return res.status(400).json({ error: "El contenido debe ser texto" });
      }
      if (msg.content.length > MAX_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Cada mensaje debe tener máximo ${MAX_CONTENT_LENGTH} caracteres` });
      }
    }

    // 🔒 Forzar modelo seguro (ignorar lo que envíe el frontend)
    const modelo = MODELO_DEFAULT;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: modelo,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error OpenAI:", response.status);
      // 🔒 No filtrar detalles del error de OpenAI al frontend
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