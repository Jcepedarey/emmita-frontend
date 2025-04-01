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

    // Calcular total sumando subtotales
    const total = productos.reduce((acc, prod) => acc + prod.subtotal, 0);

    // Agregar producto manualmente
    const agregarProducto = () => {
        if (!productoNombre || cantidad <= 0 || precio <= 0) {
            alert("Debe ingresar un producto válido con cantidad y precio.");
            return;
        }

        const nuevoProducto = {
            nombre: productoNombre,
            cantidad: cantidad,
            precio: parseFloat(precio),
            subtotal: cantidad * parseFloat(precio)
        };

        setProductos([...productos, nuevoProducto]);

        // Limpiar campos después de agregar
        setProductoNombre('');
        setCantidad(1);
        setPrecio('');
    };

    // Agregar producto desde modal
    const handleAgregarProducto = (producto) => {
        const nuevoProducto = {
            nombre: producto.descripcion,
            cantidad: 1,
            precio: producto.precio,
            subtotal: producto.precio
        };

        setProductos([...productos, nuevoProducto]);
        setModalOpen(false);
    };

    // Eliminar producto de la lista
    const eliminarProducto = (index) => {
        const nuevaLista = productos.filter((_, i) => i !== index);
        setProductos(nuevaLista);
    };

    // Guardar cotización en Supabase
    const guardarCotizacion = async () => {
        if (!cliente || productos.length === 0) {
            alert("Debe ingresar un cliente y al menos un producto.");
            return;
        }

        const { error } = await supabase
            .from('cotizaciones')
            .insert([{ 
                cliente: cliente, 
                productos: productos, 
                total: total 
            }]);

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
        <div>
            <h2>Crear Cotización</h2>
            <label>Cliente:</label>
            <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} />

            <h3>Productos</h3>
            <input 
                type="text" 
                placeholder="Producto" 
                value={productoNombre} 
                onChange={(e) => setProductoNombre(e.target.value)} 
            />
            <input 
                type="number" 
                placeholder="Cantidad" 
                value={cantidad} 
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)} 
            />
            <input 
                type="number" 
                placeholder="Precio" 
                value={precio} 
                onChange={(e) => setPrecio(e.target.value)} 
            />
            <button onClick={agregarProducto}>Agregar</button>

            <h3>Lista de Productos</h3>
            <ul>
                {productos.map((prod, index) => (
                    <li key={index}>
                        {prod.nombre} - {prod.cantidad} x ${prod.precio} = ${prod.subtotal.toFixed(2)}
                        <button onClick={() => eliminarProducto(index)}>Eliminar</button>
                    </li>
                ))}
            </ul>

            <h3>Total: ${total.toFixed(2)}</h3>

            <button onClick={guardarCotizacion}>Guardar Cotización</button>

            <button onClick={() => setModalOpen(true)}>+ Agregar Producto</button>
            {modalOpen && <BuscarProductoModal onSelect={handleAgregarProducto} />}
        </div>
    );
};

export default CotizacionForm;
