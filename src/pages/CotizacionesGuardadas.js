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
    <div style={{ padding: "1rem", maxWidth: "700px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Cotizaciones Guardadas</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {cotizaciones.map((cotizacion) => (
          <li key={cotizacion.id} style={{ marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "8px", padding: "10px" }}>
            <strong>{cotizacion.clientes?.nombre || "Cliente desconocido"}</strong><br />
            Fecha: {cotizacion.fecha}<br />
            Total: ${cotizacion.total?.toFixed(2)}
            <ul>
              {cotizacion.productos.map((prod, index) => (
                <li key={index}>
                  {prod.nombre} - {prod.cantidad} x ${prod.precio}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CotizacionesGuardadas;
