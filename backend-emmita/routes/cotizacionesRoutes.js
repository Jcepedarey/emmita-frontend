const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/verificarToken");
const { body, param } = require("express-validator");
const validar = require("../middleware/validar");

// GET
router.get("/", verificarToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cotizaciones");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo cotizaciones:", error);
    res.status(500).send("Error del servidor");
  }
});

// POST
router.post("/",
  verificarToken,
  [
    body("cliente").notEmpty().withMessage("cliente requerido"),
    body("productos").isArray({ min: 1 }).withMessage("productos debe ser un arreglo"),
  ],
  validar,
  async (req, res) => {
    try {
      const { cliente, productos } = req.body;
      const result = await pool.query(
        "INSERT INTO cotizaciones (cliente, productos) VALUES ($1, $2) RETURNING *",
        [cliente, productos]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al guardar cotización:", error);
      res.status(500).send("Error al guardar cotización");
    }
  }
);

// PUT
router.put("/:id",
  verificarToken,
  [
    param("id").isInt().withMessage("id inválido"),
    body("cliente").notEmpty().withMessage("cliente requerido"),
    body("productos").isArray({ min: 1 }).withMessage("productos debe ser un arreglo"),
  ],
  validar,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { cliente, productos } = req.body;

      const result = await pool.query(
        "UPDATE cotizaciones SET cliente = $1, productos = $2 WHERE id = $3 RETURNING *",
        [cliente, productos, id]
      );

      if (result.rows.length === 0) return res.status(404).send("Cotización no encontrada");
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al actualizar cotización:", error);
      res.status(500).send("Error al actualizar cotización");
    }
  }
);

// DELETE
router.delete("/:id",
  verificarToken,
  [param("id").isInt().withMessage("id inválido")],
  validar,
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query("DELETE FROM cotizaciones WHERE id = $1 RETURNING *", [id]);
      if (result.rows.length === 0) return res.status(404).send("Cotización no encontrada");
      res.json({ message: "Cotización eliminada con éxito" });
    } catch (error) {
      console.error("Error al eliminar cotización:", error);
      res.status(500).send("Error al eliminar cotización");
    }
  }
);

module.exports = router;
