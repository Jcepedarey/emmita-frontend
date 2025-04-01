const express = require("express");
const router = express.Router();
const pool = require("../database"); // Conexión a Supabase

// ✅ Obtener todos los clientes
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    res.status(500).send("Error del servidor");
  }
});

// ✅ Crear un nuevo cliente
router.post("/", async (req, res) => {
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
});

module.exports = router;
