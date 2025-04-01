const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");

// Agregar producto
router.post("/agregar", async (req, res) => {
  try {
    const { nombre, precio, cantidad } = req.body;
    const producto = await Producto.create({ nombre, precio, cantidad });
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al agregar producto" });
  }
});

// Obtener todos los productos
router.get("/", async (req, res) => {
  try {
    const productos = await Producto.findAll();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Buscar producto por nombre
router.get("/buscar/:nombre", async (req, res) => {
  try {
    const productos = await Producto.findAll({
      where: { nombre: req.params.nombre }
    });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error en la búsqueda" });
  }
});

module.exports = router;
