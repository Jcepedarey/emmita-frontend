// backend-emmita/routes/registro.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// Cliente con service_role (bypass RLS) — SOLO para registro
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // service_role key
);

// ✅ Verificar token de Turnstile con Cloudflare
async function verificarCaptcha(token) {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error("Error verificando CAPTCHA:", err);
    return false;
  }
}

// POST /api/registro — Crear empresa + usuario administrador
router.post("/", async (req, res) => {
  const { empresa, usuario, captchaToken } = req.body;

  // ─── Verificar CAPTCHA ────────────────────────────
  if (!captchaToken) {
    return res.status(400).json({ error: "Verificación de seguridad requerida" });
  }
  const captchaValido = await verificarCaptcha(captchaToken);
  if (!captchaValido) {
    return res.status(403).json({ error: "Verificación de seguridad fallida. Intenta de nuevo." });
  }

  // ─── Validaciones ─────────────────────────────────
  if (!empresa?.nombre?.trim() || !empresa?.slug?.trim()) {
    return res.status(400).json({ error: "Nombre y slug de empresa son obligatorios" });
  }
  if (!usuario?.nombre?.trim() || !usuario?.email?.trim() || !usuario?.password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }
  if (usuario.password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }
  if (!/^[a-z0-9-]+$/.test(empresa.slug) || empresa.slug.length < 3) {
    return res.status(400).json({ error: "El slug solo puede contener letras minúsculas, números y guiones (mínimo 3 caracteres)" });
  }

  try {
    // 1. Verificar que el slug no exista
    const { data: slugExiste } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", empresa.slug.trim())
      .maybeSingle();

    if (slugExiste) {
      return res.status(409).json({ error: `El identificador "${empresa.slug}" ya está en uso` });
    }

    // 2. Verificar que el email no exista
    const { data: { users: existentes } } = await supabaseAdmin.auth.admin.listUsers();
    const emailEnUso = existentes?.find(u => u.email === usuario.email.trim().toLowerCase());
    if (emailEnUso) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    // 3. Crear empresa (tenant)
    const { data: nuevoTenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        nombre: empresa.nombre.trim(),
        slug: empresa.slug.trim(),
        telefono: (empresa.telefono || "").trim(),
        direccion: (empresa.direccion || "").trim(),
        email: (empresa.email || usuario.email).trim(),
        plan: "trial",
        estado: "activo",
        max_usuarios: 2,
        max_productos: 100,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creando tenant:", tenantError);
      return res.status(500).json({ error: "No se pudo crear la empresa" });
    }

    // 4. Crear usuario en Auth (con tenant_id en metadata para el trigger)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: usuario.email.trim().toLowerCase(),
      password: usuario.password,
      email_confirm: true,
      user_metadata: {
        tenant_id: nuevoTenant.id,
        nombre: usuario.nombre.trim(),
        rol: "admin",
      },
    });

    if (authError) {
      console.error("Error creando usuario:", authError);
      // Rollback: eliminar el tenant
      await supabaseAdmin.from("tenants").delete().eq("id", nuevoTenant.id);
      return res.status(500).json({ error: authError.message || "No se pudo crear el usuario" });
    }

    // 5. Verificar que el trigger creó el profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id, rol")
      .eq("id", authData.user.id)
      .maybeSingle();

    // Si el trigger no lo creó (por timing), lo creamos manualmente
    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        tenant_id: nuevoTenant.id,
        nombre: usuario.nombre.trim(),
        rol: "admin",
        activo: true,
      });
    }

    // ✅ Éxito
    res.status(201).json({
      ok: true,
      mensaje: "Empresa y usuario creados exitosamente",
      empresa: {
        id: nuevoTenant.id,
        nombre: nuevoTenant.nombre,
        slug: nuevoTenant.slug,
        plan: nuevoTenant.plan,
      },
    });

  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;