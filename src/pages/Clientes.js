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
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Clientes</h2>

      <input
        type="text"
        placeholder="Buscar por nombre, email o teléfono"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "1rem" }}
      />

      <h3>{editando ? "Editar Cliente" : "Agregar Cliente"}</h3>
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
        type="text"
        placeholder="Teléfono"
        value={form.telefono}
        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      />
      <input
        type="text"
        placeholder="Dirección"
        value={form.direccion}
        onChange={(e) => setForm({ ...form, direccion: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      />
      <button onClick={guardarCliente} style={{ width: "100%", padding: "10px", marginBottom: "1rem" }}>
        {editando ? "Actualizar" : "Guardar"}
      </button>

      <h3 style={{ marginTop: "2rem" }}>Lista de Clientes</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {filtrados.map((cliente) => (
          <li key={cliente.id} style={{
            marginBottom: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "10px"
          }}>
            <strong>{cliente.nombre}</strong><br />
            📧 {cliente.email || "Sin correo"}<br />
            📞 {cliente.telefono || "Sin teléfono"}<br />
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={() => editarCliente(cliente)} title="Editar" style={{ marginRight: "10px" }}>
                <FaEdit />
              </button>
              <button onClick={() => eliminarCliente(cliente.id)} title="Eliminar">
                <FaTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Clientes;
