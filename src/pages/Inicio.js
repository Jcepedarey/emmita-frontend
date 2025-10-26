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

  // 🔎 Consulta rápida de stock
  const [busqProd, setBusqProd] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [prodSel, setProdSel] = useState(null);
  const [fechaConsulta, setFechaConsulta] = useState("");
  const [stockConsulta, setStockConsulta] = useState(null);
  const [cargandoStock, setCargandoStock] = useState(false);

  // ───────────────────── Cargar órdenes (PRÓXIMAS y PENDIENTES) ─────────────────────
  useEffect(() => {
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
  }, []); // ← sin navigate en deps para no re-ejecutar innecesariamente

  // ───────────────────── Sugerencias por nombre (mín. 2 letras) ────────────────────
  useEffect(() => {
    const fetch = async () => {
      if (!busqProd || busqProd.trim().length < 2) {
        setSugerencias([]);
        return;
      }
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, stock")
        .ilike("nombre", `%${busqProd}%`)
        .limit(10);

      if (error) {
        console.error("Error buscando productos:", error);
        setSugerencias([]);
        return;
      }
      setSugerencias(data || []);
    };
    fetch();
  }, [busqProd]);

  // ───────────────────── Calcular stock por fecha ─────────────────────
  const calcularStockParaFecha = async (productoId, fechaISO) => {
    setCargandoStock(true);
    try {
      // 1) Stock base del producto
      const { data: prod } = await supabase
        .from("productos")
        .select("id, stock")
        .eq("id", productoId)
        .single();
      const stockBase = parseInt(prod?.stock ?? 0, 10);

      // 2) Órdenes abiertas que tocan esa fecha (1 día o multi-días)
      const { data: ords } = await supabase
        .from("ordenes_pedido")
        .select("productos, fecha_evento, fechas_evento, cerrada")
        .eq("cerrada", false);

      const ordenes = ords || [];
      const fecha = String(fechaISO).slice(0, 10);

      let reservado = 0;
      ordenes.forEach((o) => {
        const dias = new Set([
          ...(o.fecha_evento ? [String(o.fecha_evento).slice(0, 10)] : []),
          ...((o.fechas_evento || []).map((d) => String(d).slice(0, 10))),
        ]);
        if (!dias.has(fecha)) return;

        (o.productos || []).forEach((p) => {
          if (p.es_grupo && Array.isArray(p.productos)) {
            p.productos.forEach((sub) => {
              const id = sub.producto_id || sub.id;
              const cant = (sub.cantidad || 0) * (p.cantidad || 1);
              if (id === productoId) reservado += cant;
            });
          } else {
            const id = p.producto_id || p.id;
            if (id === productoId) reservado += (p.cantidad || 0);
          }
        });
      });

      setStockConsulta(stockBase - reservado);
    } catch (e) {
      console.error("Error calculando stock:", e);
      setStockConsulta(null);
    } finally {
      setCargandoStock(false);
    }
  };

  // ───────────────────── Recalcular cuando haya producto y fecha ───────────────────
  useEffect(() => {
    if (prodSel?.id && fechaConsulta) {
      calcularStockParaFecha(prodSel.id, fechaConsulta);
    } else {
      setStockConsulta(null);
    }
  }, [prodSel, fechaConsulta]);

  // ───────────────────── Acciones UI ─────────────────────
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
        <h1 className="text-2xl font-bold mb-6">Bienvenido</h1>

        {/* TABLA VISUAL CON SCROLL INTERNO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Columna izquierda - Activos */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-blue-800 mb-3 text-center">
              Pedidos activos más próximos
            </h2>
            {ordenesProximas.length === 0 ? (
              <p className="text-center text-gray-500">No hay pedidos próximos.</p>
            ) : (
              <div className="h-48 overflow-y-auto pr-2">
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
              <div className="h-48 overflow-y-auto pr-2">
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

        {/* ───────────────── Consulta rápida de stock ───────────────── */}
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2">Consulta rápida de stock</h3>

         <div className="flex flex-col md:flex-row gap-3 items-center">
  {/* Fecha (izquierda, ancho fijo pequeño) */}
  <input
    type="date"
    value={fechaConsulta}
    onChange={(e) => setFechaConsulta(e.target.value)}
    className="border rounded-md px-3 py-2 w-[160px] md:w-[180px] text-base placeholder-gray-400"
    title="Seleccione la fecha a consultar"
  />

  {/* Buscador con sugerencias (centro, ocupa el espacio) */}
  <div className="relative flex-1 min-w-[280px] w-full">
    <input
      type="text"
      value={busqProd}
      onChange={(e) => {
        setBusqProd(e.target.value);
        setProdSel(null);
        setStockConsulta(null);
      }}
      placeholder="Buscar producto del inventario..."
      className="w-full border rounded-md px-3 py-2 text-base placeholder-gray-400"
    />
    {sugerencias.length > 0 && (
      <ul className="absolute z-30 bg-white border rounded-md mt-1 max-h-56 overflow-y-auto w-full shadow-lg text-lg leading-6">
        {sugerencias.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-100"
              onClick={() => {
                setProdSel(s);
                setBusqProd(s.nombre);
                setSugerencias([]);
              }}
            >
              {s.nombre}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>

  {/* Resultado (derecha, ancho fijo pequeño, “sage” suave) */}
  <div
    className="w-[170px] text-base font-semibold text-center px-3 py-2 rounded-md border"
    style={{
      backgroundColor: "rgba(168, 181, 162, 0.18)", // sage suave
      borderColor: "rgba(168, 181, 162, 0.6)",
      color: "#1f2937", // texto gris oscuro legible (tailwind slate-800 aprox)
    }}
    title="Unidades disponibles para la fecha seleccionada"
  >
    {prodSel && fechaConsulta
      ? (cargandoStock ? "Calculando..." : `Disponible: ${stockConsulta ?? "—"}`)
      : "Disponible:"}
  </div>
</div>

        </div>

        {/* MENÚ VISUAL DE ÍCONOS */}
        <h2 className="text-xl font-semibold mb-4 text-center">Menú Principal</h2>
        <div className="menu-grid grid sm:grid-cols-4 gap-6 place-items-center">
          <div className="boton-modulo">
            <BotonModulo
              titulo="Crear documento"
              imagen={`${process.env.PUBLIC_URL}/icons/contrato.png`}
              onClick={() => navigate("/crear-documento")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Clientes"
              imagen={`${process.env.PUBLIC_URL}/icons/buscar_cliente.png`}
              onClick={() => navigate("/clientes")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Inventario"
              imagen={`${process.env.PUBLIC_URL}/icons/inventario.png`}
              onClick={() => navigate("/inventario")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Agenda"
              imagen={`${process.env.PUBLIC_URL}/icons/agenda.png`}
              onClick={() => navigate("/agenda")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Proveedores"
              imagen={`${process.env.PUBLIC_URL}/icons/proveedores.png`}
              onClick={() => navigate("/proveedores")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Buscar documento"
              imagen={`${process.env.PUBLIC_URL}/icons/buscar_doc.png`}
              onClick={() => navigate("/buscar-documento")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Reportes"
              imagen={`${process.env.PUBLIC_URL}/icons/reportes.png`}
              onClick={() => navigate("/reportes")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Trazabilidad"
              imagen={`${process.env.PUBLIC_URL}/icons/trazabilidad.png`}
              onClick={() => navigate("/trazabilidad")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Usuarios"
              imagen={`${process.env.PUBLIC_URL}/icons/usuario.png`}
              onClick={() => navigate("/usuarios")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Recepción"
              imagen={`${process.env.PUBLIC_URL}/icons/recepcion.png`}
              onClick={() => navigate("/recepcion")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Contabilidad"
              imagen={`${process.env.PUBLIC_URL}/icons/contabilidad.png`}
              onClick={() => navigate("/contabilidad")}
            />
          </div>

          <div className="boton-modulo">
            <BotonModulo
              titulo="Buscar recepción"
              imagen={`${process.env.PUBLIC_URL}/icons/buscar_recepcion.png`}
              onClick={() => navigate("/buscar-recepcion")}
            />
          </div>

          {usuario?.rol === "admin" && <></>}
        </div>

        {/* 🔻 Eliminado: Menú inferior (solo móvil)
        <div className="menu-inferior md:hidden">
          <button onClick={() => navigate("/inicio")}>🏠 Inicio</button>
          <button onClick={() => navigate("/crear-documento")}>📄 Documento</button>
          <button onClick={() => navigate("/agenda")}>📅 Agenda</button>
          <button onClick={() => navigate("/clientes")}>👥 Clientes</button>
        </div>
        */}
      </div>
    </Protegido>
  );
};

export default Inicio;
