// backend-emmita/routes/registro.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
require("dotenv").config(); // ✅ Asegura que las variables de entorno estén disponibles

// Configura tu correo (usa variables de entorno en producción)
const transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: "alquileresemmita@hotmail.com",
    pass: process.env.HOTMAIL_PASSWORD, // ✅ Ahora se usa una variable segura
  },
});

router.post("/solicitar", async (req, res) => {
  const { nombre, identificacion, usuario, correo, password, confirmar } = req.body;

  if (!nombre || !correo || !password || !confirmar) {
    return res.status(400).json({ error: "Todos los campos son requeridos." });
  }

  if (password !== confirmar) {
    return res.status(400).json({ error: "Las contraseñas no coinciden." });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos

  try {
    await pool.query(`
      INSERT INTO solicitudes_usuarios (id, nombre, identificacion, usuario, correo, password, codigo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [uuidv4(), nombre, identificacion, usuario, correo, password, codigo]);

    await transporter.sendMail({
      from: "alquileresemmita@hotmail.com",
      to: "alquileresemmita@hotmail.com",
      subject: "Nueva solicitud de usuario",
      text: `📩 Nueva solicitud de usuario:\n
Nombre: ${nombre}
Usuario: ${usuario}
Correo: ${correo}
Identificación: ${identificacion}

Código de autorización: ${codigo}
Ingresa este código en el sistema para aprobar el acceso.`,
    });

    res.json({ mensaje: "Solicitud enviada correctamente. Espera autorización por correo." });
  } catch (err) {
    console.error("Error al registrar solicitud:", err);
    res.status(500).json({ error: "Error interno al procesar la solicitud." });
  }
});

module.exports = router;
