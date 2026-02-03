// src/pages/Inicio.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/EstilosGlobales.css";

// ========== COMPONENTES INTERNOS ==========

// Botón de módulo del menú (solo para PC - en móvil usamos sidebar/bottom nav)
const BotonModulo = ({ titulo, imagen, onClick }) => (
  <div className="sw-menu-item" onClick={onClick}>
    <div className="sw-menu-icono">
      <img src={imagen} alt={titulo} />
    </div>
    <span className="sw-menu-texto">{titulo}</span>
  </div>
);

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

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const proximas = (data || []).filter((o) => {
        const f = new Date(o.fecha_evento);
        if (isNaN(f.getTime())) return false;
        return f.getTime() >= hoy.getTime();
      });

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

      setOrdenesProximas(proximas);
      setOrdenesPendientes(vencidas);
    };

    cargarOrdenes();
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

  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido sw-animate-in">
          
          {/* Header */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">Bienvenido</h1>
          </div>

          {/* Grid de pedidos */}
          <div className="sw-pedidos-grid">
            
            {/* Pedidos próximos */}
            <div className="sw-card">
              <div className="sw-card-header sw-card-header-cyan">
                <h2 className="sw-card-titulo">
                  📅 Pedidos activos más próximos
                </h2>
              </div>
              <div className="sw-card-body">
                {ordenesProximas.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0' }}>
                    No hay pedidos próximos
                  </p>
                ) : (
                  <div className="sw-scroll-lista">
                    {ordenesProximas.slice(0, 10).map((orden) => (
                      <div key={orden.id} className="sw-pedido-card">
                        <div className="sw-pedido-info">
                          <p className="sw-pedido-numero">{orden.numero || "OP-???"}</p>
                          <p className="sw-pedido-cliente">{orden.clientes?.nombre || "Cliente"}</p>
                          <p className="sw-pedido-fecha">{soloFecha(orden.fecha_evento) || "-"}</p>
                        </div>
                        <div className="sw-pedido-acciones">
                          <IconoPago orden={orden} />
                          <button className="sw-btn-icono" onClick={() => editarOrden(orden)} title="Editar">
                            ✏️
                          </button>
                          <button className="sw-btn-icono" onClick={() => manejarPDF(orden)} title="PDF">
                            📄
                          </button>
                          <button className="sw-btn-icono" onClick={() => manejarRemision(orden)} title="Remisión">
                            🚚
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pedidos pendientes */}
            <div className="sw-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="sw-card-header" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
                <h2 className="sw-card-titulo" style={{ color: '#dc2626' }}>
                  ⚠️ Pedidos pendientes por revisar
                </h2>
              </div>
              <div className="sw-card-body">
                {ordenesPendientes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0' }}>
                    No hay pedidos pendientes
                  </p>
                ) : (
                  <div className="sw-scroll-lista">
                    {ordenesPendientes.map((orden) => (
                      <div key={orden.id} className="sw-pedido-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <div className="sw-pedido-info">
                          <p className="sw-pedido-numero" style={{ color: '#dc2626' }}>
                            {orden.numero || "OP-???"}
                          </p>
                          <p className="sw-pedido-cliente">{orden.clientes?.nombre || "Cliente"}</p>
                          <p className="sw-pedido-fecha">{soloFecha(orden.fecha_evento) || "-"}</p>
                        </div>
                        <div className="sw-pedido-acciones">
                          <IconoPago orden={orden} />
                          <button 
                            className="sw-btn-icono" 
                            onClick={() => navigate(`/recepcion?id=${orden.id}`)}
                            title="Revisar"
                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            📝
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consulta de stock */}
          <div className="sw-stock-seccion">
            <h3 className="sw-stock-titulo">📊 Consulta rápida de stock</h3>
            <div className="sw-stock-form">
              <input
                type="date"
                value={fechaConsulta}
                onChange={(e) => setFechaConsulta(e.target.value)}
                className="sw-stock-input"
                style={{ maxWidth: '150px' }}
                title="Fecha a consultar"
              />
              
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  value={busqProd}
                  onChange={(e) => {
                    setBusqProd(e.target.value);
                    setProdSel(null);
                    setStockConsulta(null);
                  }}
                  placeholder="Buscar producto del inventario..."
                  className="sw-stock-input"
                  style={{ width: '100%' }}
                />
                {sugerencias.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid var(--sw-borde)',
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

              <div className="sw-stock-resultado">
                {prodSel && fechaConsulta
                  ? (cargandoStock ? "⏳" : `Disponible: ${stockConsulta ?? "—"}`)
                  : "Disponible:"}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MENÚ PRINCIPAL - Solo visible en PC (en móvil usamos sidebar)
          ═══════════════════════════════════════════════════════════════ */}
          <div className="menu-pc-only">
            <h2 className="sw-menu-titulo">Menú Principal</h2>
            <div className="sw-menu-grid">
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
            </div>
          </div>

        </div>
      </div>
    </Protegido>
  );
};

export default Inicio;