import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { exportarCSV } from "../utils/exportarCSV"; // ✅ Importación

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Reportes() {
  const [reportes, setReportes] = useState([]);
  const [form, setForm] = useState({ tipo: "ingreso", monto: "", descripcion: "" });
  const [productosMasUsados, setProductosMasUsados] = useState([]);

  useEffect(() => {
    cargarReportes();
    cargarProductosFrecuentes();
  }, []);

  const cargarReportes = async () => {
    const { data } = await supabase.from("reportes").select("*").order("fecha", { ascending: false });
    if (data) setReportes(data);
  };

  const cargarProductosFrecuentes = async () => {
    const { data: ordenes } = await supabase.from("ordenes_pedido").select("productos");
    const conteo = {};
    ordenes?.forEach((orden) => {
      orden.productos.forEach((p) => {
        conteo[p.nombre] = (conteo[p.nombre] || 0) + p.cantidad;
      });
    });
    const top = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));
    setProductosMasUsados(top);
  };

  const guardarReporte = async () => {
    const { tipo, monto, descripcion } = form;
    if (!monto) return alert("Debes ingresar un monto");
    const { error } = await supabase.from("reportes").insert([{ tipo, monto, descripcion }]);
    if (!error) {
      setForm({ tipo: "ingreso", monto: "", descripcion: "" });
      cargarReportes();
    }
  };

  const totalIngresos = reportes.filter(r => r.tipo === "ingreso").reduce((acc, r) => acc + parseFloat(r.monto), 0);
  const totalGastos = reportes.filter(r => r.tipo === "gasto").reduce((acc, r) => acc + parseFloat(r.monto), 0);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Reportes y Estadísticas</h2>

      <h3>Agregar ingreso o gasto</h3>
      <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
        <option value="ingreso">Ingreso</option>
        <option value="gasto">Gasto</option>
      </select><br />
      <input
        type="number"
        placeholder="Monto"
        value={form.monto}
        onChange={(e) => setForm({ ...form, monto: e.target.value })}
      /><br />
      <input
        type="text"
        placeholder="Descripción"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      /><br />
      <button onClick={guardarReporte}>Guardar</button>

      <h3>Resumen</h3>
      <p><strong>Total ingresos:</strong> ${totalIngresos.toFixed(2)}</p>
      <p><strong>Total gastos:</strong> ${totalGastos.toFixed(2)}</p>
      <p><strong>Balance:</strong> ${(totalIngresos - totalGastos).toFixed(2)}</p>

      {/* ✅ Botón para exportar a Excel */}
      <button onClick={() => exportarCSV(reportes, "reporte_financiero")}>
        Exportar a Excel (CSV)
      </button>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginTop: "2rem" }}>
        <div style={{ width: "300px" }}>
          <h4>Balance Gráfico</h4>
          <Pie
            data={{
              labels: ["Ingresos", "Gastos"],
              datasets: [
                {
                  data: [totalIngresos, totalGastos],
                  backgroundColor: ["#4caf50", "#f44336"],
                },
              ],
            }}
          />
        </div>

        <div style={{ width: "400px" }}>
          <h4>Productos más alquilados</h4>
          <Bar
            data={{
              labels: productosMasUsados.map(p => p.nombre),
              datasets: [
                {
                  label: "Cantidad alquilada",
                  data: productosMasUsados.map(p => p.cantidad),
                  backgroundColor: "#2196f3",
                },
              ],
            }}
          />
        </div>
      </div>

      <h3>Listado de ingresos/gastos</h3>
      <ul>
        {reportes.map((r) => (
          <li key={r.id}>
            <strong>{r.tipo.toUpperCase()}</strong>: ${r.monto} - {r.descripcion || "Sin descripción"} - {r.fecha?.split("T")[0]}
          </li>
        ))}
      </ul>
    </div>
  );
}
