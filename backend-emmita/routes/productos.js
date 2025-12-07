const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarToken = require("../middleware/verificarToken");
const { body } = require("express-validator");
const validar = require("../middleware/validar");

// GET
router.get("/", verificarToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).send("Error del servidor");
  }
});

// POST
router.post("/",
  verificarToken,
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("descripcion").optional().isString().isLength({ max: 500 }).withMessage("Descripción muy larga"),
    body("precio").isFloat({ min: 0 }).withMessage("Precio inválido"),
  ],
  validar,
  async (req, res) => {
    try {
      const { nombre, descripcion, precio } = req.body;
      const result = await pool.query(
        "INSERT INTO productos (nombre, descripcion, precio) VALUES ($1, $2, $3) RETURNING *",
        [nombre, descripcion, precio]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al crear producto:", error);
      res.status(500).send("Error al crear producto");
    }
  }
);

module.exports = router;
