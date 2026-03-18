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
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);
  const navigate = useNavigate();

  const { recargar } = useTenant();

  // ✅ CORRECCIÓN: Limpieza suave y local.
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

  /* ═══════════════════════════════════════════════════════════════
     ESTILOS INLINE — Inspirados en la calculadora SwAlquiler
     ═══════════════════════════════════════════════════════════════ */
  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(170deg, #023E8A 0%, #0077B6 35%, #00B4D8 60%, #e0f7fa 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      position: "relative",
      overflow: "hidden",
    },
    // Círculos decorativos de fondo
    circle1: {
      position: "absolute",
      width: "400px",
      height: "400px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(0,180,216,0.15) 0%, transparent 70%)",
      top: "-100px",
      right: "-100px",
      pointerEvents: "none",
    },
    circle2: {
      position: "absolute",
      width: "300px",
      height: "300px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(2,62,138,0.12) 0%, transparent 70%)",
      bottom: "-50px",
      left: "-80px",
      pointerEvents: "none",
    },
    card: {
      background: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: "20px",
      padding: "36px 32px 28px",
      width: "100%",
      maxWidth: "400px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      position: "relative",
      zIndex: 1,
      animation: "cardSlideUp 0.5s ease-out",
    },
    logo: {
      width: "120px",
      display: "block",
      margin: "0 auto 8px",
      filter: "drop-shadow(0 4px 12px rgba(0, 119, 182, 0.2))",
    },
    titulo: {
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      fontSize: "20px",
      fontWeight: 700,
      color: "#023E8A",
      textAlign: "center",
      margin: "0 0 4px 0",
    },
    subtitulo: {
      fontSize: "13px",
      color: "#64748b",
      textAlign: "center",
      margin: "0 0 24px 0",
      fontWeight: 400,
    },
    inputGroup: {
      position: "relative",
      marginBottom: "16px",
    },
    inputIcon: {
      position: "absolute",
      left: "14px",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "16px",
      color: "#94a3b8",
      pointerEvents: "none",
      transition: "color 0.2s",
    },
    inputIconFocused: {
      color: "#0077B6",
    },
    input: {
      width: "100%",
      padding: "14px 14px 14px 42px",
      fontSize: "15px",
      border: "2px solid #e2e8f0",
      borderRadius: "12px",
      outline: "none",
      transition: "border-color 0.25s, box-shadow 0.25s",
      background: "#f8fafc",
      color: "#1e293b",
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      boxSizing: "border-box",
    },
    inputFocused: {
      borderColor: "#00B4D8",
      boxShadow: "0 0 0 4px rgba(0, 180, 216, 0.12)",
      background: "#ffffff",
    },
    forgotLink: {
      display: "block",
      textAlign: "right",
      fontSize: "13px",
      color: "#0077B6",
      cursor: "pointer",
      fontWeight: 500,
      margin: "-8px 0 20px 0",
      textDecoration: "none",
      transition: "color 0.2s",
    },
    boton: {
      width: "100%",
      padding: "14px",
      fontSize: "15px",
      fontWeight: 700,
      color: "white",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      background: "linear-gradient(135deg, #00B4D8, #0077B6)",
      boxShadow: "0 4px 14px rgba(0, 119, 182, 0.3)",
      transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      letterSpacing: "0.3px",
    },
    botonDisabled: {
      opacity: 0.55,
      cursor: "not-allowed",
      transform: "none",
      boxShadow: "0 2px 8px rgba(0, 119, 182, 0.15)",
    },
    registro: {
      textAlign: "center",
      marginTop: "20px",
      fontSize: "14px",
      color: "#64748b",
    },
    registroLink: {
      color: "#0077B6",
      fontWeight: 700,
      textDecoration: "none",
    },
    captchaWrapper: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: "16px",
    },
    captchaHint: {
      fontSize: "11px",
      color: "#94a3b8",
      marginTop: "6px",
      textAlign: "center",
    },
    footer: {
      marginTop: "24px",
      fontSize: "11px",
      color: "rgba(255,255,255,0.7)",
      textAlign: "center",
      position: "relative",
      zIndex: 1,
    },
    footerLink: {
      color: "rgba(255,255,255,0.9)",
      textDecoration: "none",
      fontWeight: 600,
    },
  };

  const isDisabled = cargando || !captchaToken;

  return (
    <>
      {/* Animación CSS inyectada */}
      <style>{`
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(0,119,182,0.4) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .forgot-link:hover {
          color: #023E8A !important;
        }
      `}</style>

      <div style={styles.page}>
        {/* Círculos decorativos */}
        <div style={styles.circle1} />
        <div style={styles.circle2} />

        {/* Card principal */}
        <div style={styles.card}>
          {/* Logo */}
          <img
            src="/icons/swalquiler-logo.png"
            alt="SwAlquiler"
            className="app-logo-login"
            style={styles.logo}
          />

          <h2 style={styles.titulo}>Bienvenido</h2>
          <p style={styles.subtitulo}>Ingresa a tu cuenta para continuar</p>

          {/* Input Email */}
          <div style={styles.inputGroup}>
            <span
              style={{
                ...styles.inputIcon,
                ...(focusEmail ? styles.inputIconFocused : {}),
              }}
            >
              ✉
            </span>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
              style={{
                ...styles.input,
                ...(focusEmail ? styles.inputFocused : {}),
              }}
            />
          </div>

          {/* Input Password */}
          <div style={styles.inputGroup}>
            <span
              style={{
                ...styles.inputIcon,
                ...(focusPass ? styles.inputIconFocused : {}),
              }}
            >
              🔒
            </span>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              onFocus={() => setFocusPass(true)}
              onBlur={() => setFocusPass(false)}
              style={{
                ...styles.input,
                ...(focusPass ? styles.inputFocused : {}),
              }}
            />
          </div>

          {/* Olvidaste contraseña */}
          <span
            className="forgot-link"
            onClick={handleRecuperarPassword}
            style={styles.forgotLink}
          >
            ¿Olvidaste tu contraseña?
          </span>

          {/* Botón entrar */}
          <button
            className="login-btn"
            onClick={handleLogin}
            disabled={isDisabled}
            style={{
              ...styles.boton,
              ...(isDisabled ? styles.botonDisabled : {}),
            }}
          >
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {/* Registro */}
          <p style={styles.registro}>
            ¿No tienes cuenta?{" "}
            <Link to="/registro" style={styles.registroLink}>
              Registra tu empresa
            </Link>
          </p>

          {/* CAPTCHA Cloudflare Turnstile */}
          <div style={styles.captchaWrapper}>
            <Turnstile
              sitekey={process.env.REACT_APP_TURNSTILE_SITE_KEY || "0x4AAAAAACgQb4Y7stbzuhZh"}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              theme="light"
            />
            <span style={styles.captchaHint}>
              Verificación de seguridad · Espera a que se complete
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <a href="https://www.swalquiler.com" style={styles.footerLink}>
            www.swalquiler.com
          </a>{" "}
          · Gestión de alquiler y eventos
        </div>
      </div>
    </>
  );
}