// backend-emmita/routes/autorizar.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

// POST /api/usuarios/autorizar
router.post("/autorizar", async (req, res) => {
  const { codigo, rol } = req.body;

  if (!codigo || !rol) {
    return res.status(400).json({ error: "Código y rol son requeridos." });
  }

  try {
    // Buscar solicitud con ese código
    const result = await pool.query(
      "SELECT * FROM solicitudes_usuarios WHERE codigo = $1",
      [codigo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Código no válido o ya utilizado." });
    }

    const solicitud = result.rows[0];

    // Verificar si ya fue aprobada
    const existe = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [solicitud.correo]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: "Este usuario ya está registrado." });
    }

    const hashed = await bcrypt.hash(solicitud.password, 10);

    // Crear el usuario oficialmente
    await pool.query(
      `INSERT INTO usuarios (id, nombre, email, password, rol)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), solicitud.nombre, solicitud.correo, hashed, rol]
    );

    // Borrar la solicitud
    await pool.query("DELETE FROM solicitudes_usuarios WHERE id = $1", [solicitud.id]);

    res.json({ mensaje: "Usuario autorizado y registrado correctamente." });
  } catch (err) {
    console.error("Error al autorizar usuario:", err);
    res.status(500).json({ error: "Error interno al autorizar usuario." });
  }
});

module.exports = router;
