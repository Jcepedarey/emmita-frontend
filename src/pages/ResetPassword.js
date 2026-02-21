// src/pages/ResetPassword.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!password || password.length < 6) {
      return Swal.fire("Contraseña corta", "La contraseña debe tener al menos 6 caracteres", "warning");
    }
    if (password !== passwordConfirm) {
      return Swal.fire("No coinciden", "Las contraseñas no coinciden", "warning");
    }

    try {
      setCargando(true);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setCargando(false);
        return Swal.fire("Error", error.message, "error");
      }

      // Cerrar sesión para que entre con la nueva contraseña
      await supabase.auth.signOut();
      localStorage.removeItem("usuario");
      localStorage.removeItem("sesion");

      setCargando(false);

      await Swal.fire({
        icon: "success",
        title: "¡Contraseña actualizada!",
        text: "Ya puedes iniciar sesión con tu nueva contraseña.",
        confirmButtonColor: "#0077B6",
      });

      navigate("/");

    } catch (err) {
      setCargando(false);
      Swal.fire("Error", "No se pudo actualizar la contraseña. Intenta de nuevo.", "error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)",
      padding: 20,
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 32,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        textAlign: "center",
      }}>
        <img
          src="/icons/swalquiler-logo.png"
          alt="SwAlquiler"
          style={{ width: 80, display: "block", margin: "0 auto 12px" }}
        />
        <h2 style={{ color: "#0077B6", margin: "0 0 8px 0" }}>
          Nueva contraseña
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
          Ingresa tu nueva contraseña
        </p>

        <input
          type="password"
          placeholder="Nueva contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleReset()}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
            marginBottom: 20,
          }}
        />

        <button
          onClick={handleReset}
          disabled={cargando}
          style={{
            width: "100%",
            padding: 12,
            background: "#0077B6",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: cargando ? "not-allowed" : "pointer",
            opacity: cargando ? 0.7 : 1,
          }}
        >
          {cargando ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </div>
    </div>
  );
}