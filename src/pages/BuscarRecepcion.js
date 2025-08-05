import React, { useState, useEffect } from "react";
import supabase from "../supabase";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido"; // 🔐 Protección

export default function BuscarRecepcion() {

  const [cliente, setCliente] = useState("");
  const [inicio, setInicio] = useState(null);
  const [fin, setFin] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const navigate = useNavigate();

  const limite = 20;

  const buscarRecepciones = async (paginaActual = 1) => {
    const desde = (paginaActual - 1) * limite;
    const hasta = desde + limite - 1;

    const { data, error, count } = await supabase
      .from("ordenes_pedido")
      .select("*, clientes(nombre)", { count: "exact" })
      .eq("revisada", true)
      .range(desde, hasta)
      .order("fecha_evento", { ascending: false });

    if (error) {
      console.error("Error al buscar recepciones:", error);
      return;
    }

    // filtros por cliente y fechas
    let filtradas = data;
    if (cliente) {
      filtradas = filtradas.filter((o) =>
        o.clientes?.nombre?.toLowerCase().includes(cliente.toLowerCase())
      );
    }
    if (inicio) {
      filtradas = filtradas.filter((o) => new Date(o.fecha_evento) >= new Date(inicio));
    }
    if (fin) {
      filtradas = filtradas.filter((o) => new Date(o.fecha_evento) <= new Date(fin));
    }

    setOrdenes(filtradas);
    setPagina(paginaActual);
    setTotalPaginas(Math.ceil((count || 1) / limite));
    setMostrar(true);
  };

  const limpiar = () => {
    setCliente("");
    setInicio(null);
    setFin(null);
    setOrdenes([]);
    setMostrar(false);
  };

  const eliminarRecepcionDefinitiva = async (id) => {
    const { value: codigo } = await Swal.fire({
      title: "¿Eliminar definitivamente esta recepción?",
      input: "password",
      inputLabel: "Escribe el código de seguridad",
      inputPlaceholder: "••••",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (codigo !== "4860") {
      Swal.fire("Acceso denegado", "Código incorrecto", "error");
      return;
    }

    const { error } = await supabase.from("ordenes_pedido").delete().eq("id", id);

    if (error) {
      console.error("❌ Error al eliminar:", error);
      Swal.fire("Error", "No se pudo eliminar la recepción", "error");
    } else {
      Swal.fire("Éxito", "Recepción eliminada definitivamente", "success");
      buscarRecepciones(pagina);
    }
  };

  return (
    <Protegido>
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">🔍 Buscar Recepción</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Buscar cliente por nombre"
          className="border p-2 rounded w-full"
        />
        <div className="flex flex-col">
          <label className="text-sm mb-1">📅 Fecha evento (inicio):</label>
          <DatePicker
            selected={inicio}
            onChange={(date) => setInicio(date)}
            className="border p-2 rounded"
            placeholderText="dd/mm/aaaa"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">📅 Fecha evento (fin):</label>
          <DatePicker
            selected={fin}
            onChange={(date) => setFin(date)}
            className="border p-2 rounded"
            placeholderText="dd/mm/aaaa"
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => buscarRecepciones(1)} className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200">
          🔍 Buscar
        </button>
        <button onClick={limpiar} className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200">
          🧹 Limpiar
        </button>
        <button onClick={() => setMostrar(false)} className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200">
          👁️ Ocultar Resultados
        </button>
      </div>

      {mostrar && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Resultados (página {pagina}):</h3>
          <div className="space-y-2">
            {ordenes.map((o) => (
              <div
                key={o.id}
                className="bg-gray-100 p-3 rounded shadow flex justify-between items-center"
              >
                <div>
                  <strong>{o.clientes?.nombre || "Sin cliente"}</strong> – {o.numero} –{" "}
                  {o.fecha_evento?.split("T")[0]}
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => navigate(`/recepcion?id=${o.id}`)}
                  >
                    Editar
                  </button>
                  <button
                    className="text-green-600 underline"
                    onClick={() => window.open(`/pdfrecepcion?id=${o.id}`, "_blank")}
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => eliminarRecepcionDefinitiva(o.id)}
                    className="text-red-500 text-xl hover:text-red-700"
                    title="Eliminar definitivamente"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botones de paginación */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              disabled={pagina <= 1}
              onClick={() => buscarRecepciones(pagina - 1)}
              className="px-4 py-2 border rounded bg-gray-200 disabled:opacity-50"
            >
              ⬅️ Anterior
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => buscarRecepciones(pagina + 1)}
              className="px-4 py-2 border rounded bg-gray-200 disabled:opacity-50"
            >
              Siguiente ➡️
            </button>
          </div>
        </div>
      )}
    </div>
  </Protegido>
);
}