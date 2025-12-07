const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarToken = require("../middleware/verificarToken");
const { body, param } = require("express-validator");
const validar = require("../middleware/validar");

// POST /
router.post("/",
  verificarToken,
  [
    body("producto_id").isInt().withMessage("producto_id inválido"),
    body("cliente_id").optional().isInt().withMessage("cliente_id inválido"),
    body("descripcion").notEmpty().withMessage("descripcion requerida"),
  ],
  validar,
  async (req, res) => {
    try {
      const { producto_id, cliente_id, descripcion } = req.body;
      const result = await pool.query(
        `INSERT INTO trazabilidad (producto_id, cliente_id, descripcion)
         VALUES ($1, $2, $3) RETURNING *`,
        [producto_id, cliente_id, descripcion]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al registrar trazabilidad:", error);
      res.status(500).send("Error en trazabilidad");
    }
  }
);

// GET /buscar/:producto_id
router.get("/buscar/:producto_id",
  verificarToken,
  [param("producto_id").isInt().withMessage("producto_id inválido")],
  validar,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT t.*, p.nombre AS producto, c.nombre AS cliente
         FROM trazabilidad t
         LEFT JOIN productos p ON t.producto_id = p.id
         LEFT JOIN clientes c ON t.cliente_id = c.id
         WHERE t.producto_id = $1`,
        [req.params.producto_id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error buscando trazabilidad:", error);
      res.status(500).send("Error del servidor");
    }
  }
);

module.exports = router;
