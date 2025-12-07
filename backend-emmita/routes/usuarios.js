const express = require("express");
const router = express.Router();
const sequelize = require("../database");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const verificarToken = require("../middleware/verificarToken"); // proteger TODO excepto /login
const { body } = require("express-validator");
const validar = require("../middleware/validar");

// GET /  (PROTEGIDA)
router.get("/",
  verificarToken,
  async (req, res) => {
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
  }
);

// POST /crear  (PROTEGIDA + validaciones)
router.post("/crear",
  verificarToken,
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("email").isEmail().withMessage("Email inválido"),
    body("password").isLength({ min: 6 }).withMessage("Password mínimo 6 caracteres"),
    body("rol").optional().isString(),
  ],
  validar,
  async (req, res) => {
    try {
      const { nombre, email, password, rol } = req.body;
      const hash = await bcrypt.hash(password, 10);

      const result = await sequelize.query(
        `INSERT INTO usuarios (id, nombre, email, password, rol)
         VALUES (:id, :nombre, :email, :password, :rol)
         RETURNING id, nombre, email, rol`,
        {
          replacements: { id: uuidv4(), nombre, email, password: hash, rol },
          type: sequelize.QueryTypes.INSERT,
        }
      );

      res.json(result[0][0]);
    } catch (err) {
      console.error("Error al crear usuario:", err);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  }
);

// POST /login  (PÚBLICA + validaciones)
router.post("/login",
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password").notEmpty().withMessage("Password requerido"),
  ],
  validar,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await sequelize.query(
        "SELECT * FROM usuarios WHERE email = :email",
        { replacements: { email }, type: sequelize.QueryTypes.SELECT }
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
  }
);

// POST /cambiar-password  (PROTEGIDA + validaciones)
router.post("/cambiar-password",
  verificarToken,
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password_actual").notEmpty().withMessage("password_actual requerido"),
    body("nueva_password").isLength({ min: 6 }).withMessage("nueva_password mínimo 6 caracteres"),
  ],
  validar,
  async (req, res) => {
    const { email, password_actual, nueva_password } = req.body;
    try {
      const result = await sequelize.query(
        "SELECT * FROM usuarios WHERE email = :email",
        { replacements: { email }, type: sequelize.QueryTypes.SELECT }
      );

      const usuario = result[0];
      if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

      const valid = await bcrypt.compare(password_actual, usuario.password);
      if (!valid) return res.status(401).json({ error: "Contraseña actual incorrecta" });

      const hashNueva = await bcrypt.hash(nueva_password, 10);
      await sequelize.query(
        "UPDATE usuarios SET password = :password WHERE id = :id",
        { replacements: { password: hashNueva, id: usuario.id }, type: sequelize.QueryTypes.UPDATE }
      );

      res.json({ mensaje: "Contraseña actualizada correctamente" });
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      res.status(500).json({ error: "Error interno al cambiar la contraseña" });
    }
  }
);

module.exports = router;
