// src/pages/MiEmpresa.js
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";
import { useTenant } from "../context/TenantContext";
import { limpiarCacheTenant } from "../utils/tenantPDF";
import Protegido from "../components/Protegido";

export default function MiEmpresa() {
  const { tenant, perfil, esAdmin, recargar } = useTenant();
  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
    instagram: "",
    facebook: "",
    nit: "",
  });
  const [guardando, setGuardando] = useState(false);

  // Cargar datos actuales del tenant
  useEffect(() => {
    if (tenant) {
      setForm({
        nombre: tenant.nombre || "",
        direccion: tenant.direccion || "",
        telefono: tenant.telefono || "",
        email: tenant.email || "",
        instagram: tenant.instagram || "",
        facebook: tenant.facebook || "",
        nit: tenant.nit || "",
      });
    }
  }, [tenant]);

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre de la empresa es obligatorio", "warning");
    }

    try {
      setGuardando(true);

      const { error } = await supabase
        .from("tenants")
        .update({
          nombre: form.nombre.trim(),
          direccion: form.direccion.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim(),
          instagram: form.instagram.trim(),
          facebook: form.facebook.trim(),
          nit: form.nit.trim(),
        })
        .eq("id", tenant.id);

      if (error) {
        console.error("Error actualizando empresa:", error);
        Swal.fire("Error", "No se pudo actualizar la información", "error");
        setGuardando(false);
        return;
      }

      // Limpiar caché de PDFs y recargar contexto
      limpiarCacheTenant();
      await recargar();

      setGuardando(false);
      Swal.fire("Guardado", "Los datos de tu empresa se actualizaron correctamente", "success");

    } catch (err) {
      console.error("Error:", err);
      setGuardando(false);
      Swal.fire("Error", "No se pudo conectar", "error");
    }
  };

  // Estilos
  const card = {
    maxWidth: 600,
    margin: "20px auto",
    padding: 24,
    background: "white",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  };
  const label = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    marginTop: 12,
  };
  const input = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  };
  const btnGuardar = {
    width: "100%",
    padding: 12,
    marginTop: 20,
    background: "#0077B6",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: guardando ? "not-allowed" : "pointer",
    opacity: guardando ? 0.7 : 1,
  };

  if (!esAdmin) {
    return (
      <Protegido>
        <div style={{ textAlign: "center", marginTop: 60, color: "#6b7280" }}>
          <h3>Acceso restringido</h3>
          <p>Solo el administrador puede modificar los datos de la empresa.</p>
        </div>
      </Protegido>
    );
  }

  return (
    <Protegido>
      <div style={card}>
        <h2 style={{ textAlign: "center", color: "#0077B6", marginBottom: 4 }}>
          Mi Empresa
        </h2>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>
          Plan: <strong style={{ color: "#0077B6" }}>{tenant?.plan || "—"}</strong>
          {" · "}Estado: <strong style={{ color: tenant?.estado === "activo" ? "#22c55e" : "#ef4444" }}>
            {tenant?.estado || "—"}
          </strong>
        </p>

        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 8 }} />

        <label style={label}>Nombre de la empresa *</label>
        <input
          style={input}
          value={form.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          placeholder="Nombre de tu empresa"
        />

        <label style={label}>NIT / Identificación fiscal</label>
        <input
          style={input}
          value={form.nit}
          onChange={(e) => handleChange("nit", e.target.value)}
          placeholder="Ej: 900.123.456-7"
        />

        <label style={label}>Dirección</label>
        <input
          style={input}
          value={form.direccion}
          onChange={(e) => handleChange("direccion", e.target.value)}
          placeholder="Dirección física del negocio"
        />

        <label style={label}>Teléfono / WhatsApp</label>
        <input
          style={input}
          value={form.telefono}
          onChange={(e) => handleChange("telefono", e.target.value)}
          placeholder="Ej: 3166534685"
        />

        <label style={label}>Email de contacto</label>
        <input
          style={input}
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="email@empresa.com"
        />

        <label style={label}>Instagram</label>
        <input
          style={input}
          value={form.instagram}
          onChange={(e) => handleChange("instagram", e.target.value)}
          placeholder="@tuempresa"
        />

        <label style={label}>Facebook</label>
        <input
          style={input}
          value={form.facebook}
          onChange={(e) => handleChange("facebook", e.target.value)}
          placeholder="facebook.com/tuempresa"
        />

        <button style={btnGuardar} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </Protegido>
  );
}