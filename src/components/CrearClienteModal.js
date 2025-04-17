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
    const { nombre, identificacion, telefono } = form;
    if (!nombre || !identificacion || !telefono) {
      return Swal.fire("Campos requeridos", "Nombre, identificación y teléfono son obligatorios.", "warning");
    }

    const { data: clientesExistentes } = await supabase.from("clientes").select("codigo");
    const codigos = clientesExistentes
      .map(c => c.codigo)
      .filter(Boolean)
      .filter(c => c.startsWith("C") && !isNaN(parseInt(c.slice(1))))
      .map(c => parseInt(c.slice(1)));

    const siguiente = Math.max(...codigos, 1000) + 1;
    const nuevoCodigo = `C${siguiente}`;

    const { data, error } = await supabase.from("clientes").insert([{ ...form, codigo: nuevoCodigo }]).select();

    if (!error && data?.length) {
      Swal.fire("Cliente creado", "El cliente fue guardado correctamente", "success");
      onClienteCreado(data[0]); // pasa el cliente nuevo al módulo padre
      onClose();
    } else {
      console.error(error);
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
        <button onClick={onClose} style={{ background: "#f44336", color: "white", marginTop: "10px" }}>Cancelar</button>
      </div>
    </div>
  );
};

export default CrearClienteModal;
