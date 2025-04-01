import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "" });
  const [buscar, setBuscar] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    obtenerProductos();
  }, []);

  const obtenerProductos = async () => {
    const { data, error } = await supabase.from("productos").select("*").order("nombre");
    if (error) console.error("Error al obtener productos:", error);
    else setProductos(data);
  };

  const guardarProducto = async () => {
    const { nombre, descripcion, precio, stock, categoria } = form;

    // ✅ Validaciones con SweetAlert
    if (!nombre || !precio || !stock) {
      return Swal.fire("Campos requeridos", "Nombre, precio y stock son obligatorios.", "warning");
    }
    if (precio < 0 || stock < 0) {
      return Swal.fire("Valores inválidos", "Precio y stock deben ser positivos.", "error");
    }

    if (editandoId) {
      const { error } = await supabase
        .from("productos")
        .update({ nombre, descripcion, precio, stock, categoria })
        .eq("id", editandoId);
      if (!error) {
        Swal.fire("Actualizado", "Producto actualizado correctamente", "success");
        setEditandoId(null);
        limpiarFormulario();
        obtenerProductos();
      }
    } else {
      const { error } = await supabase.from("productos").insert([{ nombre, descripcion, precio, stock, categoria }]);
      if (!error) {
        Swal.fire("Guardado", "Producto guardado correctamente", "success");
        limpiarFormulario();
        obtenerProductos();
      }
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

    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (!error) {
      Swal.fire("Eliminado", "Producto eliminado correctamente", "success");
      obtenerProductos();
    }
  };

  const editarProducto = (producto) => {
    setEditandoId(producto.id);
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      precio: producto.precio,
      stock: producto.stock,
      categoria: producto.categoria || "",
    });
  };

  const limpiarFormulario = () => {
    setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "" });
    setEditandoId(null);
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Gestión de Inventario</h2>

      <input
        type="text"
        placeholder="Buscar producto"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />

      <h3>{editandoId ? "Editar Producto" : "Agregar Producto"}</h3>
      <input
        type="text"
        placeholder="Nombre"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      /><br />
      <input
        type="text"
        placeholder="Descripción"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      /><br />
      <input
        type="number"
        placeholder="Precio"
        value={form.precio}
        onChange={(e) => setForm({ ...form, precio: e.target.value })}
      /><br />
      <input
        type="number"
        placeholder="Stock"
        value={form.stock}
        onChange={(e) => setForm({ ...form, stock: e.target.value })}
      /><br />
      <input
        type="text"
        placeholder="Categoría"
        value={form.categoria}
        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
      /><br />
      <button onClick={guardarProducto}>
        {editandoId ? "Actualizar" : "Guardar"}
      </button>
      <button onClick={limpiarFormulario}>Cancelar</button>

      <h3>Lista de Productos</h3>
      <ul>
        {productosFiltrados.map((producto) => (
          <li key={producto.id}>
            <strong>{producto.nombre}</strong> - {producto.descripcion} - ${producto.precio} - Stock: {producto.stock} - {producto.categoria}
            <br />
            <button onClick={() => editarProducto(producto)} title="Editar">
              <FaEdit />
            </button>
            <button onClick={() => eliminarProducto(producto.id)} title="Eliminar">
              <FaTrash />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
