const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");
const verificarToken = require("../middleware/verificarToken");
const { body, param } = require("express-validator");
const validar = require("../middleware/validar");

// POST /agregar
router.post("/agregar",
  verificarToken,
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("precio").isFloat({ min: 0 }).withMessage("Precio inválido"),
    body("cantidad").isInt({ min: 0 }).withMessage("Cantidad inválida"),
  ],
  validar,
  async (req, res) => {
    try {
      const { nombre, precio, cantidad } = req.body;
      const producto = await Producto.create({ nombre, precio, cantidad });
      res.status(201).json(producto);
    } catch (error) {
      res.status(500).json({ error: "Error al agregar producto" });
    }
  }
);

// GET /
router.get("/", verificarToken, async (req, res) => {
  try {
    const productos = await Producto.findAll();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// GET /buscar/:nombre
router.get("/buscar/:nombre",
  verificarToken,
  [param("nombre").notEmpty().withMessage("nombre requerido")],
  validar,
  async (req, res) => {
    try {
      const productos = await Producto.findAll({ where: { nombre: req.params.nombre } });
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: "Error en la búsqueda" });
    }
  }
);

module.exports = router;
