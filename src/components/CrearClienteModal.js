import React, { useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";

const CrearClienteModal = ({ onClienteCreado, onClose }) => {
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    direccion: "",
    email: ""
  });

  const guardarCliente = async () => {
    const { nombre, identificacion, telefono, direccion, email } = form;
    if (!nombre || !identificacion || !telefono) {
      return Swal.fire("Campos requeridos", "Nombre, identificación y teléfono son obligatorios.", "warning");
    }

    // ✅ Verificar si ya existe cliente con esa identificación
    const { data: existentes, error: errorExistentes } = await supabase
      .from("clientes")
      .select("id")
      .eq("identificacion", identificacion);

    if (errorExistentes) {
      console.error("Error buscando duplicados:", errorExistentes);
      return Swal.fire("Error", "Problema verificando cliente existente.", "error");
    }

    if (existentes && existentes.length > 0) {
      return Swal.fire("Ya existe", "Ya hay un cliente con esa identificación.", "warning");
    }

    // ✅ Consultar códigos existentes para generar uno nuevo
    const { data: clientesExistentes } = await supabase
      .from("clientes")
      .select("codigo");

    const codigos = clientesExistentes
      .map(c => c.codigo)
      .filter(Boolean)
      .filter(c => c.startsWith("C") && !isNaN(parseInt(c.slice(1))))
      .map(c => parseInt(c.slice(1)));

    const siguiente = Math.max(...codigos, 1000) + 1;
    const nuevoCodigo = `C${siguiente}`;

    // ✅ Insertar nuevo cliente
    const { data, error } = await supabase
      .from("clientes")
      .insert([{ codigo: nuevoCodigo, nombre, identificacion, telefono, direccion, email }])
      .select();

    if (!error && data?.length) {
      Swal.fire("Cliente creado", "El cliente fue guardado correctamente", "success");
      onClienteCreado(data[0]);
      onClose();
    } else {
      console.error("Error al guardar:", error);
      Swal.fire("Error", "No se pudo guardar el cliente", "error");
    }
  };

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h2>Nuevo Cliente</h2>
        <input
          type="text"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <input
          type="text"
          placeholder="Identificación"
          value={form.identificacion}
          onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        />
        <input
          type="text"
          placeholder="Dirección"
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <button onClick={guardarCliente}>Guardar</button>
        <button onClick={onClose} style={{ background: "#f44336", color: "white", marginTop: "10px" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CrearClienteModal;
