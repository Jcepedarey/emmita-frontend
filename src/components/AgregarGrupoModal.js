// src/components/AgregarGrupoModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../supabaseClient";
import "../estilos/ModalesEstilo.css";

const AgregarGrupoModal = ({
  onAgregarGrupo,
  onClose,
  stockDisponible = {},
  grupoEnEdicion,
  persistOpen = true,
}) => {
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [cantidadGrupo, setCantidadGrupo] = useState("");
  const [productos, setProductos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const buscarRef = useRef(null);

  // Precarga para edición
  useEffect(() => {
    if (grupoEnEdicion) {
      setNombreGrupo(grupoEnEdicion.nombre || "");
      setCantidadGrupo(
        grupoEnEdicion.cantidad != null ? String(grupoEnEdicion.cantidad) : ""
      );
      const items = (grupoEnEdicion.productos || []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        precio: typeof p.precio === "number" ? p.precio : Number(p.precio || 0),
        cantidad: typeof p.cantidad === "number" ? p.cantidad : Number(p.cantidad || 1),
        subtotal:
          (typeof p.subtotal === "number"
            ? p.subtotal
            : Number(p.precio || 0) * Number(p.cantidad || 1)) || 0,
        temporal: !!p.temporal,
        es_proveedor: !!p.es_proveedor,
        multiplicar: p.multiplicar !== undefined ? !!p.multiplicar : true,
        precio_compra: p.precio_compra || 0,
        proveedor_nombre: p.proveedor_nombre || "",
      }));
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

  const actualizarCampo = (index, campo, valor) => {
    setSeleccionados((prev) => {
      const arr = [...prev];

      if (campo === "temporal") {
        arr[index][campo] = !!valor;
      } else if (campo === "multiplicar") {
        arr[index][campo] = !!valor;
      } else if (campo === "cantidad") {
        const raw = valor;
        if (raw === "") {
          arr[index].cantidad = "";
        } else {
          const n = parseInt(raw, 10);
          if (isNaN(n) || n <= 0) {
            arr[index].cantidad = "";
          } else {
            arr[index].cantidad = n;
          }
        }
      } else if (campo === "precio_compra") {
        const raw = valor;
        if (raw === "") {
          arr[index].precio_compra = "";
        } else {
          const n = Number(raw);
          arr[index].precio_compra = !isNaN(n) && n >= 0 ? n : 0;
        }
      } else if (campo === "precio") {
        const raw = valor;
        if (raw === "") {
          arr[index].precio = "";
        } else {
          const n = Number(raw);
          arr[index].precio = !isNaN(n) && n >= 0 ? n : 0;
        }
      }

      arr[index].subtotal =
        Number(arr[index].precio || 0) * Number(arr[index].cantidad || 0);

      return arr;
    });
  };

  const eliminarDelGrupo = (index) => {
    setSeleccionados((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotalGrupo = useMemo(
    () => seleccionados.reduce((acc, it) => acc + Number(it.subtotal || 0), 0),
    [seleccionados]
  );

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

    if (persistOpen) {
      setNombreGrupo("");
      setCantidadGrupo("");
      setSeleccionados([]);
      setBusqueda("");
      buscarRef.current?.focus();
    } else {
      onClose?.();
    }
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
    <div className="modal-overlay" onClick={handleClose}>
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

          {/* Resultados de búsqueda */}
          {busqueda && filtrados.length > 0 && (
            <div className="modal-seccion">
              <ul className="lista-sugerencias">
                {filtrados.slice(0, 10).map((p) => (
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

                  {/* Info del producto */}
                  <div className="item-editable-info">
                    <div className="item-editable-nombre">{item.nombre}</div>
                    <div className="item-editable-meta">
                      {item.es_proveedor ? (
                        <span className="badge badge-morado">{item.proveedor_nombre || "Proveedor"}</span>
                      ) : (
                        <span className="badge badge-gris">Inventario</span>
                      )}
                      {" · Stock: "}
                      {stockDisponible?.[item.id] ?? "N/A"}
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
            ➕ {grupoEnEdicion ? "Guardar cambios" : "Agregar grupo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgregarGrupoModal;