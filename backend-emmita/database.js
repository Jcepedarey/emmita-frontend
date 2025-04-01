const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

sequelize
  .authenticate()
  .then(() => console.log("✅ Conectado a Supabase con Sequelize"))
  .catch((error) => console.error("❌ Error de conexión:", error));

module.exports = sequelize;
