import React, { useState, useEffect, useRef } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";
import Papa from "papaparse";
import Protegido from "../components/Protegido";
import { useNavigationState } from "../context/NavigationContext";
import useLimites from "../hooks/useLimites";

export default function Clientes() {
  const { saveModuleState, getModuleState } = useNavigationState();

  // ✅ Cargar estado guardado solo una vez
  const estadoGuardado = useRef(getModuleState("/clientes")).current;

  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState(estadoGuardado?.buscar || "");
  const [form, setForm] = useState(estadoGuardado?.form || {
    nombre: "",
    identificacion: "",
    telefono: "",
    direccion: "",
    email: ""
  });
  const [editando, setEditando] = useState(estadoGuardado?.editando || null);
  const [mostrarFormulario, setMostrarFormulario] = useState(estadoGuardado?.mostrarFormulario || false);
const { puedeCrearCliente, mensajeBloqueo } = useLimites();

  // ✅ GUARDAR ESTADO
  useEffect(() => {
    const estadoActual = {
      buscar,
      form,
      editando,
      mostrarFormulario
    };
    
    saveModuleState("/clientes", estadoActual);
  }, [
    buscar,
    JSON.stringify(form),
    editando,
    mostrarFormulario,
    saveModuleState
  ]);

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
    // ✅ Verificar límites del plan
    if (!editando && !puedeCrearCliente()) {
      const msg = mensajeBloqueo("cliente");
      return Swal.fire(msg.titulo, msg.mensaje, msg.icono);
    }
    
    const { nombre, identificacion, telefono, direccion, email } = form;

    if (!nombre.trim()) {
      return Swal.fire("Campo requerido", "El nombre del cliente es obligatorio.", "warning");
    }

    const clienteCompleto = {
      nombre: nombre.trim(),
      identificacion: identificacion?.trim() || null,
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
      email: email?.trim() || null
    };

    const { data: existentes, error: errorExistentes } = await supabase
      .from("clientes")
      .select("id")
      .eq("identificacion", clienteCompleto.identificacion);

    if (errorExistentes) {
      console.error("Error buscando duplicados:", errorExistentes);
      return Swal.fire("Error", "Problema verificando cliente existente.", "error");
    }

    if (existentes && existentes.length > 0 && !editando) {
      return Swal.fire("Ya existe", "Ya hay un cliente con esa identificación.", "warning");
    }

    if (editando) {
      const { error } = await supabase
        .from("clientes")
        .update(clienteCompleto)
        .eq("id", editando);

      if (!error) {
        Swal.fire("Actualizado", "Cliente actualizado correctamente.", "success");
        setEditando(null);
        setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" });
        setMostrarFormulario(false);
        cargarClientes();
      } else {
        console.error("Error al actualizar:", error);
        Swal.fire("Error", "No se pudo actualizar el cliente.", "error");
      }
    } else {
      const nuevoCodigo = generarCodigoCliente();
      if (!nuevoCodigo) return;

      const { error } = await supabase
        .from("clientes")
        .insert([{ codigo: nuevoCodigo, ...clienteCompleto }]);

      if (!error) {
        Swal.fire("Guardado", "Cliente guardado correctamente.", "success");
        setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" });
        setMostrarFormulario(false);
        cargarClientes();
      } else {
        console.error("Error al guardar:", error);
        Swal.fire("Error", "No se pudo guardar el cliente.", "error");
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
      email: cliente.email || ""
    });
    setMostrarFormulario(true);
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

  const exportarCSV = () => {
    if (clientes.length === 0) {
      Swal.fire("Sin datos", "No hay clientes para exportar.", "info");
      return;
    }
    const csv = Papa.unparse(clientes, { delimiter: ";" });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtrados = clientes.filter((c) =>
    [c.codigo, c.nombre, c.telefono, c.direccion, c.email]
      .some((campo) => campo?.toLowerCase().includes(buscar.toLowerCase()))
  );

  return (
    <Protegido>
      <div style={{ padding: "1rem", maxWidth: "650px", margin: "auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Gestión de Clientes</h2>

        <button
          onClick={() => {
            setEditando(null);
            setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" });
            setMostrarFormulario(true);
          }}
          style={{ margin: "10px 0", padding: "10px", background: "#ccc", borderRadius: "5px" }}
        >
          ➕ Agregar
        </button>

        <button
          onClick={exportarCSV}
          style={{ margin: "10px 0 20px 10px", padding: "10px", background: "#4caf50", color: "#fff", borderRadius: "5px" }}
        >
          📊 Exportar CSV
        </button>

        {mostrarFormulario && (
          <>
            <h3>{editando ? "Editar Cliente" : "Agregar Cliente"}</h3>
            <input type="text" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }} />
            <input type="text" placeholder="Identificación" value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }} />
            <input type="text" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }} />
            <input type="text" placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }} />
            <input type="email" placeholder="Correo electrónico" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "0.5rem" }} />
            <button onClick={guardarCliente} style={{ width: "100%", padding: "10px", marginBottom: "8px" }}>{editando ? "Actualizar" : "Guardar"}</button>
            <button onClick={() => { setEditando(null); setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" }); setMostrarFormulario(false); }} style={{ width: "100%", padding: "8px", marginBottom: "1rem", background: "#eee" }}>Cancelar</button>
          </>
        )}

        {/* 🔍 Buscador debajo del formulario */}
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="text"
            placeholder="Buscar cliente"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        {buscar && filtrados.length > 0 && (
          <>
            <h3 style={{ marginTop: "1.5rem" }}>Resultados</h3>
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
                  📧 {c.email}
                  <div style={{ marginTop: "0.5rem" }}>
                    <button onClick={() => editarCliente(c)} style={{ marginRight: "10px" }}><FaEdit /></button>
                    <button onClick={() => eliminarCliente(c.id)}><FaTrash /></button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Protegido>
  );
}