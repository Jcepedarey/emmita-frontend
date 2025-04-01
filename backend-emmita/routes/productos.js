const express = require("express");
const router = express.Router();
const pool = require("../database");

// ✅ Obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).send("Error del servidor");
  }
});

// ✅ Crear un nuevo producto
router.post("/", async (req, res) => {
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
});

module.exports = router;
