import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";

const CotizacionesGuardadas = () => {
  const [cotizaciones, setCotizaciones] = useState([]);

  useEffect(() => {
    const fetchCotizaciones = async () => {
      const { data, error } = await supabase.from("cotizaciones").select(`
        id, fecha, total, 
        clientes (nombre),
        productos
      `);
      if (error) {
        console.error("Error al obtener cotizaciones:", error);
      } else {
        setCotizaciones(data);
      }
    };
    fetchCotizaciones();
  }, []);

  return (
    <div>
      <h2>Cotizaciones Guardadas</h2>
      <ul>
        {cotizaciones.map((cotizacion) => (
          <li key={cotizacion.id}>
            <strong>{cotizacion.clientes?.nombre || "Cliente desconocido"}</strong> - {cotizacion.fecha} - ${cotizacion.total.toFixed(2)}
            <ul>
              {cotizacion.productos.map((prod, index) => (
                <li key={index}>{prod.nombre} - {prod.cantidad} x ${prod.precio}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CotizacionesGuardadas;
