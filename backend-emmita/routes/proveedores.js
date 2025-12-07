const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarToken = require("../middleware/verificarToken");
const { body, param } = require("express-validator");
const validar = require("../middleware/validar");

// POST /crear
router.post("/crear",
  verificarToken,
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("telefono").optional().isMobilePhone("any").withMessage("Teléfono inválido"),
    body("tipo_servicio").optional().isString().isLength({ max: 100 }).withMessage("tipo_servicio inválido"),
  ],
  validar,
  async (req, res) => {
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
  }
);

// POST /productos
router.post("/productos",
  verificarToken,
  [
    body("proveedor_id").isInt().withMessage("proveedor_id inválido"),
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("stock").isInt({ min: 0 }).withMessage("stock inválido"),
    body("precio_compra").isFloat({ min: 0 }).withMessage("precio_compra inválido"),
    body("precio_venta").isFloat({ min: 0 }).withMessage("precio_venta inválido"),
  ],
  validar,
  async (req, res) => {
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
  }
);

// GET /productos/buscar/:nombre
router.get("/productos/buscar/:nombre",
  verificarToken,
  [param("nombre").notEmpty().withMessage("nombre requerido")],
  validar,
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM productos_proveedores WHERE LOWER(nombre) LIKE LOWER($1)",
        [`%${req.params.nombre}%`]
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Error al buscar productos" });
    }
  }
);

module.exports = router;
