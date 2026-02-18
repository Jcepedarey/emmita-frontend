// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";

export default function Register() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);

  const [empresa, setEmpresa] = useState({
    nombre: "",
    slug: "",
    telefono: "",
    direccion: "",
    email: "",
  });

  const [usuario, setUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const generarSlug = (nombre) => {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleEmpresaChange = (campo, valor) => {
    const nuevo = { ...empresa, [campo]: valor };
    if (campo === "nombre") {
      nuevo.slug = generarSlug(valor);
    }
    setEmpresa(nuevo);
  };

  const validarPaso1 = () => {
    if (!empresa.nombre.trim()) {
      Swal.fire("Campo requerido", "Ingresa el nombre de tu empresa", "warning");
      return false;
    }
    if (!empresa.slug.trim() || empresa.slug.length < 3) {
      Swal.fire("Slug inválido", "El identificador debe tener al menos 3 caracteres", "warning");
      return false;
    }
    return true;
  };

  const validarPaso2 = () => {
    if (!usuario.nombre.trim()) {
      Swal.fire("Campo requerido", "Ingresa tu nombre", "warning");
      return false;
    }
    if (!usuario.email.trim() || !usuario.email.includes("@")) {
      Swal.fire("Email inválido", "Ingresa un correo electrónico válido", "warning");
      return false;
    }
    if (usuario.password.length < 6) {
      Swal.fire("Contraseña corta", "La contraseña debe tener al menos 6 caracteres", "warning");
      return false;
    }
    if (usuario.password !== usuario.passwordConfirm) {
      Swal.fire("No coinciden", "Las contraseñas no coinciden", "warning");
      return false;
    }
    return true;
  };

  const registrar = async () => {
    if (!validarPaso2()) return;

    try {
      setCargando(true);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: {
            nombre: empresa.nombre.trim(),
            slug: empresa.slug.trim(),
            telefono: empresa.telefono.trim(),
            direccion: empresa.direccion.trim(),
            email: empresa.email.trim(),
          },
          usuario: {
            nombre: usuario.nombre.trim(),
            email: usuario.email.trim(),
            password: usuario.password,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCargando(false);
        return Swal.fire("Error", data.error || "No se pudo completar el registro", "error");
      }

      setCargando(false);

      await Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        html: `
          <p>Tu empresa <strong>${empresa.nombre}</strong> ha sido creada.</p>
          <p style="margin-top:8px; color:#6b7280; font-size:13px;">
            Ya puedes iniciar sesión con tu email y contraseña.
          </p>
        `,
        confirmButtonColor: "#0077B6",
      });

      navigate("/");

    } catch (err) {
      console.error("Error en registro:", err);
      setCargando(false);
      Swal.fire("Error", "No se pudo conectar al servidor. Intenta de nuevo.", "error");
    }
  };

  // ─── Estilos ─────────────────────────────────────────
  const container = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
    padding: 20,
  };
  const card = {
    background: "white",
    borderRadius: 16,
    padding: 32,
    width: "100%",
    maxWidth: 450,
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  };
  const label = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    marginTop: 14,
  };
  const input = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  };
  const slugBox = {
    ...input,
    background: "#f3f4f6",
    color: "#6b7280",
    fontSize: 13,
  };
  const btnPrimary = {
    width: "100%",
    padding: 12,
    marginTop: 20,
    background: "#0077B6",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: cargando ? "not-allowed" : "pointer",
    opacity: cargando ? 0.7 : 1,
  };
  const btnSecondary = {
    ...btnPrimary,
    background: "transparent",
    color: "#0077B6",
    border: "2px solid #0077B6",
    marginTop: 10,
  };
  const stepper = {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  };
  const dot = (activo) => ({
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: activo ? "#0077B6" : "#d1d5db",
    transition: "background 0.3s",
  });

  return (
    <div style={container}>
      <div style={card}>
        <img
          src="/icons/swalquiler-logo.png"
          alt="SwAlquiler"
          style={{ width: 80, display: "block", margin: "0 auto 12px" }}
        />
        <h2 style={{ textAlign: "center", color: "#0077B6", margin: 0 }}>
          Crear cuenta
        </h2>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>
          Registra tu empresa en SwAlquiler
        </p>

        <div style={stepper}>
          <div style={dot(paso >= 1)} />
          <div style={dot(paso >= 2)} />
        </div>

        {paso === 1 && (
          <>
            <label style={label}>Nombre de tu empresa *</label>
            <input
              style={input}
              value={empresa.nombre}
              onChange={(e) => handleEmpresaChange("nombre", e.target.value)}
              placeholder="Ej: Alquiler & Eventos Mi Fiesta"
            />

            <label style={label}>Identificador único (slug)</label>
            <input
              style={slugBox}
              value={empresa.slug}
              onChange={(e) => setEmpresa({ ...empresa, slug: generarSlug(e.target.value) })}
              placeholder="se-genera-automaticamente"
            />
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              Se usará en tu URL: swalquiler.com/{empresa.slug || "tu-empresa"}
            </p>

            <label style={label}>Teléfono / WhatsApp</label>
            <input
              style={input}
              value={empresa.telefono}
              onChange={(e) => setEmpresa({ ...empresa, telefono: e.target.value })}
              placeholder="3001234567"
            />

            <label style={label}>Dirección</label>
            <input
              style={input}
              value={empresa.direccion}
              onChange={(e) => setEmpresa({ ...empresa, direccion: e.target.value })}
              placeholder="Dirección de tu negocio"
            />

            <label style={label}>Email de la empresa</label>
            <input
              style={input}
              type="email"
              value={empresa.email}
              onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
              placeholder="contacto@miempresa.com"
            />

            <button
              style={btnPrimary}
              onClick={() => validarPaso1() && setPaso(2)}
            >
              Siguiente →
            </button>

            <Link to="/" style={{ display: "block", textAlign: "center", marginTop: 16, color: "#0077B6", fontSize: 14 }}>
              ← Ya tengo cuenta, iniciar sesión
            </Link>
          </>
        )}

        {paso === 2 && (
          <>
            <label style={label}>Tu nombre completo *</label>
            <input
              style={input}
              value={usuario.nombre}
              onChange={(e) => setUsuario({ ...usuario, nombre: e.target.value })}
              placeholder="Tu nombre"
            />

            <label style={label}>Email de acceso *</label>
            <input
              style={input}
              type="email"
              value={usuario.email}
              onChange={(e) => setUsuario({ ...usuario, email: e.target.value })}
              placeholder="tu@email.com"
            />

            <label style={label}>Contraseña *</label>
            <input
              style={input}
              type="password"
              value={usuario.password}
              onChange={(e) => setUsuario({ ...usuario, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
            />

            <label style={label}>Confirmar contraseña *</label>
            <input
              style={input}
              type="password"
              value={usuario.passwordConfirm}
              onChange={(e) => setUsuario({ ...usuario, passwordConfirm: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && registrar()}
              placeholder="Repite tu contraseña"
            />

            <button style={btnPrimary} onClick={registrar} disabled={cargando}>
              {cargando ? "Registrando..." : "Crear mi empresa"}
            </button>

            <button style={btnSecondary} onClick={() => setPaso(1)}>
              ← Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
}