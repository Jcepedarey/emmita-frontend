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
  const [mostrarPass, setMostrarPass] = useState(false);
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

  const isDisabled = cargando || !captchaToken;

  return (
    <>
      <style>{`
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes waveFloat1 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-15px) translateY(-6px); }
        }
        @keyframes waveFloat2 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(12px) translateY(5px); }
        }
        @keyframes waveFloat3 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-8px) translateY(-4px); }
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
        .eye-toggle:hover {
          color: #0077B6 !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #023E8A 0%, #0077B6 40%, #00B4D8 70%, #90E0EF 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "visible",
      }}>

        {/* ═══════ ONDAS FLUIDAS SVG (contenedor propio) ═══════ */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}>

        {/* Onda superior — curva suave saliendo de arriba */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "200px",
            opacity: 0.08,
            pointerEvents: "none",
            animation: "waveFloat1 9s ease-in-out infinite",
          }}
        >
          <path
            fill="#ffffff"
            d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,128C840,107,960,85,1080,90.7C1200,96,1320,128,1380,144L1440,160L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
          />
        </svg>

        {/* Onda inferior principal — curva amplia */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "220px",
            opacity: 0.10,
            pointerEvents: "none",
            animation: "waveFloat2 11s ease-in-out infinite",
          }}
        >
          <path
            fill="#ffffff"
            d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,213.3C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>

        {/* Onda inferior secundaria — más estrecha y desfasada */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "160px",
            opacity: 0.06,
            pointerEvents: "none",
            animation: "waveFloat3 14s ease-in-out infinite",
          }}
        >
          <path
            fill="#CAF0F8"
            d="M0,256L80,240C160,224,320,192,480,192C640,192,800,224,960,240C1120,256,1280,256,1360,256L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
          />
        </svg>

        {/* Círculo decorativo sutil */}
        <div style={{
          position: "absolute",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(144,224,239,0.10) 0%, transparent 65%)",
          top: "-120px",
          right: "-120px",
          pointerEvents: "none",
        }} />
        </div>{/* Fin contenedor ondas */}

        {/* ═══════ CARD PRINCIPAL ═══════ */}
        <div style={{
          background: "rgba(255, 255, 255, 0.97)",
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
        }}>
          {/* Logo */}
          <img
            src="/icons/swalquiler-logo.png"
            alt="SwAlquiler"
            className="app-logo-login"
            style={{
              width: "120px",
              display: "block",
              margin: "0 auto 8px",
              filter: "drop-shadow(0 4px 12px rgba(0, 119, 182, 0.2))",
            }}
          />

          <h2 style={{
            fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            color: "#023E8A",
            textAlign: "center",
            margin: "0 0 4px 0",
          }}>Bienvenido</h2>

          <p style={{
            fontSize: "13.5px",
            color: "#4b5563",
            textAlign: "center",
            margin: "0 0 24px 0",
            fontWeight: 400,
          }}>Ingresa a tu cuenta para continuar</p>

          {/* ═══ INPUT EMAIL ═══ */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <span style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "15px",
              color: focusEmail ? "#0077B6" : "#94a3b8",
              pointerEvents: "none",
              transition: "color 0.2s",
            }}>
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
                width: "100%",
                padding: "14px 14px 14px 42px",
                fontSize: "15px",
                border: `2px solid ${focusEmail ? "#00B4D8" : "#e2e8f0"}`,
                borderRadius: "12px",
                outline: "none",
                transition: "border-color 0.25s, box-shadow 0.25s, background 0.25s",
                background: focusEmail ? "#ffffff" : "#f8fafc",
                boxShadow: focusEmail ? "0 0 0 4px rgba(0, 180, 216, 0.12)" : "none",
                color: "#1e293b",
                fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* ═══ INPUT PASSWORD + OJITO ═══ */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <span style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "15px",
              color: focusPass ? "#0077B6" : "#94a3b8",
              pointerEvents: "none",
              transition: "color 0.2s",
            }}>
              🔒
            </span>
            <input
              type={mostrarPass ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              onFocus={() => setFocusPass(true)}
              onBlur={() => setFocusPass(false)}
              style={{
                width: "100%",
                padding: "14px 48px 14px 42px",
                fontSize: "15px",
                border: `2px solid ${focusPass ? "#00B4D8" : "#e2e8f0"}`,
                borderRadius: "12px",
                outline: "none",
                transition: "border-color 0.25s, box-shadow 0.25s, background 0.25s",
                background: focusPass ? "#ffffff" : "#f8fafc",
                boxShadow: focusPass ? "0 0 0 4px rgba(0, 180, 216, 0.12)" : "none",
                color: "#1e293b",
                fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
                boxSizing: "border-box",
              }}
            />
            {/* 👁 Botón ojito */}
            <button
              type="button"
              className="eye-toggle"
              onClick={() => setMostrarPass(!mostrarPass)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "17px",
                color: "#94a3b8",
                padding: "4px 6px",
                lineHeight: 1,
                transition: "color 0.2s",
                borderRadius: "6px",
              }}
              tabIndex={-1}
              aria-label={mostrarPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarPass ? "🙈" : "👁"}
            </button>
          </div>

          {/* Olvidaste contraseña */}
          <span
            className="forgot-link"
            onClick={handleRecuperarPassword}
            style={{
              display: "block",
              textAlign: "right",
              fontSize: "13px",
              color: "#0077B6",
              cursor: "pointer",
              fontWeight: 500,
              margin: "-8px 0 20px 0",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            ¿Olvidaste tu contraseña?
          </span>

          {/* Botón entrar */}
          <button
            className="login-btn"
            onClick={handleLogin}
            disabled={isDisabled}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "15px",
              fontWeight: 700,
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: isDisabled ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg, #00B4D8, #0077B6)",
              boxShadow: isDisabled
                ? "0 2px 8px rgba(0, 119, 182, 0.15)"
                : "0 4px 14px rgba(0, 119, 182, 0.3)",
              transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
              fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
              letterSpacing: "0.3px",
              opacity: isDisabled ? 0.55 : 1,
            }}
          >
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {/* Registro */}
          <p style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "14px",
            color: "#64748b",
          }}>
            ¿No tienes cuenta?{" "}
            <Link to="/registro" style={{
              color: "#0077B6",
              fontWeight: 700,
              textDecoration: "none",
            }}>
              Registra tu empresa
            </Link>
          </p>

          {/* CAPTCHA Cloudflare Turnstile */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "16px",
            minHeight: "80px",
          }}>
            <Turnstile
              key="sw-login-turnstile"
              sitekey={process.env.REACT_APP_TURNSTILE_SITE_KEY || "0x4AAAAAACgQb4Y7stbzuhZh"}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              retry="auto"
              refreshExpired="auto"
              theme="light"
            />
            <span style={{
              fontSize: "11px",
              color: "#94a3b8",
              marginTop: "6px",
              textAlign: "center",
            }}>
              {captchaToken
                ? "✅ Verificación completada"
                : "Verificación de seguridad · Espera a que se complete"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: "24px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.90)",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          textShadow: "0 1px 4px rgba(0,0,0,0.20)",
        }}>
          <a href="https://www.swalquiler.com" style={{
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
          }}>
            www.swalquiler.com
          </a>{" "}
          · Gestión de alquiler y eventos
        </div>
      </div>
    </>
  );
}