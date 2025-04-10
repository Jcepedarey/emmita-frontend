const express = require("express"); 
const cors = require("cors");
require("dotenv").config();
const sequelize = require("./database");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ El backend funciona correctamente" });
});

// Rutas
app.use("/api/cotizaciones", require("./routes/cotizaciones"));
app.use("/api/clientes", require("./routes/clientes"));
app.use("/api/productos", require("./routes/productos"));
app.use("/api/ordenes", require("./routes/ordenes"));
app.use("/api/proveedores", require("./routes/proveedores"));
app.use("/api/trazabilidad", require("./routes/trazabilidad"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/usuarios", require("./routes/registro"));       // ✅ solicitud de registro
app.use("/api/usuarios", require("./routes/autorizar"));      // ✅ autorización de registro

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ error: "❌ Ruta no encontrada" });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
sequelize.authenticate()
  .then(() => {
    console.log("🟢 Conexión exitosa con la base de datos");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Error de conexión a la base de datos:", error);
  });
