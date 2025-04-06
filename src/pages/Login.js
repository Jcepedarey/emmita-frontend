import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setCargando(false);

      if (res.ok) {
        localStorage.setItem("usuario", JSON.stringify(data));
        navigate("/inicio");
      } else {
        Swal.fire("Acceso denegado", data.error || "Email o contraseña incorrectos", "error");
      }
    } catch (err) {
      setCargando(false);
      Swal.fire("Error de conexión", "No se pudo conectar al servidor", "error");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2 style={{ marginBottom: "20px", fontSize: "1.6rem" }}>Iniciar sesión</h2>
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
      <button
        onClick={handleLogin}
        disabled={cargando}
        style={{ padding: "10px 30px", fontSize: "1rem", cursor: "pointer" }}
      >
        {cargando ? "Cargando..." : "Entrar"}
      </button>
      <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#888" }}>
        ¿No tienes cuenta? Pronto podrás crearla desde aquí.
      </div>
    </div>
  );
}
