// src/components/BuscarProductoModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../supabaseClient";
import { v4 as uuidv4 } from "uuid";
import "../estilos/ModalesEstilo.css";

const DEBOUNCE_MS = 250;
const PAGE_LIMIT = 50;

export default function BuscarProductoModal({
  onSelect,
  onAgregarProducto,
  onClose,
  persistOpen = true,
}) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState(""); // "" = todos, "articulo", "servicio"

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria: "",
    cantidad: 1,
    tipo: "articulo",
    costo: "",
  });
  const [temporal, setTemporal] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const debouncedQ = useMemo(() => {
    let h;
    return {
      set(value, setter) {
        clearTimeout(h);
        h = setTimeout(() => setter(value), DEBOUNCE_MS);
      },
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    setError("");

    const run = async (term) => {
      if (!term || term.trim().length === 0) {
        setResultados([]);
        return;
      }
      setLoading(true);
      try {
        let query = supabase
          .from("productos")
          .select("*")
          .ilike("nombre", `%${term}%`)
          .order("nombre", { ascending: true })
          .limit(PAGE_LIMIT);

        // Filtrar por tipo si está seleccionado
        if (filtroTipo) {
          query = query.eq("tipo", filtroTipo);
        }

        const { data, error } = await query;

        if (!cancel) {
          if (error) {
            setError("No se pudieron cargar productos.");
            setResultados([]);
          } else {
            setResultados(data || []);
          }
        }
      } catch (e) {
        if (!cancel) {
          setError("Error de conexión al buscar productos.");
          setResultados([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    debouncedQ.set(q, run);
    return () => {
      cancel = true;
    };
  }, [q, filtroTipo, debouncedQ]);

  const limpiarYContinuar = () => {
    setQ("");
    inputRef.current?.focus();
  };

  const handleAgregarSeleccion = (p) => {
    if (onSelect) onSelect(p);
    if (persistOpen) {
      limpiarYContinuar();
    } else {
      onClose?.();
    }
  };

  const handleAgregarTemporalDesdeInventario = (p) => {
    if (onAgregarProducto) {
      onAgregarProducto({
        id: uuidv4(),
        nombre: p.nombre,
        precio: Number(p.precio || 0),
        cantidad: 1,
        subtotal: Number(p.precio || 0),
        temporal: true,
        es_grupo: false,
        es_servicio: p.tipo === "servicio",
        costo_interno: Number(p.costo || 0),
      });
    }
    if (persistOpen) {
      limpiarYContinuar();
    } else {
      onClose?.();
    }
  };

  const guardarNuevoProducto = async () => {
    const { nombre, descripcion, precio, stock, categoria, cantidad, tipo, costo } = form;
    const esServicio = tipo === "servicio";

    if (!nombre || !precio || (!temporal && !esServicio && !stock)) {
      alert("Nombre y precio son obligatorios. Stock es obligatorio para artículos no temporales.");
      return;
    }

    if (temporal) {
      const itemTemporal = {
        id: uuidv4(),
        nombre,
        precio: parseFloat(precio),
        cantidad: parseInt(cantidad, 10) || 1,
        subtotal: parseFloat(precio) * (parseInt(cantidad, 10) || 1),
        temporal: true,
        es_grupo: false,
        es_servicio: esServicio,
        costo_interno: Number(costo || 0),
      };
      onAgregarProducto?.(itemTemporal);
      if (persistOpen) {
        setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "", cantidad: 1, tipo: "articulo", costo: "" });
        setMostrarFormNuevo(false);
        inputRef.current?.focus();
      } else {
        onClose?.();
      }
      return;
    }

    try {
      const stockFinal = esServicio ? 999 : Number(stock);
      const { data, error } = await supabase
        .from("productos")
        .insert([{ nombre, descripcion, precio: Number(precio), stock: stockFinal, categoria, tipo, costo: Number(costo || 0) }])
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Error al guardar el producto.");
        return;
      }

      const nuevoProducto = {
        ...data,
        cantidad: parseInt(cantidad, 10) || 1,
        precio: Number(precio),
        subtotal: Number(precio) * (parseInt(cantidad, 10) || 1),
        temporal: false,
        es_grupo: false,
        es_servicio: esServicio,
        costo_interno: Number(costo || 0),
      };

      onAgregarProducto?.(nuevoProducto);

      if (persistOpen) {
        setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "", cantidad: 1, tipo: "articulo", costo: "" });
        setMostrarFormNuevo(false);
        inputRef.current?.focus();
      } else {
        onClose?.();
      }
    } catch (e) {
      console.error(e);
      alert("Error inesperado al guardar el producto.");
    }
  };

  const onKeyDownBuscar = (e) => {
    if (e.key === "Enter" && resultados.length > 0) {
      handleAgregarSeleccion(resultados[0]);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contenedor" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header header-azul">
          <h2>🔍 Buscar en Inventario</h2>
          <button className="btn-cerrar-modal" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          
          {/* Toggle de tipo */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[
              { id: "", label: "Todos" },
              { id: "articulo", label: "📦 Artículos" },
              { id: "servicio", label: "🔧 Servicios" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFiltroTipo(t.id)}
                style={{
                  flex: 1, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  border: filtroTipo === t.id ? "2px solid var(--sw-azul)" : "1px solid #e5e7eb",
                  background: filtroTipo === t.id ? "var(--sw-cyan-muy-claro)" : "white",
                  color: filtroTipo === t.id ? "var(--sw-azul)" : "#6b7280",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="modal-seccion">
            <label className="modal-label">Buscar en inventario:</label>
            <input
              ref={inputRef}
              type="text"
              placeholder={filtroTipo === "servicio" ? "Buscar servicios..." : filtroTipo === "articulo" ? "Buscar artículos..." : "Buscar artículos y servicios..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownBuscar}
              className="modal-input"
            />
          </div>

          {loading && <div style={{ color: "#6b7280", marginBottom: 12 }}>Cargando...</div>}
          {error && <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>}

          {/* Resultados */}
          {q && resultados.length > 0 && (
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">📋 Resultados ({resultados.length})</div>
              {resultados.map((p) => {
                const esServicio = p.tipo === "servicio";
                return (
                  <div key={p.id} className="item-card" style={{
                    background: esServicio ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "white",
                    borderLeft: esServicio ? "3px solid #22c55e" : undefined,
                  }}>
                    <div className="item-card-info">
                      <div className="item-card-titulo" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.nombre}
                        <span style={{
                          fontSize: 10, padding: "1px 7px", borderRadius: 20, fontWeight: 600,
                          background: esServicio ? "#f3e8ff" : "#eff6ff",
                          color: esServicio ? "#7c3aed" : "#2563eb",
                        }}>
                          {esServicio ? "🔧 Servicio" : "📦"}
                        </span>
                      </div>
                      <div className="item-card-subtitulo">
                        Precio: ${Number(p.precio || 0).toLocaleString("es-CO")}
                        {!esServicio && p.stock !== undefined && ` · Stock: ${p.stock}`}
                        {Number(p.costo || 0) > 0 && ` · Costo: $${Number(p.costo).toLocaleString("es-CO")}`}
                      </div>
                    </div>
                    <div className="item-card-acciones">
                      <button 
                        onClick={() => handleAgregarSeleccion(p)}
                        className="btn-modal btn-primario btn-pequeno"
                      >
                        ➕ Agregar
                      </button>
                      <button 
                        onClick={() => handleAgregarTemporalDesdeInventario(p)} 
                        className="btn-modal btn-secundario btn-pequeno"
                        title="Agregar como temporal"
                      >
                        📝 Temp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {q && resultados.length === 0 && !loading && (
            <div className="mensaje-vacio">
              <div className="mensaje-vacio-icono">🔍</div>
              <div className="mensaje-vacio-texto">No se encontraron {filtroTipo === "servicio" ? "servicios" : filtroTipo === "articulo" ? "artículos" : "productos"} con "{q}"</div>
            </div>
          )}

          <hr className="modal-separador" />

          {/* Botón para mostrar formulario */}
          {!mostrarFormNuevo ? (
            <button
              onClick={() => setMostrarFormNuevo(true)}
              className="btn-modal btn-dashed"
            >
              ➕ Crear nuevo artículo o servicio
            </button>
          ) : (
            <div className="form-expandible">
              <div className="form-expandible-titulo">➕ Crear nuevo artículo o servicio</div>

              {/* Selector de tipo */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[
                  { id: "articulo", label: "📦 Artículo" },
                  { id: "servicio", label: "🔧 Servicio" },
                ].map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => setForm({ ...form, tipo: t.id, stock: t.id === "servicio" ? "" : form.stock })}
                    style={{
                      flex: 1, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      border: form.tipo === t.id ? `2px solid ${t.id === "servicio" ? "#7c3aed" : "var(--sw-azul)"}` : "1px solid #e5e7eb",
                      background: form.tipo === t.id ? (t.id === "servicio" ? "#f3e8ff" : "#eff6ff") : "white",
                      color: form.tipo === t.id ? (t.id === "servicio" ? "#7c3aed" : "var(--sw-azul)") : "#6b7280",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              
              <div className="form-grid">
                <input
                  type="text"
                  placeholder={form.tipo === "servicio" ? "Nombre del servicio" : "Nombre del producto"}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="modal-input"
                />
                <input
                  type="text"
                  placeholder="Descripción"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="modal-input"
                />
                <div className="form-grid form-grid-2">
                  <input
                    type="number"
                    placeholder="Precio de venta"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    className="modal-input"
                  />
                  {form.tipo === "articulo" ? (
                    <input
                      type="number"
                      placeholder="Stock"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="modal-input"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="∞ Ilimitado"
                      disabled
                      className="modal-input"
                      style={{ background: "#f3f4f6", color: "#9ca3af" }}
                    />
                  )}
                </div>
                <div className="form-grid form-grid-2">
                  <input
                    type="number"
                    placeholder="Costo interno (opcional)"
                    value={form.costo}
                    onChange={(e) => setForm({ ...form, costo: e.target.value })}
                    className="modal-input"
                  />
                  <input
                    type="text"
                    placeholder="Categoría"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div className="form-grid form-grid-2">
                  <input
                    type="number"
                    placeholder="Cantidad"
                    min="1"
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    className="modal-input input-destacado"
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="temporal-check"
                  checked={temporal}
                  onChange={(e) => setTemporal(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label htmlFor="temporal-check" style={{ fontSize: 13, color: "#4b5563", cursor: "pointer" }}>
                  ¿Temporal? (no se guarda en inventario)
                </label>
              </div>

              <div className="form-acciones">
                <button onClick={guardarNuevoProducto} className="btn-modal btn-verde">
                  💾 {form.tipo === "servicio" ? "Guardar servicio" : "Guardar producto"}
                </button>
                <button
                  onClick={() => {
                    setMostrarFormNuevo(false);
                    setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "", cantidad: 1, tipo: "articulo", costo: "" });
                  }}
                  className="btn-modal btn-secundario"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            onClick={() => {
              setMostrarFormNuevo(false);
              onClose();
            }}
            className="btn-modal btn-rojo"
          >
            ❌ Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}