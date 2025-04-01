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
    <div>
      <h2>Órdenes Guardadas</h2>
      <ul>
        {ordenes.map((orden) => (
          <li key={orden.id}>
            <strong>{orden.clientes?.nombre || "Cliente desconocido"}</strong> - {orden.fecha} - ${orden.total.toFixed(2)}
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
