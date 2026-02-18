// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // ✅ Agregado Link
import Swal from "sweetalert2";
import supabase from "../supabaseClient";
import { useTenant } from "../context/TenantContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  
  // Función para recargar los datos de la empresa al entrar
  const { recargar } = useTenant();

  const handleLogin = async () => {
    if (!email || !password) {
      return Swal.fire("Campos requeridos", "Debes ingresar email y contraseña", "warning");
    }

    try {
      setCargando(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.session) {
        setCargando(false);
        return Swal.fire("Acceso denegado", error?.message || "Email o contraseña incorrectos", "error");
      }

      // ✅ Guardar sesión (compatibilidad con el resto del frontend)
      localStorage.setItem("sesion", JSON.stringify(data.session));
      localStorage.setItem("usuario", JSON.stringify(data.session.user));

      // ✅ CLAVE: Forzar la carga de la empresa antes de entrar
      await recargar();

      setCargando(false);
      navigate("/inicio");

    } catch (err) {
      setCargando(false);
      Swal.fire("Error de conexión", "No se pudo conectar a Supabase", "error");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <img
        src="/icons/swalquiler-logo.png"
        alt="SwAlquiler"
        className="app-logo-login"
        style={{
          width: "145px",
          display: "block",
          margin: "0 auto 16px",
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,.1))"
        }}
      />

      <h2>Iniciar sesión</h2>

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: "10px", marginBottom: "10px", width: "250px" }}
      /><br />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        style={{ padding: "10px", marginBottom: "20px", width: "250px" }}
      /><br />

      <button
        onClick={handleLogin}
        disabled={cargando}
        style={{ padding: "10px 30px" }}
      >
        {cargando ? "Cargando..." : "Entrar"}
      </button>

      {/* ✅ ENLACE DE REGISTRO NUEVO */}
      <p style={{ marginTop: 20, fontSize: 14, color: "#6b7280" }}>
        ¿No tienes cuenta?{" "}
        <Link to="/registro" style={{ color: "#0077B6", fontWeight: 600 }}>
          Registra tu empresa
        </Link>
      </p>
    </div>
  );
}