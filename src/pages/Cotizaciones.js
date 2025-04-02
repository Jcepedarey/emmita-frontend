import React, { useState } from 'react';
import supabase from "../supabaseClient";
import BuscarProductoModal from '../components/BuscarProductoModal';

const CotizacionForm = () => {
  const [cliente, setCliente] = useState('');
  const [productos, setProductos] = useState([]);
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState('');
  const [productoNombre, setProductoNombre] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const total = productos.reduce((acc, prod) => acc + prod.subtotal, 0);

  const agregarProducto = () => {
    if (!productoNombre || cantidad <= 0 || precio <= 0) {
      alert("Debe ingresar un producto válido con cantidad y precio.");
      return;
    }

    const nuevoProducto = {
      nombre: productoNombre,
      cantidad,
      precio: parseFloat(precio),
      subtotal: cantidad * parseFloat(precio),
    };

    setProductos([...productos, nuevoProducto]);
    setProductoNombre('');
    setCantidad(1);
    setPrecio('');
  };

  const handleAgregarProducto = (producto) => {
    const nuevoProducto = {
      nombre: producto.descripcion,
      cantidad: 1,
      precio: producto.precio,
      subtotal: producto.precio,
    };

    setProductos([...productos, nuevoProducto]);
    setModalOpen(false);
  };

  const eliminarProducto = (index) => {
    const nuevaLista = productos.filter((_, i) => i !== index);
    setProductos(nuevaLista);
  };

  const guardarCotizacion = async () => {
    if (!cliente || productos.length === 0) {
      alert("Debe ingresar un cliente y al menos un producto.");
      return;
    }

    const { error } = await supabase.from('cotizaciones').insert([{ cliente, productos, total }]);

    if (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar la cotización.");
    } else {
      alert("Cotización guardada exitosamente.");
      setCliente('');
      setProductos([]);
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Crear Cotización</h2>

      <label>Cliente:</label>
      <input
        type="text"
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <h3>Agregar Producto</h3>
      <input
        type="text"
        placeholder="Producto"
        value={productoNombre}
        onChange={(e) => setProductoNombre(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <input
        type="number"
        placeholder="Cantidad"
        value={cantidad}
        onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <input
        type="number"
        placeholder="Precio"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button onClick={agregarProducto} style={{ width: "100%", marginBottom: 16 }}>
        Agregar
      </button>

      <button onClick={() => setModalOpen(true)} style={{ width: "100%", marginBottom: 16 }}>
        + Agregar desde inventario
      </button>

      <h3>Lista de Productos</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {productos.map((prod, index) => (
          <li key={index} style={{ padding: 8, borderBottom: "1px solid #ccc" }}>
            {prod.nombre} - {prod.cantidad} x ${prod.precio} = ${prod.subtotal.toFixed(2)}
            <br />
            <button onClick={() => eliminarProducto(index)} style={{ marginTop: 4 }}>Eliminar</button>
          </li>
        ))}
      </ul>

      <h3>Total: ${total.toFixed(2)}</h3>

      <button onClick={guardarCotizacion} style={{ width: "100%", marginTop: 16 }}>
        Guardar Cotización
      </button>

      {modalOpen && <BuscarProductoModal onSelect={handleAgregarProducto} onClose={() => setModalOpen(false)} />}
    </div>
  );
};

export default CotizacionForm;
