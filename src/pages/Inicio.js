import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";

const usuario = JSON.parse(localStorage.getItem("usuario"));
const esAdmin = usuario?.rol === "admin";

const iconos = [
  { nombre: "Crear documento", ruta: "/cotizaciones" },
  { nombre: "Clientes", ruta: "/clientes" },
  ...(esAdmin ? [{ nombre: "Inventario", ruta: "/inventario" }] : []),
  ...(esAdmin ? [{ nombre: "Usuarios", ruta: "/usuarios" }] : []),
  ...(esAdmin ? [{ nombre: "Reportes", ruta: "/reportes" }] : []),
  { nombre: "Buscar documento", ruta: "/buscar" },
  { nombre: "Trazabilidad", ruta: "/trazabilidad" },
  { nombre: "Calendario y agenda", ruta: "/agenda" },
  { nombre: "Proveedores", ruta: "/proveedores" },
];

export default function Inicio() {
  const navigate = useNavigate();
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const [cotizacionesSemana, setCotizacionesSemana] = useState(0);

  useEffect(() => {
    obtenerPedidosActivos();
    obtenerCotizacionesSemana();
    verificarAlertasHoy();
  }, []);

  const obtenerPedidosActivos = async () => {
    const { data } = await supabase
      .from("ordenes_pedido")
      .select("*")
      .eq("estado", "confirmada");
    if (data) setPedidosActivos(data.length);
  };

  const obtenerCotizacionesSemana = async () => {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 7);
    const isoInicio = fechaInicio.toISOString();

    const { data } = await supabase
      .from("cotizaciones")
      .select("*")
      .gte("fecha", isoInicio);

    if (data) setCotizacionesSemana(data.length);
  };

  const verificarAlertasHoy = async () => {
    const hoy = new Date().toISOString().split("T")[0];

    const { data: pedidos } = await supabase
      .from("ordenes_pedido")
      .select("*")
      .eq("fecha_evento", hoy)
      .eq("estado", "confirmada");

    const { data: notas } = await supabase
      .from("agenda")
      .select("*")
      .eq("fecha", hoy);

    const alertas = [];

    if (pedidos && pedidos.length > 0) {
      alertas.push(`📦 Hay ${pedidos.length} pedido(s) programado(s) para hoy.`);
    }

    if (notas && notas.length > 0) {
      alertas.push(`📌 Hay ${notas.length} nota(s) agendada(s) para hoy.`);
    }

    // 🛠️ Verificar productos con disponibilidad menor a 5
    const conteoPorProducto = {};
    pedidos?.forEach((p) => {
      p.productos?.forEach((prod) => {
        conteoPorProducto[prod.nombre] = (conteoPorProducto[prod.nombre] || 0) + prod.cantidad;
      });
    });

    const { data: productos } = await supabase.from("productos").select("*");

    const productosEnAlerta = productos.filter((prod) => {
      const alquilado = conteoPorProducto[prod.nombre] || 0;
      const disponible = prod.stock - alquilado;
      return disponible < 5;
    });

    if (productosEnAlerta.length > 0) {
      alertas.push("⚠️ Productos con baja disponibilidad hoy:\n" + productosEnAlerta.map(p => `• ${p.nombre}`).join("\n"));
    }

    if (alertas.length > 0) {
      Swal.fire({
        title: "🔔 Recordatorios para hoy",
        text: alertas.join("\n\n"),
        icon: "info",
        confirmButtonText: "Ok",
      });
    }
  };

  return (
    <div style={{ padding: "1rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>Inicio</h1>

      <div style={{ margin: "20px auto" }}>
        <img src="/logo192.png" alt="logo" style={{ width: "100px", maxWidth: "80%" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "20px" }}>
        <div style={{
          flex: "1 1 250px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "15px",
          background: "#f0f8ff"
        }}>
          <h3>📦 Pedidos activos</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{pedidosActivos}</p>
        </div>

        <div style={{
          flex: "1 1 250px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "15px",
          background: "#fff0f5"
        }}>
          <h3>🧾 Cotizaciones esta semana</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{cotizacionesSemana}</p>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "15px",
      }}>
        {iconos.map((item) => (
          <button
            key={item.nombre}
            onClick={() => navigate(item.ruta)}
            style={{
              padding: "15px",
              fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
              cursor: "pointer",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "#f9f9f9",
            }}
          >
            {item.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
