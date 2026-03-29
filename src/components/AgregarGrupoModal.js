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
  const [formTemporal, setFormTemporal] = useState({ nombre: "", precio: "", tipo: "articulo" });
  const [filtroTipoBusqueda, setFiltroTipoBusqueda] = useState(""); // "" = todos
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
          es_servicio: !!p.es_servicio || (p.tipo === "servicio"),
          multiplicar: p.multiplicar !== undefined ? !!p.multiplicar : true,
          precio_compra: Number(p.precio_compra || 0),
          proveedor_nombre: p.proveedor_nombre || "",
          costo_interno: Number(p.costo_interno || p.costo || 0),
          tipo: p.tipo || (p.es_servicio ? "servicio" : "articulo"),
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
          supabase.from("productos").select("id, nombre, descripcion, precio, tipo, costo"),
          supabase.from("productos_proveedores")
            .select("id, nombre, precio_venta, precio_compra, proveedor_id, tipo, proveedores ( id, nombre )"),
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
          es_servicio: p.tipo === "servicio",
          tipo: p.tipo || "articulo",
          costo_interno: Number(p.costo || 0),
        }));

        const proveedoresNormalizado = (proveedores || []).map((p) => ({
          id: `prov-${p.id}`,
          nombre: p.nombre,
          descripcion: "",
          precio: Number(p.precio_venta || 0),
          precio_compra: Number(p.precio_compra || 0),
          es_proveedor: true,
          es_servicio: p.tipo === "servicio",
          tipo: p.tipo || "articulo",
          proveedor_id: p.proveedor_id || p.proveedores?.id || null,
          proveedor_nombre: p.proveedores?.nombre || "",
          costo_interno: 0,
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

  // ✅ Filtrado con soporte de tipo
  const filtrados = useMemo(() => {
    const t = (busqueda || "").toLowerCase();
    if (!t) return [];
    let lista = productos.filter(
      (p) => p.nombre?.toLowerCase().includes(t) || p.descripcion?.toLowerCase().includes(t)
    );
    if (filtroTipoBusqueda) {
      if (filtroTipoBusqueda === "servicio") {
        lista = lista.filter((p) => p.es_servicio || p.tipo === "servicio");
      } else if (filtroTipoBusqueda === "articulo") {
        lista = lista.filter((p) => !p.es_servicio && (p.tipo || "articulo") === "articulo");
      }
    }
    return lista;
  }, [productos, busqueda, filtroTipoBusqueda]);

  const agregarAlGrupo = (producto) => {
    if (seleccionados.some((p) => p.id === producto.id)) return;
    const nuevo = {
      ...producto,
      cantidad: "",
      subtotal: 0,
      temporal: false,
      multiplicar: true,
      precio_compra: producto.precio_compra || 0,
      costo_interno: producto.costo_interno || 0,
      es_servicio: !!producto.es_servicio || producto.tipo === "servicio",
      tipo: producto.tipo || "articulo",
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
        } else if (campo === "costo_interno") {
          if (valor === "") {
            updated.costo_interno = "";
          } else {
            const n = Number(valor);
            updated.costo_interno = (!isNaN(n) && n >= 0) ? n : 0;
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
    const esServicio = formTemporal.tipo === "servicio";
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
      es_servicio: esServicio,
      tipo: formTemporal.tipo || "articulo",
      multiplicar: true,
      precio_compra: 0,
      costo_interno: 0,
      proveedor_nombre: "",
    };
    setSeleccionados((prev) => [...prev, nuevo]);
    setFormTemporal({ nombre: "", precio: "", tipo: "articulo" });
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
          <h2>📦 {grupoEnEdicion ? "Editar" : "Crear"} Grupo</h2>
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
            <label className="modal-label">🔍 Buscar productos y servicios:</label>
            {/* Filtro tipo en búsqueda */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {[
                { id: "", label: "Todos" },
                { id: "articulo", label: "📦 Artículos" },
                { id: "servicio", label: "🔧 Servicios" },
              ].map((t) => (
                <button key={t.id} type="button"
                  onClick={() => setFiltroTipoBusqueda(t.id)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                    border: filtroTipoBusqueda === t.id ? "2px solid var(--sw-azul)" : "1px solid #e5e7eb",
                    background: filtroTipoBusqueda === t.id ? "var(--sw-cyan-muy-claro)" : "white",
                    color: filtroTipoBusqueda === t.id ? "var(--sw-azul)" : "#9ca3af",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              ref={buscarRef}
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={onKeyDownBuscar}
              className="modal-input"
            />
          </div>

          {loading && <div style={{ color: "#6b7280", marginBottom: 12 }}>Cargando productos...</div>}
          {error && <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>}

          {/* ✅ Resultados de búsqueda — con scroll y badges de tipo */}
          {busqueda && filtrados.length > 0 && (
            <div className="modal-seccion">
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
              </div>
              <ul className="lista-sugerencias" style={{ maxHeight: "40vh", overflowY: "auto" }}>
                {filtrados.map((p) => (
                  <li key={p.id} onClick={() => agregarAlGrupo(p)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: p.es_servicio ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : p.es_proveedor ? "linear-gradient(135deg, #faf5ff, #f3e8ff)" : undefined,
                    borderLeft: p.es_servicio ? "3px solid #22c55e" : p.es_proveedor ? "3px solid #a78bfa" : undefined,
                  }}>
                    <div>
                      <strong>{p.nombre}</strong>
                      {/* Badge de tipo */}
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 20, fontWeight: 600, marginLeft: 6,
                        background: p.es_servicio ? "#f3e8ff" : p.es_proveedor ? "#faf5ff" : "#eff6ff",
                        color: p.es_servicio ? "#7c3aed" : p.es_proveedor ? "#7c3aed" : "#2563eb",
                      }}>
                        {p.es_servicio ? "🔧" : p.es_proveedor ? "🏢" : "📦"}
                      </span>
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
                      {p.es_servicio && Number(p.costo_interno || 0) > 0 && (
                        <span className="badge badge-gris" style={{ marginLeft: 8 }}>
                          Costo: ${Number(p.costo_interno).toLocaleString("es-CO")}
                        </span>
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

          {/* ✅ Crear artículo/servicio temporal */}
          {!mostrarFormTemporal ? (
            <button
              onClick={() => setMostrarFormTemporal(true)}
              className="btn-modal btn-dashed"
              style={{ marginBottom: 12, fontSize: 12 }}
            >
              ➕ Crear item temporal (sin inventario)
            </button>
          ) : (
            <div className="form-expandible" style={{ marginBottom: 12 }}>
              <div className="form-expandible-titulo">➕ Item temporal</div>
              {/* Tipo */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[
                  { id: "articulo", label: "📦 Artículo" },
                  { id: "servicio", label: "🔧 Servicio" },
                ].map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => setFormTemporal({ ...formTemporal, tipo: t.id })}
                    style={{
                      padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                      fontSize: 11, fontWeight: 600,
                      border: formTemporal.tipo === t.id ? "2px solid var(--sw-azul)" : "1px solid #e5e7eb",
                      background: formTemporal.tipo === t.id ? "var(--sw-cyan-muy-claro)" : "white",
                      color: formTemporal.tipo === t.id ? "var(--sw-azul)" : "#9ca3af",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="form-grid form-grid-2" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder={formTemporal.tipo === "servicio" ? "Nombre del servicio" : "Nombre del artículo"}
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
                    setFormTemporal({ nombre: "", precio: "", tipo: "articulo" });
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
            <div className="modal-seccion-titulo">📋 Items del grupo ({seleccionados.length})</div>
            
            {seleccionados.length === 0 ? (
              <div className="mensaje-vacio">
                <div className="mensaje-vacio-icono">📭</div>
                <div className="mensaje-vacio-texto">Busca y agrega productos o servicios al grupo</div>
              </div>
            ) : (
              seleccionados.map((item, index) => (
                <div key={`${item.id}-${index}`} className="item-editable" style={{
                  background: item.es_servicio ? "linear-gradient(135deg, #f0fdf4f0, #dcfce7a0)" : item.es_proveedor ? "linear-gradient(135deg, #faf5fff0, #f3e8ffa0)" : undefined,
                  borderLeft: item.es_servicio ? "3px solid #22c55e" : item.es_proveedor ? "3px solid #a78bfa" : undefined,
                  borderRadius: 8,
                }}>
                  
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
                      {item.es_servicio ? (
                        <span className="badge" style={{ background: "#f3e8ff", color: "#7c3aed" }}>🔧 Servicio</span>
                      ) : item.temporal ? (
                        <span className="badge badge-gris">Temporal</span>
                      ) : item.es_proveedor ? (
                        <span className="badge badge-morado">{item.proveedor_nombre || "Proveedor"}</span>
                      ) : (
                        <span className="badge badge-gris">Inventario</span>
                      )}
                      {!item.temporal && !item.es_servicio && (
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

                  {/* Costo interno (servicios siempre, artículos si tienen costo) */}
                  {(item.es_servicio || Number(item.costo_interno || 0) > 0) && !item.es_proveedor && (
                    <div className="item-editable-campo">
                      <label style={{ color: "#dc2626" }}>Costo:</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.costo_interno || ""}
                        onChange={(e) => actualizarCampo(index, "costo_interno", e.target.value)}
                        style={{ borderColor: Number(item.costo_interno || 0) > 0 ? "#fca5a5" : undefined }}
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