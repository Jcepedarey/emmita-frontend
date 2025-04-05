import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "vendedor" });
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (data) setUsuarios(data);
    if (error) console.error("Error al obtener usuarios:", error);
  };

  const guardarUsuario = async () => {
    const { nombre, email, password, rol } = form;

    if (!nombre || !email || !password) {
      return Swal.fire("Campos requeridos", "Todos los campos son obligatorios.", "warning");
    }
    if (!email.includes("@")) {
      return Swal.fire("Correo inválido", "Ingresa un correo válido.", "error");
    }

    const operacion = editando
      ? supabase.from("usuarios").update({ nombre, email, password, rol }).eq("id", editando)
      : supabase.from("usuarios").insert([{ nombre, email, password, rol }]);

    const { error } = await operacion;

    if (!error) {
      Swal.fire(editando ? "Actualizado" : "Creado", `Usuario ${editando ? "actualizado" : "creado"} correctamente`, "success");
      setEditando(null);
      limpiar();
      cargarUsuarios();
    }
  };

  const eliminarUsuario = async (id) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar este usuario?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmar.isConfirmed) return;

    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    if (!error) {
      Swal.fire("Eliminado", "Usuario eliminado correctamente", "success");
      cargarUsuarios();
    }
  };

  const editarUsuario = (usuario) => {
    setEditando(usuario.id);
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      password: usuario.password,
      rol: usuario.rol,
    });
  };

  const limpiar = () => {
    setForm({ nombre: "", email: "", password: "", rol: "vendedor" });
    setEditando(null);
  };

  const filtrados = usuarios.filter((u) =>
    [u.nombre, u.email].some((campo) =>
      campo?.toLowerCase().includes(buscar.toLowerCase())
    )
  );

  return (
    <div style={{ padding: "1rem", maxWidth: "650px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Usuarios</h2>

      <input
        type="text"
        placeholder="Buscar por nombre o correo"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "1rem" }}
      />

      <h3>{editando ? "Editar Usuario" : "Crear Usuario"}</h3>
      <input
        type="text"
        placeholder="Nombre"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      />
      <input
        type="email"
        placeholder="Correo"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      />
      <select
        value={form.rol}
        onChange={(e) => setForm({ ...form, rol: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      >
        <option value="vendedor">Vendedor</option>
        <option value="admin">Administrador</option>
      </select>
      <button onClick={guardarUsuario} style={{ width: "100%", padding: "10px", marginBottom: "8px" }}>
        {editando ? "Actualizar" : "Guardar"}
      </button>
      <button onClick={limpiar} style={{ width: "100%", padding: "8px" }}>Cancelar</button>

      <h3 style={{ marginTop: "2rem" }}>Lista de Usuarios</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {filtrados.map((u) => (
          <li key={u.id} style={{
            marginBottom: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "10px",
            background: "#f9f9f9"
          }}>
            <strong>{u.nombre}</strong><br />
            📧 {u.email}<br />
            🔐 Contraseña: ******<br />
            🧩 Rol: {u.rol}
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={() => editarUsuario(u)} title="Editar" style={{ marginRight: "10px" }}>
                <FaEdit />
              </button>
              <button onClick={() => eliminarUsuario(u.id)} title="Eliminar">
                <FaTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
