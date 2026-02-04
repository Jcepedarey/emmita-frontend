// src/pages/Inicio.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/EstilosGlobales.css";

// ========== COMPONENTES INTERNOS ==========

// Icono de estado de pago
const IconoPago = ({ orden }) => {
  const totalNeto = Number(orden.total_neto || orden.total || 0);
  const sumaAbonos = (orden.abonos || []).reduce((acc, ab) => acc + Number(ab.valor || ab || 0), 0);
  const saldo = Math.max(0, totalNeto - sumaAbonos);
  const estaPagado = saldo === 0 && totalNeto > 0;

  return (
    <div
      className={`sw-icono-pago ${estaPagado ? 'pagado' : 'pendiente'}`}
      title={estaPagado ? "Pagado" : `Saldo: $${saldo.toLocaleString()}`}
    >
      $
    </div>
  );
};

// Helper para formatear fechas
const soloFecha = (valor) => {
  if (!valor) return "";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ========== COMPONENTE PRINCIPAL ==========
const Inicio = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  // Estados para datos
  const [ordenesProximas, setOrdenesProximas] = useState([]);
  const [cotizacionesProximas, setCotizacionesProximas] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [ordenesSaldoPendiente, setOrdenesSaldoPendiente] = useState([]);

  // 🆕 Estados para pestañas
  const [tabIzquierda, setTabIzquierda] = useState("pedidos"); // "pedidos" | "cotizaciones"
  const [tabDerecha, setTabDerecha] = useState("revisar"); // "revisar" | "pagos"

  // 🔎 Consulta rápida de stock
  const [busqProd, setBusqProd] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [prodSel, setProdSel] = useState(null);
  const [fechaConsulta, setFechaConsulta] = useState("");
  const [stockConsulta, setStockConsulta] = useState(null);
  const [cargandoStock, setCargandoStock] = useState(false);

  // ───────────────────── Cargar órdenes ─────────────────────
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

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Pedidos próximos (fecha_evento >= hoy)
      const proximas = (data || []).filter((o) => {
        const f = new Date(o.fecha_evento);
        if (isNaN(f.getTime())) return false;
        return f.getTime() >= hoy.getTime();
      });

      // Pedidos pendientes de revisar (vencidos y no revisados)
      const vencidas = (data || []).filter((o) => {
        if (o.revisada) return false;
        let ultimoDia;
        
        if (o.multi_dias && Array.isArray(o.fechas_evento) && o.fechas_evento.length > 0) {
          const fechasOrdenadas = [...o.fechas_evento]
            .map(d => new Date(d))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => b - a);
          
          if (fechasOrdenadas.length > 0) {
            ultimoDia = fechasOrdenadas[0];
          }
        }
        
        if (!ultimoDia && o.fecha_evento) {
          ultimoDia = new Date(o.fecha_evento);
        }

        if (!ultimoDia || isNaN(ultimoDia.getTime())) return false;
        return ultimoDia.getTime() < hoy.getTime();
      });

      // 🆕 Pedidos con saldo pendiente (tienen deuda)
      const conSaldo = (data || []).filter((o) => {
        const totalNeto = Number(o.total_neto || o.total || 0);
        const sumaAbonos = (o.abonos || []).reduce((acc, ab) => acc + Number(ab.valor || ab || 0), 0);
        const saldo = totalNeto - sumaAbonos;
        return saldo > 0 && totalNeto > 0;
      });

      setOrdenesProximas(proximas);
      setOrdenesPendientes(vencidas);
      setOrdenesSaldoPendiente(conSaldo);
    };

    cargarOrdenes();
  }, []);

  // ───────────────────── 🆕 Cargar cotizaciones próximas ─────────────────────
  useEffect(() => {
    const cargarCotizaciones = async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*, clientes(*)")
        .order("fecha_evento", { ascending: true });

      if (error) {
        console.error("Error cargando cotizaciones:", error);
        return;
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Cotizaciones con fecha_evento >= hoy
      const proximas = (data || []).filter((c) => {
        const f = new Date(c.fecha_evento);
        if (isNaN(f.getTime())) return false;
        return f.getTime() >= hoy.getTime();
      });

      setCotizacionesProximas(proximas);
    };

    cargarCotizaciones();
  }, []);

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
      const { data: prod } = await supabase
        .from("productos")
        .select("id, stock")
        .eq("id", productoId)
        .single();
      const stockBase = parseInt(prod?.stock ?? 0, 10);

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaHoy = hoy.toISOString().split('T')[0];

      const { data: ords } = await supabase
        .from("ordenes_pedido")
        .select("productos, fecha_evento, fechas_evento, cerrada")
        .eq("cerrada", false)
        .gte("fecha_evento", fechaHoy);

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
              const cant = (Number(sub.cantidad) || 0) * (Number(p.cantidad) || 1);
              if (id === productoId) {
                reservado += cant;
              }
            });
          } else {
            const id = p.producto_id || p.id;
            if (id === productoId) {
              reservado += (Number(p.cantidad) || 0);
            }
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

    navigate("/crear-documento", {
      state: {
        documento: documentoCompleto,
        tipo: "orden",
      },
    });
  };

  // 🆕 Editar cotización
  const editarCotizacion = (cotizacion) => {
    const cliente = cotizacion.clientes || {};

    const documentoCompleto = {
      ...cotizacion,
      nombre_cliente: cliente.nombre || "",
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      email: cliente.email || "",
      fecha_creacion: cotizacion.fecha_creacion || cotizacion.fecha || null,
      estado: cotizacion.estado || "",
      numero: cotizacion.numero || "",
      esEdicion: true,
      idOriginal: cotizacion.id,
    };

    navigate("/crear-documento", {
      state: {
        documento: documentoCompleto,
        tipo: "cotizacion",
      },
    });
  };

  const manejarPDF = async (orden) => {
    const doc = {
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "N/A",
      identificacion: orden.clientes?.identificacion || "N/A",
      telefono: orden.clientes?.telefono || "N/A",
      direccion: orden.clientes?.direccion || "N/A",
      email: orden.clientes?.email || "N/A",
      fecha_creacion: soloFecha(orden.fecha_creacion || orden.fecha),
      fecha_evento: soloFecha(orden.fecha_evento),
    };

    await generarPDF(doc, "orden");
  };

  // 🆕 PDF de cotización
  const manejarPDFCotizacion = async (cotizacion) => {
    const doc = {
      ...cotizacion,
      nombre_cliente: cotizacion.clientes?.nombre || "N/A",
      identificacion: cotizacion.clientes?.identificacion || "N/A",
      telefono: cotizacion.clientes?.telefono || "N/A",
      direccion: cotizacion.clientes?.direccion || "N/A",
      email: cotizacion.clientes?.email || "N/A",
      fecha_creacion: soloFecha(cotizacion.fecha_creacion || cotizacion.fecha),
      fecha_evento: soloFecha(cotizacion.fecha_evento),
    };

    await generarPDF(doc, "cotizacion");
  };

  const manejarRemision = async (orden) => {
    const doc = {
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "N/A",
      identificacion: orden.clientes?.identificacion || "N/A",
      telefono: orden.clientes?.telefono || "N/A",
      direccion: orden.clientes?.direccion || "N/A",
      email: orden.clientes?.email || "N/A",
      fecha_creacion: soloFecha(orden.fecha_creacion || orden.fecha),
      fecha_evento: soloFecha(orden.fecha_evento),
    };

    await generarRemision(doc);
  };

  // 🆕 Calcular saldo de una orden
  const calcularSaldo = (orden) => {
    const totalNeto = Number(orden.total_neto || orden.total || 0);
    const sumaAbonos = (orden.abonos || []).reduce((acc, ab) => acc + Number(ab.valor || ab || 0), 0);
    return Math.max(0, totalNeto - sumaAbonos);
  };

  // ═══════════════════════════════════════════════════════════════
  // ESTILOS
  // ═══════════════════════════════════════════════════════════════
  const estilos = {
    pagina: {
      minHeight: "calc(100vh - 56px)",
      backgroundColor: "#ffffff",
      padding: "0",
    },
    contenido: {
      maxWidth: "1000px", // 🔧 Reducido para centrar mejor
      margin: "0 auto",
      padding: "20px",
      paddingLeft: "0px", // 🔧 Ajustado para centrar
    },
    header: {
      marginBottom: "20px",
    },
    titulo: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#1f2937",
      borderLeft: "4px solid #00B4D8",
      paddingLeft: "12px",
    },
    gridPedidos: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: "24px",
      marginBottom: "24px",
    },
    card: {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      minHeight: "340px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      transition: "border-color 0.3s ease",
    },
    // 🆕 Estilos de pestañas
    tabsContainer: {
      display: "flex",
      gap: "0",
    },
    tab: {
      flex: 1,
      padding: "12px 8px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "all 0.3s ease",
      borderRadius: "0",
    },
    tabActivePedidos: {
      background: "linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)",
      color: "#ffffff",
    },
    tabInactivePedidos: {
      background: "#e0f2fe",
      color: "#0077B6",
    },
    tabActiveCotizaciones: {
      background: "linear-gradient(135deg, #86A789 0%, #739072 100%)", // Verde sage
      color: "#ffffff",
    },
    tabInactiveCotizaciones: {
      background: "#dcfce7",
      color: "#166534",
    },
    tabActiveRevisar: {
      background: "linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)",
      color: "#dc2626",
    },
    tabInactiveRevisar: {
      background: "#fee2e2",
      color: "#dc2626",
    },
    tabActivePagos: {
      background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)", // Morado
      color: "#ffffff",
    },
    tabInactivePagos: {
      background: "#ede9fe",
      color: "#6d28d9",
    },
    cardBody: {
      padding: "16px",
      maxHeight: "280px",
      overflowY: "auto",
    },
    pedidoCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px",
      backgroundColor: "#fafafa",
      borderRadius: "8px",
      marginBottom: "8px",
      border: "1px solid rgba(0,0,0,0.05)",
    },
    pedidoInfo: {
      flex: 1,
    },
    pedidoNumero: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#0077B6",
      margin: "0 0 2px 0",
    },
    pedidoCliente: {
      fontSize: "13px",
      color: "#374151",
      margin: "0 0 2px 0",
    },
    pedidoFecha: {
      fontSize: "12px",
      color: "#9ca3af",
      margin: 0,
    },
    pedidoSaldo: {
      fontSize: "12px",
      color: "#dc2626",
      fontWeight: "500",
      margin: 0,
    },
    pedidoAcciones: {
      display: "flex",
      gap: "6px",
    },
    btnIcono: {
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,180,216,0.1)",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      transition: "background-color 0.2s",
    },
    stockSeccion: {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      padding: "20px",
      marginBottom: "20px",
    },
    stockTitulo: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "16px",
    },
    stockForm: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      alignItems: "center",
    },
    stockInput: {
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
    },
    stockResultado: {
      padding: "10px 20px",
      backgroundColor: "#f0f9ff",
      borderRadius: "8px",
      border: "1px solid #bae6fd",
      fontSize: "14px",
      fontWeight: "500",
      color: "#0369a1",
    },
    noData: {
      textAlign: "center",
      color: "#9ca3af",
      padding: "24px 0",
      fontSize: "14px",
    },
  };

  return (
    <Protegido>
      <div style={estilos.pagina}>
        <div style={estilos.contenido}>
          
          {/* Header */}
          <div style={estilos.header}>
            <h1 style={estilos.titulo}>Bienvenido</h1>
          </div>

          {/* Grid de pedidos */}
          <div style={estilos.gridPedidos}>
            
            {/* ═══════════════════════════════════════════════════════════
                CUADRO IZQUIERDO: Pedidos / Cotizaciones próximas
            ═══════════════════════════════════════════════════════════ */}
            <div style={{
              ...estilos.card,
              borderColor: tabIzquierda === "pedidos" ? "rgba(0,180,216,0.3)" : "rgba(134,167,137,0.3)",
            }}>
              {/* Pestañas */}
              <div style={estilos.tabsContainer}>
                <button
                  onClick={() => setTabIzquierda("pedidos")}
                  style={{
                    ...estilos.tab,
                    ...(tabIzquierda === "pedidos" ? estilos.tabActivePedidos : estilos.tabInactivePedidos),
                    borderTopLeftRadius: "12px",
                  }}
                >
                  📅 Próximos pedidos
                </button>
                <button
                  onClick={() => setTabIzquierda("cotizaciones")}
                  style={{
                    ...estilos.tab,
                    ...(tabIzquierda === "cotizaciones" ? estilos.tabActiveCotizaciones : estilos.tabInactiveCotizaciones),
                    borderTopRightRadius: "12px",
                  }}
                >
                  📅 Próximas cotizaciones
                </button>
              </div>

              {/* Contenido según pestaña */}
              <div style={estilos.cardBody}>
                {tabIzquierda === "pedidos" ? (
                  // PEDIDOS PRÓXIMOS
                  ordenesProximas.length === 0 ? (
                    <p style={estilos.noData}>No hay pedidos próximos</p>
                  ) : (
                    ordenesProximas.slice(0, 10).map((orden) => (
                      <div key={orden.id} style={estilos.pedidoCard}>
                        <div style={estilos.pedidoInfo}>
                          <p style={estilos.pedidoNumero}>{orden.numero || "OP-???"}</p>
                          <p style={estilos.pedidoCliente}>{orden.clientes?.nombre || "Cliente"}</p>
                          <p style={estilos.pedidoFecha}>{soloFecha(orden.fecha_evento) || "-"}</p>
                        </div>
                        <div style={estilos.pedidoAcciones}>
                          <IconoPago orden={orden} />
                          <button style={estilos.btnIcono} onClick={() => editarOrden(orden)} title="Editar">
                            ✏️
                          </button>
                          <button style={estilos.btnIcono} onClick={() => manejarPDF(orden)} title="PDF">
                            📄
                          </button>
                          <button style={estilos.btnIcono} onClick={() => manejarRemision(orden)} title="Remisión">
                            🚚
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  // COTIZACIONES PRÓXIMAS
                  cotizacionesProximas.length === 0 ? (
                    <p style={estilos.noData}>No hay cotizaciones próximas</p>
                  ) : (
                    cotizacionesProximas.slice(0, 10).map((cot) => (
                      <div key={cot.id} style={{
                        ...estilos.pedidoCard,
                        backgroundColor: "#f0fdf4",
                        border: "1px solid rgba(134,167,137,0.2)",
                      }}>
                        <div style={estilos.pedidoInfo}>
                          <p style={{ ...estilos.pedidoNumero, color: "#166534" }}>
                            {cot.numero || "COT-???"}
                          </p>
                          <p style={estilos.pedidoCliente}>{cot.clientes?.nombre || "Cliente"}</p>
                          <p style={estilos.pedidoFecha}>{soloFecha(cot.fecha_evento) || "-"}</p>
                        </div>
                        <div style={estilos.pedidoAcciones}>
                          <button 
                            style={{ ...estilos.btnIcono, backgroundColor: "rgba(134,167,137,0.15)" }} 
                            onClick={() => editarCotizacion(cot)} 
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            style={{ ...estilos.btnIcono, backgroundColor: "rgba(134,167,137,0.15)" }} 
                            onClick={() => manejarPDFCotizacion(cot)} 
                            title="PDF"
                          >
                            📄
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                CUADRO DERECHO: Por revisar / Pagos pendientes
            ═══════════════════════════════════════════════════════════ */}
            <div style={{
              ...estilos.card,
              borderColor: tabDerecha === "revisar" ? "rgba(239, 68, 68, 0.3)" : "rgba(139, 92, 246, 0.3)",
            }}>
              {/* Pestañas */}
              <div style={estilos.tabsContainer}>
                <button
                  onClick={() => setTabDerecha("revisar")}
                  style={{
                    ...estilos.tab,
                    ...(tabDerecha === "revisar" ? estilos.tabActiveRevisar : estilos.tabInactiveRevisar),
                    borderTopLeftRadius: "12px",
                  }}
                >
                  ⚠️ Por revisar
                </button>
                <button
                  onClick={() => setTabDerecha("pagos")}
                  style={{
                    ...estilos.tab,
                    ...(tabDerecha === "pagos" ? estilos.tabActivePagos : estilos.tabInactivePagos),
                    borderTopRightRadius: "12px",
                  }}
                >
                  💰 Pagos pendientes
                </button>
              </div>

              {/* Contenido según pestaña */}
              <div style={estilos.cardBody}>
                {tabDerecha === "revisar" ? (
                  // PEDIDOS POR REVISAR
                  ordenesPendientes.length === 0 ? (
                    <p style={estilos.noData}>No hay pedidos pendientes</p>
                  ) : (
                    ordenesPendientes.map((orden) => (
                      <div key={orden.id} style={{
                        ...estilos.pedidoCard,
                        backgroundColor: "#fef2f2",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                      }}>
                        <div style={estilos.pedidoInfo}>
                          <p style={{ ...estilos.pedidoNumero, color: '#dc2626' }}>
                            {orden.numero || "OP-???"}
                          </p>
                          <p style={estilos.pedidoCliente}>{orden.clientes?.nombre || "Cliente"}</p>
                          <p style={estilos.pedidoFecha}>{soloFecha(orden.fecha_evento) || "-"}</p>
                        </div>
                        <div style={estilos.pedidoAcciones}>
                          <IconoPago orden={orden} />
                          <button 
                            style={{ ...estilos.btnIcono, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                            onClick={() => navigate(`/recepcion?id=${orden.id}`)}
                            title="Revisar"
                          >
                            📝
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  // PAGOS PENDIENTES
                  ordenesSaldoPendiente.length === 0 ? (
                    <p style={estilos.noData}>No hay pagos pendientes</p>
                  ) : (
                    ordenesSaldoPendiente.slice(0, 10).map((orden) => (
                      <div key={orden.id} style={{
                        ...estilos.pedidoCard,
                        backgroundColor: "#faf5ff",
                        border: "1px solid rgba(139, 92, 246, 0.15)",
                      }}>
                        <div style={estilos.pedidoInfo}>
                          <p style={{ ...estilos.pedidoNumero, color: '#6d28d9' }}>
                            {orden.numero || "OP-???"}
                          </p>
                          <p style={estilos.pedidoCliente}>{orden.clientes?.nombre || "Cliente"}</p>
                          <p style={estilos.pedidoSaldo}>
                            Saldo: ${calcularSaldo(orden).toLocaleString()}
                          </p>
                        </div>
                        <div style={estilos.pedidoAcciones}>
                          <button 
                            style={{ ...estilos.btnIcono, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                            onClick={() => editarOrden(orden)}
                            title="Ver pedido"
                          >
                            👁️
                          </button>
                          <button 
                            style={{ ...estilos.btnIcono, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                            onClick={() => manejarPDF(orden)}
                            title="PDF"
                          >
                            📄
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* Consulta de stock */}
          <div style={estilos.stockSeccion}>
            <h3 style={estilos.stockTitulo}>📊 Consulta rápida de stock</h3>
            <div style={estilos.stockForm}>
              <input
                type="date"
                value={fechaConsulta}
                onChange={(e) => setFechaConsulta(e.target.value)}
                style={{ ...estilos.stockInput, maxWidth: '160px' }}
                title="Fecha a consultar"
              />
              
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  value={busqProd}
                  onChange={(e) => {
                    setBusqProd(e.target.value);
                    setProdSel(null);
                    setStockConsulta(null);
                  }}
                  placeholder="Buscar producto del inventario..."
                  style={{ ...estilos.stockInput, width: '100%' }}
                />
                {sugerencias.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 50,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {sugerencias.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setProdSel(s);
                            setBusqProd(s.nombre);
                            setSugerencias([]);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#f0f9ff'}
                          onMouseOut={(e) => e.target.style.background = 'none'}
                        >
                          {s.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={estilos.stockResultado}>
                {prodSel && fechaConsulta
                  ? (cargandoStock ? "⏳" : `Disponible: ${stockConsulta ?? "—"}`)
                  : "Disponible:"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Protegido>
  );
};

export default Inicio;