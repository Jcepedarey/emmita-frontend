// src/pages/Login.js
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";
import { useTenant } from "../context/TenantContext";
import { Turnstile } from "react-turnstile";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  const { recargar } = useTenant();

  useEffect(() => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("sesion");
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      return Swal.fire("Campos requeridos", "Debes ingresar email y contraseña", "warning");
    }
    if (!captchaToken) {
      return Swal.fire("Verificación requerida", "Completa la verificación de seguridad", "warning");
    }

    try {
      setCargando(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (error || !data.session) {
        setCargando(false);
        return Swal.fire("Acceso denegado", error?.message || "Email o contraseña incorrectos", "error");
      }

      localStorage.setItem("sesion", JSON.stringify(data.session));
      localStorage.setItem("usuario", JSON.stringify(data.session.user));

      await recargar();

      setCargando(false);
      navigate("/inicio");
    } catch (err) {
      setCargando(false);
      Swal.fire("Error de conexión", "No se pudo conectar a Supabase", "error");
    }
  };

  // ✅ Recuperar contraseña
  const handleRecuperarPassword = async () => {
    const { value: emailRecuperar } = await Swal.fire({
      title: "Recuperar contraseña",
      input: "email",
      inputLabel: "Ingresa el correo de tu cuenta",
      inputPlaceholder: "tu@email.com",
      inputValue: email || "",
      showCancelButton: true,
      confirmButtonText: "Enviar enlace",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0077B6",
      inputValidator: (value) => {
        if (!value || !value.includes("@")) {
          return "Ingresa un correo electrónico válido";
        }
      },
    });

    if (!emailRecuperar) return;

    if (!captchaToken) {
      return Swal.fire(
        "Verificación requerida",
        "Completa primero la verificación de seguridad y luego intenta recuperar tu contraseña",
        "info"
      );
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperar, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      });

      if (error) {
        return Swal.fire("Error", error.message, "error");
      }

      Swal.fire({
        icon: "success",
        title: "Correo enviado",
        html: `
          <p>Si existe una cuenta con <strong>${emailRecuperar}</strong>, recibirás un enlace para restablecer tu contraseña.</p>
          <p style="margin-top:8px; color:#6b7280; font-size:13px;">Revisa tu bandeja de entrada y la carpeta de spam.</p>
        `,
        confirmButtonColor: "#0077B6",
      });
    } catch (err) {
      Swal.fire("Error", "No se pudo enviar el correo. Intenta de nuevo.", "error");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 80, padding: "0 20px" }}>
      <img
        src="/icons/swalquiler-logo.png"
        alt="SwAlquiler"
        className="app-logo-login"
        style={{ width: 140, marginBottom: 10 }}
      />
      <h2 style={{ marginBottom: 4, color: "#023E8A" }}>Bienvenido</h2>
      <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
        Ingresa a tu cuenta para continuar
      </p>

      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          display: "block",
          margin: "10px auto",
          padding: "10px 14px",
          width: "100%",
          maxWidth: 340,
          fontSize: 15,
          borderRadius: 8,
          border: "1px solid #ccc",
          boxSizing: "border-box",
        }}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        style={{
          display: "block",
          margin: "10px auto",
          padding: "10px 14px",
          width: "100%",
          maxWidth: 340,
          fontSize: 15,
          borderRadius: 8,
          border: "1px solid #ccc",
          boxSizing: "border-box",
        }}
      />

      <p style={{ margin: "8px 0 16px", fontSize: 13 }}>
        <span
          onClick={handleRecuperarPassword}
          style={{
            color: "#0077B6",
            cursor: "pointer",
            fontWeight: 500,
            textDecoration: "underline",
          }}
        >
          ¿Olvidaste tu contraseña?
        </span>
      </p>

      {/* ✅ CAPTCHA Cloudflare Turnstile */}
      <div style={{ display: "inline-block", marginBottom: 16 }}>
        <Turnstile
          sitekey="0x4AAAAAACgQb4Y7stbzuhZh"
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          theme="light"
        />
      </div>
      <br />

      <button
        onClick={handleLogin}
        disabled={cargando || !captchaToken}
        style={{
          padding: "10px 30px",
          opacity: cargando || !captchaToken ? 0.5 : 1,
          cursor: cargando || !captchaToken ? "not-allowed" : "pointer",
        }}
      >
        {cargando ? "Cargando..." : "Entrar"}
      </button>

      <p style={{ marginTop: 20, fontSize: 14, color: "#6b7280" }}>
        ¿No tienes cuenta?{" "}
        <Link to="/registro" style={{ color: "#0077B6", fontWeight: 600 }}>
          Registra tu empresa
        </Link>
      </p>
    </div>
  );
}