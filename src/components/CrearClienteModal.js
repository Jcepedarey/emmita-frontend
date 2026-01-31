// src/components/CrearClienteModal.js
import React, { useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import "../estilos/ModalesEstilo.css";

const CrearClienteModal = ({ onClienteCreado, onClose }) => {
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    direccion: "",
    email: ""
  });
  const [guardando, setGuardando] = useState(false);

  const guardarCliente = async () => {
    const { nombre, identificacion, telefono, direccion, email } = form;

    if (!nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre del cliente es obligatorio.", "warning");
    }

    setGuardando(true);

    const clienteCompleto = {
      nombre: nombre.trim(),
      identificacion: identificacion?.trim() || null,
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
      email: email?.trim() || null,
      codigo: ""
    };

    // Verificar si ya existe cliente con esa identificación
    if (clienteCompleto.identificacion) {
      const { data: existentes, error: errorExistentes } = await supabase
        .from("clientes")
        .select("id")
        .eq("identificacion", clienteCompleto.identificacion);

      if (errorExistentes) {
        console.error("Error buscando duplicados:", errorExistentes);
        setGuardando(false);
        return Swal.fire("Error", "Problema verificando cliente existente.", "error");
      }

      if (existentes && existentes.length > 0) {
        setGuardando(false);
        return Swal.fire("Ya existe", "Ya hay un cliente con esa identificación.", "warning");
      }
    }

    // Generar código de cliente
    const { data: clientesExistentes } = await supabase
      .from("clientes")
      .select("codigo");

    const codigos = (clientesExistentes || [])
      .map(c => c.codigo)
      .filter(Boolean)
      .filter(c => c.startsWith("C") && !isNaN(parseInt(c.slice(1))))
      .map(c => parseInt(c.slice(1)));

    const siguiente = Math.max(...codigos, 1000) + 1;
    clienteCompleto.codigo = `C${siguiente}`;

    // Insertar nuevo cliente
    const { data, error } = await supabase
      .from("clientes")
      .insert([clienteCompleto])
      .select();

    setGuardando(false);

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-contenedor ancho-medio" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header header-verde">
          <h2>👤 Nuevo Cliente</h2>
          <button className="btn-cerrar-modal" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          
          {/* Nombre - Campo principal */}
          <div className="modal-seccion">
            <label className="modal-label">Nombre completo: <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="modal-input"
              autoFocus
            />
          </div>

          {/* Identificación y Teléfono */}
          <div className="modal-seccion">
            <div className="form-grid form-grid-2">
              <div>
                <label className="modal-label">Identificación:</label>
                <input
                  type="text"
                  placeholder="Cédula o NIT"
                  value={form.identificacion}
                  onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                  className="modal-input"
                />
              </div>
              <div>
                <label className="modal-label">Teléfono:</label>
                <input
                  type="text"
                  placeholder="Número de contacto"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="modal-input"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="modal-seccion">
            <label className="modal-label">Dirección:</label>
            <input
              type="text"
              placeholder="Dirección del cliente"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="modal-input"
            />
          </div>

          {/* Email */}
          <div className="modal-seccion">
            <label className="modal-label">Correo electrónico:</label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="modal-input"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer footer-espaciado">
          <button onClick={onClose} className="btn-modal btn-secundario">
            Cancelar
          </button>
          <button 
            onClick={guardarCliente} 
            className="btn-modal btn-verde"
            disabled={guardando}
          >
            {guardando ? "⏳ Guardando..." : "💾 Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearClienteModal;