// src/pages/Inicio.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido"; // 🔐 Protección

// ✅ NUEVO: Componente de botón compacto con círculo
const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div
    className="boton-modulo-compacto flex flex-col items-center justify-center cursor-pointer transition hover:scale-105"
    onClick={onClick}
    style={{ gap: "4px" }}
  >
    <div
      className="icono-circulo flex items-center justify-center"
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        backgroundColor: "#f3f4f6",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
      }}
    >
      <img src={imagen} alt={titulo} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
    </div>
    <p
      className="text-center text-gray-700 font-medium"
      style={{ fontSize: "11px", lineHeight: "1.2", maxWidth: "70px" }}
    >
      {titulo}
    </p>
  </div>
);

// ✅ NUEVO: Componente IconoPago - Muestra $ verde (pagado) o rojo (pendiente)
const IconoPago = ({ orden }) => {
  // Calcular saldo: total_neto - suma de abonos
  const totalNeto = Number(orden.total_neto || orden.total || 0);
  const sumaAbonos = (orden.abonos || []).reduce((acc, ab) => acc + Number(ab.valor || ab || 0), 0);
  const saldo = Math.max(0, totalNeto - sumaAbonos);
  const estaPagado = saldo === 0 && totalNeto > 0;

  return (
    <div
      title={estaPagado ? "Pagado" : `Saldo: $${saldo.toLocaleString()}`}
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: estaPagado ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
        border: `1.5px solid ${estaPagado ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "bold",
        color: estaPagado ? "rgba(22, 163, 74, 0.85)" : "rgba(220, 38, 38, 0.85)",
        cursor: "default",
        flexShrink: 0
      }}
    >
      $
    </div>
  );
};

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
  if (o.revisada) return false;

  // ✅ Determinar el ÚLTIMO día del pedido
  let ultimoDia;
  
  if (o.multi_dias && Array.isArray(o.fechas_evento) && o.fechas_evento.length > 0) {
    // Pedido multi-día: usar el día MÁS TARDE
    const fechasOrdenadas = [...o.fechas_evento]
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b - a); // Ordenar descendente
    
    if (fechasOrdenadas.length > 0) {
      ultimoDia = fechasOrdenadas[0];
    }
  }
  
  // Si no es multi-día o no tiene fechas_evento, usar fecha_evento
  if (!ultimoDia && o.fecha_evento) {
    ultimoDia = new Date(o.fecha_evento);
  }

  if (!ultimoDia || isNaN(ultimoDia.getTime())) return false;

  // ✅ Mostrar solo si el ÚLTIMO día ya pasó
  return ultimoDia.getTime() < hoy.getTime();
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

    // 2) Órdenes abiertas
    const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const fechaHoy = hoy.toISOString().split('T')[0];

const { data: ords } = await supabase
  .from("ordenes_pedido")
  .select("productos, fecha_evento, fechas_evento, cerrada")
  .eq("cerrada", false)
  .gte("fecha_evento", fechaHoy);

  console.log('📋 Pedidos filtrados:', ords?.length, ords);

    const ordenes = ords || [];
    const fecha = String(fechaISO).slice(0, 10);

    let reservado = 0;
    
    // ✅ CORRECCIÓN: Contar cada pedido UNA SOLA VEZ
    ordenes.forEach((o) => {
      const dias = new Set([
        ...(o.fecha_evento ? [String(o.fecha_evento).slice(0, 10)] : []),
        ...((o.fechas_evento || []).map((d) => String(d).slice(0, 10))),
      ]);
      
      // 🆕 CONSOLE LOG 1: Ver qué pedido se está procesando
      console.log('🔄 Procesando orden:', {
        fecha_evento: o.fecha_evento,
        tiene_fecha_consultada: dias.has(fecha),
        fecha_consultada: fecha
      });
      
      // ✅ Si el pedido NO incluye esta fecha, ignorarlo
      if (!dias.has(fecha)) return;

      // ✅ Contar los productos UNA VEZ (no multiplicar por días)
      (o.productos || []).forEach((p) => {
        if (p.es_grupo && Array.isArray(p.productos)) {
          p.productos.forEach((sub) => {
            const id = sub.producto_id || sub.id;
            const cant = (Number(sub.cantidad) || 0) * (Number(p.cantidad) || 1);
            if (id === productoId) {
              // 🆕 CONSOLE LOG 2: Ver grupos encontrados
              console.log('🔢 Grupo encontrado:', {
                nombre_grupo: p.nombre,
                cant_grupo: p.cantidad,
                producto_dentro: sub.nombre,
                cant_producto: sub.cantidad,
                cant_calculada: cant
              });
              reservado += cant;
            }
          });
        } else {
          const id = p.producto_id || p.id;
          if (id === productoId) {
            // 🆕 CONSOLE LOG 3: Ver productos encontrados
            console.log('🔢 Producto encontrado:', {
              nombre: p.nombre,
              cantidad: p.cantidad
            });
            reservado += (Number(p.cantidad) || 0);
          }
        }
      });
    });

    // 🆕 CONSOLE LOG 4: Ver el resultado final
    console.log('📊 TOTAL RESERVADO:', reservado);
    console.log('📦 STOCK BASE:', stockBase);
    console.log('✅ DISPONIBLE:', stockBase - reservado);

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
      <div className="p-4 pb-20 md:pb-4">
        <h1 className="text-xl font-bold mb-4">Bienvenido</h1>

        {/* TABLA VISUAL CON SCROLL INTERNO - MÁS COMPACTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Columna izquierda - Activos */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 shadow-sm">
            <h2 className="text-base font-semibold text-blue-800 mb-2 text-center">
              Pedidos activos más próximos
            </h2>
            {ordenesProximas.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-2">No hay pedidos próximos.</p>
            ) : (
              <div className="h-36 overflow-y-auto pr-1">
                <ul className="space-y-2">
                  {ordenesProximas.map((orden) => (
                    <li
                      key={orden.id}
                      className="bg-white p-2 rounded-lg shadow-sm flex justify-between items-center hover:bg-blue-100 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-blue-700 text-sm truncate">
                          {orden.numero || "OP-???"}
                        </p>
                        <p className="text-gray-800 text-sm truncate">
                          {orden.clientes?.nombre || "Cliente"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {soloFecha(orden.fecha_evento) || "-"}
                        </p>
                      </div>
                      <div className="flex gap-1 text-base ml-2 flex-shrink-0 items-center">
                        <IconoPago orden={orden} />
                        <button onClick={() => editarOrden(orden)} title="Editar" className="p-1 hover:bg-blue-200 rounded">
                          ✏️
                        </button>
                        <button onClick={() => manejarPDF(orden)} title="PDF" className="p-1 hover:bg-blue-200 rounded">
                          📄
                        </button>
                        <button onClick={() => manejarRemision(orden)} title="Remisión" className="p-1 hover:bg-blue-200 rounded">
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
          <div className="bg-red-50 rounded-lg border border-red-200 p-3 shadow-sm">
            <h2 className="text-base font-semibold text-red-700 mb-2 text-center">
              Pedidos pendientes por revisar
            </h2>
            {ordenesPendientes.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-2">No hay pedidos pendientes.</p>
            ) : (
              <div className="h-36 overflow-y-auto pr-1">
                <ul className="space-y-2">
                  {ordenesPendientes.map((orden) => (
                    <li
                      key={orden.id}
                      className="bg-white p-2 rounded-lg shadow-sm flex justify-between items-center hover:bg-red-100 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-red-700 text-sm truncate">
                          {orden.numero || "OP-???"}
                        </p>
                        <p className="text-gray-800 text-sm truncate">
                          {orden.clientes?.nombre || "Cliente"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {soloFecha(orden.fecha_evento) || "-"}
                        </p>
                      </div>
                      <div className="flex gap-1 text-base ml-2 flex-shrink-0 items-center">
                        <IconoPago orden={orden} />
                        <button
                          onClick={() => navigate(`/recepcion?id=${orden.id}`)}
                          title="Revisar"
                          className="p-1 hover:bg-red-200 rounded"
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

        {/* ───────────────── Consulta rápida de stock - MÁS COMPACTA ───────────────── */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Consulta rápida de stock</h3>

          <div className="flex flex-col md:flex-row gap-2 items-center">
            {/* Fecha */}
            <input
              type="date"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              className="border rounded-md px-2 py-1.5 w-full md:w-[140px] text-sm"
              title="Seleccione la fecha a consultar"
            />

            {/* Buscador con sugerencias */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={busqProd}
                onChange={(e) => {
                  setBusqProd(e.target.value);
                  setProdSel(null);
                  setStockConsulta(null);
                }}
                placeholder="Buscar producto del inventario..."
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              />
              {sugerencias.length > 0 && (
                <ul className="absolute z-30 bg-white border rounded-md mt-1 max-h-48 overflow-y-auto w-full shadow-lg text-sm">
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

            {/* Resultado */}
            <div
              className="w-full md:w-[140px] text-sm font-semibold text-center px-2 py-1.5 rounded-md border"
              style={{
                backgroundColor: "rgba(168, 181, 162, 0.18)",
                borderColor: "rgba(168, 181, 162, 0.6)",
                color: "#1f2937",
              }}
              title="Unidades disponibles para la fecha seleccionada"
            >
              {prodSel && fechaConsulta
                ? (cargandoStock ? "..." : `Disp: ${stockConsulta ?? "—"}`)
                : "Disponible:"}
            </div>
          </div>
        </div>

        {/* MENÚ VISUAL DE ÍCONOS - COMPACTO CON CÍRCULOS */}
        <h2 className="text-base font-semibold mb-3 text-center">Menú Principal</h2>
        <div 
          className="menu-grid-compacto"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            justifyItems: "center",
            maxWidth: "500px",
            margin: "0 auto"
          }}
        >
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
      </div>
    </Protegido>
  );
};

export default Inicio;