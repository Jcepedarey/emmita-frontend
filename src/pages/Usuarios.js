// src/pages/Usuarios.js
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import { useTenant } from "../context/TenantContext";
import useLimites from "../hooks/useLimites";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido";

const API_URL = process.env.REACT_APP_API_URL;

export default function Usuarios() {
  const { tenant, perfil } = useTenant();
  const { puedeAgregarUsuario, mensajeBloqueo, conteos, limites, recargarConteos } = useLimites();
  const esAdmin = perfil?.rol === "admin";

  // ─── Tabs ────────────────────────────────────────────────────
  const [tab, setTab] = useState("perfil");

  // ─── Mi Perfil ───────────────────────────────────────────────
  const [formPerfil, setFormPerfil] = useState({
    nombre: "",
    nuevaPassword: "",
    confirmarPassword: "",
  });

  // ─── Equipo (admin) ──────────────────────────────────────────
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "empleado",
  });
  const [cargando, setCargando] = useState(false);

  // ─── Cargar datos ────────────────────────────────────────────
  useEffect(() => {
    if (perfil) {
      setFormPerfil((prev) => ({ ...prev, nombre: perfil.nombre || "" }));
    }
  }, [perfil]);

  useEffect(() => {
    if (esAdmin && tenant?.id) cargarUsuarios();
  }, [esAdmin, tenant?.id]);

  const cargarUsuarios = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });

    if (error) console.error("Error cargando usuarios:", error);
    else setUsuarios(data || []);
  };

  // ─── Actualizar perfil propio ────────────────────────────────
  const actualizarPerfil = async () => {
    const { nombre, nuevaPassword, confirmarPassword } = formPerfil;

    if (!nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre es obligatorio", "warning");
    }

    // Actualizar nombre en profiles
    const { error: errorPerfil } = await supabase
      .from("profiles")
      .update({ nombre: nombre.trim() })
      .eq("id", perfil.id);

    if (errorPerfil) {
      return Swal.fire("Error", "No se pudo actualizar el nombre", "error");
    }

    // Cambiar contraseña si se llenó
    if (nuevaPassword) {
      if (nuevaPassword.length < 6) {
        return Swal.fire("Contraseña corta", "Mínimo 6 caracteres", "warning");
      }
      if (nuevaPassword !== confirmarPassword) {
        return Swal.fire("No coinciden", "Las contraseñas no coinciden", "warning");
      }

      const { error: errorPass } = await supabase.auth.updateUser({
        password: nuevaPassword,
      });

      if (errorPass) {
        return Swal.fire("Error", errorPass.message, "error");
      }
    }

    Swal.fire("✅ Actualizado", "Tu perfil fue actualizado correctamente", "success");
    setFormPerfil((prev) => ({ ...prev, nuevaPassword: "", confirmarPassword: "" }));
  };

  // ─── Crear empleado (admin) ──────────────────────────────────
  const crearEmpleado = async () => {
    const { nombre, email, password, rol } = formNuevo;

    if (!nombre.trim() || !email.trim() || !password) {
      return Swal.fire("Campos requeridos", "Nombre, email y contraseña son obligatorios", "warning");
    }
    if (password.length < 6) {
      return Swal.fire("Contraseña corta", "Mínimo 6 caracteres", "warning");
    }
    if (!email.includes("@")) {
      return Swal.fire("Email inválido", "Ingresa un email válido", "warning");
    }

    // Verificar límite de usuarios
    if (!puedeAgregarUsuario()) {
      const msg = mensajeBloqueo("usuario");
      return Swal.fire(msg.titulo, msg.mensaje, msg.icono);
    }

    try {
      setCargando(true);

      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCargando(false);
        return Swal.fire("Error", "No hay sesión activa", "error");
      }

      const res = await fetch(`${API_URL}/api/empleados/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim().toLowerCase(), password, rol }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCargando(false);
        return Swal.fire("Error", data.error || "No se pudo crear el usuario", "error");
      }

      Swal.fire("✅ Usuario creado", `${nombre} ahora puede acceder al sistema`, "success");
      setFormNuevo({ nombre: "", email: "", password: "", rol: "empleado" });
      setMostrarFormCrear(false);
      cargarUsuarios();
      recargarConteos();
    } catch (err) {
      console.error("Error creando empleado:", err);
      Swal.fire("Error de conexión", "No se pudo conectar al servidor", "error");
    } finally {
      setCargando(false);
    }
  };

  // ─── Cambiar estado de usuario (activar/desactivar) ──────────
  const toggleActivo = async (usuario) => {
    // No permitir desactivarse a sí mismo
    if (usuario.id === perfil.id) {
      return Swal.fire("No permitido", "No puedes desactivar tu propia cuenta", "warning");
    }

    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? "activar" : "desactivar";

    const confirmar = await Swal.fire({
      title: `¿${nuevoEstado ? "Activar" : "Desactivar"} a ${usuario.nombre}?`,
      text: nuevoEstado
        ? "El usuario podrá acceder al sistema nuevamente."
        : "El usuario no podrá iniciar sesión hasta que lo reactives.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: "Cancelar",
      confirmButtonColor: nuevoEstado ? "#22c55e" : "#ef4444",
    });

    if (!confirmar.isConfirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({ activo: nuevoEstado })
      .eq("id", usuario.id);

    if (error) {
      return Swal.fire("Error", "No se pudo actualizar el usuario", "error");
    }

    Swal.fire("✅ Listo", `${usuario.nombre} fue ${accion === "activar" ? "activado" : "desactivado"}`, "success");
    cargarUsuarios();
  };

  // ─── Cambiar rol de usuario ──────────────────────────────────
  const cambiarRol = async (usuario, nuevoRol) => {
    if (usuario.id === perfil.id) {
      return Swal.fire("No permitido", "No puedes cambiar tu propio rol", "warning");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ rol: nuevoRol })
      .eq("id", usuario.id);

    if (error) {
      return Swal.fire("Error", "No se pudo cambiar el rol", "error");
    }

    Swal.fire("✅ Rol actualizado", `${usuario.nombre} ahora es ${nuevoRol}`, "success");
    cargarUsuarios();
  };

  // ─── Obtener email del usuario actual ────────────────────────
  const emailActual = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuario"));
      return user?.email || "";
    } catch {
      return "";
    }
  })();

  // ─── Estilos ─────────────────────────────────────────────────
  const estilos = {
    container: { padding: "1rem", maxWidth: "700px", margin: "auto" },
    titulo: { textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)", marginBottom: 8 },
    subtitulo: { textAlign: "center", fontSize: 14, color: "#9ca3af", marginBottom: 24 },
    tabs: { display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e5e7eb" },
    tab: (activo) => ({
      flex: 1,
      padding: "12px 16px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 15,
      fontWeight: activo ? 600 : 400,
      color: activo ? "#0077B6" : "#6b7280",
      borderBottom: activo ? "2px solid #0077B6" : "2px solid transparent",
      marginBottom: -2,
      transition: "all 0.2s ease",
    }),
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 },
    input: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      boxSizing: "border-box",
      marginBottom: 12,
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      boxSizing: "border-box",
      marginBottom: 12,
      background: "#fff",
    },
    btnPrimario: {
      width: "100%",
      padding: 12,
      background: "#0077B6",
      color: "white",
      border: "none",
      borderRadius: 8,
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
    },
    btnSecundario: {
      width: "100%",
      padding: 10,
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      cursor: "pointer",
      marginTop: 8,
    },
    btnAgregar: {
      padding: "10px 20px",
      background: "#00B4D8",
      color: "white",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      marginBottom: 16,
    },
    userItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      marginBottom: 8,
      background: "#fff",
    },
    badge: (tipo) => ({
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: tipo === "admin" ? "#dbeafe" : "#f3e8ff",
      color: tipo === "admin" ? "#1d4ed8" : "#7c3aed",
    }),
    badgeActivo: (activo) => ({
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: activo ? "#22c55e" : "#ef4444",
      marginRight: 8,
    }),
    contador: {
      textAlign: "center",
      fontSize: 13,
      color: "#9ca3af",
      marginBottom: 16,
    },
  };

  return (
    <Protegido>
      <div style={estilos.container}>
        <h2 style={estilos.titulo}>👤 Usuarios</h2>
        <p style={estilos.subtitulo}>
          {tenant?.nombre || "Cargando..."}
        </p>

        {/* ─── Tabs ─────────────────────────────────────────── */}
        <div style={estilos.tabs}>
          <button style={estilos.tab(tab === "perfil")} onClick={() => setTab("perfil")}>
            Mi Perfil
          </button>
          {esAdmin && (
            <button style={estilos.tab(tab === "equipo")} onClick={() => setTab("equipo")}>
              Mi Equipo ({usuarios.length}/{limites.maxUsuarios === Infinity ? "∞" : limites.maxUsuarios})
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: MI PERFIL                                     */}
        {/* ═══════════════════════════════════════════════════ */}
        {tab === "perfil" && (
          <div style={estilos.card}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Información personal</h3>

            <label style={estilos.label}>Nombre</label>
            <input
              type="text"
              value={formPerfil.nombre}
              onChange={(e) => setFormPerfil({ ...formPerfil, nombre: e.target.value })}
              style={estilos.input}
            />

            <label style={estilos.label}>Email</label>
            <input
              type="email"
              value={emailActual}
              disabled
              style={{ ...estilos.input, background: "#f9fafb", color: "#9ca3af" }}
            />

            <label style={estilos.label}>Rol</label>
            <input
              type="text"
              value={perfil?.rol === "admin" ? "Administrador" : "Empleado"}
              disabled
              style={{ ...estilos.input, background: "#f9fafb", color: "#9ca3af" }}
            />

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Cambiar contraseña</h3>

            <label style={estilos.label}>Nueva contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formPerfil.nuevaPassword}
              onChange={(e) => setFormPerfil({ ...formPerfil, nuevaPassword: e.target.value })}
              style={estilos.input}
            />

            <label style={estilos.label}>Confirmar contraseña</label>
            <input
              type="password"
              placeholder="Repite la nueva contraseña"
              value={formPerfil.confirmarPassword}
              onChange={(e) => setFormPerfil({ ...formPerfil, confirmarPassword: e.target.value })}
              style={estilos.input}
            />

            <button onClick={actualizarPerfil} style={estilos.btnPrimario}>
              Guardar cambios
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: MI EQUIPO (solo admin)                        */}
        {/* ═══════════════════════════════════════════════════ */}
        {tab === "equipo" && esAdmin && (
          <>
            <p style={estilos.contador}>
              {conteos.usuarios} de {limites.maxUsuarios === Infinity ? "ilimitados" : limites.maxUsuarios} usuarios
            </p>

            {/* Botón agregar */}
            {!mostrarFormCrear && (
              <button onClick={() => setMostrarFormCrear(true)} style={estilos.btnAgregar}>
                ➕ Agregar usuario
              </button>
            )}

            {/* ─── Formulario crear usuario ───────────────── */}
            {mostrarFormCrear && (
              <div style={estilos.card}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Nuevo usuario</h3>

                <label style={estilos.label}>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Nombre del empleado"
                  value={formNuevo.nombre}
                  onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                  style={estilos.input}
                />

                <label style={estilos.label}>Email</label>
                <input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formNuevo.email}
                  onChange={(e) => setFormNuevo({ ...formNuevo, email: e.target.value })}
                  style={estilos.input}
                />

                <label style={estilos.label}>Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formNuevo.password}
                  onChange={(e) => setFormNuevo({ ...formNuevo, password: e.target.value })}
                  style={estilos.input}
                />

                <label style={estilos.label}>Rol</label>
                <select
                  value={formNuevo.rol}
                  onChange={(e) => setFormNuevo({ ...formNuevo, rol: e.target.value })}
                  style={estilos.select}
                >
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>

                <button
                  onClick={crearEmpleado}
                  disabled={cargando}
                  style={{
                    ...estilos.btnPrimario,
                    opacity: cargando ? 0.7 : 1,
                    cursor: cargando ? "not-allowed" : "pointer",
                  }}
                >
                  {cargando ? "Creando..." : "Crear usuario"}
                </button>

                <button
                  onClick={() => {
                    setMostrarFormCrear(false);
                    setFormNuevo({ nombre: "", email: "", password: "", rol: "empleado" });
                  }}
                  style={estilos.btnSecundario}
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* ─── Lista de usuarios ──────────────────────── */}
            <h3 style={{ fontSize: 16, marginBottom: 12, marginTop: 8 }}>Usuarios de la empresa</h3>

            {usuarios.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af" }}>No hay usuarios registrados</p>
            ) : (
              usuarios.map((u) => (
                <div key={u.id} style={estilos.userItem}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={estilos.badgeActivo(u.activo)} title={u.activo ? "Activo" : "Inactivo"} />
                      <strong style={{ fontSize: 15 }}>{u.nombre}</strong>
                      <span style={estilos.badge(u.rol)}>{u.rol}</span>
                      {u.id === perfil.id && (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>(tú)</span>
                      )}
                    </div>
                    {u.email && (
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, marginLeft: 16 }}>
                        📧 {u.email}
                      </div>
                    )}
                  </div>

                  {/* Acciones (no en sí mismo) */}
                  {u.id !== perfil.id && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        value={u.rol}
                        onChange={(e) => cambiarRol(u, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #d1d5db",
                          fontSize: 13,
                        }}
                      >
                        <option value="empleado">Empleado</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        onClick={() => toggleActivo(u)}
                        title={u.activo ? "Desactivar" : "Activar"}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "none",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: u.activo ? "#fee2e2" : "#dcfce7",
                          color: u.activo ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </Protegido>
  );
}