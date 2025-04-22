import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase";
import { generarPDF } from "../utils/generarPDF";
import { generarRemision } from "../utils/generarRemision";
import Swal from "sweetalert2";
import { FaEdit } from "react-icons/fa";

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

      const hoy = new Date();

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

  const editarOrden = (orden) => {
    navigate("/crear-documento", { state: { documento: orden, tipo: "orden" } });
  };

  const manejarPDF = async (orden) => {
    await generarPDF(orden, "orden");
  };

  const manejarRemision = async (orden) => {
    await generarRemision(orden);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Bienvenido, {usuario?.nombre}
      </h1>

      {/* CUADROS DE INFORMACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Pedidos activos más próximos */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 text-blue-800 flex items-center gap-2">
            📦 Pedidos activos más próximos
          </h2>
          {ordenesProximas.length === 0 ? (
            <p className="text-gray-500">No hay pedidos próximos.</p>
          ) : (
            <ul className="space-y-3">
              {ordenesProximas.map((orden) => (
                <li key={orden.id} className="bg-white p-3 rounded-lg shadow flex items-center justify-between hover:bg-blue-100 transition">
                  <div className="text-sm">
                    <p className="font-semibold text-blue-700">OP-{orden.numero || "???"}</p>
                    <p className="text-gray-700">{orden.cliente_nombre}</p>
                    <p className="text-gray-500">
                      {new Date(orden.fecha_evento).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => editarOrden(orden)} className="text-green-600 hover:text-green-800" title="Editar orden">
                      <FaEdit size={18} />
                    </button>
                    <button onClick={() => manejarPDF(orden)} className="text-red-600 hover:text-red-800" title="Descargar PDF">
                      🧾
                    </button>
                    <button onClick={() => manejarRemision(orden)} className="text-blue-600 hover:text-blue-800" title="Generar remisión">
                      🚚
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pedidos pendientes por recibir */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 text-red-700 flex items-center gap-2">
            🧾 Pedidos pendientes por revisar (retornados a bodega)
          </h2>
          {ordenesPendientes.length === 0 ? (
            <p className="text-gray-500">No hay pedidos pendientes por revisar.</p>
          ) : (
            <div className="h-64 overflow-y-auto pr-2">
              <ul className="space-y-3">
                {ordenesPendientes.map((orden) => (
                  <li key={orden.id} className="bg-white p-3 rounded-lg shadow flex items-center justify-between hover:bg-red-100 transition">
                    <div className="text-sm">
                      <p className="font-semibold text-red-700">OP-{orden.numero || "???"}</p>
                      <p className="text-gray-700">{orden.cliente_nombre}</p>
                      <p className="text-gray-500">
                        {new Date(orden.fecha_evento).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => navigate("/recepcion", { state: { ordenId: orden.id } })}
                        className="text-green-600 hover:text-green-800"
                        title="Revisar recepción"
                      >
                        📝
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* MENÚ PRINCIPAL */}
      <h2 className="text-xl font-semibold text-center mb-6">Menú Principal</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BotonModulo titulo="Crear documento" imagen="/icons/contrato.png" onClick={() => navigate("/crear-documento")} />
        <BotonModulo titulo="Clientes" imagen="/icons/buscar_cliente.png" onClick={() => navigate("/clientes")} />
        <BotonModulo titulo="Inventario" imagen="/icons/inventario.png" onClick={() => navigate("/inventario")} />
        <BotonModulo titulo="Agenda" imagen="/icons/adenda.png" onClick={() => navigate("/agenda")} />
        <BotonModulo titulo="Proveedores" imagen="/icons/proveedores.png" onClick={() => navigate("/proveedores")} />
        <BotonModulo titulo="Usuarios" imagen="/icons/usuario.png" onClick={() => navigate("/usuarios")} />
        <BotonModulo titulo="Reportes" imagen="/icons/reportes.png" onClick={() => navigate("/reportes")} />
        <BotonModulo titulo="Trazabilidad" imagen="/icons/trazabilidad.png" onClick={() => navigate("/trazabilidad")} />
        <BotonModulo titulo="Buscar documento" imagen="/icons/buscar_doc.png" onClick={() => navigate("/buscar-documento")} />
        <BotonModulo titulo="Recepción" imagen="/icons/recepcion.png" onClick={() => navigate("/recepcion")} />
      </div>
    </div>
  );
};

// COMPONENTE PARA CADA BOTÓN DEL MENÚ
const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div
    className="flex flex-col items-center justify-center p-4 rounded-lg shadow hover:shadow-md hover:bg-gray-50 transition cursor-pointer"
    onClick={onClick}
  >
    <img src={imagen} alt={titulo} className="w-12 h-12 mb-2 object-contain" />
    <p className="text-sm text-center text-gray-800">{titulo}</p>
  </div>
);

export default Inicio;
