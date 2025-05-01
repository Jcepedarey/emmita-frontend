// src/pages/Contabilidad.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { exportarCSV } from "../utils/exportarCSV";
import { generarPDFContable } from "../utils/generarPDFContable";

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
    </div>
  );
};

export default Contabilidad;
