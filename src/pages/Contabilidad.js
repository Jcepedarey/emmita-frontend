// src/pages/Contabilidad.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { exportarCSV } from "../utils/exportarCSV";
import { generarPDFContable } from "../utils/generarPDFContable";
import Swal from "sweetalert2";

const Contabilidad = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState({
    tipo: "ingreso",
    monto: "",
    descripcion: "",
    categoria: ""
  });

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const cargarMovimientos = async () => {
    const { data, error } = await supabase
      .from("movimientos_contables")
      .select("*")
      .order("fecha", { ascending: false });

    if (!error) setMovimientos(data);
    else console.error("❌ Error cargando movimientos:", error);
  };

  const guardarMovimiento = async () => {
    if (!form.monto || !form.tipo) return alert("Completa el tipo y monto");

    const nuevo = {
      ...form,
      monto: parseFloat(form.monto),
      fecha: new Date().toISOString().split("T")[0],
      estado: "activo",
    };

    const { error } = await supabase.from("movimientos_contables").insert([nuevo]);
    if (!error) {
      setForm({ tipo: "ingreso", monto: "", descripcion: "", categoria: "" });
      cargarMovimientos();
    } else {
      console.error("❌ Error al guardar:", error);
    }
  };

  const eliminarMovimiento = async (id) => {
    const { value: justificacion } = await Swal.fire({
      title: "¿Estás seguro?",
      input: "text",
      inputLabel: "Motivo de eliminación",
      inputPlaceholder: "Escribe una razón",
      inputValidator: (value) => {
        if (!value) return "Debes escribir una justificación";
      },
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!justificacion) return;

    const { error } = await supabase
      .from("movimientos_contables")
      .update({
        estado: "eliminado",
        justificacion,
        fecha_modificacion: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      Swal.fire("✅ Eliminado", "Movimiento marcado como eliminado", "success");
      cargarMovimientos();
    } else {
      console.error("❌ Error al eliminar movimiento:", error);
      Swal.fire("Error", "No se pudo eliminar el movimiento", "error");
    }
  };
  const editarMovimiento = async (movimiento) => {
    const { value: formValues } = await Swal.fire({
      title: "Editar movimiento",
      html:
        `<input id="swal-monto" class="swal2-input" placeholder="Monto" type="number" value="${movimiento.monto}">` +
        `<input id="swal-descripcion" class="swal2-input" placeholder="Descripción" value="${movimiento.descripcion || ''}">` +
        `<input id="swal-categoria" class="swal2-input" placeholder="Categoría" value="${movimiento.categoria || ''}">` +
        `<select id="swal-tipo" class="swal2-input">
          <option value="ingreso" ${movimiento.tipo === "ingreso" ? "selected" : ""}>Ingreso</option>
          <option value="gasto" ${movimiento.tipo === "gasto" ? "selected" : ""}>Gasto</option>
        </select>` +
        `<textarea id="swal-justificacion" class="swal2-textarea" placeholder="Justificación de la edición"></textarea>`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const monto = document.getElementById("swal-monto").value;
        const descripcion = document.getElementById("swal-descripcion").value;
        const categoria = document.getElementById("swal-categoria").value;
        const tipo = document.getElementById("swal-tipo").value;
        const justificacion = document.getElementById("swal-justificacion").value;
        if (!monto || !justificacion) {
          Swal.showValidationMessage("Monto y justificación son obligatorios");
          return false;
        }
        return { monto, descripcion, categoria, tipo, justificacion };
      },
    });
  
    if (!formValues) return;
  
    const { monto, descripcion, categoria, tipo, justificacion } = formValues;
    const { error } = await supabase
      .from("movimientos_contables")
      .update({
        monto: parseFloat(monto),
        descripcion,
        categoria,
        tipo,
        justificacion,
        fecha_modificacion: new Date().toISOString(),
        estado: "editado",
      })
      .eq("id", movimiento.id);
  
    if (!error) {
      Swal.fire("✅ Editado", "Movimiento actualizado correctamente", "success");
      cargarMovimientos();
    } else {
      console.error("❌ Error al editar movimiento:", error);
      Swal.fire("Error", "No se pudo editar el movimiento", "error");
    }
  };
  const movimientosFiltrados = filtro === "todos"
    ? movimientos
    : movimientos.filter((m) => m.tipo === filtro);

  const totalIngresos = movimientos
    .filter(m => m.tipo === "ingreso" && m.estado === "activo")
    .reduce((acc, m) => acc + m.monto, 0);

  const totalGastos = movimientos
    .filter(m => m.tipo === "gasto" && m.estado === "activo")
    .reduce((acc, m) => acc + m.monto, 0);

  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
        💰 Panel de Contabilidad
      </h2>

      <div style={{ marginTop: "1rem" }}>
        <h3>Agregar ingreso o gasto</h3>
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          style={{ width: "100%", marginBottom: 8, padding: "8px" }}
        >
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
        </select>
        <input
          type="number"
          placeholder="Monto"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          style={{ width: "100%", marginBottom: 8, padding: "8px" }}
        />
        <input
          type="text"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          style={{ width: "100%", marginBottom: 8, padding: "8px" }}
        />
        <input
          type="text"
          placeholder="Categoría (opcional)"
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          style={{ width: "100%", marginBottom: 8, padding: "8px" }}
        />
        <button
          onClick={guardarMovimiento}
          style={{ width: "100%", padding: "10px", backgroundColor: "#4caf50", color: "white" }}
        >
          Guardar movimiento
        </button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>Balance actual</h3>
        <p><strong>Total ingresos:</strong> ${totalIngresos.toFixed(2)}</p>
        <p><strong>Total gastos:</strong> ${totalGastos.toFixed(2)}</p>
        <p><strong>Balance:</strong> ${(totalIngresos - totalGastos).toFixed(2)}</p>

        <button onClick={() => exportarCSV(movimientos, "movimientos_contables")} style={{ marginTop: "10px", padding: "10px", width: "48%", marginRight: "2%" }}>
          Exportar CSV
        </button>
        <button onClick={() => generarPDFContable(movimientos)} style={{ padding: "10px", width: "48%" }}>
          Exportar PDF
        </button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>Historial de movimientos</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {movimientosFiltrados.map((m) => (
            <li
              key={m.id}
              style={{
                background: m.estado === "eliminado" ? "#ffe6e6" : "#fdfdfd",
                color: m.estado === "eliminado" ? "#b30000" : "#000",
                padding: "10px",
                borderBottom: "1px solid #ccc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <strong>{m.tipo.toUpperCase()}</strong>: ${m.monto} – {m.descripcion || "Sin descripción"} – {m.fecha?.split("T")[0]}
                {m.estado === "eliminado" && m.justificacion ? (
                  <em style={{ display: "block", fontSize: "0.8rem" }}>Justificación: {m.justificacion}</em>
                ) : null}
              </span>

              {m.estado === "activo" && (
  <div style={{ display: "flex", gap: "8px" }}>
    <button
      onClick={() => editarMovimiento(m)}
      title="Editar movimiento"
      style={{
        background: "#2196f3",
        color: "white",
        border: "none",
        borderRadius: "5px",
        padding: "4px 10px",
        cursor: "pointer"
      }}
    >
      ✏️
    </button>
    <button
      onClick={() => eliminarMovimiento(m.id)}
      title="Eliminar movimiento"
      style={{
        background: "#f44336",
        color: "white",
        border: "none",
        borderRadius: "5px",
        padding: "4px 10px",
        cursor: "pointer"
      }}
    >
      🗑️
    </button>
  </div>
)}
</li>
))} {/* Fin del map */}
</ul>
</div>
</div>
);
};

export default Contabilidad;