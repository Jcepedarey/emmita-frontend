// src/context/TenantContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import supabase from "../supabaseClient";

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);       // datos de la empresa
  const [perfil, setPerfil] = useState(null);        // profile del usuario (rol, permisos)
  const [cargando, setCargando] = useState(true);    // loading inicial
  const [error, setError] = useState(null);

  // Cargar perfil y tenant del usuario autenticado
  const cargarTenant = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      // 1. Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTenant(null);
        setPerfil(null);
        setCargando(false);
        return;
      }

      // 2. Obtener profile (tiene tenant_id y rol)
      const { data: perfilData, error: perfilError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (perfilError || !perfilData) {
        console.error("Error cargando perfil:", perfilError);
        setError("No se encontró perfil de usuario");
        setCargando(false);
        return;
      }

      // 3. Obtener datos del tenant (empresa)
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", perfilData.tenant_id)
        .single();

      if (tenantError || !tenantData) {
        console.error("Error cargando tenant:", tenantError);
        setError("No se encontró la empresa");
        setCargando(false);
        return;
      }

      setPerfil(perfilData);
      setTenant(tenantData);
      setCargando(false);

    } catch (err) {
      console.error("Error en TenantContext:", err);
      setError("Error cargando datos de empresa");
      setCargando(false);
    }
  }, []);

  // Escuchar cambios de sesión (login/logout)
  useEffect(() => {
    cargarTenant();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        cargarTenant();
      }
      if (event === "SIGNED_OUT") {
        setTenant(null);
        setPerfil(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, [cargarTenant]);

  // Helpers útiles
  const esAdmin = perfil?.rol === "admin" || perfil?.rol === "super_admin";
  const esSuperAdmin = perfil?.rol === "super_admin";
  const tenantActivo = tenant?.estado === "activo";

  return (
    <TenantContext.Provider
      value={{
        tenant,          // { id, nombre, slug, logo_url, direccion, ... }
        perfil,          // { id, tenant_id, nombre, rol, permisos }
        cargando,
        error,
        esAdmin,
        esSuperAdmin,
        tenantActivo,
        recargar: cargarTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);