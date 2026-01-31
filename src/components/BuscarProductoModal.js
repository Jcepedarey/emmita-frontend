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

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria: "",
    cantidad: 1,
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
        const { data, error } = await supabase
          .from("productos")
          .select("*")
          .ilike("nombre", `%${term}%`)
          .order("nombre", { ascending: true })
          .limit(PAGE_LIMIT);

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
  }, [q, debouncedQ]);

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
      });
    }
    if (persistOpen) {
      limpiarYContinuar();
    } else {
      onClose?.();
    }
  };

  const guardarNuevoProducto = async () => {
    const { nombre, descripcion, precio, stock, categoria, cantidad } = form;

    if (!nombre || !precio || (!temporal && !stock)) {
      alert("Nombre y precio son obligatorios. Stock es obligatorio si no es temporal.");
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
      };
      onAgregarProducto?.(itemTemporal);
      if (persistOpen) {
        setForm({
          nombre: "",
          descripcion: "",
          precio: "",
          stock: "",
          categoria: "",
          cantidad: 1,
        });
        setMostrarFormNuevo(false);
        inputRef.current?.focus();
      } else {
        onClose?.();
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("productos")
        .insert([{ nombre, descripcion, precio: Number(precio), stock: Number(stock), categoria }])
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
      };

      onAgregarProducto?.(nuevoProducto);

      if (persistOpen) {
        setForm({
          nombre: "",
          descripcion: "",
          precio: "",
          stock: "",
          categoria: "",
          cantidad: 1,
        });
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-contenedor" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header header-azul">
          <h2>🔍 Buscar Producto del Inventario</h2>
          <button className="btn-cerrar-modal" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          
          {/* Búsqueda */}
          <div className="modal-seccion">
            <label className="modal-label">Buscar en inventario:</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe para buscar..."
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
              {resultados.map((p) => (
                <div key={p.id} className="item-card">
                  <div className="item-card-info">
                    <div className="item-card-titulo">{p.nombre}</div>
                    <div className="item-card-subtitulo">
                      Precio: ${Number(p.precio || 0).toLocaleString("es-CO")}
                      {p.stock !== undefined && ` · Stock: ${p.stock}`}
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
              ))}
            </div>
          )}

          {q && resultados.length === 0 && !loading && (
            <div className="mensaje-vacio">
              <div className="mensaje-vacio-icono">🔍</div>
              <div className="mensaje-vacio-texto">No se encontraron productos con "{q}"</div>
            </div>
          )}

          <hr className="modal-separador" />

          {/* Botón para mostrar formulario */}
          {!mostrarFormNuevo ? (
            <button
              onClick={() => setMostrarFormNuevo(true)}
              className="btn-modal btn-dashed"
            >
              ➕ Agregar nuevo producto
            </button>
          ) : (
            <div className="form-expandible">
              <div className="form-expandible-titulo">➕ Agregar nuevo producto</div>
              
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Nombre"
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
                    placeholder="Precio"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    className="modal-input"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div className="form-grid form-grid-2">
                  <input
                    type="text"
                    placeholder="Categoría"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="modal-input"
                  />
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
                  ¿Producto temporal? (no se guarda en inventario)
                </label>
              </div>

              <div className="form-acciones">
                <button onClick={guardarNuevoProducto} className="btn-modal btn-verde">
                  💾 Guardar producto
                </button>
                <button
                  onClick={() => {
                    setMostrarFormNuevo(false);
                    setForm({
                      nombre: "",
                      descripcion: "",
                      precio: "",
                      stock: "",
                      categoria: "",
                      cantidad: 1,
                    });
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