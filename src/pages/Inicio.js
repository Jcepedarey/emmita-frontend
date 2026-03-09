// src/pages/Inicio.js
import React, { useEffect, useState, useRef } from "react";
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

// 🆕 Formato corto dd/mm para tarjetas
const fechaCorta = (valor) => {
  if (!valor) return null;
  const s = String(valor).trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}` : null;
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
  const [devolucionesVencidas, setDevolucionesVencidas] = useState([]); // 🆕

  // 🆕 Estados para pestañas
  const [tabIzquierda, setTabIzquierda] = useState("pedidos"); // "pedidos" | "cotizaciones"
  const [tabDerecha, setTabDerecha] = useState("revisar"); // "revisar" | "pagos" | "devoluciones"

  // 🔎 Consulta rápida de stock
  const [busqProd, setBusqProd] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [prodSel, setProdSel] = useState(null);
  const [fechaConsulta, setFechaConsulta] = useState("");
  const [stockConsulta, setStockConsulta] = useState(null);
  const [cargandoStock, setCargandoStock] = useState(false);

  // 👤 Nombre del usuario logueado
  const [nombreUsuario, setNombreUsuario] = useState("");
  const seleccionandoRef = useRef(false); // evita re-buscar al seleccionar sugerencia

  useEffect(() => {
    const cargarNombreUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .single();
      if (profile?.nombre) {
        // Extraer solo el primer nombre
        const primerNombre = profile.nombre.trim().split(/\s+/)[0];
        setNombreUsuario(primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase());
      }
    };
    cargarNombreUsuario();
  }, []);

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

      // 🆕 Devoluciones vencidas: pasó fecha_devolucion y no se ha marcado mercancia_devuelta
      const devVencidas = (data || []).filter((o) => {
        if (o.cerrada || o.mercancia_devuelta) return false;
        // Calcular fecha de devolución esperada
        let fechaDev = o.fecha_devolucion;
        if (!fechaDev) {
          // Fallback: día siguiente al último día del evento
          let ultimoDia = o.fecha_evento;
          if (o.multi_dias && Array.isArray(o.fechas_evento) && o.fechas_evento.length > 0) {
            const sorted = [...o.fechas_evento].sort();
            ultimoDia = sorted[sorted.length - 1];
          }
          if (!ultimoDia) return false;
          const ud = new Date(ultimoDia);
          ud.setDate(ud.getDate() + 1);
          fechaDev = ud.toISOString().slice(0, 10);
        }
        const fd = new Date(fechaDev);
        if (isNaN(fd.getTime())) return false;
        return fd.getTime() < hoy.getTime();
      });
      setDevolucionesVencidas(devVencidas);
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
    // Si acabamos de seleccionar una sugerencia, no re-buscar
    if (seleccionandoRef.current) {
      seleccionandoRef.current = false;
      return;
    }
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
            <h1 style={estilos.titulo}>Bienvenido{nombreUsuario ? `, ${nombreUsuario}` : ""} 👋</h1>
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
                          {/* 🆕 Fechas de entrega y devolución */}
                          {(orden.fecha_entrega || orden.fecha_devolucion) && (
                            <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>
                              {fechaCorta(orden.fecha_entrega) && `📦 ${fechaCorta(orden.fecha_entrega)}`}
                              {orden.fecha_entrega && orden.fecha_devolucion && "  ·  "}
                              {fechaCorta(orden.fecha_devolucion) && `📥 ${fechaCorta(orden.fecha_devolucion)}`}
                            </p>
                          )}
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

                {/* 🆕 Botón Ver todos */}
                {tabIzquierda === "pedidos" && ordenesProximas.length > 0 && (
                  <div style={{ textAlign: "center", padding: "8px 0 4px", borderTop: "1px solid #f3f4f6" }}>
                    <button onClick={() => navigate("/ruta-entregas")}
                      style={{ background: "none", border: "none", color: "#0077B6", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                      Ver todos ({ordenesProximas.length}) →
                    </button>
                  </div>
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
                  💰 Pagos
                </button>
              </div>

              {/* 🆕 Alerta de devoluciones vencidas */}
              {devolucionesVencidas.length > 0 && tabDerecha !== "devoluciones" && (
                <div
                  onClick={() => setTabDerecha("devoluciones")}
                  style={{
                    padding: "8px 12px", margin: "0 12px 8px", borderRadius: 8,
                    background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    fontSize: 12, color: "#991b1b", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  🚨 {devolucionesVencidas.length} pedido{devolucionesVencidas.length > 1 ? "s" : ""} con devolución vencida — click para ver
                </div>
              )}

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
                ) : tabDerecha === "devoluciones" ? (
                  // 🆕 DEVOLUCIONES VENCIDAS
                  devolucionesVencidas.length === 0 ? (
                    <p style={estilos.noData}>No hay devoluciones vencidas 🎉</p>
                  ) : (
                    devolucionesVencidas.slice(0, 10).map((orden) => {
                      let fechaDev = orden.fecha_devolucion;
                      if (!fechaDev) {
                        let ultimoDia = orden.fecha_evento;
                        if (orden.multi_dias && Array.isArray(orden.fechas_evento) && orden.fechas_evento.length > 0) {
                          const sorted = [...orden.fechas_evento].sort();
                          ultimoDia = sorted[sorted.length - 1];
                        }
                        if (ultimoDia) {
                          const ud = new Date(ultimoDia);
                          ud.setDate(ud.getDate() + 1);
                          fechaDev = ud.toISOString().slice(0, 10);
                        }
                      }
                      const diasRetraso = fechaDev ? Math.floor((new Date() - new Date(fechaDev)) / 86400000) : 0;
                      return (
                        <div key={orden.id} style={{
                          ...estilos.pedidoCard,
                          backgroundColor: "#fef2f2",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                        }}>
                          <div style={estilos.pedidoInfo}>
                            <p style={{ ...estilos.pedidoNumero, color: '#dc2626' }}>{orden.numero || "OP-???"}</p>
                            <p style={estilos.pedidoCliente}>{orden.clientes?.nombre || "Cliente"}</p>
                            <p style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, margin: 0 }}>
                              ⏰ {diasRetraso} día{diasRetraso !== 1 ? "s" : ""} de retraso
                            </p>
                          </div>
                          <div style={estilos.pedidoAcciones}>
                            <button style={{ ...estilos.btnIcono, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                              onClick={() => navigate(`/recepcion?id=${orden.id}`)} title="Recepción">📝</button>
                            <button style={{ ...estilos.btnIcono, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                              onClick={() => editarOrden(orden)} title="Editar">✏️</button>
                          </div>
                        </div>
                      );
                    })
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
                          <p style={estilos.pedidoFecha}>{soloFecha(orden.fecha_evento) || "-"}</p>
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
                            ✏️
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

                {/* 🆕 Botón Ver todos para pagos pendientes */}
                {tabDerecha === "pagos" && ordenesSaldoPendiente.length > 0 && (
                  <div style={{ textAlign: "center", padding: "8px 0 4px", borderTop: "1px solid #f3f4f6" }}>
                    <button onClick={() => navigate("/pagos-pendientes")}
                      style={{ background: "none", border: "none", color: "#6d28d9", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                      Ver todos ({ordenesSaldoPendiente.length}) →
                    </button>
                  </div>
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
              
              <div style={{ position: 'relative', flex: 1, minWidth: '220px', zIndex: 50 }}>
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
                    maxHeight: '35vh',
                    overflowY: 'scroll',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    zIndex: 200,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    listStyle: 'none',
                    padding: '0 0 70px 0',
                    margin: 0
                  }}>
                    {sugerencias.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            seleccionandoRef.current = true;
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
                            borderBottom: '1px solid #f3f4f6',
                            color: '#1f2937'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#f0f9ff'}
                          onMouseOut={(e) => e.target.style.background = 'none'}
                        >
                          {s.nombre} <span style={{ color: '#9ca3af', fontSize: 12 }}>· Stock: {s.stock}</span>
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

          {/* ─── Footer informativo ─── */}
          <div style={{
            marginTop: 32,
            padding: '20px 16px',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            textAlign: 'center',
            marginBottom: 5
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <a href="https://wa.me/573214909600?text=Hola%2C%20necesito%20ayuda%20con%20SwAlquiler" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: '#ecfdf5', color: '#059669',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  border: '1px solid #bbf7d0'
                }}>
                💬 Soporte
              </a>
              <a href="https://www.instagram.com/swalquiler" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: '#fdf2f8', color: '#db2777',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  border: '1px solid #fbcfe8'
                }}>
                📸 Tutoriales
              </a>
              <a href="https://www.swalquiler.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: '#f0f9ff', color: '#0077B6',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  border: '1px solid #bae6fd'
                }}>
                🌐 swalquiler.com
              </a>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
              SwAlquiler v1.0 · Gestión de alquiler y eventos
              <br />
              📧 soporte@swalquiler.com
            </p>
          </div>

        </div>
      </div>
    </Protegido>
  );
};

export default Inicio;