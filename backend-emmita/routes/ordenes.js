const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarToken = require("../middleware/verificarToken");
const { body } = require("express-validator");
const validar = require("../middleware/validar");

// GET
router.get("/", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.total, o.fecha_creacion, o.fecha_evento, o.estado, cl.nombre AS cliente, o.productos
      FROM ordenes_pedido o
      LEFT JOIN clientes cl ON o.cliente_id = cl.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo órdenes:", error);
    res.status(500).send("Error del servidor");
  }
});

// POST
router.post("/",
  verificarToken,
  [
    body("cliente_id").isInt().withMessage("cliente_id debe ser numérico"),
    body("productos").isArray({ min: 1 }).withMessage("productos debe ser un arreglo"),
    body("productos.*.id").exists().withMessage("Cada producto requiere id"),
    body("productos.*.cantidad").isInt({ min: 1 }).withMessage("Cantidad debe ser entero >= 1"),
    body("total").isFloat({ min: 0 }).withMessage("total inválido"),
    body("fecha_evento").optional().isISO8601().withMessage("fecha_evento inválida"),
  ],
  validar,
  async (req, res) => {
    try {
      const { cliente_id, productos, total, fecha_evento } = req.body;
      const result = await pool.query(
        `INSERT INTO ordenes_pedido (cliente_id, productos, total, fecha_evento)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [cliente_id, productos, total, fecha_evento]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al crear orden:", error);
      res.status(500).send("Error al crear orden");
    }
  }
);

module.exports = router;
