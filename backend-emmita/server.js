const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sequelize = require("./database");
const rateLimit = require("express-rate-limit");

const app = express();

app.set("trust proxy", 1);

// ✅ CORS restringido
app.use(cors({
  origin: [
    "https://swalquiler.com",
    "https://www.swalquiler.com",
    "https://emmita-frontend.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json({ limit: "1mb" })); // ✅ NUEVO: limitar tamaño del body

// ═══════════════════════════════════════════════════════
// 🔒 SECURITY HEADERS (equivalente a helmet)
// ═══════════════════════════════════════════════════════
app.use((req, res, next) => {
  // Prevenir que el navegador detecte MIME type diferente al declarado
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevenir clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Activar filtro XSS del navegador
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // No enviar referrer a otros sitios
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Forzar HTTPS
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Deshabilitar funciones del navegador que no usamos
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// ═══════════════════════════════════════════════════════
// 🔒 RATE LIMITERS
// ═══════════════════════════════════════════════════════

// General: 100 req / 15 min por IP
const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones, intenta más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Estricto para auth: 10 req / 15 min (login, registro, reset password)
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Espera 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// IA: 20 req / 15 min (proteger costos OpenAI)
const limiterIA = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Límite de consultas IA alcanzado. Espera unos minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Empleados: 10 req / 15 min (crear usuarios)
const limiterEmpleados = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de crear usuarios. Espera unos minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar limiter general a toda la API
app.use("/api/", limiterGeneral);

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ El backend funciona correctamente" });
});

// ==========================================
// 🚨 RUTAS ANTIGUAS DESACTIVADAS (ZOMBIES) 🚨
// ==========================================
// app.use("/api/cotizaciones", require("./routes/cotizaciones"));
// app.use("/api/clientes", require("./routes/clientes"));
// app.use("/api/productos", require("./routes/productos"));
// app.use("/api/ordenes", require("./routes/ordenes"));
// app.use("/api/proveedores", require("./routes/proveedores"));
// app.use("/api/trazabilidad", require("./routes/trazabilidad"));

// ==========================================
// ✅ RUTAS SEGURAS Y EN USO
// ==========================================
app.use("/api/usuarios", limiterAuth, require("./routes/usuarios"));       // 🔒 rate limit estricto
app.use("/api/ia", limiterIA, require("./routes/ia"));                     // 🔒 rate limit IA
app.use("/api/registro", limiterAuth, require("./routes/registro"));       // 🔒 rate limit estricto
app.use("/api/empleados", limiterEmpleados, require("./routes/empleados")); // 🔒 rate limit empleados

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ═══════════════════════════════════════════════════════
// 🔒 MANEJO GLOBAL DE ERRORES (no filtrar stack traces)
// ═══════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
sequelize.authenticate()
  .then(() => {
    console.log("🟢 Conexión exitosa con la base de datos");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Error de conexión a la base de datos:", error.message);
  });