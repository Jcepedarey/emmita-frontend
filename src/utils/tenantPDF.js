// src/utils/tenantPDF.js
// Helper que obtiene los datos de la empresa para generar PDFs
import supabase from "../supabaseClient";

let _cachedTenant = null;

export async function obtenerDatosTenantPDF() {
  // Si ya lo tenemos en caché (misma sesión), no volver a consultar
  if (_cachedTenant) return _cachedTenant;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return datosPorDefecto();

    const { data: perfil } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!perfil) return datosPorDefecto();

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", perfil.tenant_id)
      .single();

    if (!tenant) return datosPorDefecto();

    // ✅ Migrar datos legacy: si redes_sociales está vacío pero hay instagram/facebook
    let redesSociales = tenant.redes_sociales || [];
    if ((!redesSociales || redesSociales.length === 0)) {
      const legacy = [];
      if (tenant.instagram) legacy.push({ red: "instagram", usuario: tenant.instagram });
      if (tenant.facebook) legacy.push({ red: "facebook", usuario: tenant.facebook });
      if (legacy.length > 0) redesSociales = legacy;
    }

    _cachedTenant = {
      nombre: tenant.nombre || "Mi Empresa",
      direccion: tenant.direccion || "",
      telefono: tenant.telefono || "",
      email: tenant.email || "",
      instagram: tenant.instagram || "",
      facebook: tenant.facebook || "",
      nit: tenant.nit || "",
      // Si no hay imagen subida, queda null (no mostrar nada en el PDF)
      logoUrl: tenant.logo_url || null,
      fondoUrl: tenant.fondo_url || null,
      // 🆕 Nuevos campos
      redesSociales: redesSociales,
      textoCondicionesPdf: tenant.texto_condiciones_pdf || "",
    };

    return _cachedTenant;

  } catch (error) {
    console.error("Error obteniendo datos de empresa para PDF:", error);
    return datosPorDefecto();
  }
}

// Fallback por si algo falla
function datosPorDefecto() {
  return {
    nombre: "Mi Empresa",
    direccion: "",
    telefono: "",
    email: "",
    instagram: "",
    facebook: "",
    nit: "",
    logoUrl: null,
    fondoUrl: null,
    redesSociales: [],
    textoCondicionesPdf: "",
  };
}

// Limpiar caché (llamar al cerrar sesión o al cambiar datos de empresa)
export function limpiarCacheTenant() {
  _cachedTenant = null;
}