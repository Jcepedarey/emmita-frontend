import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaTrash } from "react-icons/fa";

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [formProv, setFormProv] = useState({ nombre: "", telefono: "", tipo_servicio: "" });
  const [formProd, setFormProd] = useState({ proveedor_id: "", nombre: "", precio_compra: "", precio_venta: "" });
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    cargarProveedores();
    cargarProductosProveedor();
  }, []);

  const cargarProveedores = async () => {
    const { data } = await supabase.from("proveedores").select("*").order("nombre");
    if (data) setProveedores(data);
  };

  const cargarProductosProveedor = async () => {
    const { data } = await supabase.from("productos_proveedores").select("*");
    if (data) setProductosProveedor(data);
  };

  const guardarProveedor = async () => {
    if (!formProv.nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre del proveedor es obligatorio.", "warning");
    }

    const { error } = await supabase.from("proveedores").insert([formProv]);
    if (!error) {
      Swal.fire("Guardado", "Proveedor agregado correctamente.", "success");
      setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
      cargarProveedores();
    }
  };

  const guardarProductoProveedor = async () => {
    const { proveedor_id, nombre, precio_compra, precio_venta } = formProd;

    if (!proveedor_id || !nombre || !precio_compra || !precio_venta) {
      return Swal.fire("Faltan datos", "Completa todos los campos requeridos.", "warning");
    }

    if (precio_compra < 0 || precio_venta < 0) {
      return Swal.fire("Valores inválidos", "Los precios deben ser positivos.", "error");
    }

    const { error } = await supabase.from("productos_proveedores").insert([formProd]);
    if (!error) {
      Swal.fire("Guardado", "Producto externo agregado correctamente.", "success");
      setFormProd({ proveedor_id: "", nombre: "", precio_compra: "", precio_venta: "" });
      cargarProductosProveedor();
    }
  };

  const eliminarProducto = async (id) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar este producto?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmar.isConfirmed) return;

    const { error } = await supabase.from("productos_proveedores").delete().eq("id", id);
    if (!error) {
      Swal.fire("Eliminado", "Producto eliminado correctamente", "success");
      cargarProductosProveedor();
    }
  };

  const productosFiltrados = productosProveedor.filter((p) =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div style={{ padding: "1rem", maxWidth: "650px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Proveedores</h2>

      <h3>Agregar Proveedor</h3>
      <input placeholder="Nombre" value={formProv.nombre} onChange={(e) => setFormProv({ ...formProv, nombre: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
      <input placeholder="Teléfono" value={formProv.telefono} onChange={(e) => setFormProv({ ...formProv, telefono: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
      <input placeholder="Tipo de servicio" value={formProv.tipo_servicio} onChange={(e) => setFormProv({ ...formProv, tipo_servicio: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
      <button onClick={guardarProveedor} style={{ width: "100%", marginBottom: "1rem" }}>Guardar Proveedor</button>

      <h3>Agregar Producto Externo</h3>
      <select value={formProd.proveedor_id} onChange={(e) => setFormProd({ ...formProd, proveedor_id: e.target.value })} style={{ width: "100%", marginBottom: 8 }}>
        <option value="">-- Selecciona proveedor --</option>
        {proveedores.map((prov) => (
          <option key={prov.id} value={prov.id}>{prov.nombre}</option>
        ))}
      </select>
      <input placeholder="Nombre del producto" value={formProd.nombre} onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
      <input type="number" placeholder="Precio de compra" value={formProd.precio_compra} onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
      <input type="number" placeholder="Precio de venta" value={formProd.precio_venta} onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })} style={{ width: "100%", marginBottom: 8 }} />
      <button onClick={guardarProductoProveedor} style={{ width: "100%", marginBottom: "1rem" }}>Guardar Producto</button>

      <h3>Buscar productos de proveedor</h3>
      <input placeholder="Buscar por nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} style={{ width: "100%", marginBottom: 12 }} />

      <ul style={{ listStyle: "none", padding: 0 }}>
        {productosFiltrados.map((prod) => (
          <li key={prod.id} style={{ padding: 10, border: "1px solid #ddd", marginBottom: 10, borderRadius: 8, background: "#fdfdfd" }}>
            <strong>{prod.nombre}</strong><br />
            Stock: {prod.stock ?? "-"} - Compra: ${prod.precio_compra} - Venta: ${prod.precio_venta}
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={() => eliminarProducto(prod.id)} title="Eliminar">
                <FaTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
