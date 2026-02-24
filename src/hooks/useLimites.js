// src/hooks/useLimites.js
// Hook que verifica límites del plan y estado del trial
import { useState, useEffect, useCallback } from "react";
import { useTenant } from "../context/TenantContext";
import supabase from "../supabaseClient";

// ─── Definición de planes (valores por defecto) ──────────────────────
const PLANES = {
  trial: {
    nombre: "Prueba gratuita",
    duracionDias: 14,
    maxProductos: 50,
    maxUsuarios: 1,
    maxClientes: Infinity,
    maxDocumentos: Infinity,
  },
  basico: {
    nombre: "Básico",
    duracionDias: null,
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
  enterprise: {
    nombre: "Enterprise",
    duracionDias: null,
    maxProductos: Infinity,
    maxUsuarios: 10,
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
  const planesBase = PLANES[plan] || PLANES.trial;

  // Usar valores de la DB si existen (permiten override manual por tenant)
  const limites = {
    ...planesBase,
    maxProductos: tenant?.max_productos != null && tenant.max_productos > 0
      ? tenant.max_productos
      : planesBase.maxProductos,
    maxUsuarios: tenant?.max_usuarios != null && tenant.max_usuarios > 0
      ? tenant.max_usuarios
      : planesBase.maxUsuarios,
  };

  // Calcular días restantes del trial
  let diasRestantes = null;
  let trialVencido = false;

  if (plan === "trial" && tenant?.fecha_registro) {
    const inicio = new Date(tenant.fecha_registro);
    const ahora = new Date();
    const diffMs = ahora - inicio;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    diasRestantes = Math.max(0, 14 - diffDias);
    trialVencido = diasRestantes <= 0;
  }

  // Verificar si hay fecha de vencimiento (para planes pagos con vencimiento)
  let planVencido = false;
  if (plan !== "trial" && tenant?.fecha_vencimiento) {
    const vencimiento = new Date(tenant.fecha_vencimiento);
    planVencido = new Date() > vencimiento;
  }

  // Verificar si el tenant está suspendido
  const tenantInactivo = tenant?.estado === "suspendido" || tenant?.estado === "inactivo" || planVencido;

  // ─── Funciones de verificación ───────────────────────────────

  const puedeCrearProducto = () => {
    if (tenantInactivo || trialVencido) return false;
    if (limites.maxProductos !== Infinity && conteos.productos >= limites.maxProductos) return false;
    return true;
  };

  const puedeCrearCliente = () => {
    if (tenantInactivo || trialVencido) return false;
    if (limites.maxClientes !== Infinity && conteos.clientes >= limites.maxClientes) return false;
    return true;
  };

  const puedeCrearDocumento = () => {
    if (tenantInactivo || trialVencido) return false;
    if (limites.maxDocumentos !== Infinity && conteos.documentos >= limites.maxDocumentos) return false;
    return true;
  };

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
        mensaje: "Tu cuenta está suspendida. Contacta a SwAlquiler para reactivarla.\n\n📱 WhatsApp: 321 490 9600\n📧 soporte@swalquiler.com",
        icono: "error",
      };
    }
    if (trialVencido) {
      return {
        titulo: "Prueba gratuita finalizada",
        mensaje: "Tu período de prueba de 14 días ha terminado. Contacta a SwAlquiler para activar un plan y seguir usando el sistema.\n\n📱 WhatsApp: 321 490 9600\n📧 soporte@swalquiler.com",
        icono: "warning",
      };
    }
    if (planVencido) {
      return {
        titulo: "Plan vencido",
        mensaje: "Tu plan ha vencido. Renueva tu suscripción para seguir usando el sistema.\n\n📱 WhatsApp: 321 490 9600\n📧 soporte@swalquiler.com",
        icono: "warning",
      };
    }
    const nombres = {
      producto: "productos",
      cliente: "clientes",
      documento: "documentos",
      usuario: "usuarios",
    };
    return {
      titulo: "Límite alcanzado",
      mensaje: `Has alcanzado el máximo de ${nombres[tipo]} para el plan ${limites.nombre}. Contacta a SwAlquiler para mejorar tu plan.\n\n📱 WhatsApp: 321 490 9600\n📧 soporte@swalquiler.com`,
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
    planVencido,
    tenantInactivo,
    puedeCrearProducto,
    puedeCrearCliente,
    puedeCrearDocumento,
    puedeAgregarUsuario,
    mensajeBloqueo,
    recargarConteos: cargarConteos,
  };
}