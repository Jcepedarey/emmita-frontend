import React, { useState, useEffect } from 'react';
import supabase from "../supabaseClient";

const BuscarProductoModal = ({ onSelect, onClose }) => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: ''
  });

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (!error) setProductos(data);
    else console.error('Error al obtener productos:', error);
  };

  const productosFiltrados = productos.filter(prod =>
    (prod.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (prod.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardarNuevoProducto = async () => {
    const { nombre, descripcion, precio, stock, categoria } = form;

    if (!nombre || !precio || !stock) {
      alert("Nombre, precio y stock son obligatorios");
      return;
    }

    const { error } = await supabase.from("productos").insert([{ nombre, descripcion, precio, stock, categoria }]);

    if (!error) {
      alert("Producto agregado correctamente");
      setForm({ nombre: '', descripcion: '', precio: '', stock: '', categoria: '' });
      fetchProductos();
    } else {
      alert("Error al guardar el producto");
      console.error(error);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h2>Buscar Producto</h2>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <ul style={{ marginTop: '10px' }}>
          {productosFiltrados.map((producto) => (
            <li key={producto.id}>
              {producto.nombre || producto.descripcion} - ${producto.precio}
              <button onClick={() => onSelect(producto)}>Seleccionar</button>
            </li>
          ))}
        </ul>

        <hr style={{ margin: '20px 0' }} />
        <h3>Agregar nuevo producto</h3>
        <input
          type="text"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <input
          type="text"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
        <input
          type="number"
          placeholder="Precio"
          value={form.precio}
          onChange={(e) => setForm({ ...form, precio: e.target.value })}
        />
        <input
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <input
          type="text"
          placeholder="Categoría"
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
        />
        <button onClick={guardarNuevoProducto}>Guardar producto</button>

        <hr />
        <button onClick={onClose} style={{ backgroundColor: "#f44336", color: "white", marginTop: "10px" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default BuscarProductoModal;
