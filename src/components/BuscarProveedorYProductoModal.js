import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";

const BuscarProveedorYProductoModal = ({ onSelect, onClose }) => {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");

  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const [formProv, setFormProv] = useState({ nombre: "", telefono: "", tipo_servicio: "" });
  const [formProd, setFormProd] = useState({ nombre: "", precio_compra: "", precio_venta: "" });

  const [productoEditando, setProductoEditando] = useState(null);
  const [productoForm, setProductoForm] = useState({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });

  useEffect(() => {
    const cargarProveedores = async () => {
      const { data } = await supabase.from("proveedores").select("*").order("nombre", { ascending: true });
      if (data) setProveedores(data);
    };
    cargarProveedores();
  }, []);

  const seleccionarProveedor = (proveedorId) => {
    const proveedor = proveedores.find(p => p.id === proveedorId);
    setProveedorSeleccionado(proveedor);
    setBusquedaProducto("");
    setProductos([]);
    setProductosFiltrados([]);
    setMostrarTodos(false);
  };

  const buscarProductos = async () => {
    if (!proveedorSeleccionado) return;
    const { data } = await supabase
      .from("productos_proveedores")
      .select("*")
      .eq("proveedor_id", proveedorSeleccionado.id);

    setProductos(data || []);
    if (busquedaProducto.trim()) {
      const texto = busquedaProducto.toLowerCase();
      const filtrados = data.filter((p) => p.nombre?.toLowerCase().includes(texto));
      setProductosFiltrados(filtrados);
    } else {
      setProductosFiltrados([]);
    }
  };

  useEffect(() => {
    if (mostrarTodos && proveedorSeleccionado) buscarProductos();
  }, [mostrarTodos, proveedorSeleccionado]);

  const guardarProveedor = async () => {
    if (!formProv.nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre del proveedor es obligatorio", "warning");
    }
    const { data, error } = await supabase.from("proveedores").insert([formProv]).select();
    if (error) return Swal.fire("Error", "No se pudo guardar el proveedor", "error");
    const nuevo = data[0];
    setProveedores((prev) => [...prev, nuevo]);
    seleccionarProveedor(nuevo.id);
    setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
    Swal.fire("Guardado", "Proveedor creado correctamente", "success");
  };

  const guardarProductoProveedor = async () => {
    if (!formProd.nombre || !formProd.precio_compra || !formProd.precio_venta || !proveedorSeleccionado?.id) {
      return Swal.fire("Faltan datos", "Completa todos los campos", "warning");
    }
    const { error } = await supabase.from("productos_proveedores").insert([{ ...formProd, proveedor_id: proveedorSeleccionado.id }]);
    if (error) return Swal.fire("Error", "No se pudo guardar el producto", "error");
    Swal.fire("Guardado", "Producto agregado correctamente", "success");
    setFormProd({ nombre: "", precio_compra: "", precio_venta: "" });
    buscarProductos();
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
    const { error } = await supabase.from("productos_proveedores")
      .update({ nombre, precio_compra, precio_venta, stock })
      .eq("id", productoEditando);
    if (!error) {
      Swal.fire("Producto actualizado", "", "success");
      setProductoEditando(null);
      setProductoForm({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });
      buscarProductos();
    }
  };

  const cancelarEdicion = () => {
    setProductoEditando(null);
    setProductoForm({ nombre: "", precio_compra: "", precio_venta: "", stock: 0 });
  };

  const manejarSeleccion = (prod) => {
  onSelect(prod); // ✅ Esto llama a agregarProductoProveedor sin cerrar el modal
  // ❌ NO pongas: onClose();
};

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">📦 Buscar producto por proveedor</h2>

        <label className="block mb-1 font-medium">Proveedor:</label>
        <input
          type="text"
          value={busquedaProveedor}
          onChange={(e) => setBusquedaProveedor(e.target.value)}
          className="border p-2 rounded w-full mb-2"
          placeholder="Buscar proveedor..."
        />
        <select
          className="border p-2 rounded w-full mb-4"
          value={proveedorSeleccionado?.id || ""}
          onChange={(e) => seleccionarProveedor(e.target.value)}
        >
          <option value="">Selecciona un proveedor...</option>
          {proveedores
            .filter((p) => p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()))
            .map((prov) => (
              <option key={prov.id} value={prov.id}>{prov.nombre}</option>
            ))}
        </select>

        {proveedorSeleccionado && (
          <div className="mb-4">
            <h3 className="font-semibold">Proveedor: {proveedorSeleccionado.nombre}</h3>
            <div className="flex gap-2 mt-2">
              {!mostrarTodos ? (
                <button onClick={() => setMostrarTodos(true)} className="bg-blue-600 text-white px-3 py-1 rounded">
                  🔍 Ver productos
                </button>
              ) : (
                <button onClick={() => { setMostrarTodos(false); setProductosFiltrados([]); }} className="bg-gray-400 text-white px-3 py-1 rounded">
                  ❌ Ocultar productos
                </button>
              )}
            </div>

            {mostrarTodos && productos.map((prod) => (
              <div key={prod.id} className="border p-2 rounded mt-2 bg-gray-100">
                {productoEditando === prod.id ? (
                  <div className="space-y-2">
                    <input value={productoForm.nombre} onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })} className="border p-1 rounded w-full" />
                    <input type="number" value={productoForm.precio_compra} onChange={(e) => setProductoForm({ ...productoForm, precio_compra: e.target.value })} className="border p-1 rounded w-full" />
                    <input type="number" value={productoForm.precio_venta} onChange={(e) => setProductoForm({ ...productoForm, precio_venta: e.target.value })} className="border p-1 rounded w-full" />
                    <input type="number" value={productoForm.stock} onChange={(e) => setProductoForm({ ...productoForm, stock: e.target.value })} className="border p-1 rounded w-full" />
                    <div className="flex gap-2">
                      <button onClick={guardarEdicion} className="bg-green-500 text-white px-2 py-1 rounded">💾</button>
                      <button onClick={cancelarEdicion} className="bg-gray-400 px-2 py-1 rounded">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{prod.nombre}</p>
                      <p>Compra: ${prod.precio_compra}</p>
                      <p>Venta: ${prod.precio_venta}</p>
                      <p>Stock: {prod.stock}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => manejarSeleccion(prod)} className="bg-blue-500 text-white px-2 py-1 rounded">➕</button>
                      <button onClick={() => manejarEditar(prod)} className="bg-yellow-400 text-white px-2 py-1 rounded">✏️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6">
              <h4 className="font-semibold mb-2">➕ Nuevo producto</h4>
              <input type="text" placeholder="Nombre" value={formProd.nombre} onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })} className="border p-1 rounded w-full mb-2" />
              <input type="number" placeholder="Precio compra" value={formProd.precio_compra} onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })} className="border p-1 rounded w-full mb-2" />
              <input type="number" placeholder="Precio venta" value={formProd.precio_venta} onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })} className="border p-1 rounded w-full mb-2" />
              <button onClick={guardarProductoProveedor} className="bg-green-600 text-white px-4 py-1 rounded">Guardar producto</button>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="bg-red-500 text-white px-4 py-2 rounded">✖️ Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default BuscarProveedorYProductoModal;
