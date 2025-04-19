import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";

const BuscarProductoProveedorModal = ({ onSelect, onClose }) => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from("productos_proveedores")
      .select("*");

    if (!error) setProductos(data);
    else console.error("Error al obtener productos de proveedores:", error);
  };

  const productosFiltrados = productos.filter((prod) =>
    (prod.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h2>Productos de Proveedores</h2>

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <ul style={{ paddingLeft: 0 }}>
          {productosFiltrados.map((prod) => (
            <li key={prod.id} style={{ listStyle: "none", marginBottom: "10px" }}>
              {prod.nombre} - ${parseInt(prod.precio_venta).toLocaleString("es-CO")}
              <button style={{ marginLeft: "10px" }} onClick={() => onSelect(prod)}>
                Agregar
              </button>
            </li>
          ))}
        </ul>

        <button onClick={onClose} style={{ marginTop: "20px", backgroundColor: "#f44336", color: "white" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default BuscarProductoProveedorModal;
