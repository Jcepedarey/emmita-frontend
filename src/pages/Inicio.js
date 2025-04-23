import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";

// Componente reutilizable para los botones del menú
const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div
    className="flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer hover:shadow-md"
    onClick={onClick}
    style={{ width: "80px", height: "80px" }} // Tamaño reducido
  >
    <img
      src={imagen}
      alt={titulo}
      className="w-12 h-12 object-contain" // Íconos más pequeños
    />
    <p className="text-xs text-center mt-1">{titulo}</p>
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

      {/* Tabla estilo Excel */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pedidos activos */}
        <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">Pedidos Activos Más Próximos</h2>
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-blue-200 text-blue-800">
                <th className="px-4 py-2">Orden</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ordenesProximas.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center text-gray-500">
                    No hay pedidos próximos.
                  </td>
                </tr>
              ) : (
                ordenesProximas.map((orden) => (
                  <tr key={orden.id} className="bg-white hover:bg-blue-100">
                    <td className="border px-4 py-2">OP-{orden.numero || "???"}</td>
                    <td className="border px-4 py-2">{orden.clientes?.nombre || "Cliente"}</td>
                    <td className="border px-4 py-2">
                      {new Date(orden.fecha_evento).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pedidos pendientes */}
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-3">Pedidos Pendientes por Revisar</h2>
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-red-200 text-red-800">
                <th className="px-4 py-2">Orden</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ordenesPendientes.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center text-gray-500">
                    No hay pedidos pendientes.
                  </td>
                </tr>
              ) : (
                ordenesPendientes.map((orden) => (
                  <tr key={orden.id} className="bg-white hover:bg-red-100">
                    <td className="border px-4 py-2">OP-{orden.numero || "???"}</td>
                    <td className="border px-4 py-2">{orden.clientes?.nombre || "Cliente"}</td>
                    <td className="border px-4 py-2">
                      {new Date(orden.fecha_evento).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
{/* Menú principal mejorado */}
<h2 className="text-xl font-semibold mt-6 mb-4">Menú Principal</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

export default Inicio; // Exportación corregida para evitar errores
