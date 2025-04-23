// Inicio.js (actualizado con tabla visual y diseño horizontal de iconos)
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";

const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div
    className="flex flex-col items-center justify-center p-2 rounded-lg shadow hover:shadow-md hover:bg-gray-100 transition cursor-pointer"
    onClick={onClick}
  >
    <img
      src={imagen}
      alt={titulo}
      className="w-12 h-12 mb-1 object-contain"
      style={{ maxWidth: "48px", maxHeight: "48px" }}
    />
    <p className="text-xs text-center text-gray-800 font-medium">{titulo}</p>
  </div>
);

const Inicio = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const [ordenesProximas, setOrdenesProximas] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);

  useEffect(() => {
    if (!usuario) return navigate("/login");

    const cargarOrdenes = async () => {
      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .order("fecha_evento", { ascending: true });

      if (error) return console.error("Error cargando órdenes:", error);

      const hoy = new Date();
      const proximas = data.filter(o => new Date(o.fecha_evento) >= hoy).slice(0, 5);
      const vencidas = data.filter(o => new Date(o.fecha_evento) < hoy && !o.revisada);

      setOrdenesProximas(proximas);
      setOrdenesPendientes(vencidas);
    };

    cargarOrdenes();
  }, [navigate, usuario]);

  const editarOrden = (orden) => {
    navigate("/crear-documento", { state: { documento: orden } });
  };

  const manejarPDF = async (orden) => {
    await generarPDF(orden, "orden");
  };

  const manejarRemision = async (orden) => {
    await generarRemision(orden);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Bienvenido, {usuario?.nombre || "Usuario"}</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border border-gray-300">
          <thead>
            <tr>
              <th className="bg-blue-100 p-3 text-left text-blue-800 text-lg">📦 Pedidos próximos</th>
              <th className="bg-red-100 p-3 text-left text-red-700 text-lg">🧾 Pedidos sin revisar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="align-top p-3">
                {ordenesProximas.length === 0 ? (
                  <p className="text-gray-500">No hay pedidos próximos.</p>
                ) : (
                  <ul className="space-y-3">
                    {ordenesProximas.map((orden) => (
                      <li key={orden.id} className="bg-white p-3 rounded-lg shadow hover:bg-blue-100 transition">
                        <div className="text-sm">
                          <p className="font-semibold text-blue-700">OP-{orden.numero || "???"}</p>
                          <p className="text-gray-700">{orden.clientes?.nombre || "Cliente"}</p>
                          <p className="text-gray-500">{new Date(orden.fecha_evento).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => editarOrden(orden)} title="Editar">✏️</button>
                          <button onClick={() => manejarPDF(orden)} title="PDF">🧾</button>
                          <button onClick={() => manejarRemision(orden)} title="Remisión">🚚</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="align-top p-3">
                {ordenesPendientes.length === 0 ? (
                  <p className="text-gray-500">No hay pendientes.</p>
                ) : (
                  <ul className="space-y-3">
                    {ordenesPendientes.map((orden) => (
                      <li key={orden.id} className="bg-white p-3 rounded-lg shadow hover:bg-red-100 transition">
                        <div className="text-sm">
                          <p className="font-semibold text-red-700">OP-{orden.numero || "???"}</p>
                          <p className="text-gray-700">{orden.clientes?.nombre}</p>
                          <p className="text-gray-500">{new Date(orden.fecha_evento).toLocaleDateString()}</p>
                        </div>
                        <div className="mt-2">
                          <button onClick={() => navigate("/recepcion", { state: { ordenId: orden.id } })} title="Revisar">📝</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold my-6">Menú Principal</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BotonModulo titulo="Crear documento" imagen="/icons/contrato.png" onClick={() => navigate("/crear-documento")} />
        <BotonModulo titulo="Clientes" imagen="/icons/buscar_cliente.png" onClick={() => navigate("/clientes")} />
        <BotonModulo titulo="Inventario" imagen="/icons/inventario.png" onClick={() => navigate("/inventario")} />
        <BotonModulo titulo="Agenda" imagen="/icons/adenda.png" onClick={() => navigate("/agenda")} />
        <BotonModulo titulo="Proveedores" imagen="/icons/proveedores.png" onClick={() => navigate("/proveedores")} />
        <BotonModulo titulo="Buscar documento" imagen="/icons/buscar_doc.png" onClick={() => navigate("/buscar-documento")} />
        <BotonModulo titulo="Reportes" imagen="/icons/reportes.png" onClick={() => navigate("/reportes")} />
        {usuario?.rol === "admin" && (
          <BotonModulo titulo="Usuarios" imagen="/icons/usuario.png" onClick={() => navigate("/usuarios")} />
        )}
      </div>
    </div>
  );
};

export default Inicio;