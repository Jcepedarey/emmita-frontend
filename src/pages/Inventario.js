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

    if (!nombre || !precio || !stock) {
      return Swal.fire("Campos requeridos", "Nombre, precio y stock son obligatorios.", "warning");
    }
    if (precio < 0 || stock < 0) {
      return Swal.fire("Valores inválidos", "Precio y stock deben ser positivos.", "error");
    }

    const operacion = editandoId
      ? supabase.from("productos").update({ nombre, descripcion, precio, stock, categoria }).eq("id", editandoId)
      : supabase.from("productos").insert([{ nombre, descripcion, precio, stock, categoria }]);

    const { error } = await operacion;

    if (!error) {
      Swal.fire(editandoId ? "Actualizado" : "Guardado", `Producto ${editandoId ? "actualizado" : "guardado"} correctamente`, "success");
      setEditandoId(null);
      limpiarFormulario();
      obtenerProductos();
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
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Inventario</h2>

      <input
        type="text"
        placeholder="Buscar producto"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "1rem", fontSize: "1rem" }}
      />

      <h3 style={{ marginBottom: "1rem" }}>{editandoId ? "Editar Producto" : "Agregar Producto"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input type="text" placeholder="Nombre" value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          style={{ padding: "10px", fontSize: "1rem" }}
        />
        <input type="text" placeholder="Descripción" value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          style={{ padding: "10px", fontSize: "1rem" }}
        />
        <input type="number" placeholder="Precio" value={form.precio}
          onChange={(e) => setForm({ ...form, precio: e.target.value })}
          style={{ padding: "10px", fontSize: "1rem" }}
        />
        <input type="number" placeholder="Stock" value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          style={{ padding: "10px", fontSize: "1rem" }}
        />
        <input type="text" placeholder="Categoría" value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          style={{ padding: "10px", fontSize: "1rem" }}
        />
      </div>

      <button onClick={guardarProducto} style={{ width: "100%", padding: "12px", marginTop: "10px", fontSize: "1rem" }}>
        {editandoId ? "Actualizar" : "Guardar"}
      </button>
      <button onClick={limpiarFormulario} style={{ width: "100%", padding: "10px", fontSize: "1rem", marginTop: "8px" }}>
        Cancelar
      </button>

      <h3 style={{ marginTop: "2rem" }}>Lista de Productos</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {productosFiltrados.map((producto) => (
          <li key={producto.id} style={{
            marginBottom: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "12px"
          }}>
            <strong>{producto.nombre}</strong><br />
            {producto.descripcion}<br />
            💲 {producto.precio} | Stock: {producto.stock} | {producto.categoria}
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={() => editarProducto(producto)} title="Editar" style={{ marginRight: "10px" }}>
                <FaEdit />
              </button>
              <button onClick={() => eliminarProducto(producto.id)} title="Eliminar">
                <FaTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
