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
    const usuarioGuardado = localStorage.getItem("usuario");
    if (!usuarioGuardado) {
      navigate("/login");
      return;
    }

    setUsuario(JSON.parse(usuarioGuardado));
    obtenerOrdenes();
  }, []);

  const obtenerOrdenes = async () => {
    try {
      const { data: ordenes, error } = await supabase
        .from("ordenes_pedido")
        .select("*")
        .order("fecha_evento", { ascending: true });

      if (error) throw error;

      // Buscar nombre del cliente para cada orden
      const ordenesConCliente = await Promise.all(
        ordenes.map(async (orden) => {
          const { data: cliente } = await supabase
            .from("clientes")
            .select("nombre")
            .eq("id", orden.cliente_id)
            .single();

          return {
            ...orden,
            cliente_nombre: cliente?.nombre || "Cliente desconocido",
          };
        })
      );

      const hoy = new Date();

      const proximas = ordenesConCliente
        .filter((op) => new Date(op.fecha_evento) >= hoy)
        .slice(0, 5);

      const pendientes = ordenesConCliente.filter(
        (op) => op.estado === "confirmada" && !op.recibido
      );

      setOrdenesProximas(proximas);
      setOrdenesPendientes(pendientes);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudieron cargar las órdenes.", "error");
    }
  };

  const descargarPDF = (orden) => {
    window.open(`${process.env.REACT_APP_API_URL}/api/pdf/${orden.id}`, "_blank");
  };

  const descargarRemision = (orden) => {
    window.open(`${process.env.REACT_APP_API_URL}/api/remision/${orden.id}`, "_blank");
  };

  const editarDocumento = (orden) => {
    navigate("/crear-documento", { state: { documento: orden, tipo: "orden" } });
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Bienvenido, {usuario?.nombre}
      </h1>

      {/* Cuadro: Pedidos próximos */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          📆 Pedidos activos más próximos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordenesProximas.length === 0 ? (
            <p className="text-gray-500 col-span-full">
              No hay pedidos próximos.
            </p>
          ) : (
            ordenesProximas.map((orden) => (
              <div
                key={orden.id}
                className="bg-white border rounded-xl shadow-md p-4 flex flex-col justify-between"
              >
                <div className="mb-2">
                  <p className="text-sm text-gray-500">Orden:</p>
                  <p className="text-lg font-semibold text-blue-700">
                    OP-{orden.numero || "???"}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Cliente:</p>
                  <p className="text-base text-gray-800">{orden.cliente_nombre}</p>
                  <p className="text-sm text-gray-500 mt-2">Fecha del evento:</p>
                  <p className="text-base">
                    {new Date(orden.fecha_evento).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-around mt-4">
                  <button
                    onClick={() => descargarPDF(orden)}
                    title="Descargar PDF"
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaFilePdf size={20} />
                  </button>
                  <button
                    onClick={() => descargarRemision(orden)}
                    title="Generar Remisión"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaTruck size={20} />
                  </button>
                  <button
                    onClick={() => editarDocumento(orden)}
                    title="Editar Orden"
                    className="text-green-600 hover:text-green-800"
                  >
                    <FaEdit size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {/* Cuadro: Pedidos pendientes por recibir */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-yellow-700">
          🚚 Pedidos pendientes por recibir
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordenesPendientes.length === 0 ? (
            <p className="text-gray-500 col-span-full">
              No hay pedidos pendientes por recibir.
            </p>
          ) : (
            ordenesPendientes.map((orden) => (
              <div
                key={orden.id}
                className="bg-yellow-50 border border-yellow-300 rounded-xl shadow-md p-4 flex flex-col justify-between"
              >
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Orden:</p>
                  <p className="text-lg font-semibold text-yellow-800">
                    OP-{orden.numero || "???"}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Cliente:</p>
                  <p className="text-base text-gray-800">{orden.cliente_nombre}</p>
                  <p className="text-sm text-gray-600 mt-2">Fecha del evento:</p>
                  <p className="text-base">
                    {new Date(orden.fecha_evento).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-around mt-4">
                  <button
                    onClick={() => descargarPDF(orden)}
                    title="Descargar PDF"
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaFilePdf size={20} />
                  </button>
                  <button
                    onClick={() => descargarRemision(orden)}
                    title="Generar Remisión"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaTruck size={20} />
                  </button>
                  <button
                    onClick={() => editarDocumento(orden)}
                    title="Editar Orden"
                    className="text-green-600 hover:text-green-800"
                  >
                    <FaEdit size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Inicio;
