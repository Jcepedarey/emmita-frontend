import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { exportarCSV } from "../utils/exportarCSV";
import Protegido from "../components/Protegido"; // 🔐 Protección

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Reportes() {
  <Protegido />; // ⛔ Redirige si no hay sesión activa

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
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>Reportes y Estadísticas</h2>

      <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
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
        <button onClick={guardarReporte} style={{ width: "100%", padding: "10px", marginBottom: "1.5rem" }}>
          Guardar
        </button>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <h3>Resumen</h3>
        <p><strong>Ingresos:</strong> ${totalIngresos.toFixed(2)}</p>
        <p><strong>Gastos:</strong> ${totalGastos.toFixed(2)}</p>
        <p><strong>Balance:</strong> ${(totalIngresos - totalGastos).toFixed(2)}</p>
        <button onClick={() => exportarCSV(reportes, "reporte_financiero")} style={{ width: "100%", marginTop: "10px", padding: "10px" }}>
          Exportar a Excel (CSV)
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "2rem" }}>
        <div style={{ background: "#f8f8f8", padding: "1rem", borderRadius: "10px" }}>
          <h4 style={{ textAlign: "center" }}>Balance Gráfico</h4>
          <Pie
            data={{
              labels: ["Ingresos", "Gastos"],
              datasets: [{
                data: [totalIngresos, totalGastos],
                backgroundColor: ["#4caf50", "#f44336"],
              }],
            }}
            options={{ responsive: true }}
          />
        </div>

        <div style={{ background: "#f8f8f8", padding: "1rem", borderRadius: "10px" }}>
          <h4 style={{ textAlign: "center" }}>Productos más alquilados</h4>
          <Bar
            data={{
              labels: productosMasUsados.map(p => p.nombre),
              datasets: [{
                label: "Cantidad alquilada",
                data: productosMasUsados.map(p => p.cantidad),
                backgroundColor: "#2196f3",
              }],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "#333" } },
                y: { ticks: { color: "#333" } },
              },
            }}
          />
        </div>
      </div>

      <h3>Listado de ingresos/gastos</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {reportes.map((r) => (
          <li key={r.id} style={{
            padding: "10px",
            borderBottom: "1px solid #ccc",
            background: "#fdfdfd"
          }}>
            <strong>{r.tipo.toUpperCase()}</strong>: ${r.monto} - {r.descripcion || "Sin descripción"} - {r.fecha?.split("T")[0]}
          </li>
        ))}
      </ul>
    </div>
  );
}
