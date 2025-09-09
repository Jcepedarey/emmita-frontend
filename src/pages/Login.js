// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

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

      setCargando(false);

      if (error || !data.session) {
        return Swal.fire("Acceso denegado", error?.message || "Email o contraseña incorrectos", "error");
      }

      // ✅ Guarda la sesión COMPLETA (incluye refresh token)
      localStorage.setItem("sesion", JSON.stringify(data.session));

      // ✅ (Compatibilidad con el resto del frontend)
      localStorage.setItem("usuario", JSON.stringify(data.session.user));

      navigate("/inicio");
    } catch (err) {
      setCargando(false);
      Swal.fire("Error de conexión", "No se pudo conectar a Supabase", "error");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
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
        style={{ padding: "10px", marginBottom: "20px", width: "250px" }}
      /><br />
      <button onClick={handleLogin} disabled={cargando} style={{ padding: "10px 30px" }}>
        {cargando ? "Cargando..." : "Entrar"}
      </button>
    </div>
  );
}
