import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    direccion: "",
    correo: ""
  });
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("id", { ascending: true });
    if (data) setClientes(data);
  };

  const generarCodigoCliente = () => {
    const codigos = clientes
      .map(c => c.codigo)
      .filter(Boolean)
      .filter(c => c.startsWith("C") && !isNaN(parseInt(c.slice(1))))
      .map(c => parseInt(c.slice(1)));

    const siguiente = Math.max(...codigos, 1000) + 1;
    if (siguiente > 9999) {
      Swal.fire("Límite alcanzado", "No se pueden generar más códigos de cliente", "error");
      return null;
    }
    return `C${siguiente}`;
  };

  const guardarCliente = async () => {
    const { nombre, identificacion, telefono, direccion, correo } = form;
    if (!nombre || !identificacion || !telefono) {
      return Swal.fire("Campos requeridos", "Nombre, identificación y teléfono son obligatorios.", "warning");
    }

    if (editando) {
      const { error } = await supabase.from("clientes")
        .update({ nombre, identificacion, telefono, direccion, correo })
        .eq("id", editando);
      if (!error) {
        Swal.fire("Actualizado", "Cliente actualizado correctamente.", "success");
        setEditando(null);
        setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", correo: "" });
        cargarClientes();
      }
    } else {
      const nuevoCodigo = generarCodigoCliente();
      if (!nuevoCodigo) return;

      const { error } = await supabase.from("clientes")
        .insert([{ codigo: nuevoCodigo, nombre, identificacion, telefono, direccion, correo }]);

      if (!error) {
        Swal.fire("Guardado", "Cliente guardado correctamente.", "success");
        setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", correo: "" });
        cargarClientes();
      }
    }
  };

  const editarCliente = (cliente) => {
    setEditando(cliente.id);
    setForm({
      nombre: cliente.nombre,
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      correo: cliente.correo || ""
    });
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
      Swal.fire("Eliminado", "Cliente eliminado correctamente.", "success");
      cargarClientes();
    }
  };

  const filtrados = clientes.filter((c) =>
    [c.codigo, c.nombre, c.telefono, c.direccion, c.correo]
      .some((campo) => campo?.toLowerCase().includes(buscar.toLowerCase()))
  );

  return (
    <div style={{ padding: "1rem", maxWidth: "650px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Clientes</h2>

      <input
        type="text"
        placeholder="Buscar cliente"
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
        type="text"
        placeholder="Identificación"
        value={form.identificacion}
        onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
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
      <input
        type="email"
        placeholder="Correo electrónico"
        value={form.correo}
        onChange={(e) => setForm({ ...form, correo: e.target.value })}
        style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }}
      />

      <button onClick={guardarCliente} style={{ width: "100%", padding: "10px", marginBottom: "8px" }}>
        {editando ? "Actualizar" : "Guardar"}
      </button>
      <button onClick={() => {
        setEditando(null);
        setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", correo: "" });
      }} style={{ width: "100%", padding: "8px", marginBottom: "1rem" }}>Cancelar</button>

      <h3 style={{ marginTop: "1.5rem" }}>Lista de Clientes</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {filtrados.map((c) => (
          <li key={c.id} style={{
            marginBottom: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "10px",
            background: "#f9f9f9"
          }}>
            <strong>{c.codigo || "Sin código"}</strong><br />
            {c.nombre}<br />
            🆔 {c.identificacion}<br />
            📞 {c.telefono}<br />
            📍 {c.direccion}<br />
            📧 {c.correo}
            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={() => editarCliente(c)} style={{ marginRight: "10px" }}><FaEdit /></button>
              <button onClick={() => eliminarCliente(c.id)}><FaTrash /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
