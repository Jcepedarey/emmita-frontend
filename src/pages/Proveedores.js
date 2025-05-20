import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaTrash, FaEdit } from "react-icons/fa";
import Papa from "papaparse";

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [formProv, setFormProv] = useState({ nombre: "", telefono: "", tipo_servicio: "" });
  const [formProd, setFormProd] = useState({ proveedor_id: "", nombre: "", precio_compra: "", precio_venta: "" });
  const [buscar, setBuscar] = useState("");
  const [modoBusqueda, setModoBusqueda] = useState("proveedor");
  const [editandoProveedor, setEditandoProveedor] = useState(null);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [mostrarFormProv, setMostrarFormProv] = useState(false);
  const [mostrarFormProd, setMostrarFormProd] = useState(false);

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

    if (editandoProveedor) {
      const { error } = await supabase.from("proveedores").update(formProv).eq("id", editandoProveedor);
      if (!error) {
        Swal.fire("Actualizado", "Proveedor actualizado correctamente.", "success");
        setEditandoProveedor(null);
      }
    } else {
      const { error } = await supabase.from("proveedores").insert([formProv]);
      if (!error) {
        Swal.fire("Guardado", "Proveedor agregado correctamente.", "success");
        setMostrarFormProd(true);
      }
    }

    setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
    cargarProveedores();
  };

  const editarProveedor = (prov) => {
    setEditandoProveedor(prov.id);
    setFormProv({ nombre: prov.nombre, telefono: prov.telefono, tipo_servicio: prov.tipo_servicio });
    setMostrarFormProv(true);
    setMostrarFormProd(true);
    setFormProd((prev) => ({ ...prev, proveedor_id: prov.id }));
  };

  const eliminarProveedor = async (id) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar este proveedor?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) return;

    const { error } = await supabase.from("proveedores").delete().eq("id", id);
    if (!error) {
      Swal.fire("Eliminado", "Proveedor eliminado correctamente", "success");
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

    const operacion = editandoProducto
      ? supabase.from("productos_proveedores").update(formProd).eq("id", editandoProducto)
      : supabase.from("productos_proveedores").insert([formProd]);

    const { error } = await operacion;

    if (!error) {
      Swal.fire(editandoProducto ? "Actualizado" : "Guardado", `Producto ${editandoProducto ? "actualizado" : "guardado"} correctamente.`, "success");
      setEditandoProducto(null);
      setFormProd({ proveedor_id: formProd.proveedor_id, nombre: "", precio_compra: "", precio_venta: "" });
      cargarProductosProveedor();
    }
  };

  const editarProducto = (producto) => {
    setEditandoProducto(producto.id);
    setFormProd({
      proveedor_id: producto.proveedor_id,
      nombre: producto.nombre,
      precio_compra: producto.precio_compra,
      precio_venta: producto.precio_venta,
    });
    setMostrarFormProd(true);
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

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  const productosFiltrados = productosProveedor.filter((p) =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  const exportarCSV = () => {
    if (productosProveedor.length === 0) {
      Swal.fire("Sin datos", "No hay productos para exportar.", "info");
      return;
    }

    const productosConProveedor = productosProveedor.map((p) => {
      const proveedor = proveedores.find((prov) => prov.id === p.proveedor_id);
      return {
        nombre: p.nombre,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        proveedor: proveedor?.nombre || "-"
      };
    });

    const csv = Papa.unparse(productosConProveedor, { delimiter: ";" });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "productos_proveedores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Proveedores</h2>

      <button
        onClick={() => {
          setMostrarFormProv(true);
          setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
          setEditandoProveedor(null);
        }}
        style={{ margin: "10px 0", padding: "10px", background: "#ccc", borderRadius: "5px" }}
      >
        ➕ Agregar Proveedor
      </button>

      <button
        onClick={exportarCSV}
        style={{ margin: "10px 0 20px 10px", padding: "10px", background: "#4caf50", color: "#fff", borderRadius: "5px" }}
      >
        📁 Exportar CSV
      </button>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: "bold", marginRight: "10px" }}>Buscar en:</label>
        <select value={modoBusqueda} onChange={(e) => setModoBusqueda(e.target.value)}>
          <option value="proveedor">Proveedores</option>
          <option value="producto">Productos</option>
        </select>
      </div>

      <input
        placeholder={modoBusqueda === "producto" ? "Buscar productos de proveedor" : "Buscar proveedor por nombre"}
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />

      {modoBusqueda === "proveedor" && buscar && proveedoresFiltrados.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {proveedoresFiltrados.map((prov) => (
            <li key={prov.id} style={{ padding: 10, border: "1px solid #ddd", marginBottom: 10, borderRadius: 8, background: "#fdfdfd" }}>
              <strong>{prov.nombre}</strong><br />
              📞 {prov.telefono} | {prov.tipo_servicio}
              <div style={{ marginTop: "0.5rem" }}>
                <button onClick={() => editarProveedor(prov)} title="Editar" style={{ marginRight: 10 }}><FaEdit /></button>
                <button onClick={() => eliminarProveedor(prov.id)} title="Eliminar"><FaTrash /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mostrarFormProv && (
        <>
          <h3>{editandoProveedor ? "Editar Proveedor" : "Agregar Proveedor"}</h3>
          <input placeholder="Nombre" value={formProv.nombre} onChange={(e) => setFormProv({ ...formProv, nombre: e.target.value })} />
          <input placeholder="Teléfono" value={formProv.telefono} onChange={(e) => setFormProv({ ...formProv, telefono: e.target.value })} />
          <input placeholder="Tipo de servicio" value={formProv.tipo_servicio} onChange={(e) => setFormProv({ ...formProv, tipo_servicio: e.target.value })} />
          <button onClick={guardarProveedor} style={{ width: "100%", margin: "10px 0" }}>
            {editandoProveedor ? "Actualizar" : "Guardar Proveedor"}
          </button>
          <button onClick={() => {
            setMostrarFormProv(false);
            setEditandoProveedor(null);
            setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
          }} style={{ width: "100%", marginBottom: "1rem", background: "#eee" }}>
            Cancelar
          </button>
        </>
      )}

      {mostrarFormProd && (
        <>
          <h3>{editandoProducto ? "Editar Producto" : "Agregar Producto Externo"}</h3>
          <select value={formProd.proveedor_id} onChange={(e) => setFormProd({ ...formProd, proveedor_id: e.target.value })}>
            <option value="">-- Selecciona proveedor --</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>{prov.nombre}</option>
            ))}
          </select>
          <input placeholder="Nombre del producto" value={formProd.nombre} onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })} />
          <input type="number" placeholder="Precio de compra" value={formProd.precio_compra} onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })} />
          <input type="number" placeholder="Precio de venta" value={formProd.precio_venta} onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })} />
          <button onClick={guardarProductoProveedor} style={{ width: "100%", margin: "10px 0" }}>
            {editandoProducto ? "Actualizar" : "Guardar Producto"}
          </button>
        </>
      )}

      {modoBusqueda === "producto" && buscar.trim() !== "" && productosFiltrados.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {productosFiltrados.map((prod) => (
            <li key={prod.id} style={{ padding: 10, border: "1px solid #ddd", marginBottom: 10, borderRadius: 8, background: "#fdfdfd" }}>
              <strong>{prod.nombre}</strong><br />
              Stock: {prod.stock ?? "-"} - Compra: ${prod.precio_compra} - Venta: ${prod.precio_venta}
              <div style={{ marginTop: "0.5rem" }}>
                <button onClick={() => editarProducto(prod)} title="Editar" style={{ marginRight: 10 }}><FaEdit /></button>
                <button onClick={() => eliminarProducto(prod.id)} title="Eliminar"><FaTrash /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
