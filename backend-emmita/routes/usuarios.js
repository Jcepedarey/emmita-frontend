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
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

// POST /api/usuarios/solicitud-registro
router.post("/solicitud-registro", async (req, res) => {
  const { nombre, identificacion, usuario, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son requeridos." });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await pool.query(`
      INSERT INTO solicitudes_usuarios (id, nombre, identificacion, usuario, correo, password, codigo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [uuidv4(), nombre, identificacion, usuario, email, password, codigo]);

    await transporter.sendMail({
      from: "alquileresemmita@hotmail.com",
      to: "alquileresemmita@hotmail.com",
      subject: "Nueva solicitud de usuario",
      text: `📩 Nueva solicitud de usuario:\n
Nombre: ${nombre}
Usuario: ${usuario}
Correo: ${email}
Identificación: ${identificacion}

Código de autorización: ${codigo}
Ingresa este código en el sistema para aprobar el acceso.`
    });

    res.json({ mensaje: "Solicitud enviada correctamente. Espera autorización por correo." });
  } catch (err) {
    console.error("Error al registrar solicitud:", err);
    res.status(500).json({ error: "Error interno al procesar la solicitud." });
  }
});

// POST /api/usuarios/autorizar
router.post("/autorizar", async (req, res) => {
  const { codigo, rol } = req.body;

  if (!codigo || !rol) {
    return res.status(400).json({ error: "Código y rol son requeridos" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM solicitudes_usuarios WHERE codigo = $1",
      [codigo]
    );

    const solicitud = rows[0];

    if (!solicitud) {
      return res.status(404).json({ error: "Código inválido o ya usado" });
    }

    await pool.query(
      "INSERT INTO usuarios (id, nombre, email, password, rol) VALUES ($1, $2, $3, $4, $5)",
      [uuidv4(), solicitud.nombre, solicitud.correo, solicitud.password, rol]
    );

    await pool.query("DELETE FROM solicitudes_usuarios WHERE id = $1", [solicitud.id]);

    res.json({ mensaje: "✅ Usuario creado exitosamente." });
  } catch (err) {
    console.error("Error al autorizar usuario:", err);
    res.status(500).json({ error: "Error interno al autorizar usuario." });
  }
});

module.exports = router;
