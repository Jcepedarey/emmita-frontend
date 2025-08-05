import * as XLSX from "xlsx";
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";
import Papa from "papaparse";
import Protegido from "../components/Protegido"; // 🔐 Protección

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "" });
  const [buscar, setBuscar] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarTodo, setMostrarTodo] = useState(false);

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
    setMostrarFormulario(true);
  };

  const limpiarFormulario = () => {
    setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "" });
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const productosFiltrados = productos.filter((p) => {
    if (mostrarTodo) return true;
    const coincideTexto = buscar && p.nombre.toLowerCase().includes(buscar.toLowerCase());
    const coincideCategoria = categoriaFiltro && p.categoria?.toLowerCase() === categoriaFiltro.toLowerCase();
    return coincideTexto || coincideCategoria;
  });

  const categoriasUnicas = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];

  const exportarCSV = () => {
    if (productos.length === 0) {
      Swal.fire("Sin datos", "No hay productos para exportar.", "info");
      return;
    }
    const csv = Papa.unparse(productos, { delimiter: ";" });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "inventario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importarDesdeArchivo = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const productosValidos = json.filter((p) =>
        p.nombre &&
        p.categoria &&
        !isNaN(parseFloat(p.precio)) &&
        !isNaN(parseFloat(p.stock)) &&
        parseFloat(p.precio) >= 0 &&
        parseFloat(p.stock) >= 0
      );
      const productosPreparados = productosValidos.map((p) => ({
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        precio: parseFloat(p.precio),
        stock: parseInt(p.stock, 10),
        categoria: p.categoria
      }));
      if (productosPreparados.length === 0) {
        Swal.fire("Archivo inválido", "No se encontraron productos válidos para importar.", "error");
        return;
      }
      const { error } = await supabase.from("productos").insert(productosPreparados);
      if (error) {
        console.error(error);
        Swal.fire("Error", "No se pudieron guardar los productos.", "error");
      } else {
        Swal.fire("Importación exitosa", `${productosPreparados.length} productos fueron agregados.`, "success");
        obtenerProductos();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error al leer el archivo", "Verifica que sea un archivo Excel válido.", "error");
    }
  };

  const borrarTodo = async () => {
    const confirmacion = await Swal.fire({
      title: "¿Eliminar todo el stock?",
      text: "Esta acción borrará TODOS los productos del sistema y no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todo",
      cancelButtonText: "Cancelar"
    });
    if (confirmacion.isConfirmed) {
      const { error } = await supabase.from("productos").delete().neq("id", 0);
      if (!error) {
        Swal.fire("Inventario eliminado", "Todos los productos fueron eliminados.", "success");
        obtenerProductos();
      } else {
        Swal.fire("Error", "No se pudo eliminar el inventario.", "error");
      }
    }
  };

  return (
    <Protegido>
      <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Inventario</h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
          <button onClick={() => { limpiarFormulario(); setMostrarFormulario(true); }} style={{ padding: "10px", background: "#ccc", borderRadius: "5px" }}>
            ➕ Agregar
          </button>
          <button onClick={exportarCSV} style={{ padding: "10px", background: "#4caf50", color: "#fff", borderRadius: "5px" }}>
            📁 Exportar CSV
          </button>
          <button onClick={() => document.getElementById("archivoExcel").click()} style={{ padding: "10px", background: "#2196f3", color: "#fff", borderRadius: "5px" }}>
            📥 Importar desde Excel
          </button>
          <button onClick={() => { setBuscar(""); setCategoriaFiltro(""); setMostrarTodo(true); }} style={{ padding: "10px", background: "#795548", color: "#fff", borderRadius: "5px" }}>
            📋 Ver todo el stock
          </button>
          <button onClick={borrarTodo} style={{ padding: "10px", background: "#f44336", color: "#fff", borderRadius: "5px" }}>
            🗑️ Borrar todo el inventario
          </button>
        </div>

        <input type="file" accept=".xlsx,.xls,.csv" onChange={importarDesdeArchivo} id="archivoExcel" style={{ display: "none" }} />

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input type="text" placeholder="Buscar por nombre" value={buscar} onChange={(e) => { setBuscar(e.target.value); setMostrarTodo(false); }} />
          <select value={categoriaFiltro} onChange={(e) => { setCategoriaFiltro(e.target.value); setMostrarTodo(false); }}>
            <option value="">Filtrar por categoría</option>
            {categoriasUnicas.map((cat, idx) => (<option key={idx} value={cat}>{cat}</option>))}
          </select>
        </div>

        {mostrarFormulario && (
          <>
            <h3 style={{ marginTop: "2rem" }}>{editandoId ? "Editar Producto" : "Agregar Producto"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1rem" }}>
              <input type="text" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <input type="text" placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              <input type="number" placeholder="Precio" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              <input type="text" placeholder="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </div>
            <button onClick={guardarProducto} style={{ padding: "10px", width: "100%", background: "#2196f3", color: "#fff" }}>
              {editandoId ? "Actualizar" : "Guardar"}
            </button>
            <button onClick={limpiarFormulario} style={{ padding: "10px", width: "100%", marginTop: "8px", background: "#eee" }}>
              Cancelar
            </button>
          </>
        )}

        {productosFiltrados.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3>Resultados</h3>
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
        )}
      </div>
    </Protegido>
  );
}
