const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarToken = require("../middleware/verificarToken");
const { body } = require("express-validator");
const validar = require("../middleware/validar");

// GET (protegida, solo lectura: no requiere validaciones de body)
router.get("/", verificarToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    res.status(500).send("Error del servidor");
  }
});

// POST (protegida + validaciones)
router.post("/",
  verificarToken,
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("email").optional().isEmail().withMessage("Email inválido"),
    body("telefono").optional().isMobilePhone("any").withMessage("Teléfono inválido"),
    body("direccion").optional().isString().isLength({ max: 200 }).withMessage("Dirección demasiado larga"),
  ],
  validar,
  async (req, res) => {
    try {
      const { nombre, email, telefono, direccion } = req.body;
      const result = await pool.query(
        "INSERT INTO clientes (nombre, email, telefono, direccion) VALUES ($1, $2, $3, $4) RETURNING *",
        [nombre, email, telefono, direccion]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al crear cliente:", error);
      res.status(500).send("Error al crear cliente");
    }
  }
);

module.exports = router;
