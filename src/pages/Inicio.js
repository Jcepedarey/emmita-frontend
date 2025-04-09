import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import {
  FaFileAlt, FaUserFriends, FaBoxes, FaSearch, FaFingerprint,
  FaCalendarAlt, FaTruck, FaChartBar, FaUsers
} from "react-icons/fa";

export default function Inicio() {
  const navigate = useNavigate();
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const [cotizacionesSemana, setCotizacionesSemana] = useState(0);
  const [fechaHora, setFechaHora] = useState(new Date());
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("usuario"));
    if (!u) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  useEffect(() => {
    if (!usuario) return;
    const interval = setInterval(() => setFechaHora(new Date()), 1000);
    obtenerPedidosActivos();
    obtenerCotizacionesSemana();
    verificarAlertasHoy();
    return () => clearInterval(interval);
  }, [usuario]);

  const esAdmin = usuario?.rol === "admin";

  const iconos = [
    { nombre: "Crear documento", ruta: "/crear-documento", icono: <FaFileAlt /> },
    { nombre: "Clientes", ruta: "/clientes", icono: <FaUserFriends /> },
    ...(esAdmin ? [{ nombre: "Inventario", ruta: "/inventario", icono: <FaBoxes /> }] : []),
    ...(esAdmin ? [{ nombre: "Usuarios", ruta: "/usuarios", icono: <FaUsers /> }] : []),
    ...(esAdmin ? [{ nombre: "Reportes", ruta: "/reportes", icono: <FaChartBar /> }] : []),
    { nombre: "Buscar documento", ruta: "/buscar", icono: <FaSearch /> },
    { nombre: "Trazabilidad", ruta: "/trazabilidad", icono: <FaFingerprint /> },
    { nombre: "Calendario y agenda", ruta: "/agenda", icono: <FaCalendarAlt /> },
    { nombre: "Proveedores", ruta: "/proveedores", icono: <FaTruck /> },
  ];

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

    if (pedidos?.length) {
      alertas.push(`📦 Hay ${pedidos.length} pedido(s) programado(s) para hoy.`);
    }

    if (notas?.length) {
      alertas.push(`📌 Hay ${notas.length} nota(s) agendada(s) para hoy.`);
    }

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
      alertas.push("⚠️ Productos con baja disponibilidad hoy:\n" +
        productosEnAlerta.map(p => `• ${p.nombre}`).join("\n"));
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

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    navigate("/");
  };

  if (!usuario) return null;

  return (
    <div style={{ padding: "1rem", maxWidth: "1000px", margin: "auto" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
      }}>
        <img src="/logo192.png" alt="logo" style={{ height: "50px" }} />
        <div style={{ textAlign: "right" }}>
          <div>{fechaHora.toLocaleString()}</div>
          <div style={{ fontWeight: "bold" }}>{usuario?.nombre}</div>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>

      <h1 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>Menú Principal</h1>

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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <div style={{ fontSize: "1.5rem" }}>{item.icono}</div>
            {item.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
