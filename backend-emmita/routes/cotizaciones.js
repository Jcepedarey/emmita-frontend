const express = require("express");
const router = express.Router();
const pool = require("../database");

// ✅ Obtener todas las cotizaciones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.total, c.fecha, cl.nombre AS cliente, c.productos
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo cotizaciones:", error);
    res.status(500).send("Error del servidor");
  }
});

// ✅ Guardar una nueva cotización
router.post("/", async (req, res) => {
  try {
    const { cliente_id, productos, total } = req.body;
    const result = await pool.query(
      "INSERT INTO cotizaciones (cliente_id, productos, total) VALUES ($1, $2, $3) RETURNING *",
      [cliente_id, productos, total]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al guardar cotización:", error);
    res.status(500).send("Error al guardar cotización");
  }
});

// ✅ Actualizar una cotización
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_id, productos, total } = req.body;

    const result = await pool.query(
      "UPDATE cotizaciones SET cliente_id = $1, productos = $2, total = $3 WHERE id = $4 RETURNING *",
      [cliente_id, productos, total, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Cotización no encontrada");
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar cotización:", error);
    res.status(500).send("Error al actualizar cotización");
  }
});

// ✅ Eliminar una cotización
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM cotizaciones WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Cotización no encontrada");
    }

    res.json({ message: "Cotización eliminada con éxito" });
  } catch (error) {
    console.error("Error al eliminar cotización:", error);
    res.status(500).send("Error al eliminar cotización");
  }
});

module.exports = router;
