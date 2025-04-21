// src/pages/Inicio.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase";
import Swal from "sweetalert2";
import { FaFilePdf, FaEdit, FaTruck } from "react-icons/fa";

const Inicio = () => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [ordenesProximas, setOrdenesProximas] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);

  useEffect(() => {
    const usuarioStorage = localStorage.getItem("usuario");
    if (!usuarioStorage) {
      navigate("/login");
      return;
    }
    setUsuario(JSON.parse(usuarioStorage));
    obtenerOrdenes();
  }, []);

  const obtenerOrdenes = async () => {
    try {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("tipo", "orden")
        .order("fecha_evento", { ascending: true });

      if (error) throw error;

      const hoy = new Date();

      const proximas = data
        .filter((doc) => new Date(doc.fecha_evento) >= hoy)
        .slice(0, 5);

      const pendientes = data.filter((doc) => !doc.recibido);

      setOrdenesProximas(proximas);
      setOrdenesPendientes(pendientes);
    } catch (err) {
      console.error("Error al obtener órdenes:", err);
      Swal.fire("Error", "No se pudieron cargar las órdenes.", "error");
    }
  };

  const descargarPDF = (documento) => {
    // Asumiendo que tienes la función ya implementada
    window.open(`${process.env.REACT_APP_API_URL}/api/pdf/${documento.id}`, "_blank");
  };

  const descargarRemision = (documento) => {
    // Asumiendo que tienes la función ya implementada
    window.open(`${process.env.REACT_APP_API_URL}/api/remision/${documento.id}`, "_blank");
  };

  const editarDocumento = (documento) => {
    navigate("/crear-documento", { state: { documento, tipo: "orden" } });
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Bienvenido, {usuario?.nombre}
      </h1>

      {/* CUADRO 1: Órdenes próximas */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          📅 Pedidos activos más próximos
        </h2>
        <div className="overflow-x-auto shadow border rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2"># OP</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha del evento</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesProximas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500">
                    No hay pedidos próximos.
                  </td>
                </tr>
              ) : (
                ordenesProximas.map((orden, index) => (
                  <tr key={orden.id} className="border-t">
                    <td className="px-4 py-2 font-semibold">
                      OP-{orden.numero}
                    </td>
                    <td className="px-4 py-2">{orden.cliente_nombre}</td>
                    <td className="px-4 py-2">
                      {new Date(orden.fecha_evento).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => descargarPDF(orden)}
                        className="text-red-600 hover:text-red-800"
                        title="Descargar PDF"
                      >
                        <FaFilePdf size={18} />
                      </button>
                      <button
                        onClick={() => descargarRemision(orden)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Generar Remisión"
                      >
                        <FaTruck size={18} />
                      </button>
                      <button
                        onClick={() => editarDocumento(orden)}
                        className="text-green-600 hover:text-green-800"
                        title="Editar"
                      >
                        <FaEdit size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* CUADRO 2: Órdenes pendientes por recibir */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-yellow-700">
          🚚 Pedidos pendientes por recibir
        </h2>
        <div className="overflow-x-auto shadow border rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-yellow-100 text-gray-700">
              <tr>
                <th className="px-4 py-2"># OP</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha del evento</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesPendientes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500">
                    No hay pedidos pendientes por recibir.
                  </td>
                </tr>
              ) : (
                ordenesPendientes.map((orden, index) => (
                  <tr key={orden.id} className="border-t bg-yellow-50">
                    <td className="px-4 py-2 font-semibold">
                      OP-{orden.numero}
                    </td>
                    <td className="px-4 py-2">{orden.cliente_nombre}</td>
                    <td className="px-4 py-2">
                      {new Date(orden.fecha_evento).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => descargarPDF(orden)}
                        className="text-red-600 hover:text-red-800"
                        title="Descargar PDF"
                      >
                        <FaFilePdf size={18} />
                      </button>
                      <button
                        onClick={() => descargarRemision(orden)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Generar Remisión"
                      >
                        <FaTruck size={18} />
                      </button>
                      <button
                        onClick={() => editarDocumento(orden)}
                        className="text-green-600 hover:text-green-800"
                        title="Editar"
                      >
                        <FaEdit size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inicio;
