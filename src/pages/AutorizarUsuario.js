import React, { useState } from "react";
import Swal from "sweetalert2";

export default function AutorizarUsuario() {
  const [codigo, setCodigo] = useState("");
  const [solicitud, setSolicitud] = useState(null);
  const [rol, setRol] = useState("vendedor");

  const buscarSolicitud = async () => {
    if (!codigo) return Swal.fire("Código requerido", "Ingresa el código enviado por correo", "warning");

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/usuarios/buscar-solicitud/${codigo}`);
      const data = await res.json();

      if (res.ok) {
        setSolicitud(data);
        Swal.fire("Solicitud encontrada", "Completa el proceso de autorización", "info");
      } else {
        Swal.fire("Error", data.error || "Código inválido", "error");
      }
    } catch (err) {
      Swal.fire("Error de conexión", "No se pudo conectar al servidor", "error");
    }
  };

  const autorizar = async () => {
    if (!solicitud) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/usuarios/autorizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, rol }),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire("Autorizado", "El usuario ha sido creado correctamente", "success");
        setSolicitud(null);
        setCodigo("");
      } else {
        Swal.fire("Error", data.error || "No se pudo autorizar", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Error al autorizar", "error");
    }
  };

  const rechazar = async () => {
    if (!solicitud) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/usuarios/rechazar/${codigo}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire("Rechazada", "Solicitud eliminada correctamente", "info");
        setSolicitud(null);
        setCodigo("");
      } else {
        Swal.fire("Error", data.error || "No se pudo rechazar", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Error al rechazar", "error");
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "auto", padding: "2rem", textAlign: "center" }}>
      <h2>Autorización de nuevos usuarios</h2>

      <input
        type="text"
        placeholder="Código recibido"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <button onClick={buscarSolicitud} style={{ marginBottom: "20px" }}>
        Buscar solicitud
      </button>

      {solicitud && (
        <div style={{ textAlign: "left", marginTop: "20px" }}>
          <p><strong>Nombre:</strong> {solicitud.nombre}</p>
          <p><strong>Usuario:</strong> {solicitud.usuario}</p>
          <p><strong>Correo:</strong> {solicitud.correo}</p>
          <p><strong>Identificación:</strong> {solicitud.identificacion}</p>

          <label>Rol a asignar:</label>
          <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ width: "100%", marginBottom: "10px" }}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>

          <button onClick={autorizar} style={{ marginRight: "10px", background: "green", color: "white", padding: "10px" }}>
            Autorizar
          </button>
          <button onClick={rechazar} style={{ background: "red", color: "white", padding: "10px" }}>
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
