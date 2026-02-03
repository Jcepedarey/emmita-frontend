// src/components/BuscarProveedorYProductoModal.js
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";
import "../estilos/ModalesEstilo.css";

const BuscarProveedorYProductoModal = ({ onSelect, onClose }) => {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");

  const [productos, setProductos] = useState([]);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  const [formProd, setFormProd] = useState({ nombre: "", precio_compra: "", precio_venta: "" });

  const [productoEditando, setProductoEditando] = useState(null);
  const [productoForm, setProductoForm] = useState({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });

  const [sugerenciasProveedores, setSugerenciasProveedores] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  useEffect(() => {
    const cargarProveedores = async () => {
      const { data } = await supabase.from("proveedores").select("*").order("nombre", { ascending: true });
      if (data) setProveedores(data);
    };
    cargarProveedores();
  }, []);

  const manejarCambioProveedor = (e) => {
    const valor = e.target.value;
    setBusquedaProveedor(valor);
    
    if (valor.trim().length > 0) {
      const filtrados = proveedores.filter((p) =>
        p.nombre.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerenciasProveedores(filtrados);
    } else {
      setSugerenciasProveedores([]);
    }
  };

  const seleccionarProveedor = async (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setBusquedaProveedor(proveedor.nombre);
    setSugerenciasProveedores([]);
    setMostrarFormNuevo(false);
    setBusquedaProducto(""); // Limpiar búsqueda de productos

    const { data } = await supabase
      .from("productos_proveedores")
      .select("*")
      .eq("proveedor_id", proveedor.id);

    setProductos(data || []);
  };

  const guardarProductoProveedor = async () => {
    if (!formProd.nombre || !formProd.precio_compra || !formProd.precio_venta || !proveedorSeleccionado?.id) {
      return Swal.fire("Faltan datos", "Completa todos los campos", "warning");
    }

    const { data, error } = await supabase
      .from("productos_proveedores")
      .insert([{ ...formProd, proveedor_id: proveedorSeleccionado.id, stock: 0 }])
      .select();

    if (error) return Swal.fire("Error", "No se pudo guardar el producto", "error");

    const productoCreado = data[0];
    
    Swal.fire({
      title: "Producto guardado",
      text: "¿Deseas agregarlo al pedido ahora?",
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Sí, agregar",
      cancelButtonText: "No, solo guardar"
    }).then((result) => {
      if (result.isConfirmed) {
        // ✅ CORRECCIÓN: Incluir nombre del proveedor
        onSelect({
          ...productoCreado,
          proveedor_nombre: proveedorSeleccionado?.nombre || "Proveedor",
        });
      }
    });

    setFormProd({ nombre: "", precio_compra: "", precio_venta: "" });
    setMostrarFormNuevo(false);

    const { data: productosActualizados } = await supabase
      .from("productos_proveedores")
      .select("*")
      .eq("proveedor_id", proveedorSeleccionado.id);
    setProductos(productosActualizados || []);
  };

  const manejarEditar = (prod) => {
    setProductoEditando(prod.id);
    setProductoForm({
      nombre: prod.nombre,
      precio_compra: prod.precio_compra || "",
      precio_venta: prod.precio_venta || "",
      stock: prod.stock || 0
    });
  };

  const guardarEdicion = async () => {
    const { nombre, precio_compra, precio_venta, stock } = productoForm;
    if (!nombre || !precio_venta) return Swal.fire("Campos incompletos", "Completa nombre y precio de venta", "warning");
    
    const { error } = await supabase
      .from("productos_proveedores")
      .update({ nombre, precio_compra, precio_venta, stock })
      .eq("id", productoEditando);
    
    if (!error) {
      Swal.fire("Producto actualizado", "", "success");
      setProductoEditando(null);
      setProductoForm({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });
      
      const { data } = await supabase
        .from("productos_proveedores")
        .select("*")
        .eq("proveedor_id", proveedorSeleccionado.id);
      setProductos(data || []);
    }
  };

  const cancelarEdicion = () => {
    setProductoEditando(null);
    setProductoForm({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });
  };

  // ✅ CORRECCIÓN: Incluir nombre del proveedor
  const manejarSeleccion = (prod) => {
    onSelect({
      ...prod,
      proveedor_nombre: proveedorSeleccionado?.nombre || "Proveedor",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-contenedor ancho-medio" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header header-rojo">
          <h2>📦 Buscar Producto por Proveedor</h2>
          <button className="btn-cerrar-modal" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          
          {/* Búsqueda de proveedor */}
          <div className="modal-seccion">
            <label className="modal-label">🏢 Buscar proveedor:</label>
            <input
              type="text"
              value={busquedaProveedor}
              onChange={manejarCambioProveedor}
              className="modal-input"
              placeholder="Escribe el nombre del proveedor..."
            />
          </div>

          {/* Lista de sugerencias */}
          {sugerenciasProveedores.length > 0 && (
            <ul className="lista-sugerencias" style={{ marginBottom: 16 }}>
              {sugerenciasProveedores.map((prov) => (
                <li key={prov.id} onClick={() => seleccionarProveedor(prov)}>
                  🏢 {prov.nombre}
                </li>
              ))}
            </ul>
          )}

          {/* Proveedor seleccionado */}
          {proveedorSeleccionado && (
            <>
              {/* Header del proveedor */}
              <div className="proveedor-header">
                <h3>🏢 {proveedorSeleccionado.nombre}</h3>
                <span className="badge badge-azul">{productos.length} productos</span>
              </div>

              {/* Botón nuevo producto */}
              {!mostrarFormNuevo && (
                <button
                  onClick={() => setMostrarFormNuevo(true)}
                  className="btn-modal btn-dashed"
                  style={{ marginBottom: 16 }}
                >
                  ➕ Nuevo producto
                </button>
              )}

              {/* 🔍 Campo de búsqueda de productos */}
              <div className="modal-seccion" style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="modal-input"
                  placeholder="🔍 Buscar producto..."
                />
              </div>

              {/* Formulario nuevo producto */}
              {mostrarFormNuevo && (
                <div className="form-expandible">
                  <div className="form-expandible-titulo">➕ Crear nuevo producto</div>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Nombre del producto"
                      value={formProd.nombre}
                      onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })}
                      className="modal-input"
                    />
                    <div className="form-grid form-grid-2">
                      <input
                        type="number"
                        placeholder="Precio compra"
                        value={formProd.precio_compra}
                        onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })}
                        className="modal-input"
                      />
                      <input
                        type="number"
                        placeholder="Precio venta"
                        value={formProd.precio_venta}
                        onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })}
                        className="modal-input"
                      />
                    </div>
                  </div>
                  <div className="form-acciones">
                    <button onClick={guardarProductoProveedor} className="btn-modal btn-verde">
                      💾 Guardar
                    </button>
                    <button
                      onClick={() => {
                        setMostrarFormNuevo(false);
                        setFormProd({ nombre: "", precio_compra: "", precio_venta: "" });
                      }}
                      className="btn-modal btn-secundario"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de productos */}
              <div className="modal-seccion">
                <div className="modal-seccion-titulo">📋 Productos disponibles:</div>
                
                {productos.length === 0 ? (
                  <div className="mensaje-vacio">
                    <div className="mensaje-vacio-icono">📭</div>
                    <div className="mensaje-vacio-texto">No hay productos registrados para este proveedor</div>
                  </div>
                ) : (
                  productos
                    .filter((prod) => 
                      !busquedaProducto || 
                      prod.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
                    )
                    .map((prod) => (
                    <div key={prod.id} className="item-card">
                      {productoEditando === prod.id ? (
                        <div style={{ width: '100%' }}>
                          <div className="form-grid" style={{ marginBottom: 10 }}>
                            <input
                              value={productoForm.nombre}
                              onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
                              className="modal-input"
                              placeholder="Nombre"
                            />
                            <div className="form-grid form-grid-3">
                              <input
                                type="number"
                                placeholder="Precio compra"
                                value={productoForm.precio_compra}
                                onChange={(e) => setProductoForm({ ...productoForm, precio_compra: e.target.value })}
                                className="modal-input"
                              />
                              <input
                                type="number"
                                placeholder="Precio venta"
                                value={productoForm.precio_venta}
                                onChange={(e) => setProductoForm({ ...productoForm, precio_venta: e.target.value })}
                                className="modal-input"
                              />
                              <input
                                type="number"
                                placeholder="Stock"
                                value={productoForm.stock}
                                onChange={(e) => setProductoForm({ ...productoForm, stock: e.target.value })}
                                className="modal-input"
                              />
                            </div>
                          </div>
                          <div className="form-acciones">
                            <button onClick={guardarEdicion} className="btn-modal btn-verde btn-pequeno">
                              💾 Guardar
                            </button>
                            <button onClick={cancelarEdicion} className="btn-modal btn-secundario btn-pequeno">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="item-card-info">
                            <div className="item-card-titulo">{prod.nombre}</div>
                            <div className="item-card-subtitulo">
                              <span className="badge badge-gris">Compra: ${Number(prod.precio_compra || 0).toLocaleString("es-CO")}</span>
                              {" "}
                              <span className="badge badge-verde">Venta: ${Number(prod.precio_venta || 0).toLocaleString("es-CO")}</span>
                              {" "}
                              <span>Stock: {prod.stock || 0}</span>
                            </div>
                          </div>
                          <div className="item-card-acciones">
                            <button
                              onClick={() => manejarSeleccion(prod)}
                              className="btn-modal btn-primario btn-pequeno"
                            >
                              ➕ Agregar
                            </button>
                            <button
                              onClick={() => manejarEditar(prod)}
                              className="btn-modal btn-amarillo btn-pequeno"
                            >
                              ✏️
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-modal btn-rojo">
            ✖️ Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuscarProveedorYProductoModal;