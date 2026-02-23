// backend-emmita/routes/registro.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🔒 Límites de longitud
const LIMITES = {
  nombre: 100,
  slug: 50,
  telefono: 20,
  direccion: 200,
  email: 100,
  password_min: 6,
  password_max: 72,
};

// ✅ Verificar CAPTCHA con Cloudflare
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
    console.error("Error verificando CAPTCHA:", err.message);
    return false;
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

// POST /api/registro
router.post("/", async (req, res) => {
  const { empresa, usuario, captchaToken } = req.body;

  // ── Verificar CAPTCHA ─────────────────────────────
  if (!captchaToken) {
    return res.status(400).json({ error: "Verificación de seguridad requerida" });
  }
  const captchaValido = await verificarCaptcha(captchaToken);
  if (!captchaValido) {
    return res.status(403).json({ error: "Verificación de seguridad fallida. Intenta de nuevo." });
  }

  // ── Validaciones estrictas ────────────────────────
  if (!empresa?.nombre?.trim() || !empresa?.slug?.trim()) {
    return res.status(400).json({ error: "Nombre y slug de empresa son obligatorios" });
  }
  if (!usuario?.nombre?.trim() || !usuario?.email?.trim() || !usuario?.password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }

  // 🔒 Validar longitudes
  if (empresa.nombre.trim().length > LIMITES.nombre) {
    return res.status(400).json({ error: `Nombre de empresa: máximo ${LIMITES.nombre} caracteres` });
  }
  if (empresa.slug.trim().length > LIMITES.slug) {
    return res.status(400).json({ error: `Identificador: máximo ${LIMITES.slug} caracteres` });
  }
  if (usuario.nombre.trim().length > LIMITES.nombre) {
    return res.status(400).json({ error: `Nombre: máximo ${LIMITES.nombre} caracteres` });
  }
  if (usuario.email.trim().length > LIMITES.email) {
    return res.status(400).json({ error: `Email: máximo ${LIMITES.email} caracteres` });
  }
  if (usuario.password.length < LIMITES.password_min) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }
  if (usuario.password.length > LIMITES.password_max) {
    return res.status(400).json({ error: "La contraseña es demasiado larga" });
  }

  // 🔒 Validar formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(usuario.email.trim())) {
    return res.status(400).json({ error: "Formato de email inválido" });
  }

  // 🔒 Validar slug
  if (!/^[a-z0-9-]+$/.test(empresa.slug) || empresa.slug.length < 3) {
    return res.status(400).json({ error: "El slug solo puede contener letras minúsculas, números y guiones (mínimo 3 caracteres)" });
  }

  // 🔒 Sanitizar
  const nombreEmpresa = empresa.nombre.trim();
  const slugEmpresa = empresa.slug.trim();
  const telefonoEmpresa = (empresa.telefono || "").trim().slice(0, LIMITES.telefono);
  const direccionEmpresa = (empresa.direccion || "").trim().slice(0, LIMITES.direccion);
  const emailEmpresa = (empresa.email || usuario.email).trim().toLowerCase();
  const nombreUsuario = usuario.nombre.trim();
  const emailUsuario = usuario.email.trim().toLowerCase();

  try {
    // 1. Verificar slug único
    const { data: slugExiste } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", slugEmpresa)
      .maybeSingle();

    if (slugExiste) {
      return res.status(409).json({ error: `El identificador "${slugEmpresa}" ya está en uso` });
    }

    // 2. 🔒 Verificar email sin traer todos los usuarios
    const yaExiste = await emailExiste(emailUsuario);
    if (yaExiste) {
      return res.status(409).json({ error: "No se pudo completar el registro. Verifica tus datos." });
    }

    // 3. Crear empresa
    const { data: nuevoTenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        nombre: nombreEmpresa,
        slug: slugEmpresa,
        telefono: telefonoEmpresa,
        direccion: direccionEmpresa,
        email: emailEmpresa,
        plan: "trial",
        estado: "activo",
        max_usuarios: 2,
        max_productos: 100,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creando tenant:", tenantError.message);
      return res.status(500).json({ error: "No se pudo crear la empresa" });
    }

    // 4. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailUsuario,
      password: usuario.password,
      email_confirm: true,
      user_metadata: {
        tenant_id: nuevoTenant.id,
        nombre: nombreUsuario,
        rol: "admin",
      },
    });

    if (authError) {
      console.error("Error creando usuario:", authError.message);
      await supabaseAdmin.from("tenants").delete().eq("id", nuevoTenant.id);
      return res.status(500).json({ error: "No se pudo crear el usuario. Verifica tus datos." });
    }

    // 5. Verificar/crear profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id, rol")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        tenant_id: nuevoTenant.id,
        nombre: nombreUsuario,
        email: emailUsuario,
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
    console.error("Error en registro:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;