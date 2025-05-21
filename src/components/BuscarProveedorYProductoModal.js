import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";

const BuscarProveedorYProductoModal = ({ onSelect, onClose }) => {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);

  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productosFiltrados, setProductosFiltrados] = useState([]);

  // 🔁 Cargar proveedores al abrir
  useEffect(() => {
    const cargarProveedores = async () => {
      const { data } = await supabase.from("proveedores").select("*").order("nombre", { ascending: true });
      if (data) setProveedores(data);
    };
    cargarProveedores();
  }, []);

  // 🔁 Cargar productos del proveedor seleccionado
  useEffect(() => {
    const cargarProductos = async () => {
      if (!proveedorSeleccionado) return;
      const { data } = await supabase
        .from("productos_proveedores")
        .select("*")
        .eq("proveedor_id", proveedorSeleccionado.id);
      setProductos(data || []);
    };
    cargarProductos();
  }, [proveedorSeleccionado]);

  // 🔍 Filtro dinámico al escribir
  useEffect(() => {
    const texto = busquedaProducto.toLowerCase();
    if (!texto) {
      setProductosFiltrados([]);
      return;
    }
    const filtrados = productos.filter((p) =>
      p.nombre?.toLowerCase().includes(texto)
    );
    setProductosFiltrados(filtrados);
  }, [busquedaProducto, productos]);

  const seleccionarProveedor = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setBusquedaProducto("");
    setProductosFiltrados([]);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "white",
        padding: "20px",
        width: "90%",
        maxWidth: "800px",
        borderRadius: "8px"
      }}>
        <h3>🔍 Buscar producto de proveedor</h3>

        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label>Buscar proveedor:</label>
            <input
              type="text"
              placeholder="Nombre del proveedor"
              value={busquedaProveedor}
              onChange={(e) => setBusquedaProveedor(e.target.value)}
              style={{ width: "100%" }}
            />
            <ul style={{ listStyle: "none", padding: 0, marginTop: "10px", maxHeight: "150px", overflowY: "auto" }}>
              {busquedaProveedor &&
                proveedores
                  .filter((p) =>
                    p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase())
                  )
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => seleccionarProveedor(p)}
                        style={{ width: "100%", textAlign: "left", marginBottom: "5px" }}
                      >
                        {p.nombre}
                      </button>
                    </li>
                  ))}
            </ul>
          </div>

          <div style={{ flex: 1 }}>
            <label>Buscar producto:</label>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              disabled={!proveedorSeleccionado}
              style={{ width: "100%" }}
            />
            <ul style={{ listStyle: "none", padding: 0, marginTop: "10px", maxHeight: "150px", overflowY: "auto" }}>
              {productosFiltrados.map((prod) => (
                <li key={prod.id}>
                  <button
                    onClick={() => {
                      onSelect(prod);
                      onClose();
                    }}
                    style={{ width: "100%", textAlign: "left", marginBottom: "5px" }}
                  >
                    {prod.nombre} – ${prod.precio_venta?.toLocaleString("es-CO")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button onClick={onClose} style={{ backgroundColor: "#e53935", color: "white", padding: "8px 16px" }}>
          ✖️ Cerrar
        </button>
      </div>
    </div>
  );
};

export default BuscarProveedorYProductoModal;
