// src/pages/Inicio.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido"; // 🔐 Protección

const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div
    className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-md hover:bg-gray-100 transition cursor-pointer"
    onClick={onClick}
  >
    <img src={imagen} alt={titulo} className="w-12 h-12 object-contain mb-2" />
    <p className="text-sm font-medium text-gray-700 text-center">{titulo}</p>
  </div>
);

// 👉 Helper para FECHAS: devuelve "AAAA-MM-DD" sin hora
const soloFecha = (valor) => {
  if (!valor) return "";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const Inicio = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const [ordenesProximas, setOrdenesProximas] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);

  useEffect(() => {
    // Nota: Protegido ya controla el acceso; esta línea es opcional.

    const cargarOrdenes = async () => {
      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .order("fecha_evento", { ascending: true });

      if (error) {
        console.error("Error cargando órdenes:", error);
        return;
      }

      // ✅ hoy a las 00:00 para que "hoy" cuente como PRÓXIMO
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const proximas = (data || []).filter((o) => {
        const f = new Date(o.fecha_evento);
        if (isNaN(f.getTime())) return false;
        // incluye hoy y futuros
        return f.getTime() >= hoy.getTime();
      });

      const vencidas = (data || []).filter((o) => {
        const f = new Date(o.fecha_evento);
        if (isNaN(f.getTime())) return false;
        // ya pasaron (estrictamente menor a hoy 00:00) y no revisadas
        return f.getTime() < hoy.getTime() && !o.revisada;
      });

      setOrdenesProximas(proximas);
      setOrdenesPendientes(vencidas);
    };

    cargarOrdenes();
  }, [navigate]);

  const editarOrden = (orden) => {
    const cliente = orden.clientes || {};

    const documentoCompleto = {
      ...orden,
      nombre_cliente: cliente.nombre || "",
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      email: cliente.email || "",
      fecha_creacion: orden.fecha_creacion || orden.fecha || null,
      abonos: orden.abonos || [],
      garantia: orden.garantia || "",
      fechaGarantia: orden.fechaGarantia || "",
      garantiaRecibida: orden.garantiaRecibida || false,
      estado: orden.estado || "",
      numero: orden.numero || "",
      esEdicion: true,
      idOriginal: orden.id,
    };

    // ✅ Usa "orden" para que la UI de CrearDocumento funcione (botón Remisión, etc.)
    navigate("/crear-documento", {
      state: {
        documento: documentoCompleto,
        tipo: "orden",
      },
    });
  };

  // ✅ PDF con fechas sin hora
  const manejarPDF = async (orden) => {
    const doc = {
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "N/A",
      identificacion: orden.clientes?.identificacion || "N/A",
      telefono: orden.clientes?.telefono || "N/A",
      direccion: orden.clientes?.direccion || "N/A",
      email: orden.clientes?.email || "N/A",
      // Formateo de fechas SOLO fecha
      fecha_creacion: soloFecha(orden.fecha_creacion || orden.fecha),
      fecha_evento: soloFecha(orden.fecha_evento),
    };

    await generarPDF(doc, "orden");
  };

  // ✅ Remisión con fechas sin hora
  const manejarRemision = async (orden) => {
    const doc = {
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "N/A",
      identificacion: orden.clientes?.identificacion || "N/A",
      telefono: orden.clientes?.telefono || "N/A",
      direccion: orden.clientes?.direccion || "N/A",
      email: orden.clientes?.email || "N/A",
      // También normalizamos las fechas para remisión
      fecha_creacion: soloFecha(orden.fecha_creacion || orden.fecha),
      fecha_evento: soloFecha(orden.fecha_evento),
    };

    await generarRemision(doc);
  };

  return (
    <Protegido>
      <div className="p-6 pb-24 md:pb-6">
        <h1 className="text-2xl font-bold mb-6">
          Bienvenido, {usuario?.nombre || "Administrador"}
        </h1>

        {/* TABLA VISUAL CON SCROLL INTERNO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Columna izquierda - Activos */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-blue-800 mb-3 text-center">
              Pedidos activos más próximos
            </h2>
            {ordenesProximas.length === 0 ? (
              <p className="text-center text-gray-500">No hay pedidos próximos.</p>
            ) : (
              <div className="h-60 overflow-y-auto pr-2">
                <ul className="space-y-3">
                  {ordenesProximas.map((orden) => (
                    <li
                      key={orden.id}
                      className="bg-white p-3 rounded-lg shadow flex justify-between items-center hover:bg-blue-100 transition"
                    >
                      <div>
                        <p className="font-bold text-blue-700">
                          {orden.numero || "OP-???"}
                        </p>
                        <p className="text-gray-800">
                          {orden.clientes?.nombre || "Cliente"}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {soloFecha(orden.fecha_evento) || "-"}
                        </p>
                      </div>
                      <div className="flex gap-2 text-lg">
                        <button onClick={() => editarOrden(orden)} title="Editar">
                          ✏️
                        </button>
                        <button onClick={() => manejarPDF(orden)} title="PDF">
                          📄
                        </button>
                        <button onClick={() => manejarRemision(orden)} title="Remisión">
                          🚚
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Columna derecha - Pendientes */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-red-700 mb-3 text-center">
              Pedidos pendientes por revisar
            </h2>
            {ordenesPendientes.length === 0 ? (
              <p className="text-center text-gray-500">No hay pedidos pendientes.</p>
            ) : (
              <div className="h-60 overflow-y-auto pr-2">
                <ul className="space-y-3">
                  {ordenesPendientes.map((orden) => (
                    <li
                      key={orden.id}
                      className="bg-white p-3 rounded-lg shadow flex justify-between items-center hover:bg-red-100 transition"
                    >
                      <div>
                        <p className="font-bold text-red-700">
                          {orden.numero || "OP-???"}
                        </p>
                        <p className="text-gray-800">
                          {orden.clientes?.nombre || "Cliente"}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {soloFecha(orden.fecha_evento) || "-"}
                        </p>
                      </div>
                      <div className="text-lg">
                        <button
                          // ✅ Recepción recibe ?id=...
                          onClick={() => navigate(`/recepcion?id=${orden.id}`)}
                          title="Revisar"
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

        {/* MENÚ VISUAL DE ÍCONOS */}
        <h2 className="text-xl font-semibold mb-4 text-center">Menú Principal</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 place-items-center">
          <BotonModulo
            titulo="Crear documento"
            imagen={`${process.env.PUBLIC_URL}/icons/contrato.png`}
            onClick={() => navigate("/crear-documento")}
          />
          <BotonModulo
            titulo="Clientes"
            imagen={`${process.env.PUBLIC_URL}/icons/buscar_cliente.png`}
            onClick={() => navigate("/clientes")}
          />
          <BotonModulo
            titulo="Inventario"
            imagen={`${process.env.PUBLIC_URL}/icons/inventario.png`}
            onClick={() => navigate("/inventario")}
          />
          <BotonModulo
            titulo="Agenda"
            imagen={`${process.env.PUBLIC_URL}/icons/agenda.png`}
            onClick={() => navigate("/agenda")}
          />
          <BotonModulo
            titulo="Proveedores"
            imagen={`${process.env.PUBLIC_URL}/icons/proveedores.png`}
            onClick={() => navigate("/proveedores")}
          />
          <BotonModulo
            titulo="Buscar documento"
            imagen={`${process.env.PUBLIC_URL}/icons/buscar_doc.png`}
            onClick={() => navigate("/buscar-documento")}
          />
          <BotonModulo
            titulo="Reportes"
            imagen={`${process.env.PUBLIC_URL}/icons/reportes.png`}
            onClick={() => navigate("/reportes")}
          />
          <BotonModulo
            titulo="Trazabilidad"
            imagen={`${process.env.PUBLIC_URL}/icons/trazabilidad.png`}
            onClick={() => navigate("/trazabilidad")}
          />
          <BotonModulo
            titulo="Usuarios"
            imagen={`${process.env.PUBLIC_URL}/icons/usuario.png`}
            onClick={() => navigate("/usuarios")}
          />
          <BotonModulo
            titulo="Recepción"
            imagen={`${process.env.PUBLIC_URL}/icons/recepcion.png`}
            onClick={() => navigate("/recepcion")}
          />
          <BotonModulo
            titulo="Contabilidad"
            imagen={`${process.env.PUBLIC_URL}/icons/contabilidad.png`}
            onClick={() => navigate("/contabilidad")}
          />
          <BotonModulo
            titulo="Buscar recepción"
            imagen={`${process.env.PUBLIC_URL}/icons/buscar_recepcion.png`}
            onClick={() => navigate("/buscar-recepcion")}
          />
          {usuario?.rol === "admin" && <></>}
        </div>

        {/* Menú inferior (solo móvil) */}
        <div className="menu-inferior md:hidden">
          <button onClick={() => navigate("/inicio")}>🏠 Inicio</button>
          <button onClick={() => navigate("/crear-documento")}>📄 Documento</button>
          <button onClick={() => navigate("/agenda")}>📅 Agenda</button>
          <button onClick={() => navigate("/clientes")}>👥 Clientes</button>
        </div>
      </div>
    </Protegido>
  );
};

export default Inicio;