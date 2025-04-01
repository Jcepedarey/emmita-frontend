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

    // ✅ Validaciones con SweetAlert
    if (!nombre || !email || !password) {
      return Swal.fire("Campos requeridos", "Todos los campos son obligatorios.", "warning");
    }
    if (!email.includes("@")) {
      return Swal.fire("Correo inválido", "Ingresa un correo válido.", "error");
    }

    if (editando) {
      const { error } = await supabase
        .from("usuarios")
        .update({ nombre, email, password, rol })
        .eq("id", editando);
      if (!error) {
        Swal.fire("Actualizado", "Usuario actualizado correctamente", "success");
        setEditando(null);
        limpiar();
        cargarUsuarios();
      }
    } else {
      const { error } = await supabase.from("usuarios").insert([{ nombre, email, password, rol }]);
      if (!error) {
        Swal.fire("Creado", "Usuario creado correctamente", "success");
        limpiar();
        cargarUsuarios();
      }
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
    <div style={{ padding: "1rem" }}>
      <h2>Gestión de Usuarios</h2>

      <input
        type="text"
        placeholder="Buscar por nombre o correo"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />

      <h3>{editando ? "Editar Usuario" : "Crear Usuario"}</h3>
      <input
        type="text"
        placeholder="Nombre"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      /><br />
      <input
        type="email"
        placeholder="Correo"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      /><br />
      <input
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      /><br />
      <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
        <option value="vendedor">Vendedor</option>
        <option value="admin">Administrador</option>
      </select><br />
      <button onClick={guardarUsuario}>
        {editando ? "Actualizar" : "Guardar"}
      </button>
      <button onClick={limpiar}>Cancelar</button>

      <h3>Lista de Usuarios</h3>
      <ul>
        {filtrados.map((u) => (
          <li key={u.id}>
            <strong>{u.nombre}</strong> - {u.email} - Rol: {u.rol} - Contraseña: ******<br />
            <button onClick={() => editarUsuario(u)} title="Editar"><FaEdit /></button>
            <button onClick={() => eliminarUsuario(u.id)} title="Eliminar"><FaTrash /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
