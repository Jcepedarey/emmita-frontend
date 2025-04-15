const express = require("express");
const router = express.Router();
const pool = require("../database"); // ✅ CAMBIADO desde "../db"
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// ✅ Obtener todos los usuarios
router.get("/", async (req, res) => {
  const result = await pool.query("SELECT id, nombre, email, rol FROM usuarios");
  res.json(result.rows);
});

// ✅ Crear usuario manualmente (con encriptación de contraseña)
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
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
  const usuario = result.rows[0];

  if (!usuario) return res.status(400).json({ error: "Usuario no encontrado" });

  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) return res.status(400).json({ error: "Contraseña incorrecta" });

  const { password: _, ...usuarioSeguro } = usuario;
  res.json(usuarioSeguro);
});

// ✅ Cambiar contraseña
router.post("/cambiar-password", async (req, res) => {
  const { email, password_actual, nueva_password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = result.rows[0];

    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password_actual, usuario.password);
    if (!valid) return res.status(401).json({ error: "Contraseña actual incorrecta" });

    const hashNueva = await bcrypt.hash(nueva_password, 10);

    await pool.query("UPDATE usuarios SET password = $1 WHERE id = $2", [hashNueva, usuario.id]);
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error al cambiar contraseña:", err);
    res.status(500).json({ error: "Error interno al cambiar la contraseña" });
  }
});

module.exports = router;
