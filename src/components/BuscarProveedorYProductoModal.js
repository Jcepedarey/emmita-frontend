import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";

const BuscarProveedorYProductoModal = ({ onSelect, onClose }) => {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");

  const [productos, setProductos] = useState([]);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  const [formProd, setFormProd] = useState({ nombre: "", precio_compra: "", precio_venta: "" });

  const [productoEditando, setProductoEditando] = useState(null);
  const [productoForm, setProductoForm] = useState({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });

  // Sugerencias filtradas en tiempo real
  const [sugerenciasProveedores, setSugerenciasProveedores] = useState([]);

  useEffect(() => {
    const cargarProveedores = async () => {
      const { data } = await supabase.from("proveedores").select("*").order("nombre", { ascending: true });
      if (data) setProveedores(data);
    };
    cargarProveedores();
  }, []);

  // ✅ Cambio 1: Filtrar automáticamente mientras escribe
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

  // ✅ Cambio 2: Al seleccionar proveedor, cargar productos automáticamente
  const seleccionarProveedor = async (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setBusquedaProveedor(proveedor.nombre);
    setSugerenciasProveedores([]);
    setMostrarFormNuevo(false);

    // Cargar productos automáticamente
    const { data } = await supabase
      .from("productos_proveedores")
      .select("*")
      .eq("proveedor_id", proveedor.id);

    setProductos(data || []);
  };

  // ✅ Cambio 3: Guardar nuevo producto
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
        onSelect(productoCreado);
      }
    });

    setFormProd({ nombre: "", precio_compra: "", precio_venta: "" });
    setMostrarFormNuevo(false);

    // Recargar lista de productos
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
    if (!nombre || !precio_venta || !stock) return Swal.fire("Campos incompletos", "Completa todos los campos", "warning");
    
    const { error } = await supabase
      .from("productos_proveedores")
      .update({ nombre, precio_compra, precio_venta, stock })
      .eq("id", productoEditando);
    
    if (!error) {
      Swal.fire("Producto actualizado", "", "success");
      setProductoEditando(null);
      setProductoForm({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });
      
      // Recargar productos
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

  const manejarSeleccion = (prod) => {
    onSelect(prod);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">📦 Buscar producto por proveedor</h2>

        {/* ✅ Cambio 1: Búsqueda con sugerencias automáticas */}
        <label className="block mb-1 font-medium">Proveedor:</label>
        <input
          type="text"
          value={busquedaProveedor}
          onChange={manejarCambioProveedor}
          className="border p-2 rounded w-full mb-2"
          placeholder="Escribe el nombre del proveedor..."
        />

        {/* Lista de sugerencias (similar a Trazabilidad) */}
        {sugerenciasProveedores.length > 0 && (
          <ul className="border rounded max-h-40 overflow-y-auto mb-4 bg-gray-50">
            {sugerenciasProveedores.map((prov) => (
              <li
                key={prov.id}
                onClick={() => seleccionarProveedor(prov)}
                className="p-2 hover:bg-blue-100 cursor-pointer"
              >
                {prov.nombre}
              </li>
            ))}
          </ul>
        )}

        {/* ✅ Cambio 2: Productos se muestran automáticamente al seleccionar proveedor */}
        {proveedorSeleccionado && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-lg">
              Proveedor: {proveedorSeleccionado.nombre}
            </h3>

            {/* ✅ Cambio 3: Botón para mostrar formulario de nuevo producto */}
            {!mostrarFormNuevo && (
              <button
                onClick={() => setMostrarFormNuevo(true)}
                className="bg-green-600 text-white px-4 py-2 rounded mb-3"
              >
                ➕ Nuevo producto
              </button>
            )}

            {/* Formulario de nuevo producto (solo visible si se activa) */}
            {mostrarFormNuevo && (
              <div className="border p-4 rounded mb-4 bg-green-50">
                <h4 className="font-semibold mb-2">Crear nuevo producto</h4>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formProd.nombre}
                  onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })}
                  className="border p-2 rounded w-full mb-2"
                />
                <input
                  type="number"
                  placeholder="Precio compra"
                  value={formProd.precio_compra}
                  onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })}
                  className="border p-2 rounded w-full mb-2"
                />
                <input
                  type="number"
                  placeholder="Precio venta"
                  value={formProd.precio_venta}
                  onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })}
                  className="border p-2 rounded w-full mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={guardarProductoProveedor}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    💾 Guardar
                  </button>
                  <button
                    onClick={() => {
                      setMostrarFormNuevo(false);
                      setFormProd({ nombre: "", precio_compra: "", precio_venta: "" });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ✅ Cambio 4: Lista de productos (visible automáticamente) */}
            <div className="space-y-2">
              {productos.length === 0 ? (
                <p className="text-gray-500 italic">No hay productos registrados para este proveedor</p>
              ) : (
                productos.map((prod) => (
                  <div key={prod.id} className="border p-3 rounded bg-gray-100">
                    {productoEditando === prod.id ? (
                      <div className="space-y-2">
                        <input
                          value={productoForm.nombre}
                          onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
                          className="border p-2 rounded w-full"
                        />
                        <input
                          type="number"
                          placeholder="Precio compra"
                          value={productoForm.precio_compra}
                          onChange={(e) => setProductoForm({ ...productoForm, precio_compra: e.target.value })}
                          className="border p-2 rounded w-full"
                        />
                        <input
                          type="number"
                          placeholder="Precio venta"
                          value={productoForm.precio_venta}
                          onChange={(e) => setProductoForm({ ...productoForm, precio_venta: e.target.value })}
                          className="border p-2 rounded w-full"
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          value={productoForm.stock}
                          onChange={(e) => setProductoForm({ ...productoForm, stock: e.target.value })}
                          className="border p-2 rounded w-full"
                        />
                        <div className="flex gap-2">
                          <button onClick={guardarEdicion} className="bg-green-500 text-white px-3 py-1 rounded">
                            💾 Guardar
                          </button>
                          <button onClick={cancelarEdicion} className="bg-gray-400 text-white px-3 py-1 rounded">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{prod.nombre}</p>
                          <p className="text-sm">Compra: ${Number(prod.precio_compra || 0).toLocaleString("es-CO")}</p>
                          <p className="text-sm">Venta: ${Number(prod.precio_venta || 0).toLocaleString("es-CO")}</p>
                          <p className="text-sm">Stock: {prod.stock || 0}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => manejarSeleccion(prod)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          >
                            ➕ Agregar
                          </button>
                          <button
                            onClick={() => manejarEditar(prod)}
                            className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            ✖️ Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuscarProveedorYProductoModal;