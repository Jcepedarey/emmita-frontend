// BuscarProductoModal.js
import React, { useState, useEffect } from 'react';
import supabase from "../supabaseClient";
import { v4 as uuidv4 } from 'uuid'; // ✅ para productos temporales

const BuscarProductoModal = ({ onSelect, onClose, onAgregarProducto }) => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    cantidad: 1
  });
  const [temporal, setTemporal] = useState(false); // ✅ estado para checkbox

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order("nombre", { ascending: true });
    if (!error) setProductos(data);
    else console.error('Error al obtener productos:', error);
  };

  const productosFiltrados = productos.filter(prod =>
    (prod.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (prod.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardarNuevoProducto = async () => {
    const { nombre, descripcion, precio, stock, categoria, cantidad } = form;

    if (!nombre || !precio || !stock) {
      alert("Nombre, precio y stock son obligatorios");
      return;
    }

    if (temporal) {
      const productoTemporal = {
        id: uuidv4(),
        nombre,
        precio: parseFloat(precio),
        cantidad: parseInt(cantidad, 10),
        temporal: true
      };
      onAgregarProducto(productoTemporal);
      onClose();
    } else {
      const { data, error } = await supabase
        .from("productos")
        .insert([{ nombre, descripcion, precio, stock, categoria }])
        .select();

      if (!error && data?.length) {
        const nuevoProducto = {
          ...data[0],
          cantidad: parseInt(cantidad, 10),
          precio: parseFloat(precio),
          temporal: false
        };
        onAgregarProducto(nuevoProducto);
        onClose();
      } else {
        alert("Error al guardar el producto");
        console.error(error);
      }
    }
  };

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxHeight: "90vh", overflowY: "auto", padding: "20px" }}>
        <h2>🔍 Buscar producto</h2>

        <input
          type="text"
          placeholder="Escribe para buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />

        {busqueda && productosFiltrados.length > 0 && (
          <ul style={{ maxHeight: "250px", overflowY: "auto", padding: 0, listStyle: "none" }}>
            {productosFiltrados.map((producto) => (
              <li key={producto.id} style={{ marginBottom: "8px" }}>
                {producto.nombre} - ${producto.precio?.toLocaleString("es-CO")}
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={() => onSelect(producto)}
                >
                  Seleccionar
                </button>
              </li>
            ))}
          </ul>
        )}

        <hr style={{ margin: "20px 0" }} />
        <h3>➕ Agregar nuevo producto</h3>

        <input
          type="text"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          style={{ width: "100%", marginBottom: "8px", padding: "6px" }}
        />
        <input
          type="text"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          style={{ width: "100%", marginBottom: "8px", padding: "6px" }}
        />
        <input
          type="number"
          placeholder="Precio"
          value={form.precio}
          onChange={(e) => setForm({ ...form, precio: e.target.value })}
          style={{ width: "100%", marginBottom: "8px", padding: "6px" }}
        />
        <input
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          style={{ width: "100%", marginBottom: "8px", padding: "6px" }}
        />
        <input
          type="text"
          placeholder="Categoría"
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          style={{ width: "100%", marginBottom: "8px", padding: "6px" }}
        />
        <input
          type="number"
          placeholder="Cantidad"
          min="1"
          value={form.cantidad}
          onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
          style={{ width: "100%", marginBottom: "8px", padding: "6px" }}
        />

        <div style={{ marginTop: "10px", marginBottom: "10px" }}>
  <span style={{ display: "block", marginBottom: "4px" }}>¿Producto temporal?</span>
  <input
    type="checkbox"
    checked={temporal}
    onChange={(e) => setTemporal(e.target.checked)}
    style={{
      display: "inline-block",
      width: "16px",
      height: "16px",
      padding: 0,
      margin: 0,
      verticalAlign: "middle"
    }}
  />
</div>

        <button onClick={guardarNuevoProducto} style={{ marginTop: "10px" }}>
          Guardar producto
        </button>

        <hr style={{ margin: "20px 0" }} />
        <button
          onClick={onClose}
          style={{ backgroundColor: "#f44336", color: "white", padding: "8px 12px" }}
        >
          ❌ Cerrar
        </button>
      </div>
    </div>
  );
};

export default BuscarProductoModal;
