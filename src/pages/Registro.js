import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    usuario: "",
    email: "",
    password: "",
    confirmar: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { nombre, identificacion, usuario, email, password, confirmar } = form;

    if (!nombre || !identificacion || !usuario || !email || !password || !confirmar) {
      return Swal.fire("Campos incompletos", "Todos los campos son obligatorios", "warning");
    }

    if (password !== confirmar) {
      return Swal.fire("Error", "Las contraseñas no coinciden", "error");
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/usuarios/solicitud-registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, identificacion, usuario, email, password, confirmar }), // ✅ se agregó confirmar
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire("Solicitud enviada", "Tu solicitud será revisada y aprobada manualmente", "success");
        navigate("/");
      } else {
        Swal.fire("Error", data.error || "No se pudo registrar", "error");
      }
    } catch (err) {
      Swal.fire("Error de conexión", "No se pudo conectar con el servidor", "error");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto", padding: "1rem", textAlign: "center" }}>
      <h2>Crear cuenta nueva</h2>

      <input
        type="text"
        name="nombre"
        placeholder="Nombre completo"
        value={form.nombre}
        onChange={handleChange}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <input
        type="text"
        name="identificacion"
        placeholder="Identificación"
        value={form.identificacion}
        onChange={handleChange}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <input
        type="text"
        name="usuario"
        placeholder="Nombre de usuario"
        value={form.usuario}
        onChange={handleChange}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <input
        type="email"
        name="email"
        placeholder="Correo"
        value={form.email}
        onChange={handleChange}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={handleChange}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <input
        type="password"
        name="confirmar"
        placeholder="Confirmar contraseña"
        value={form.confirmar}
        onChange={handleChange}
        style={{ width: "100%", padding: "10px", marginBottom: "20px" }}
      />
      <button onClick={handleSubmit} style={{ width: "100%", padding: "10px" }}>
        Enviar solicitud
      </button>
    </div>
  );
}
