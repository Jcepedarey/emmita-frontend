// backend-emmita/routes/empleados.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🔒 Límites
const LIMITES = {
  nombre: 100,
  email: 100,
  password_min: 6,
  password_max: 72,
};

// ─── Middleware: verificar admin ────────────────────────────────
async function verificarAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticación requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id, rol, activo")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "Perfil no encontrado" });
    }

    if (profile.rol !== "admin") {
      return res.status(403).json({ error: "Solo los administradores pueden gestionar usuarios" });
    }

    if (!profile.activo) {
      return res.status(403).json({ error: "Tu cuenta está desactivada" });
    }

    req.adminProfile = profile;
    req.adminUser = user;
    next();
  } catch (err) {
    console.error("Error verificando admin:", err.message);
    return res.status(500).json({ error: "Error de autenticación" });
  }
}

// 🔒 Verificar si email existe (sin traer TODOS los usuarios)
async function emailExiste(email) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return !!data;
}

// ─── POST /api/empleados/crear ─────────────────────────────────
router.post("/crear", verificarAdmin, async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const tenantId = req.adminProfile.tenant_id;

  // 🔒 Validaciones estrictas
  if (!nombre?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }
  if (nombre.trim().length > LIMITES.nombre) {
    return res.status(400).json({ error: `Nombre: máximo ${LIMITES.nombre} caracteres` });
  }
  if (email.trim().length > LIMITES.email) {
    return res.status(400).json({ error: `Email: máximo ${LIMITES.email} caracteres` });
  }
  if (password.length < LIMITES.password_min) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }
  if (password.length > LIMITES.password_max) {
    return res.status(400).json({ error: "La contraseña es demasiado larga" });
  }
  if (!["admin", "empleado"].includes(rol)) {
    return res.status(400).json({ error: "Rol inválido" });
  }

  // 🔒 Validar formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Formato de email inválido" });
  }

  const emailLimpio = email.trim().toLowerCase();
  const nombreLimpio = nombre.trim();

  try {
    // 1. Verificar límite de usuarios del tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("plan, estado, max_usuarios")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    if (tenant.estado !== "activo") {
      return res.status(403).json({ error: "La empresa está suspendida" });
    }

    const { count: totalUsuarios } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (totalUsuarios >= tenant.max_usuarios) {
      return res.status(403).json({
        error: `Límite de usuarios alcanzado (${totalUsuarios}/${tenant.max_usuarios}). Mejora tu plan para agregar más usuarios.`,
      });
    }

    // 2. 🔒 Verificar email sin traer todos los usuarios
    const yaExiste = await emailExiste(emailLimpio);
    if (yaExiste) {
      return res.status(409).json({ error: "No se pudo crear el usuario. Verifica los datos." });
    }

    // 3. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLimpio,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        nombre: nombreLimpio,
        rol,
      },
    });

    if (authError) {
      console.error("Error creando usuario en Auth:", authError.message);
      return res.status(500).json({ error: "No se pudo crear el usuario. Verifica los datos." });
    }

    // 4. Verificar/crear perfil
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (!profile) {
      const { error: insertError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        tenant_id: tenantId,
        nombre: nombreLimpio,
        email: emailLimpio,
        rol,
        activo: true,
      });

      if (insertError) {
        console.error("Error creando perfil:", insertError.message);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: "No se pudo crear el perfil del usuario" });
      }
    } else {
      await supabaseAdmin.from("profiles").update({
        nombre: nombreLimpio,
        email: emailLimpio,
        rol,
        activo: true,
      }).eq("id", authData.user.id);
    }

    // ✅ Éxito
    res.status(201).json({
      ok: true,
      mensaje: `Usuario ${nombreLimpio} creado exitosamente`,
      usuario: {
        id: authData.user.id,
        nombre: nombreLimpio,
        email: emailLimpio,
        rol,
      },
    });

  } catch (err) {
    console.error("Error en crear empleado:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;