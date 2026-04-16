// src/components/EditarPaqueteModal.js
import React, { useState, useEffect, useMemo } from "react";
import supabase from "../supabaseClient";
import { useTenant } from "../context/TenantContext";
import Swal from "sweetalert2";
import BuscarProductoModal from "./BuscarProductoModal";
import AgregarGrupoModal from "./AgregarGrupoModal";
import BuscarProveedorYProductoModal from "./BuscarProveedorYProductoModal";
import "../estilos/ModalesEstilo.css";

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

/**
 * Modal para crear y editar Paquetes de Eventos.
 *
 * Props:
 * - paqueteEnEdicion: null = crear nuevo, objeto = editar existente
 * - onGuardar: callback tras guardar (para refrescar lista)
 * - onClose: cerrar modal
 */
export default function EditarPaqueteModal({ paqueteEnEdicion, onGuardar, onClose }) {
  const { tenant } = useTenant();

  // ── Estado del paquete ──
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [items, setItems] = useState([]); // misma estructura JSONB que ordenes_pedido.productos
  const [guardando, setGuardando] = useState(false);

  // ── Sub-modales ──
  const [modalBuscar, setModalBuscar] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);
  const [grupoEnEdicion, setGrupoEnEdicion] = useState(null);
  const [indiceGrupoEnEdicion, setIndiceGrupoEnEdicion] = useState(null);

  // ── Precargar datos si es edición ──
  useEffect(() => {
    if (paqueteEnEdicion) {
      setNombre(paqueteEnEdicion.nombre || "");
      setDescripcion(paqueteEnEdicion.descripcion || "");
      setItems(paqueteEnEdicion.productos || []);
    }
  }, [paqueteEnEdicion]);

  // ── Cálculo de total ──
  const totalPaquete = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item.es_grupo && Array.isArray(item.productos)) {
        const cantGrupo = Number(item.cantidad || 1);
        const subTotal = item.productos.reduce((s, sub) => {
          const cantSub = Number(sub.cantidad || 0);
          const precioSub = Number(sub.precio || 0);
          const mult = sub.multiplicar !== false;
          return s + (mult ? precioSub * cantSub * cantGrupo : precioSub * cantSub);
        }, 0);
        return acc + subTotal;
      }
      return acc + Number(item.precio || 0) * Number(item.cantidad || 0);
    }, 0);
  }, [items]);

  const totalItems = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item.es_grupo && Array.isArray(item.productos)) return acc + item.productos.length;
      return acc + 1;
    }, 0);
  }, [items]);

  // ── Agregar producto desde inventario ──
  const agregarProducto = (producto) => {
    setItems((prev) => [
      ...prev,
      {
        id: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio: Number(producto.precio || 0),
        es_grupo: false,
        temporal: false,
        es_servicio: producto.tipo === "servicio",
        es_proveedor: false,
        costo_interno: Number(producto.costo || 0),
      },
    ]);
  };

  // ── Agregar producto temporal (creado en el modal) ──
  const agregarProductoTemporal = (producto) => {
    setItems((prev) => [
      ...prev,
      {
        id: producto.id ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: producto.nombre,
        cantidad: Number(producto.cantidad || 1),
        precio: Number(producto.precio || 0),
        es_grupo: false,
        temporal: !!producto.temporal,
        es_servicio: !!producto.es_servicio,
        es_proveedor: !!producto.es_proveedor,
        costo_interno: Number(producto.costo_interno || 0),
      },
    ]);
  };

  // ── Agregar producto de proveedor ──
  const agregarProductoProveedor = (producto) => {
    setItems((prev) => [
      ...prev,
      {
        id: `prov-${producto.id ?? Date.now()}`,
        nombre: producto.nombre,
        cantidad: 1,
        precio: Number(producto.precio_venta || 0),
        precio_compra: Number(producto.precio_compra || 0),
        proveedor_id: producto.proveedor_id,
        proveedor_nombre: producto.proveedores?.nombre || producto.proveedor_nombre || "",
        es_grupo: false,
        es_proveedor: true,
        temporal: true,
        es_servicio: false,
      },
    ]);
  };

  // ── Agregar / actualizar grupo ──
  const agregarGrupo = (grupo) => {
    const linea = { ...grupo, es_grupo: true };
    if (indiceGrupoEnEdicion !== null) {
      setItems((prev) => {
        const nuevos = [...prev];
        nuevos[indiceGrupoEnEdicion] = linea;
        return nuevos;
      });
    } else {
      setItems((prev) => [...prev, linea]);
    }
    setGrupoEnEdicion(null);
    setIndiceGrupoEnEdicion(null);
  };

  // ── Editar grupo existente ──
  const editarGrupo = (index) => {
    const grupo = items[index];
    if (grupo?.es_grupo) {
      setGrupoEnEdicion(grupo);
      setIndiceGrupoEnEdicion(index);
      setModalGrupo(true);
    }
  };

  // ── Eliminar item ──
  const eliminarItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Actualizar cantidad ──
  const actualizarCantidad = (index, val) => {
    setItems((prev) => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], cantidad: val };
      return nuevos;
    });
  };

  // ── Actualizar precio ──
  const actualizarPrecio = (index, val) => {
    setItems((prev) => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], precio: val };
      return nuevos;
    });
  };

  // ── Guardar paquete ──
  const guardar = async () => {
    if (!nombre.trim()) {
      return Swal.fire("Nombre requerido", "Escribe un nombre para el paquete.", "warning");
    }
    if (items.length === 0) {
      return Swal.fire("Sin productos", "Agrega al menos un producto al paquete.", "warning");
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        productos: items,
        precio_total: totalPaquete,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (paqueteEnEdicion) {
        ({ error } = await supabase
          .from("paquetes_eventos")
          .update(datos)
          .eq("id", paqueteEnEdicion.id));
      } else {
        ({ error } = await supabase
          .from("paquetes_eventos")
          .insert({ ...datos, tenant_id: tenant?.id }));
      }

      if (error) {
        console.error("Error al guardar paquete:", error);
        Swal.fire("Error", "No se pudo guardar el paquete.", "error");
      } else {
        Swal.fire({
          icon: "success",
          title: paqueteEnEdicion ? "Paquete actualizado" : "Paquete creado",
          text: `"${nombre}" — ${totalItems} items · ${money(totalPaquete)}`,
          timer: 2200,
          showConfirmButton: false,
        });
        onGuardar?.();
        onClose?.();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Ocurrió un error inesperado.", "error");
    } finally {
      setGuardando(false);
    }
  };

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-contenedor ancho-grande"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* ── Header ── */}
        <div
          className="modal-header"
          style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "white" }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>
            📦 {paqueteEnEdicion ? "Editar Paquete" : "Crear Paquete de Evento"}
          </h2>
          <button className="btn-cerrar-modal" onClick={onClose} style={{ color: "white" }}>
            ✕
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Nombre y descripción */}
          <div className="modal-seccion">
            <label className="modal-label">Nombre del paquete *</label>
            <input
              type="text"
              className="modal-input"
              placeholder="Ej: Boda Vintage - Opción Media"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
            <label className="modal-label" style={{ marginTop: 10 }}>
              Descripción (opcional)
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="Breve descripción del paquete..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {/* Botones para agregar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
            <button
              onClick={() => setModalBuscar(true)}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px dashed #0891b2", background: "#f0fdfa", color: "#0e7490",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              🔍 Buscar en inventario
            </button>
            <button
              onClick={() => {
                setGrupoEnEdicion(null);
                setIndiceGrupoEnEdicion(null);
                setModalGrupo(true);
              }}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px dashed #d97706", background: "#fffbeb", color: "#b45309",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              📦 Crear grupo
            </button>
            <button
              onClick={() => setModalProveedor(true)}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px dashed #7c3aed", background: "#faf5ff", color: "#6d28d9",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              🏪 Desde proveedor
            </button>
          </div>

          {/* Lista de items */}
          <div className="modal-seccion">
            <div className="modal-seccion-titulo" style={{ color: "#0e7490" }}>
              📋 Productos del paquete ({totalItems})
            </div>

            {items.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>📦</div>
                <div style={{ fontSize: 13, color: "var(--sw-texto-terciario)" }}>
                  Usa los botones de arriba para agregar productos al paquete
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item, index) => {
                  const esServicio = item.es_servicio;
                  const esProveedor = item.es_proveedor;
                  const esGrupo = item.es_grupo;

                  // Subtotal del item
                  let subtotal = 0;
                  if (esGrupo && Array.isArray(item.productos)) {
                    const cantGrupo = Number(item.cantidad || 1);
                    subtotal = item.productos.reduce((s, sub) => {
                      const c = Number(sub.cantidad || 0);
                      const p = Number(sub.precio || 0);
                      const m = sub.multiplicar !== false;
                      return s + (m ? p * c * cantGrupo : p * c);
                    }, 0);
                  } else {
                    subtotal = Number(item.precio || 0) * Number(item.cantidad || 0);
                  }

                  return (
                    <div
                      key={`${item.id || item.nombre}-${index}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        background: esGrupo
                          ? "linear-gradient(135deg, #fffbeb, #fef3c7)"
                          : esServicio
                          ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
                          : esProveedor
                          ? "linear-gradient(135deg, #faf5ff, #f3e8ff)"
                          : "#fff",
                        borderLeft: esGrupo
                          ? "3px solid #d97706"
                          : esServicio
                          ? "3px solid #22c55e"
                          : esProveedor
                          ? "3px solid #a78bfa"
                          : "3px solid #0891b2",
                      }}
                    >
                      {/* Badge + nombre */}
                      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            fontSize: 9, padding: "1px 6px", borderRadius: 20, fontWeight: 700,
                            background: esGrupo ? "#fef3c7" : esServicio ? "#dcfce7" : esProveedor ? "#f3e8ff" : "#f0fdfa",
                            color: esGrupo ? "#b45309" : esServicio ? "#16a34a" : esProveedor ? "#7c3aed" : "#0e7490",
                          }}>
                            {esGrupo ? "📦 Grupo" : esServicio ? "🔧 Servicio" : esProveedor ? "🏢 Proveedor" : "📦 Artículo"}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginTop: 2 }}>
                          {item.nombre}
                        </div>
                        {esGrupo && Array.isArray(item.productos) && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {item.productos.length} items dentro
                          </div>
                        )}
                        {esProveedor && item.proveedor_nombre && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                            Prov: {item.proveedor_nombre}
                          </div>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          min="0"
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(index, e.target.value)}
                          style={{
                            width: 56, padding: "6px 8px", borderRadius: 6,
                            border: "1px solid #d1d5db", fontSize: 13, textAlign: "center",
                          }}
                          placeholder="Cant"
                        />
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>×</span>
                      </div>

                      {/* Precio */}
                      {!esGrupo && (
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={item.precio}
                            onChange={(e) => actualizarPrecio(index, e.target.value)}
                            style={{
                              width: 90, padding: "6px 8px", borderRadius: 6,
                              border: "1px solid #d1d5db", fontSize: 13, textAlign: "right",
                            }}
                            placeholder="Precio"
                          />
                        </div>
                      )}

                      {/* Subtotal */}
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#059669", minWidth: 80, textAlign: "right" }}>
                        {money(subtotal)}
                      </div>

                      {/* Acciones */}
                      <div style={{ display: "flex", gap: 4 }}>
                        {esGrupo && (
                          <button
                            onClick={() => editarGrupo(index)}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 16, padding: 4, borderRadius: 4,
                            }}
                            title="Editar grupo"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          onClick={() => eliminarItem(index)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 16, padding: 4, borderRadius: 4,
                          }}
                          title="Quitar del paquete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)",
                border: "1px solid #99f6e4",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0e7490" }}>
                💰 Total del paquete
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#0e7490" }}>
                {money(totalPaquete)}
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            background: "#fafafa",
            borderRadius: "0 0 16px 16px",
          }}
        >
          <button
            onClick={onClose}
            className="btn-modal btn-secundario"
            style={{ minWidth: 100 }}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || items.length === 0 || !nombre.trim()}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              cursor: guardando || items.length === 0 || !nombre.trim() ? "not-allowed" : "pointer",
              color: "white",
              background:
                guardando || items.length === 0 || !nombre.trim()
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #0891b2, #0e7490)",
              boxShadow:
                guardando || items.length === 0 || !nombre.trim()
                  ? "none"
                  : "0 2px 8px rgba(8,145,178,0.3)",
              transition: "all 0.2s",
              minWidth: 160,
            }}
          >
            {guardando
              ? "⏳ Guardando..."
              : paqueteEnEdicion
              ? "💾 Actualizar Paquete"
              : "💾 Guardar Paquete"}
          </button>
        </div>

        {/* ── Sub-modales ── */}
        {modalBuscar && (
          <BuscarProductoModal
            persistOpen
            onSelect={agregarProducto}
            onAgregarProducto={agregarProductoTemporal}
            onClose={() => setModalBuscar(false)}
          />
        )}

        {modalGrupo && (
          <AgregarGrupoModal
            grupoEnEdicion={grupoEnEdicion}
            onAgregarGrupo={agregarGrupo}
            onClose={() => {
              setModalGrupo(false);
              setGrupoEnEdicion(null);
              setIndiceGrupoEnEdicion(null);
            }}
          />
        )}

        {modalProveedor && (
          <BuscarProveedorYProductoModal
            onAgregar={agregarProductoProveedor}
            onClose={() => setModalProveedor(false)}
          />
        )}
      </div>
    </div>
  );
}