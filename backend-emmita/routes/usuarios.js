const express = require("express");
const router = express.Router();
const pool = require("../database");
const bcrypt = require("bcryptjs");

// ✅ Obtener todos los usuarios
router.get("/", async (req, res) => {
  const result = await pool.query("SELECT id, nombre, email, rol FROM usuarios");
  res.json(result.rows);
});

// ✅ Crear usuario (con encriptación de contraseña)
router.post("/crear", async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol",
      [nombre, email, hash, rol]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ✅ Login (verificación de contraseña encriptada)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
  const usuario = result.rows[0];

  if (!usuario) return res.status(400).json({ error: "Usuario no encontrado" });

  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) return res.status(400).json({ error: "Contraseña incorrecta" });

  // Devolver usuario sin contraseña
  const { password: _, ...usuarioSeguro } = usuario;
  res.json(usuarioSeguro);
});

module.exports = router;
