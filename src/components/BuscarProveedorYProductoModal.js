import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";

const BuscarProveedorYProductoModal = ({ onSelect, onClose }) => {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);

  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productosFiltrados, setProductosFiltrados] = useState([]);

  const [mostrarFormProveedor, setMostrarFormProveedor] = useState(false);
  const [formProv, setFormProv] = useState({ nombre: "", telefono: "", tipo_servicio: "" });
  const [formProd, setFormProd] = useState({
    nombre: "",
    precio_venta: "",
    precio_compra: "",
    proveedor_id: ""
  });

  // Cargar proveedores al abrir
  useEffect(() => {
    const cargarProveedores = async () => {
      const { data } = await supabase.from("proveedores").select("*").order("nombre", { ascending: true });
      if (data) setProveedores(data);
    };
    cargarProveedores();
  }, []);

  // Cargar productos del proveedor seleccionado
  useEffect(() => {
    const cargarProductosProveedor = async () => {
      if (!proveedorSeleccionado) return;
      const { data } = await supabase
        .from("productos_proveedores")
        .select("*")
        .eq("proveedor_id", proveedorSeleccionado.id);
      setProductos(data || []);
    };
    cargarProductosProveedor();
  }, [proveedorSeleccionado]);

  // Filtro dinámico al escribir producto
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

  const guardarProveedor = async () => {
    if (!formProv.nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre del proveedor es obligatorio", "warning");
    }

    const { data, error } = await supabase
      .from("proveedores")
      .insert([formProv])
      .select();

    if (error) {
      console.error("Error al guardar proveedor:", error);
      return Swal.fire("Error", "No se pudo guardar el proveedor", "error");
    }

    const nuevoProveedor = data[0];
    setProveedorSeleccionado(nuevoProveedor);
    setFormProd((prev) => ({ ...prev, proveedor_id: nuevoProveedor.id }));
    setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
    setMostrarFormProveedor(false);
    Swal.fire("Guardado", "Proveedor creado correctamente", "success");
  };

  const guardarProductoProveedor = async () => {
    if (
      !formProd.nombre ||
      !formProd.precio_venta ||
      !formProd.precio_compra ||
      !formProd.proveedor_id
    ) {
      return Swal.fire("Faltan datos", "Completa todos los campos", "warning");
    }

    const { error } = await supabase
      .from("productos_proveedores")
      .insert([formProd]);

    if (error) {
      console.error("Error al guardar producto proveedor:", error);
      Swal.fire("Error", "No se pudo guardar el producto", "error");
    } else {
      Swal.fire("Guardado", "Producto agregado correctamente", "success");
      setFormProd({
        nombre: "",
        precio_venta: "",
        precio_compra: "",
        proveedor_id: formProd.proveedor_id
      });
      const { data } = await supabase
        .from("productos_proveedores")
        .select("*")
        .eq("proveedor_id", formProd.proveedor_id);
      setProductos(data || []);
    }
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
            <button
              style={{ marginTop: "10px", padding: "6px", fontSize: "14px" }}
              onClick={() => setMostrarFormProveedor(true)}
            >
              ➕ Agregar proveedor
            </button>
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

        {mostrarFormProveedor && (
          <div style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <h4>🧾 Nuevo proveedor</h4>
            <input
              type="text"
              placeholder="Nombre del proveedor"
              value={formProv.nombre}
              onChange={(e) => setFormProv({ ...formProv, nombre: e.target.value })}
              style={{ width: "100%", marginBottom: "5px" }}
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={formProv.telefono}
              onChange={(e) => setFormProv({ ...formProv, telefono: e.target.value })}
              style={{ width: "100%", marginBottom: "5px" }}
            />
            <input
              type="text"
              placeholder="Tipo de servicio"
              value={formProv.tipo_servicio}
              onChange={(e) => setFormProv({ ...formProv, tipo_servicio: e.target.value })}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <button onClick={guardarProveedor}>💾 Guardar proveedor</button>
          </div>
        )}

        {proveedorSeleccionado && (
  <div style={{ marginTop: "20px" }}>
    <h4>➕ Producto para {proveedorSeleccionado.nombre}</h4>
    <input
      type="text"
      placeholder="Nombre del producto"
      value={formProd.nombre}
      onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })}
      style={{ width: "100%", marginBottom: "5px" }}
    />
    <input
      type="number"
      placeholder="Precio de compra"
      value={formProd.precio_compra}
      onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })}
      style={{ width: "100%", marginBottom: "5px" }}
    />
    <input
      type="number"
      placeholder="Precio de venta"
      value={formProd.precio_venta}
      onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })}
      style={{ width: "100%", marginBottom: "10px" }}
    />
    <button onClick={guardarProductoProveedor}>💾 Guardar producto</button>
  </div>
)}

      </div>
    </div>
  );
};

export default BuscarProveedorYProductoModal;
