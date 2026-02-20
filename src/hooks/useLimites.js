// src/hooks/useLimites.js
// Hook que verifica límites del plan y estado del trial
import { useState, useEffect, useCallback } from "react";
import { useTenant } from "../context/TenantContext";
import supabase from "../supabaseClient";

// ─── Definición de planes ──────────────────────────────────────────
const PLANES = {
  trial: {
    nombre: "Prueba gratuita",
    duracionDias: 7,
    maxProductos: 50,
    maxUsuarios: 1,
    maxClientes: Infinity,
    maxDocumentos: Infinity, // cotizaciones + pedidos
  },
  basico: {
    nombre: "Básico",
    duracionDias: null, // sin límite de tiempo (mientras pague)
    maxProductos: 50,
    maxUsuarios: 2,
    maxClientes: Infinity,
    maxDocumentos: Infinity,
  },
  profesional: {
    nombre: "Profesional",
    duracionDias: null,
    maxProductos: Infinity,
    maxUsuarios: 5,
    maxClientes: Infinity,
    maxDocumentos: Infinity,
  },
};

export default function useLimites() {
  const { tenant } = useTenant();
  const [conteos, setConteos] = useState({
    productos: 0,
    clientes: 0,
    documentos: 0,
    usuarios: 0,
  });
  const [cargando, setCargando] = useState(true);

  // ─── Obtener conteos actuales ────────────────────────────────
  const cargarConteos = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const [prodRes, cliRes, cotRes, ordRes, usrRes] = await Promise.all([
        supabase.from("productos").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("cotizaciones").select("id", { count: "exact", head: true }),
        supabase.from("ordenes_pedido").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      ]);

      setConteos({
        productos: prodRes.count || 0,
        clientes: cliRes.count || 0,
        documentos: (cotRes.count || 0) + (ordRes.count || 0),
        usuarios: usrRes.count || 0,
      });
    } catch (err) {
      console.error("Error cargando conteos:", err);
    } finally {
      setCargando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    cargarConteos();
  }, [cargarConteos]);

  // ─── Cálculos ────────────────────────────────────────────────
  const plan = tenant?.plan || "trial";
  const limites = PLANES[plan] || PLANES.trial;

  // Calcular días restantes del trial
  let diasRestantes = null;
  let trialVencido = false;

  if (plan === "trial" && tenant?.fecha_registro) {
    const inicio = new Date(tenant.fecha_registro);
    const ahora = new Date();
    const diffMs = ahora - inicio;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    diasRestantes = Math.max(0, limites.duracionDias - diffDias);
    trialVencido = diasRestantes <= 0;
  }

  // Verificar si el tenant está pausado/suspendido
  const tenantInactivo = tenant?.estado !== "activo";

  // ─── Funciones de verificación ───────────────────────────────

  // ¿Puede crear un producto nuevo?
  const puedeCrearProducto = () => {
    if (tenantInactivo || trialVencido) return false;
    if (conteos.productos >= limites.maxProductos) return false;
    return true;
  };

  // ¿Puede crear un cliente nuevo?
  const puedeCrearCliente = () => {
    if (tenantInactivo || trialVencido) return false;
    if (conteos.clientes >= limites.maxClientes) return false;
    return true;
  };

  // ¿Puede crear un documento (cotización/pedido)?
  const puedeCrearDocumento = () => {
    if (tenantInactivo || trialVencido) return false;
    if (conteos.documentos >= limites.maxDocumentos) return false;
    return true;
  };

  // ¿Puede agregar un usuario?
  const puedeAgregarUsuario = () => {
    if (tenantInactivo || trialVencido) return false;
    if (conteos.usuarios >= limites.maxUsuarios) return false;
    return true;
  };

  // Mensaje de error según la situación
  const mensajeBloqueo = (tipo) => {
    if (tenantInactivo) {
      return {
        titulo: "Cuenta suspendida",
        mensaje: "Tu cuenta está suspendida. Contacta a SwAlquiler para reactivarla.",
        icono: "error",
      };
    }
    if (trialVencido) {
      return {
        titulo: "Prueba gratuita finalizada",
        mensaje: "Tu período de prueba de 7 días ha terminado. Contacta a SwAlquiler para activar un plan y seguir usando el sistema.\n\nWhatsApp: 3166534685",
        icono: "warning",
      };
    }
    // Límite de cantidad alcanzado
    const nombres = {
      producto: "productos",
      cliente: "clientes",
      documento: "documentos",
      usuario: "usuarios",
    };
    return {
      titulo: "Límite alcanzado",
      mensaje: `Has alcanzado el máximo de ${nombres[tipo]} para el plan ${limites.nombre}. Contacta a SwAlquiler para mejorar tu plan.\n\nWhatsApp: 3166534685`,
      icono: "info",
    };
  };

  return {
    plan,
    limites,
    conteos,
    cargando,
    diasRestantes,
    trialVencido,
    tenantInactivo,
    puedeCrearProducto,
    puedeCrearCliente,
    puedeCrearDocumento,
    puedeAgregarUsuario,
    mensajeBloqueo,
    recargarConteos: cargarConteos,
  };
}