// Inicio.js - Parte 1
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";

const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div
    className="flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer hover:shadow-md"
    onClick={onClick}
  >
    <img
      src={imagen}
      alt={titulo}
      className="w-16 h-16 object-contain"
    />
    <p className="text-sm text-center mt-1">{titulo}</p>
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
      setOrdenesProximas(data.filter(o => new Date(o.fecha_evento) >= hoy).slice(0, 5));
      setOrdenesPendientes(data.filter(o => new Date(o.fecha_evento) < hoy && !o.revisada));
    };
    cargarOrdenes();
  }, [navigate, usuario]);
// Inicio.js - Parte 2
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

    {/* TABLA CON 2 COLUMNAS */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      {/* Columna izquierda: Próximos */}
      <div className="border border-blue-300 bg-blue-50 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
          📦 Pedidos activos más próximos
        </h2>
        {ordenesProximas.length === 0 ? (
          <p className="text-gray-600">No hay pedidos próximos.</p>
        ) : (
          <ul className="space-y-3">
            {ordenesProximas.map((orden) => (
              <li key={orden.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center hover:bg-blue-100">
                <div>
                  <p className="font-bold text-blue-700">OP-{orden.numero || "???"}</p>
                  <p>{orden.clientes?.nombre || "Cliente"}</p>
                  <p className="text-sm text-gray-500">{new Date(orden.fecha_evento).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editarOrden(orden)} title="Editar">✏️</button>
                  <button onClick={() => manejarPDF(orden)} title="PDF">📄</button>
                  <button onClick={() => manejarRemision(orden)} title="Remisión">🚚</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
        {/* Columna derecha: Pendientes por revisar */}
        <div className="border border-red-300 bg-red-50 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
            🧾 Pedidos pendientes por revisar
          </h2>
          {ordenesPendientes.length === 0 ? (
            <p className="text-gray-600">No hay pedidos pendientes.</p>
          ) : (
            <div className="h-64 overflow-y-auto pr-1">
              <ul className="space-y-3">
                {ordenesPendientes.map((orden) => (
                  <li key={orden.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center hover:bg-red-100">
                    <div>
                      <p className="font-bold text-red-700">OP-{orden.numero || "???"}</p>
                      <p>{orden.clientes?.nombre || "Cliente"}</p>
                      <p className="text-sm text-gray-500">{new Date(orden.fecha_evento).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => navigate("/recepcion", { state: { ordenId: orden.id } })}
                      title="Revisar"
                    >
                      📝
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* MENÚ VISUAL DE ÍCONOS */}
      <h2 className="text-xl font-semibold mb-4">Menú Principal</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <BotonModulo titulo="Crear documento" imagen="/icons/contrato.png" onClick={() => navigate("/crear-documento")} />
        <BotonModulo titulo="Clientes" imagen="/icons/buscar_cliente.png" onClick={() => navigate("/clientes")} />
        <BotonModulo titulo="Inventario" imagen="/icons/inventario.png" onClick={() => navigate("/inventario")} />
        <BotonModulo titulo="Agenda" imagen="/icons/agenda.png" onClick={() => navigate("/agenda")} />
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
