// src/pages/MiEmpresa.js
import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";
import { useTenant } from "../context/TenantContext";
import { limpiarCacheTenant } from "../utils/tenantPDF";
import Protegido from "../components/Protegido";
import useLimites from "../hooks/useLimites";

// ─── Comprime imagen en el navegador antes de subir ───────────────────
function comprimirImagen(file, maxAncho, maxAlto, calidad = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;

        // Redimensionar proporcionalmente
        if (w > maxAncho || h > maxAlto) {
          const ratio = Math.min(maxAncho / w, maxAlto / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Error comprimiendo imagen"));
            resolve(blob);
          },
          "image/webp",
          calidad
        );
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

export default function MiEmpresa() {
  const { tenant, esAdmin, recargar } = useTenant();
  const { plan, diasRestantes, trialVencido, planVencido, conteos, limites } = useLimites();
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
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [subiendoFondo, setSubiendoFondo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [fondoPreview, setFondoPreview] = useState(null);
  const logoInputRef = useRef(null);
  const fondoInputRef = useRef(null);

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
      setLogoPreview(tenant.logo_url || null);
      setFondoPreview(tenant.fondo_url || null);
    }
  }, [tenant]);

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  // ─── Subir imagen a Supabase Storage ─────────────────────────────
  const subirImagen = async (file, tipo) => {
    // tipo: "logo" o "fondo"
    const esLogo = tipo === "logo";
    const setter = esLogo ? setSubiendoLogo : setSubiendoFondo;

    // Validar tipo de archivo
    const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"];
    if (!tiposPermitidos.includes(file.type)) {
      Swal.fire("Formato no válido", "Solo se permiten imágenes PNG, JPG o WEBP", "warning");
      return;
    }

    // Validar tamaño original (máx 5 MB antes de comprimir)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire("Archivo muy grande", "La imagen no debe superar los 5 MB", "warning");
      return;
    }

    try {
      setter(true);

      // Comprimir: logo 400x400, fondo 800x800
      const maxDim = esLogo ? 400 : 800;
      const blob = await comprimirImagen(file, maxDim, maxDim, 0.8);

      const fileName = `${tenant.id}/${tipo}.webp`;

      // Subir a Storage (upsert reemplaza si ya existe)
      const { error: uploadError } = await supabase.storage
        .from("tenant-assets")
        .upload(fileName, blob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error subiendo imagen:", uploadError);
        Swal.fire("Error", "No se pudo subir la imagen: " + uploadError.message, "error");
        setter(false);
        return;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from("tenant-assets")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + "?v=" + Date.now(); // cache-bust

      // Guardar URL en la tabla tenants
      const campo = esLogo ? "logo_url" : "fondo_url";
      const { error: dbError } = await supabase
        .from("tenants")
        .update({ [campo]: publicUrl })
        .eq("id", tenant.id);

      if (dbError) {
        console.error("Error guardando URL:", dbError);
        Swal.fire("Error", "Imagen subida pero no se pudo guardar la referencia", "error");
        setter(false);
        return;
      }

      // Actualizar preview y caché
      if (esLogo) setLogoPreview(publicUrl);
      else setFondoPreview(publicUrl);

      limpiarCacheTenant();
      await recargar();

      setter(false);

      const tamKB = (blob.size / 1024).toFixed(0);
      Swal.fire({
        icon: "success",
        title: esLogo ? "Logo actualizado" : "Marca de agua actualizada",
        text: `Imagen comprimida a ${tamKB} KB y guardada correctamente.`,
        timer: 2500,
        showConfirmButton: false,
      });

    } catch (err) {
      console.error("Error en subida:", err);
      setter(false);
      Swal.fire("Error", "No se pudo procesar la imagen", "error");
    }
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

  // ─── Estilos ─────────────────────────────────────────────────────
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
  const imgBox = {
    width: 100,
    height: 100,
    borderRadius: 12,
    border: "2px dashed #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    cursor: "pointer",
    background: "#f9fafb",
    flexShrink: 0,
  };
  const imgPreview = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };
  const uploadRow = {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginTop: 8,
  };
  const uploadInfo = {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: "1.4",
    flex: 1,
  };
  const sectionTitle = {
    fontSize: 14,
    fontWeight: 700,
    color: "#0077B6",
    marginTop: 20,
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 6,
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
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 700 }}>
          <div className="sw-header">
            <h1 className="sw-header-titulo">🏢 Mi Empresa</h1>
          </div>
          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginBottom: 16, marginTop: -10 }}>
            Plan: <strong style={{ color: "#0077B6" }}>{tenant?.plan || "—"}</strong>
            {" · "}Estado: <strong style={{ color: tenant?.estado === "activo" ? "#22c55e" : "#ef4444" }}>
              {tenant?.estado || "—"}
            </strong>
          </p>

        {/* ─── Info del plan ─── */}
        <div style={{
          background: "#f0f9ff", borderRadius: 12, padding: "14px 16px",
          marginBottom: 16, border: "1px solid #bae6fd"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0077B6" }}>
                📋 Plan {plan === "trial" ? "Prueba gratuita" : plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#374151" }}>
              {plan === "trial" && diasRestantes !== null && (
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontWeight: 600, fontSize: 11,
                  background: diasRestantes <= 3 ? "#fef2f2" : "#ecfdf5",
                  color: diasRestantes <= 3 ? "#dc2626" : "#059669",
                }}>
                  {trialVencido ? "Vencido" : `${diasRestantes} día${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`}
                </span>
              )}
              {plan !== "trial" && tenant?.fecha_vencimiento && (
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontWeight: 600, fontSize: 11,
                  background: planVencido ? "#fef2f2" : "#ecfdf5",
                  color: planVencido ? "#dc2626" : "#059669",
                }}>
                  {planVencido ? "Vencido" : `Vence: ${new Date(tenant.fecha_vencimiento).toLocaleDateString("es-CO")}`}
                </span>
              )}
              {plan !== "trial" && !tenant?.fecha_vencimiento && (
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontWeight: 600, fontSize: 11,
                  background: "#ecfdf5", color: "#059669",
                }}>
                  Activo
                </span>
              )}
            </div>
          </div>

          {/* Uso actual */}
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              📦 Productos: <strong>{conteos.productos}</strong>{limites.maxProductos !== Infinity ? ` / ${limites.maxProductos}` : ""}
            </span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              👥 Usuarios: <strong>{conteos.usuarios}</strong> / {limites.maxUsuarios}
            </span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              📄 Documentos: <strong>{conteos.documentos}</strong>
            </span>
          </div>
        </div>

        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 8 }} />

        {/* ─── SECCIÓN: Imágenes para PDFs ───────────────────────── */}
        <div style={sectionTitle}>🖼️ Imágenes para documentos PDF</div>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px 0" }}>
          Formatos: PNG, JPG o WEBP · Máx 5 MB · Se comprimen automáticamente
        </p>

        {/* Logo */}
        <label style={label}>Logo (encabezado del PDF)</label>
        <div style={uploadRow}>
          <div
            style={imgBox}
            onClick={() => !subiendoLogo && logoInputRef.current?.click()}
            title="Click para subir logo"
          >
            {subiendoLogo ? (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Subiendo...</span>
            ) : logoPreview ? (
              <img src={logoPreview} alt="Logo" style={imgPreview} />
            ) : (
              <span style={{ fontSize: 24, color: "#d1d5db" }}>+</span>
            )}
          </div>
          <div style={uploadInfo}>
            <strong>Recomendado:</strong> imagen cuadrada (ej: 400×400 px).
            <br />Se muestra en la esquina superior izquierda de todos los PDFs.
            <br />El sistema la comprime a máx 400×400 px automáticamente.
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) subirImagen(e.target.files[0], "logo");
              e.target.value = "";
            }}
          />
        </div>

        {/* Marca de agua / Fondo */}
        <label style={{ ...label, marginTop: 16 }}>Marca de agua (fondo del PDF)</label>
        <div style={uploadRow}>
          <div
            style={imgBox}
            onClick={() => !subiendoFondo && fondoInputRef.current?.click()}
            title="Click para subir marca de agua"
          >
            {subiendoFondo ? (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Subiendo...</span>
            ) : fondoPreview ? (
              <img src={fondoPreview} alt="Fondo" style={imgPreview} />
            ) : (
              <span style={{ fontSize: 24, color: "#d1d5db" }}>+</span>
            )}
          </div>
          <div style={uploadInfo}>
            <strong>Recomendado:</strong> imagen horizontal o cuadrada (ej: 800×600 px).
            <br />Se muestra como marca de agua semitransparente de fondo.
            <br /><em>No necesitas hacerla transparente, el sistema lo hace solo.</em>
          </div>
          <input
            ref={fondoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) subirImagen(e.target.files[0], "fondo");
              e.target.value = "";
            }}
          />
        </div>

        <div style={{ borderBottom: "1px solid #e5e7eb", marginTop: 20, marginBottom: 4 }} />

        {/* ─── SECCIÓN: Datos de la empresa ──────────────────────── */}
        <div style={sectionTitle}>📋 Datos de la empresa</div>

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
      </div>
    </Protegido>
  );
}