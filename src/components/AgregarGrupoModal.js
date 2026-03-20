// src/components/AgregarGrupoModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../supabaseClient";
import "../estilos/ModalesEstilo.css";

const AgregarGrupoModal = ({
  onAgregarGrupo,
  onClose,
  stockDisponible = {},
  grupoEnEdicion,
}) => {
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [cantidadGrupo, setCantidadGrupo] = useState("");
  const [productos, setProductos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editandoNombre, setEditandoNombre] = useState(null);
  const [mostrarFormTemporal, setMostrarFormTemporal] = useState(false);
  const [formTemporal, setFormTemporal] = useState({ nombre: "", precio: "" });
  const buscarRef = useRef(null);

  // Precarga para edición
  useEffect(() => {
    if (grupoEnEdicion) {
      setNombreGrupo(grupoEnEdicion.nombre || "");
      setCantidadGrupo(
        grupoEnEdicion.cantidad != null ? String(grupoEnEdicion.cantidad) : ""
      );
      // ✅ Fix: forzar recálculo de subtotal desde precio × cantidad
      const items = (grupoEnEdicion.productos || []).map((p) => {
        const precio = Number(p.precio || 0);
        const cantidad = Number(p.cantidad || 1);
        return {
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          precio,
          cantidad,
          subtotal: precio * cantidad,
          temporal: !!p.temporal,
          es_proveedor: !!p.es_proveedor,
          multiplicar: p.multiplicar !== undefined ? !!p.multiplicar : true,
          precio_compra: Number(p.precio_compra || 0),
          proveedor_nombre: p.proveedor_nombre || "",
        };
      });
      setSeleccionados(items);
    }
  }, [grupoEnEdicion]);

  // Carga inventario + proveedores
  useEffect(() => {
    let cancel = false;
    const cargarProductos = async () => {
      setLoading(true);
      setError("");
      try {
        const [{ data: inventario, error: e1 }, { data: proveedores, error: e2 }] = await Promise.all([
          supabase.from("productos").select("id, nombre, descripcion, precio"),
          supabase.from("productos_proveedores")
            .select("id, nombre, precio_venta, precio_compra, proveedor_id, proveedores ( id, nombre )"),
        ]);

        if (e1 || e2) {
          setError("No se pudieron cargar los productos.");
          setProductos([]);
          return;
        }

        const inventarioNormalizado = (inventario || []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          precio: Number(p.precio || 0),
          es_proveedor: false,
        }));

        const proveedoresNormalizado = (proveedores || []).map((p) => ({
          id: `prov-${p.id}`,
          nombre: p.nombre,
          descripcion: "",
          precio: Number(p.precio_venta || 0),
          precio_compra: Number(p.precio_compra || 0),
          es_proveedor: true,
          proveedor_id: p.proveedor_id || p.proveedores?.id || null,
          proveedor_nombre: p.proveedores?.nombre || "",
        }));

        if (!cancel) {
          setProductos([...inventarioNormalizado, ...proveedoresNormalizado]);
        }
      } catch (e) {
        if (!cancel) {
          setError("Error de conexión al cargar productos.");
          setProductos([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    cargarProductos();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    buscarRef.current?.focus();
  }, []);

  // ✅ Sin límite — muestra todos los resultados
  const filtrados = useMemo(() => {
    const t = (busqueda || "").toLowerCase();
    if (!t) return [];
    return productos.filter(
      (p) => p.nombre?.toLowerCase().includes(t) || p.descripcion?.toLowerCase().includes(t)
    );
  }, [productos, busqueda]);

  const agregarAlGrupo = (producto) => {
    if (seleccionados.some((p) => p.id === producto.id)) return;
    const nuevo = {
      ...producto,
      cantidad: "",
      subtotal: 0,
      temporal: false,
      multiplicar: true,
      precio_compra: producto.precio_compra || 0,
    };
    setSeleccionados((prev) => [...prev, nuevo]);
    setBusqueda("");
    buscarRef.current?.focus();
  };

  // ✅ Fix: inmutabilidad correcta — crea objeto nuevo en vez de mutar
  const actualizarCampo = (index, campo, valor) => {
    setSeleccionados((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item };

        if (campo === "temporal") {
          updated.temporal = !!valor;
        } else if (campo === "multiplicar") {
          updated.multiplicar = !!valor;
        } else if (campo === "cantidad") {
          if (valor === "") {
            updated.cantidad = "";
          } else {
            const n = parseInt(valor, 10);
            updated.cantidad = (!isNaN(n) && n > 0) ? n : "";
          }
        } else if (campo === "precio_compra") {
          if (valor === "") {
            updated.precio_compra = "";
          } else {
            const n = Number(valor);
            updated.precio_compra = (!isNaN(n) && n >= 0) ? n : 0;
          }
        } else if (campo === "precio") {
          if (valor === "") {
            updated.precio = "";
          } else {
            const n = Number(valor);
            updated.precio = (!isNaN(n) && n >= 0) ? n : 0;
          }
        } else if (campo === "nombre") {
          updated.nombre = valor;
        }

        // ✅ Recalcular subtotal siempre
        updated.subtotal = Number(updated.precio || 0) * Number(updated.cantidad || 0);

        return updated;
      })
    );
  };

  const eliminarDelGrupo = (index) => {
    setSeleccionados((prev) => prev.filter((_, i) => i !== index));
    if (editandoNombre === index) setEditandoNombre(null);
  };

  // ✅ Fix: recalcular siempre desde valores actuales
  const subtotalGrupo = useMemo(
    () => seleccionados.reduce((acc, it) => {
      return acc + (Number(it.precio || 0) * Number(it.cantidad || 0));
    }, 0),
    [seleccionados]
  );

  // ✅ Agregar artículo temporal rápido
  const agregarTemporal = () => {
    if (!formTemporal.nombre.trim()) {
      alert("Escribe un nombre para el artículo.");
      return;
    }
    const precio = Number(formTemporal.precio || 0);
    const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nuevo = {
      id,
      nombre: formTemporal.nombre.trim(),
      descripcion: "",
      precio,
      cantidad: "",
      subtotal: 0,
      temporal: true,
      es_proveedor: false,
      multiplicar: true,
      precio_compra: 0,
      proveedor_nombre: "",
    };
    setSeleccionados((prev) => [...prev, nuevo]);
    setFormTemporal({ nombre: "", precio: "" });
    setMostrarFormTemporal(false);
    buscarRef.current?.focus();
  };

  // ✅ Siempre cierra al guardar
  const guardarGrupo = () => {
    if (!nombreGrupo || seleccionados.length === 0) {
      alert("Debes nombrar el grupo y agregar artículos.");
      return;
    }

    const grupo = {
      es_grupo: true,
      nombre: nombreGrupo,
      cantidad: Number(cantidadGrupo || 1),
      productos: seleccionados,
      subtotal: subtotalGrupo,
      precio: subtotalGrupo,
    };

    onAgregarGrupo?.(grupo);
    onClose?.();
  };

  const onKeyDownBuscar = (e) => {
    if (e.key === "Enter" && filtrados.length > 0) {
      agregarAlGrupo(filtrados[0]);
    }
  };

  const handleClose = () => {
    setNombreGrupo("");
    setCantidadGrupo("");
    setSeleccionados([]);
    setBusqueda("");
    onClose?.();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contenedor ancho-grande" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header header-naranja">
          <h2>📦 {grupoEnEdicion ? "Editar" : "Crear"} Grupo de Artículos</h2>
          <button className="btn-cerrar-modal" onClick={handleClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          
          {/* Nombre y cantidad del grupo */}
          <div className="modal-seccion">
            <div className="form-grid form-grid-2">
              <div>
                <label className="modal-label">Nombre del grupo:</label>
                <input
                  type="text"
                  placeholder="Ej: Set de fotos, Decoración básica..."
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div>
                <label className="modal-label">Cantidad del grupo:</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={cantidadGrupo}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setCantidadGrupo("");
                      return;
                    }
                    const n = parseInt(raw, 10);
                    if (!isNaN(n) && n > 0) {
                      setCantidadGrupo(String(n));
                    }
                  }}
                  className="modal-input input-destacado"
                  style={{ maxWidth: 120 }}
                />
              </div>
            </div>
          </div>

          {/* Búsqueda de productos */}
          <div className="modal-seccion">
            <label className="modal-label">🔍 Buscar productos para agregar:</label>
            <input
              ref={buscarRef}
              type="text"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={onKeyDownBuscar}
              className="modal-input"
            />
          </div>

          {loading && <div style={{ color: "#6b7280", marginBottom: 12 }}>Cargando productos...</div>}
          {error && <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>}

          {/* ✅ Resultados de búsqueda — SIN LÍMITE, con scroll */}
          {busqueda && filtrados.length > 0 && (
            <div className="modal-seccion">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
              </div>
              <ul className="lista-sugerencias" style={{ maxHeight: "40vh", overflowY: "auto" }}>
                {filtrados.map((p) => (
                  <li key={p.id} onClick={() => agregarAlGrupo(p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{p.nombre}</strong>
                      {p.es_proveedor && (
                        <>
                          <span className="badge badge-gris" style={{ marginLeft: 8 }}>
                            Compra: ${Number(p.precio_compra || 0).toLocaleString("es-CO")}
                          </span>
                          <span className="badge badge-morado" style={{ marginLeft: 4 }}>
                            {p.proveedor_nombre || "Proveedor"}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="badge badge-verde">
                      ${Number(p.precio || 0).toLocaleString("es-CO")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ Crear artículo temporal */}
          {!mostrarFormTemporal ? (
            <button
              onClick={() => setMostrarFormTemporal(true)}
              className="btn-modal btn-dashed"
              style={{ marginBottom: 12, fontSize: 12 }}
            >
              ➕ Crear artículo temporal (sin inventario)
            </button>
          ) : (
            <div className="form-expandible" style={{ marginBottom: 12 }}>
              <div className="form-expandible-titulo">➕ Artículo temporal</div>
              <div className="form-grid form-grid-2" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Nombre del artículo"
                  value={formTemporal.nombre}
                  onChange={(e) => setFormTemporal({ ...formTemporal, nombre: e.target.value })}
                  className="modal-input"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") agregarTemporal(); }}
                />
                <input
                  type="number"
                  placeholder="Precio (opcional)"
                  min="0"
                  value={formTemporal.precio}
                  onChange={(e) => setFormTemporal({ ...formTemporal, precio: e.target.value })}
                  className="modal-input"
                  onKeyDown={(e) => { if (e.key === "Enter") agregarTemporal(); }}
                />
              </div>
              <div className="form-acciones">
                <button onClick={agregarTemporal} className="btn-modal btn-verde btn-pequeno">
                  ➕ Agregar
                </button>
                <button
                  onClick={() => {
                    setMostrarFormTemporal(false);
                    setFormTemporal({ nombre: "", precio: "" });
                  }}
                  className="btn-modal btn-secundario btn-pequeno"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Artículos del grupo */}
          <div className="modal-seccion">
            <div className="modal-seccion-titulo">📋 Artículos del grupo ({seleccionados.length})</div>
            
            {seleccionados.length === 0 ? (
              <div className="mensaje-vacio">
                <div className="mensaje-vacio-icono">📭</div>
                <div className="mensaje-vacio-texto">Busca y agrega productos al grupo</div>
              </div>
            ) : (
              seleccionados.map((item, index) => (
                <div key={`${item.id}-${index}`} className="item-editable">
                  
                  {/* Checkbox multiplicar */}
                  <div className="checkbox-multiplicar" title="Multiplicar por cantidad del grupo">
                    <input
                      type="checkbox"
                      checked={item.multiplicar !== false}
                      onChange={(e) => actualizarCampo(index, "multiplicar", e.target.checked)}
                    />
                    <span>×</span>
                  </div>
                  
                  {/* Cantidad */}
                  <div className="item-editable-campo">
                    <label>Cant:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => actualizarCampo(index, "cantidad", e.target.value)}
                      className="input-cantidad"
                    />
                  </div>

                  {/* ✅ Nombre editable con click */}
                  <div className="item-editable-info">
                    {editandoNombre === index ? (
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => actualizarCampo(index, "nombre", e.target.value)}
                        onBlur={() => setEditandoNombre(null)}
                        onKeyDown={(e) => { if (e.key === "Enter") setEditandoNombre(null); }}
                        className="modal-input"
                        style={{ fontSize: 13, padding: "4px 8px", marginBottom: 2 }}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="item-editable-nombre"
                        onClick={() => setEditandoNombre(index)}
                        title="Click para editar nombre"
                        style={{ cursor: "pointer" }}
                      >
                        {item.nombre}
                        <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 6 }}>✏️</span>
                      </div>
                    )}
                    <div className="item-editable-meta">
                      {item.temporal ? (
                        <span className="badge badge-gris">Temporal</span>
                      ) : item.es_proveedor ? (
                        <span className="badge badge-morado">{item.proveedor_nombre || "Proveedor"}</span>
                      ) : (
                        <span className="badge badge-gris">Inventario</span>
                      )}
                      {!item.temporal && (
                        <>
                          {" · Stock: "}
                          {stockDisponible?.[item.id] ?? "N/A"}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Precio compra (solo proveedores) */}
                  {item.es_proveedor && (
                    <div className="item-editable-campo">
                      <label>Compra:</label>
                      <input
                        type="number"
                        min="0"
                        value={item.precio_compra || ""}
                        onChange={(e) => actualizarCampo(index, "precio_compra", e.target.value)}
                      />
                    </div>
                  )}

                  {/* Precio venta */}
                  <div className="item-editable-campo">
                    <label>Venta:</label>
                    <input
                      type="number"
                      min="0"
                      value={item.precio}
                      onChange={(e) => actualizarCampo(index, "precio", e.target.value)}
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="item-editable-subtotal">
                    ${Number(item.subtotal || 0).toLocaleString("es-CO")}
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => eliminarDelGrupo(index)}
                    className="btn-modal btn-rojo btn-pequeno"
                    style={{ marginLeft: 8 }}
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Resumen */}
          {seleccionados.length > 0 && (
            <div className="resumen-box">
              <div className="resumen-row resumen-total">
                <span>Total del grupo:</span>
                <span style={{ color: "#0369a1" }}>${subtotalGrupo.toLocaleString("es-CO")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer footer-espaciado">
          <button onClick={handleClose} className="btn-modal btn-secundario">
            Cancelar
          </button>
          <button onClick={guardarGrupo} className="btn-modal btn-verde">
            {grupoEnEdicion ? "💾 Guardar cambios" : "➕ Agregar grupo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgregarGrupoModal;