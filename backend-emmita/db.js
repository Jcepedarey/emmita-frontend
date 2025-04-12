const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ✅ Usa la URL completa de Supabase
  ssl: {
    rejectUnauthorized: false, // ✅ Necesario para evitar errores SSL en Render
  },
});

module.exports = pool;
