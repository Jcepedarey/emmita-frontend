const express = require("express");
const router = express.Router();
const pool = require("../database");

// ✅ Agregar proveedor
router.post("/crear", async (req, res) => {
  try {
    const { nombre, telefono, tipo_servicio } = req.body;
    const result = await pool.query(
      `INSERT INTO proveedores (nombre, telefono, tipo_servicio)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, telefono, tipo_servicio]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    res.status(500).send("Error al crear proveedor");
  }
});

// ✅ Agregar producto del proveedor
router.post("/productos", async (req, res) => {
  try {
    const { proveedor_id, nombre, stock, precio_compra, precio_venta } = req.body;
    const result = await pool.query(
      `INSERT INTO productos_proveedores (proveedor_id, nombre, stock, precio_compra, precio_venta)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [proveedor_id, nombre, stock, precio_compra, precio_venta]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear producto de proveedor:", error);
    res.status(500).send("Error al crear producto");
  }
});

// ✅ Buscar productos de proveedor por nombre
router.get("/productos/buscar/:nombre", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM productos_proveedores WHERE LOWER(nombre) LIKE LOWER($1)",
      [`%${req.params.nombre}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar productos" });
  }
});

module.exports = router;
