import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "" });
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const { data, error } = await supabase.from("clientes").select("*");
    if (data) setClientes(data);
    if (error) console.error("Error cargando clientes:", error);
  };

  const guardarCliente = async () => {
    const { nombre, email, telefono, direccion } = form;

    // ✅ Validaciones con SweetAlert
    if (!form.nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre es obligatorio", "warning");
    }
    if (form.email && !form.email.includes("@")) {
      return Swal.fire("Correo inválido", "Ingresa un correo válido", "error");
    }

    if (editando) {
      const { error } = await supabase
        .from("clientes")
        .update({ nombre, email, telefono, direccion })
        .eq("id", editando);
      if (!error) {
        Swal.fire("Actualizado", "Cliente actualizado correctamente", "success");
        setEditando(null);
        setForm({ nombre: "", email: "", telefono: "", direccion: "" });
        cargarClientes();
      }
    } else {
      const { error } = await supabase.from("clientes").insert([{ nombre, email, telefono, direccion }]);
      if (!error) {
        Swal.fire("Guardado", "Cliente guardado correctamente", "success");
        setForm({ nombre: "", email: "", telefono: "", direccion: "" });
        cargarClientes();
      }
    }
  };

  const eliminarCliente = async (id) => {
    // ✅ Confirmación con SweetAlert
    const confirmar = await Swal.fire({
      title: "¿Eliminar este cliente?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (!error) {
      Swal.fire("Eliminado", "Cliente eliminado correctamente", "success");
      cargarClientes();
    }
  };

  const editarCliente = (cliente) => {
    setEditando(cliente.id);
    setForm({
      nombre: cliente.nombre,
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
    });
  };

  const filtrados = clientes.filter((c) =>
    [c.nombre, c.telefono, c.email].some((campo) =>
      campo?.toLowerCase().includes(buscar.toLowerCase())
    )
  );

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Gestión de Clientes</h2>

      <div>
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      <h3>{editando ? "Editar Cliente" : "Agregar Cliente"}</h3>
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
        type="text"
        placeholder="Teléfono"
        value={form.telefono}
        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
      /><br />
      <input
        type="text"
        placeholder="Dirección"
        value={form.direccion}
        onChange={(e) => setForm({ ...form, direccion: e.target.value })}
      /><br />
      <button onClick={guardarCliente}>{editando ? "Actualizar" : "Guardar"}</button>

      <h3>Lista de Clientes</h3>
      <ul>
        {filtrados.map((cliente) => (
          <li key={cliente.id}>
            <strong>{cliente.nombre}</strong> - {cliente.email} - {cliente.telefono}
            <br />
            {/* ✅ Botones con íconos */}
            <button onClick={() => editarCliente(cliente)} title="Editar">
              <FaEdit />
            </button>
            <button onClick={() => eliminarCliente(cliente.id)} title="Eliminar">
              <FaTrash />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Clientes;
