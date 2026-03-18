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
        if (!value || !value.includes("@")) return "Ingresa un correo electrónico válido";
      },
    });
    if (!emailRecuperar) return;
    if (!captchaToken) {
      return Swal.fire("Verificación requerida", "Completa primero la verificación de seguridad", "info");
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperar, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      });
      if (error) return Swal.fire("Error", error.message, "error");
      Swal.fire({
        icon: "success",
        title: "Correo enviado",
        html: `<p>Si existe una cuenta con <strong>${emailRecuperar}</strong>, recibirás un enlace.</p>
               <p style="margin-top:8px;color:#6b7280;font-size:13px;">Revisa bandeja de entrada y spam.</p>`,
        confirmButtonColor: "#0077B6",
      });
    } catch (err) {
      Swal.fire("Error", "No se pudo enviar el correo.", "error");
    }
  };

  const isDisabled = cargando || !captchaToken;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #023E8A 0%, #0077B6 40%, #00B4D8 70%, #90E0EF 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      position: "relative",
    }}>

      {/* ═══ ONDAS (contenedor aislado) ═══ */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        overflow: "hidden", pointerEvents: "none", zIndex: 0,
      }}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "200px", opacity: 0.08,
        }}>
          <path fill="#fff" d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,128C840,107,960,85,1080,90.7C1200,96,1320,128,1380,144L1440,160L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" />
        </svg>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{
          position: "absolute", bottom: 0, left: 0, width: "100%", height: "220px", opacity: 0.10,
        }}>
          <path fill="#fff" d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,213.3C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{
          position: "absolute", bottom: 0, left: 0, width: "100%", height: "160px", opacity: 0.06,
        }}>
          <path fill="#CAF0F8" d="M0,256L80,240C160,224,320,192,480,192C640,192,800,224,960,240C1120,256,1280,256,1360,256L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
        </svg>
      </div>

      {/* ═══ CARD ═══ */}
      <div style={{
        background: "#ffffff", borderRadius: "20px", padding: "36px 32px 28px",
        width: "100%", maxWidth: "400px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        position: "relative", zIndex: 1,
      }}>
        <img src="/icons/swalquiler-logo.png" alt="SwAlquiler" style={{
          width: "120px", display: "block", margin: "0 auto 8px",
          filter: "drop-shadow(0 4px 12px rgba(0,119,182,0.2))",
        }} />

        <h2 style={{
          fontSize: "22px", fontWeight: 700, color: "#023E8A",
          textAlign: "center", margin: "0 0 4px 0",
        }}>Bienvenido</h2>
        <p style={{
          fontSize: "13.5px", color: "#4b5563",
          textAlign: "center", margin: "0 0 24px 0",
        }}>Ingresa a tu cuenta para continuar</p>

        {/* EMAIL */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <span style={{
            position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            fontSize: "15px", color: focusEmail ? "#0077B6" : "#94a3b8", pointerEvents: "none",
          }}>✉</span>
          <input
            id="login-email" name="email" type="email" autoComplete="email"
            placeholder="Correo electrónico" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusEmail(true)} onBlur={() => setFocusEmail(false)}
            style={{
              width: "100%", padding: "14px 14px 14px 42px", fontSize: "15px",
              border: `2px solid ${focusEmail ? "#00B4D8" : "#e2e8f0"}`,
              borderRadius: "12px", outline: "none", background: focusEmail ? "#fff" : "#f8fafc",
              boxShadow: focusEmail ? "0 0 0 4px rgba(0,180,216,0.12)" : "none",
              color: "#1e293b", boxSizing: "border-box",
            }}
          />
        </div>

        {/* PASSWORD + OJITO */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <span style={{
            position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            fontSize: "15px", color: focusPass ? "#0077B6" : "#94a3b8", pointerEvents: "none",
          }}>🔒</span>
          <input
            id="login-password" name="password" autoComplete="current-password"
            type={mostrarPass ? "text" : "password"}
            placeholder="Contraseña" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            onFocus={() => setFocusPass(true)} onBlur={() => setFocusPass(false)}
            style={{
              width: "100%", padding: "14px 48px 14px 42px", fontSize: "15px",
              border: `2px solid ${focusPass ? "#00B4D8" : "#e2e8f0"}`,
              borderRadius: "12px", outline: "none", background: focusPass ? "#fff" : "#f8fafc",
              boxShadow: focusPass ? "0 0 0 4px rgba(0,180,216,0.12)" : "none",
              color: "#1e293b", boxSizing: "border-box",
            }}
          />
          <button type="button" onClick={() => setMostrarPass(!mostrarPass)} style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", fontSize: "17px",
            color: "#94a3b8", padding: "4px 6px", lineHeight: 1,
          }} tabIndex={-1}>
            {mostrarPass ? "🙈" : "👁"}
          </button>
        </div>

        <span onClick={handleRecuperarPassword} style={{
          display: "block", textAlign: "right", fontSize: "13px",
          color: "#0077B6", cursor: "pointer", fontWeight: 500, margin: "-8px 0 20px 0",
        }}>¿Olvidaste tu contraseña?</span>

        <button onClick={handleLogin} disabled={isDisabled} style={{
          width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700,
          color: "white", border: "none", borderRadius: "12px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          background: "linear-gradient(135deg, #00B4D8, #0077B6)",
          boxShadow: isDisabled ? "0 2px 8px rgba(0,119,182,0.15)" : "0 4px 14px rgba(0,119,182,0.3)",
          opacity: isDisabled ? 0.55 : 1,
        }}>
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#64748b" }}>
          ¿No tienes cuenta?{" "}
          <Link to="/registro" style={{ color: "#0077B6", fontWeight: 700, textDecoration: "none" }}>
            Registra tu empresa
          </Link>
        </p>

        {/* ═══ TURNSTILE — EXACTO como el original que funcionaba ═══ */}
        <div style={{ display: "inline-block", marginTop: 16, width: "100%", textAlign: "center" }}>
          <Turnstile
            sitekey="0x4AAAAAACgQb4Y7stbzuhZh"
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            theme="light"
          />
        </div>
        <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", margin: "6px 0 0 0" }}>
          Verificación de seguridad · Espera a que se complete
        </p>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "20px", fontSize: "12px", color: "rgba(255,255,255,0.90)",
        textAlign: "center", position: "relative", zIndex: 1,
        textShadow: "0 1px 4px rgba(0,0,0,0.20)",
      }}>
        <a href="https://www.swalquiler.com" style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}>
          www.swalquiler.com
        </a>{" "}· Gestión de alquiler y eventos
      </div>
    </div>
  );
}