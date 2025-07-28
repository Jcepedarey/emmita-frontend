import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido"; // 🔐 Protección

export default function Usuarios() {
  <Protegido />; // ⛔ Redirige si no hay sesión activa

  const [usuario, setUsuario] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", nueva_password: "" });

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    const usuarioLocal = JSON.parse(localStorage.getItem("usuario"));
    if (!usuarioLocal) return;
    setUsuario(usuarioLocal);
    setForm({ nombre: usuarioLocal.nombre, email: usuarioLocal.email, password: "", nueva_password: "" });
  };

  const actualizarUsuario = async () => {
    const { nombre, email, password, nueva_password } = form;

    if (!nombre || !email || !password || !nueva_password) {
      return Swal.fire("Campos requeridos", "Completa todos los campos para actualizar tu perfil", "warning");
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/usuarios/cambiar-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password_actual: password, nueva_password }),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire("Actualizado", "Tu contraseña fue actualizada correctamente", "success");
        localStorage.setItem("usuario", JSON.stringify({ ...usuario, nombre, email }));
        setUsuario({ ...usuario, nombre, email });
        setForm({ nombre, email, password: "", nueva_password: "" });
      } else {
        Swal.fire("Error", data.error || "No se pudo actualizar la contraseña", "error");
      }
    } catch (err) {
      Swal.fire("Error", "No se pudo conectar al servidor", "error");
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "500px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Tu Perfil</h2>

      <label>Nombre</label>
      <input
        type="text"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />

      <label>Correo</label>
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />

      <label>Contraseña actual</label>
      <input
        type="password"
        placeholder="Contraseña actual"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />

      <label>Nueva contraseña</label>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={form.nueva_password}
        onChange={(e) => setForm({ ...form, nueva_password: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
      />

      <button onClick={actualizarUsuario} style={{ width: "100%", padding: "10px" }}>
        Actualizar datos
      </button>
    </div>
  );
}
