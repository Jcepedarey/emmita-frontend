const express = require("express");
const cors = require("cors");
require("dotenv").config(); // ✅ Carga el .env antes de todo lo demás
const sequelize = require("./database");
const rateLimit = require("express-rate-limit"); // ✅ NUEVO

const app = express();

// (Opcional/Recomendado si deployas detrás de proxy: Vercel, Render, Nginx)
app.set("trust proxy", 1); // ✅ para que el rate-limit identifique bien la IP real

// ✅ Middleware CORS para permitir acceso solo desde tu frontend
app.use(cors({
  origin: "https://emmita-frontend.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());

// ✅ Rate limiter: 100 requests / 15 min por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas peticiones, intenta más tarde",
});
// Aplicar a todas las rutas de la API (antes de montarlas)
app.use("/api/", limiter);

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
app.use("/api/usuarios", require("./routes/usuarios")); // /login queda pública dentro del router

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
