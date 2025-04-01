const express = require("express");
const router = express.Router();
const pool = require("../db"); // Asegurar que db.js está correctamente importado

// ✅ Ruta para obtener todas las cotizaciones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cotizaciones");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo cotizaciones:", error);
    res.status(500).send("Error del servidor");
  }
});

// ✅ Ruta para guardar una nueva cotización
router.post("/", async (req, res) => {
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
});

// ✅ Ruta para actualizar una cotización
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente, productos } = req.body;

    const result = await pool.query(
      "UPDATE cotizaciones SET cliente = $1, productos = $2 WHERE id = $3 RETURNING *",
      [cliente, productos, id]
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

// ✅ Ruta para eliminar una cotización
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM cotizaciones WHERE id = $1 RETURNING *", [id]);

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

