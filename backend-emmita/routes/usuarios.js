const express = require("express");
const router = express.Router();
const sequelize = require("../database"); // ✅ Usamos Sequelize
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// ✅ Obtener todos los usuarios
router.get("/", async (req, res) => {
  try {
    const result = await sequelize.query(
      "SELECT id, nombre, email, rol FROM usuarios",
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(result);
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// ✅ Crear usuario manualmente (con encriptación de contraseña)
router.post("/crear", async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const result = await sequelize.query(
      `INSERT INTO usuarios (id, nombre, email, password, rol)
       VALUES (:id, :nombre, :email, :password, :rol)
       RETURNING id, nombre, email, rol`,
      {
        replacements: {
          id: uuidv4(),
          nombre,
          email,
          password: hash,
          rol
        },
        type: sequelize.QueryTypes.INSERT,
      }
    );

    res.json(result[0][0]);
  } catch (err) {
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ✅ Login (con Sequelize)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    const result = await sequelize.query(
      "SELECT * FROM usuarios WHERE email = :email",
      {
        replacements: { email },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const usuario = result[0];

    if (!usuario) return res.status(400).json({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) return res.status(400).json({ error: "Contraseña incorrecta" });

    const { password: _, ...usuarioSeguro } = usuario;
    res.json(usuarioSeguro);
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
});

// ✅ Cambiar contraseña
router.post("/cambiar-password", async (req, res) => {
  const { email, password_actual, nueva_password } = req.body;

  try {
    const result = await sequelize.query(
      "SELECT * FROM usuarios WHERE email = :email",
      {
        replacements: { email },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const usuario = result[0];
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password_actual, usuario.password);
    if (!valid) return res.status(401).json({ error: "Contraseña actual incorrecta" });

    const hashNueva = await bcrypt.hash(nueva_password, 10);

    await sequelize.query(
      "UPDATE usuarios SET password = :password WHERE id = :id",
      {
        replacements: {
          password: hashNueva,
          id: usuario.id,
        },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error al cambiar contraseña:", err);
    res.status(500).json({ error: "Error interno al cambiar la contraseña" });
  }
});

module.exports = router;
