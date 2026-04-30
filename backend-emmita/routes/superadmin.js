// backend-emmita/routes/superadmin.js
// Rutas protegidas para el Super Admin (gestión de tenants)
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const verificarToken = require("../middleware/verificarToken");

// Cliente Supabase con service_role (bypasea RLS para acceso cross-tenant)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // En Render esto debe ser la service_role key
);

// ─── Middleware: verificar que sea super_admin ───
const verificarSuperAdmin = (req, res, next) => {
  if (req.perfil?.rol !== "super_admin") {
    return res.status(403).json({ error: "Acceso denegado. Se requiere rol super_admin." });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════
// GET /api/superadmin/tenants — Listar todos los tenants
// ═══════════════════════════════════════════════════════════════
router.get("/tenants", verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Obtener todos los tenants
    const { data: tenants, error: e1 } = await supabase
      .from("tenants")
      .select("id, nombre, plan, estado, max_usuarios, max_productos, fecha_registro, fecha_vencimiento, email, telefono, direccion, logo_url, consultas_ia_mes, consultas_ia_ultimo_reset")
      .order("fecha_registro", { ascending: false });

    if (e1) throw e1;

    // Obtener admins de cada tenant
    const { data: admins, error: e2 } = await supabase
      .from("profiles")
      .select("tenant_id, nombre, email, rol")
      .eq("rol", "admin");

    if (e2) throw e2;

    // Obtener super_admins también
    const { data: superAdmins } = await supabase
      .from("profiles")
      .select("tenant_id, nombre, email, rol")
      .eq("rol", "super_admin");

    const todosAdmins = [...(admins || []), ...(superAdmins || [])];

    // Contar usuarios por tenant
    const { data: userCounts } = await supabase
      .from("profiles")
      .select("tenant_id");

    const conteoUsuarios = {};
    (userCounts || []).forEach((u) => {
      conteoUsuarios[u.tenant_id] = (conteoUsuarios[u.tenant_id] || 0) + 1;
    });

    // Contar productos por tenant
    const { data: prodCounts } = await supabase
      .from("productos")
      .select("tenant_id, tipo");

    const conteoProductos = {};
    const conteoServicios = {};
    (prodCounts || []).forEach((p) => {
      if (p.tipo === "servicio") {
        conteoServicios[p.tenant_id] = (conteoServicios[p.tenant_id] || 0) + 1;
      } else {
        conteoProductos[p.tenant_id] = (conteoProductos[p.tenant_id] || 0) + 1;
      }
    });

    // Contar paquetes por tenant
    const { data: paqCounts } = await supabase
      .from("paquetes_eventos")
      .select("tenant_id");

    const conteoPaquetes = {};
    (paqCounts || []).forEach((p) => {
      conteoPaquetes[p.tenant_id] = (conteoPaquetes[p.tenant_id] || 0) + 1;
    });

    // Combinar datos
    const resultado = (tenants || []).map((t) => {
      const admin = todosAdmins.find((a) => a.tenant_id === t.id);
      
      // Calcular días restantes (puede ser negativo si está vencido)
      let diasRestantes = null;
      if (t.plan === "trial" && t.fecha_registro) {
        const inicio = new Date(t.fecha_registro);
        const ahora = new Date();
        diasRestantes = 14 - Math.floor((ahora - inicio) / (1000 * 60 * 60 * 24));
      } else if (t.plan !== "trial" && t.fecha_vencimiento) {
        const venc = new Date(t.fecha_vencimiento);
        diasRestantes = Math.ceil((venc - new Date()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: t.id,
        nombre: t.nombre,
        plan: t.plan,
        estado: t.estado || "activo",
        max_usuarios: t.max_usuarios,
        max_productos: t.max_productos,
        fecha_registro: t.fecha_registro,
        fecha_vencimiento: t.fecha_vencimiento,
        email_empresa: t.email,
        telefono_empresa: t.telefono,
        logo_url: t.logo_url,
        admin_nombre: admin?.nombre || "—",
        admin_email: admin?.email || "—",
        admin_rol: admin?.rol || "—",
        usuarios: conteoUsuarios[t.id] || 0,
        articulos: conteoProductos[t.id] || 0,
        servicios: conteoServicios[t.id] || 0,
        paquetes: conteoPaquetes[t.id] || 0,
        consultas_ia_hoy: t.consultas_ia_mes || 0,
        consultas_ia_reset: t.consultas_ia_ultimo_reset,
        dias_restantes: diasRestantes,
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error listando tenants:", error);
    res.status(500).json({ error: "Error obteniendo tenants" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/superadmin/stats — KPIs globales
// ═══════════════════════════════════════════════════════════════
router.get("/stats", verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, plan, estado, fecha_registro, fecha_vencimiento");

    const total = (tenants || []).length;
    const activos = (tenants || []).filter((t) => t.estado === "activo" || !t.estado).length;
    const suspendidos = (tenants || []).filter((t) => t.estado === "suspendido").length;
    const enTrial = (tenants || []).filter((t) => t.plan === "trial").length;
    const basico = (tenants || []).filter((t) => t.plan === "basico").length;
    const profesional = (tenants || []).filter((t) => t.plan === "profesional").length;

    // Trials por vencer (menos de 3 días)
    const trialsPorVencer = (tenants || []).filter((t) => {
      if (t.plan !== "trial" || !t.fecha_registro) return false;
      const dias = Math.floor((new Date() - new Date(t.fecha_registro)) / (1000 * 60 * 60 * 24));
      return dias >= 11 && dias < 14;
    }).length;

    // Planes por vencer (menos de 5 días)
    const planesPorVencer = (tenants || []).filter((t) => {
      if (t.plan === "trial" || !t.fecha_vencimiento) return false;
      const dias = Math.ceil((new Date(t.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
      return dias > 0 && dias <= 5;
    }).length;

    res.json({
      total, activos, suspendidos, enTrial, basico, profesional,
      trialsPorVencer, planesPorVencer,
    });
  } catch (error) {
    console.error("❌ Error obteniendo stats:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/superadmin/tenants/:id/plan — Cambiar plan
// ═══════════════════════════════════════════════════════════════
router.put("/tenants/:id/plan", verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    const PLANES = {
      trial:        { max_usuarios: 1,  max_productos: 50,     dias: 14 },
      basico:       { max_usuarios: 3,  max_productos: 500,    dias: 30 },
      profesional:  { max_usuarios: 10, max_productos: 999999, dias: 30 },
    };

    if (!PLANES[plan]) {
      return res.status(400).json({ error: `Plan inválido. Opciones: ${Object.keys(PLANES).join(", ")}` });
    }

    const config = PLANES[plan];
    const updateData = {
      plan,
      estado: "activo",
      max_usuarios: config.max_usuarios,
      max_productos: config.max_productos,
    };

    if (plan === "trial") {
      updateData.fecha_vencimiento = null;
      updateData.fecha_registro = new Date().toISOString();
    } else {
      updateData.fecha_vencimiento = new Date(Date.now() + config.dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    res.json({ ok: true, mensaje: `Plan cambiado a ${plan}`, datos: updateData });
  } catch (error) {
    console.error("❌ Error cambiando plan:", error);
    res.status(500).json({ error: "Error cambiando plan" });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/superadmin/tenants/:id/estado — Suspender / Reactivar
// ═══════════════════════════════════════════════════════════════
router.put("/tenants/:id/estado", verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["activo", "suspendido"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido. Opciones: activo, suspendido" });
    }

    const { error } = await supabase
      .from("tenants")
      .update({ estado })
      .eq("id", id);

    if (error) throw error;

    res.json({ ok: true, mensaje: `Tenant ${estado === "activo" ? "reactivado" : "suspendido"} correctamente` });
  } catch (error) {
    console.error("❌ Error cambiando estado:", error);
    res.status(500).json({ error: "Error cambiando estado" });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/superadmin/tenants/:id/renovar — Renovar suscripción
// ═══════════════════════════════════════════════════════════════
router.put("/tenants/:id/renovar", verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dias, desdeVencimiento } = req.body; // dias: 30, 60, 90, etc.

    if (!dias || dias < 1 || dias > 365) {
      return res.status(400).json({ error: "Días inválidos. Debe ser entre 1 y 365." });
    }

    // Obtener tenant actual
    const { data: tenant } = await supabase
      .from("tenants")
      .select("fecha_vencimiento")
      .eq("id", id)
      .single();

    let nuevaFecha;
    if (desdeVencimiento && tenant?.fecha_vencimiento) {
      // Renovar desde la fecha de vencimiento actual (no perder días)
      nuevaFecha = new Date(new Date(tenant.fecha_vencimiento).getTime() + dias * 24 * 60 * 60 * 1000);
    } else {
      // Renovar desde hoy
      nuevaFecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    }

    const { error } = await supabase
      .from("tenants")
      .update({
        estado: "activo",
        fecha_vencimiento: nuevaFecha.toISOString().slice(0, 10),
      })
      .eq("id", id);

    if (error) throw error;

    res.json({
      ok: true,
      mensaje: `Suscripción renovada por ${dias} días`,
      nueva_fecha_vencimiento: nuevaFecha.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("❌ Error renovando:", error);
    res.status(500).json({ error: "Error renovando suscripción" });
  }
});

module.exports = router;