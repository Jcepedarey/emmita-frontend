const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const Cotizacion = sequelize.define(
  "Cotizacion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cliente: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    productos: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    total: {
      type: DataTypes.NUMERIC(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "cotizaciones",
    timestamps: false,
  }
);

module.exports = Cotizacion;
