// backend-emmita/middleware/verificarToken.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const verificarToken = async (req, res, next) => {
  try {
    // 1. Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autenticado - Token faltante" });
    }

    const token = authHeader.split(" ")[1];

    // 🔒 Validar que el token no esté vacío o sea sospechosamente corto
    if (!token || token.length < 20) {
      return res.status(401).json({ error: "Token inválido" });
    }

    // 2. Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // 3. 🔒 NUEVO: Verificar que el perfil esté activo
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, tenant_id, rol, activo")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return res.status(403).json({ error: "Perfil no encontrado" });
    }

    if (profile.activo === false) {
      return res.status(403).json({ error: "Tu cuenta ha sido desactivada. Contacta al administrador." });
    }

    // 4. Agregar usuario y perfil a request
    req.usuario = user;
    req.perfil = profile;
    next();

  } catch (error) {
    console.error("Error verificando token:", error.message);
    res.status(500).json({ error: "Error de autenticación" });
  }
};

module.exports = verificarToken;