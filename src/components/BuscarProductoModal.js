import React, { useState, useEffect } from 'react';
import supabase from "../supabaseClient";

const BuscarProductoModal = ({ onSelect, onClose }) => {
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const fetchProductos = async () => {
            const { data, error } = await supabase.from('productos').select('*');
            if (error) {
                console.error('Error al obtener productos:', error);
            } else {
                setProductos(data);
            }
        };
        fetchProductos();
    }, []);

    const productosFiltrados = productos.filter(prod => 
        prod.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>Buscar Producto</h2>
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <ul>
                    {productosFiltrados.map((producto) => (
                        <li key={producto.id}>
                            {producto.descripcion} - ${producto.precio}
                            <button onClick={() => onSelect(producto)}>Seleccionar</button>
                        </li>
                    ))}
                </ul>
                <button onClick={onClose}>Cerrar</button>
            </div>
        </div>
    );
};

export default BuscarProductoModal;
