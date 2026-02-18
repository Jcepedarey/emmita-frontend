// backend-emmita/routes/ia.js
const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");

// ✅ La clave de OpenAI ahora SOLO vive aquí en el backend
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// POST /api/ia/chat — Proxy seguro para OpenAI
router.post("/chat", verificarToken, async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Se requiere un array de messages" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error OpenAI:", errorData);
      return res.status(response.status).json({ 
        error: "Error en OpenAI", 
        detail: errorData.error?.message || "Error desconocido" 
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Error en /api/ia/chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;