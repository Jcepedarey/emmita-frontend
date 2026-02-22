// backend-emmita/routes/empleados.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// Cliente con service_role (bypass RLS) — para crear usuarios
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // service_role key
);

// ─── Middleware: verificar que el usuario es admin ──────────────
async function verificarAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticación requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verificar el JWT con Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // Buscar el perfil del usuario
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

    // Pasar datos al siguiente middleware
    req.adminProfile = profile;
    req.adminUser = user;
    next();
  } catch (err) {
    console.error("Error verificando admin:", err);
    return res.status(500).json({ error: "Error de autenticación" });
  }
}

// ─── POST /api/empleados/crear — Crear usuario empleado ────────
router.post("/crear", verificarAdmin, async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const tenantId = req.adminProfile.tenant_id;

  // Validaciones
  if (!nombre?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }
  if (!["admin", "empleado"].includes(rol)) {
    return res.status(400).json({ error: "Rol inválido" });
  }

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

    // Contar usuarios actuales
    const { count: totalUsuarios } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (totalUsuarios >= tenant.max_usuarios) {
      return res.status(403).json({
        error: `Límite de usuarios alcanzado (${totalUsuarios}/${tenant.max_usuarios}). Mejora tu plan para agregar más usuarios.`,
      });
    }

    // 2. Verificar que el email no exista
    const { data: { users: existentes } } = await supabaseAdmin.auth.admin.listUsers();
    const emailEnUso = existentes?.find(u => u.email === email.trim().toLowerCase());
    if (emailEnUso) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    // 3. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // confirmar automáticamente
      user_metadata: {
        tenant_id: tenantId,
        nombre: nombre.trim(),
        rol,
      },
    });

    if (authError) {
      console.error("Error creando usuario en Auth:", authError);
      return res.status(500).json({ error: authError.message || "No se pudo crear el usuario" });
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
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol,
        activo: true,
      });

      if (insertError) {
        console.error("Error creando perfil:", insertError);
        // Intentar eliminar el usuario de Auth si el perfil falla
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: "No se pudo crear el perfil del usuario" });
      }
    } else {
      // Actualizar perfil existente (creado por trigger)
      await supabaseAdmin.from("profiles").update({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol,
        activo: true,
      }).eq("id", authData.user.id);
    }

    // ✅ Éxito
    res.status(201).json({
      ok: true,
      mensaje: `Usuario ${nombre} creado exitosamente`,
      usuario: {
        id: authData.user.id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol,
      },
    });

  } catch (err) {
    console.error("Error en crear empleado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;