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

    if (!token || token.length < 20) {
      return res.status(401).json({ error: "Token inválido" });
    }

    // 2. Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // 3. Verificar que el perfil esté activo
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

    // 4. Verificar estado del tenant (empresa)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, estado, plan, fecha_registro, fecha_vencimiento")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) {
      return res.status(403).json({ error: "Empresa no encontrada" });
    }

    // Tenant suspendido manualmente
    if (tenant.estado === "suspendido" || tenant.estado === "inactivo") {
      return res.status(403).json({ error: "Cuenta suspendida. Contacta a SwAlquiler para reactivarla." });
    }

    // Trial vencido
    if (tenant.plan === "trial" && tenant.fecha_registro) {
      const inicio = new Date(tenant.fecha_registro);
      const ahora = new Date();
      const diffDias = Math.floor((ahora - inicio) / (1000 * 60 * 60 * 24));
      if (diffDias >= 14) {
        return res.status(403).json({ error: "Tu período de prueba ha finalizado. Contacta a SwAlquiler para activar un plan." });
      }
    }

    // Plan pago vencido
    if (tenant.plan !== "trial" && tenant.fecha_vencimiento) {
      const vencimiento = new Date(tenant.fecha_vencimiento);
      if (new Date() > vencimiento) {
        return res.status(403).json({ error: "Tu plan ha vencido. Renueva tu suscripción para continuar." });
      }
    }

    // 5. Agregar usuario, perfil y tenant a request
    req.usuario = user;
    req.perfil = profile;
    req.tenant = tenant;
    next();

  } catch (error) {
    console.error("Error verificando token:", error.message);
    res.status(500).json({ error: "Error de autenticación" });
  }
};

module.exports = verificarToken;