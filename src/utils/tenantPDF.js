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

    _cachedTenant = {
      nombre: tenant.nombre || "Mi Empresa",
      direccion: tenant.direccion || "",
      telefono: tenant.telefono || "",
      email: tenant.email || "",
      instagram: tenant.instagram || "",
      facebook: tenant.facebook || "",
      nit: tenant.nit || "",
      logoUrl: tenant.logo_url || "/icons/logo.png",
      fondoUrl: tenant.fondo_url || "/icons/fondo_emmita.png",
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
    logoUrl: "/icons/logo.png",
    fondoUrl: "/icons/fondo_emmita.png",
  };
}

// Limpiar caché al cerrar sesión
export function limpiarCacheTenant() {
  _cachedTenant = null;
}