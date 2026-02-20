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
  origin: [
    "https://swalquiler.com",
    "https://www.swalquiler.com",
    "https://emmita-frontend.vercel.app"
  ],
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

// ==========================================
// 🚨 RUTAS ANTIGUAS DESACTIVADAS (ZOMBIES) 🚨
// El frontend ahora se conecta directo a Supabase con RLS para estas operaciones.
// Se comentan para evitar fugas de datos multi-tenant.
// ==========================================
// app.use("/api/cotizaciones", require("./routes/cotizaciones"));
// app.use("/api/clientes", require("./routes/clientes"));
// app.use("/api/productos", require("./routes/productos"));
// app.use("/api/ordenes", require("./routes/ordenes"));
// app.use("/api/proveedores", require("./routes/proveedores"));
// app.use("/api/trazabilidad", require("./routes/trazabilidad"));

// ==========================================
// ✅ RUTAS SEGURAS Y EN USO ✅
// ==========================================
app.use("/api/usuarios", require("./routes/usuarios")); // /login queda pública dentro del router y cambio de password
app.use("/api/ia", require("./routes/ia")); // ✅ Proxy seguro para OpenAI
app.use("/api/registro", require("./routes/registro")); // ✅ Registro Multi-Tenant seguro

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