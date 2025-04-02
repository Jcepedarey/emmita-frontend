import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";

const OrdenesGuardadas = () => {
  const [ordenes, setOrdenes] = useState([]);

  useEffect(() => {
    const fetchOrdenes = async () => {
      const { data, error } = await supabase.from("ordenes").select(`
        id, fecha, total,
        clientes (nombre),
        productos
      `);
      if (error) {
        console.error("Error al obtener órdenes:", error);
      } else {
        setOrdenes(data);
      }
    };
    fetchOrdenes();
  }, []);

  return (
    <div style={{ padding: "1rem", maxWidth: "700px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Órdenes Guardadas</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {ordenes.map((orden) => (
          <li key={orden.id} style={{ marginBottom: "1rem", border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
            <strong>{orden.clientes?.nombre || "Cliente desconocido"}</strong><br />
            Fecha: {orden.fecha}<br />
            Total: ${orden.total?.toFixed(2)}
            <ul>
              {orden.productos.map((prod, index) => (
                <li key={index}>{prod.nombre} - {prod.cantidad} x ${prod.precio}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrdenesGuardadas;
