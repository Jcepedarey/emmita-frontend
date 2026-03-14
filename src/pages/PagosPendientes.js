// src/pages/PagosPendientes.js
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import supabase from "../supabaseClient";
import { generarPDF } from "../utils/generarPDF";
import { generarRemisionPDF as generarRemision } from "../utils/generarRemision";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";

// ─── Helpers ───────────────────────────────────────────────────
const soloFecha = (valor) => {
  if (!valor) return "—";
  const s = String(valor).trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const calcularSaldo = (orden) => {
  const total = Number(orden.total_neto || orden.total || 0);
  const abonado = (orden.abonos || []).reduce(
    (acc, ab) => acc + Number(ab.valor || ab || 0),
    0
  );
  return Math.max(0, total - abonado);
};

// ═══════════════════════════════════════════════════════════════
export default function PagosPendientes() {
  const navigate = useNavigate();
  const [todasOrdenes, setTodasOrdenes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [usuario, setUsuario] = useState({ nombre: "Administrador" });

  // Leer usuario del localStorage
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("usuario"));
    if (u) setUsuario(u);
  }, []);

  // ─── Carga inicial ──────────────────────────────────────────
  const cargar = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("ordenes_pedido")
      .select("*, clientes(*)")
      .eq("cerrada", false)
      .order("fecha_evento", { ascending: true });

    if (error) {
      console.error("Error cargando órdenes:", error);
      Swal.fire("Error", "No se pudieron cargar los pedidos.", "error");
    } else {
      // Filtrar solo los que tienen saldo pendiente
      const conSaldo = (data || []).filter((o) => calcularSaldo(o) > 0);
      setTodasOrdenes(conSaldo);
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  // ─── Filtro por búsqueda ────────────────────────────────────
  const ordenesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return todasOrdenes;
    const q = busqueda.toLowerCase();
    return todasOrdenes.filter(
      (o) =>
        o.clientes?.nombre?.toLowerCase().includes(q) ||
        (o.numero || "").toLowerCase().includes(q)
    );
  }, [todasOrdenes, busqueda]);

  // ─── Totales ────────────────────────────────────────────────
  const totalPendiente = useMemo(
    () => ordenesFiltradas.reduce((acc, o) => acc + calcularSaldo(o), 0),
    [ordenesFiltradas]
  );

  // ─── Acciones de tarjeta ────────────────────────────────────
  const editarOrden = (orden) => {
    const cliente = orden.clientes || {};
    navigate("/crear-documento", {
      state: {
        documento: {
          ...orden,
          nombre_cliente: cliente.nombre || "",
          identificacion: cliente.identificacion || "",
          telefono: cliente.telefono || "",
          direccion: cliente.direccion || "",
          email: cliente.email || "",
          fecha_creacion: orden.fecha_creacion || orden.fecha || null,
          abonos: orden.abonos || [],
          garantia: orden.garantia || "",
          garantiaRecibida: orden.garantiaRecibida || false,
          estado: orden.estado || "",
          numero: orden.numero || "",
          esEdicion: true,
          idOriginal: orden.id,
        },
        tipo: "orden",
      },
    });
  };

  const manejarPDF = async (orden) => {
    await generarPDF(
      {
        ...orden,
        nombre_cliente: orden.clientes?.nombre || "N/A",
        identificacion: orden.clientes?.identificacion || "N/A",
        telefono: orden.clientes?.telefono || "N/A",
        direccion: orden.clientes?.direccion || "N/A",
        email: orden.clientes?.email || "N/A",
        fecha_creacion: orden.fecha_creacion || orden.fecha || null,
        fecha_evento: orden.fecha_evento || null,
      },
      "orden"
    );
  };

  const manejarRemision = async (orden) => {
    await generarRemision({
      ...orden,
      nombre_cliente: orden.clientes?.nombre || "N/A",
      identificacion: orden.clientes?.identificacion || "N/A",
      telefono: orden.clientes?.telefono || "N/A",
      direccion: orden.clientes?.direccion || "N/A",
      email: orden.clientes?.email || "N/A",
      fecha_creacion: orden.fecha_creacion || orden.fecha || null,
      fecha_evento: orden.fecha_evento || null,
    });
  };

  // ─── Registrar abono rápido ─────────────────────────────────
  const registrarAbono = async (orden) => {
    const saldoActual = calcularSaldo(orden);
    const fechaHoy = new Date().toISOString().slice(0, 10);

    // Pedir monto y fecha con Swal
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: `Registrar abono`,
      html: `
        <div style="text-align:left;margin-bottom:8px;">
          <strong>${orden.numero || "—"}</strong> · ${orden.clientes?.nombre || ""}
        </div>
        <div style="background:#fef9c3;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:14px;color:#92400e;">
          Saldo pendiente: <strong>$${saldoActual.toLocaleString("es-CO")}</strong>
        </div>
        <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Monto del abono</label>
        <input id="swal-monto" type="number" min="1" max="${saldoActual}" placeholder="$"
          style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;margin-bottom:12px;box-sizing:border-box;"
          value="${saldoActual}" />
        <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Fecha del abono</label>
        <input id="swal-fecha" type="date"
          style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;"
          value="${fechaHoy}" />
      `,
      showCancelButton: true,
      confirmButtonText: "✅ Registrar abono",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      focusConfirm: false,
      preConfirm: () => {
        const monto = Number(document.getElementById("swal-monto").value);
        const fecha = document.getElementById("swal-fecha").value;
        if (!monto || monto <= 0) {
          Swal.showValidationMessage("El monto debe ser mayor a 0");
          return false;
        }
        if (!fecha) {
          Swal.showValidationMessage("Selecciona una fecha");
          return false;
        }
        return { monto, fecha };
      },
    });

    if (!isConfirmed || !formValues) return;

    const { monto, fecha } = formValues;

    try {
      // ✅ Leer datos FRESCOS de la BD (mismo patrón que CrearDocumento)
      const { data: ordenFresca, error: errorFresca } = await supabase
        .from("ordenes_pedido")
        .select("abonos, abonos_registrados_contabilidad, numero, cliente_id")
        .eq("id", orden.id)
        .single();

      if (errorFresca) throw errorFresca;

      const abonosActuales = ordenFresca.abonos || [];
      const abonosYaRegistrados = ordenFresca.abonos_registrados_contabilidad || [];
      const nuevoAbono = { valor: monto, fecha };

      // 1️⃣ Actualizar el array de abonos en ordenes_pedido
      const abonosActualizados = [...abonosActuales, nuevoAbono];
      const { error: errorUpdate } = await supabase
        .from("ordenes_pedido")
        .update({ abonos: abonosActualizados })
        .eq("id", orden.id);

      if (errorUpdate) throw errorUpdate;

      // 2️⃣ Registrar en contabilidad (solo si no fue registrado ya — mismo patrón que CrearDocumento)
      const yaRegistrado = abonosYaRegistrados.find(
        (reg) => reg.valor === monto && reg.fecha === fecha
      );

      let nuevoRegistro = null;

      if (!yaRegistrado && monto > 0) {
        const numeroLimpio = (() => {
          const n = String(ordenFresca.numero || orden.numero || "");
          return n.startsWith("OP-") ? n : `OP-${n}`;
        })();

        const { data: movData, error: errorMov } = await supabase
          .from("movimientos_contables")
          .insert([{
            orden_id: orden.id,
            cliente_id: ordenFresca.cliente_id || orden.cliente_id,
            fecha,
            tipo: "ingreso",
            monto,
            descripcion: `Abono de ${orden.clientes?.nombre || ""} - ${numeroLimpio}`,
            categoria: "Abonos",
            estado: "activo",
            usuario: usuario?.nombre || "Administrador",
            fecha_modificacion: null,
          }])
          .select();

        if (errorMov) throw errorMov;

        nuevoRegistro = {
          valor: monto,
          fecha,
          movimiento_id: movData[0].id,
        };
      }

      // 3️⃣ Guardar el registro actualizado de abonos en contabilidad
      const registroFinal = nuevoRegistro
        ? [...abonosYaRegistrados, nuevoRegistro]
        : abonosYaRegistrados;

      await supabase
        .from("ordenes_pedido")
        .update({ abonos_registrados_contabilidad: registroFinal })
        .eq("id", orden.id);

      // 4️⃣ Actualizar estado local para reflejar el cambio sin recargar todo
      setTodasOrdenes((prev) =>
        prev
          .map((o) => {
            if (o.id !== orden.id) return o;
            const nuevosAbonos = [...(o.abonos || []), nuevoAbono];
            return { ...o, abonos: nuevosAbonos };
          })
          // Quitar del listado si el nuevo saldo queda en 0
          .filter((o) => calcularSaldo(o) > 0)
      );

      Swal.fire({
        icon: "success",
        title: "Abono registrado",
        text: `$${monto.toLocaleString("es-CO")} registrado correctamente.`,
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error registrando abono:", err);
      Swal.fire("Error", "No se pudo registrar el abono. Intenta de nuevo.", "error");
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>

          {/* HEADER */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">💰 Pagos Pendientes</h1>
          </div>

          {/* CONTROLES */}
          <div className="cd-card" style={{ marginBottom: 16 }}>
            <div className="cd-card-body">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {/* Buscador */}
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar por cliente o número de pedido..."
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: "10px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />

                {/* Totales */}
                <div style={{
                  display: "flex",
                  gap: 10,
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}>
                  <div style={{
                    padding: "8px 16px",
                    background: "#faf5ff",
                    borderRadius: 8,
                    border: "1px solid #e9d5ff",
                    fontSize: 13,
                    color: "#6d28d9",
                    fontWeight: 600,
                  }}>
                    {cargando ? "⏳" : `${ordenesFiltradas.length} pedido${ordenesFiltradas.length !== 1 ? "s" : ""}`}
                  </div>
                  {!cargando && totalPendiente > 0 && (
                    <div style={{
                      padding: "8px 16px",
                      background: "#fef2f2",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      fontSize: 13,
                      color: "#dc2626",
                      fontWeight: 700,
                    }}>
                      Total: ${totalPendiente.toLocaleString("es-CO")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ESTADO VACÍO */}
          {!cargando && ordenesFiltradas.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#9ca3af",
              background: "white",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>
                {busqueda ? "Sin resultados para esa búsqueda" : "No hay pagos pendientes"}
              </div>
              {!busqueda && (
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  Todos los pedidos están al día
                </div>
              )}
            </div>
          )}

          {/* SPINNER */}
          {cargando && (
            <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af", fontSize: 14 }}>
              ⏳ Cargando pedidos...
            </div>
          )}

          {/* LISTA */}
          {ordenesFiltradas.map((orden) => {
            const cliente = orden.clientes || {};
            const total = Number(orden.total_neto || orden.total || 0);
            const abonos = orden.abonos || [];
            const totalAbonado = abonos.reduce((acc, ab) => acc + Number(ab.valor || ab || 0), 0);
            const saldo = Math.max(0, total - totalAbonado);
            const pctPagado = total > 0 ? Math.min(100, Math.round((totalAbonado / total) * 100)) : 0;

            return (
              <div
                key={orden.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Header de tarjeta */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #faf5ff, #ede9fe)",
                  borderBottom: "1px solid #e9d5ff",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#6d28d9" }}>
                      {orden.numero || "OP-???"}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                      {cliente.nombre || "Sin cliente"}
                    </span>
                    {cliente.telefono && (
                      <a
                        href={`tel:${cliente.telefono}`}
                        style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}
                        title="Llamar"
                      >
                        📞 {cliente.telefono}
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    📅 {soloFecha(orden.fecha_evento)}
                  </div>
                </div>

                {/* Cuerpo */}
                <div style={{ padding: "14px 16px" }}>
                  {/* Barra de progreso */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 5,
                    }}>
                      <span>Pagado: ${totalAbonado.toLocaleString("es-CO")} ({pctPagado}%)</span>
                      <span>Total: ${total.toLocaleString("es-CO")}</span>
                    </div>
                    <div style={{
                      height: 8,
                      background: "#f3f4f6",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${pctPagado}%`,
                        background: pctPagado >= 80
                          ? "linear-gradient(90deg, #16a34a, #22c55e)"
                          : pctPagado >= 40
                          ? "linear-gradient(90deg, #d97706, #f59e0b)"
                          : "linear-gradient(90deg, #dc2626, #f87171)",
                        borderRadius: 4,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                  </div>

                  {/* Saldo y abonos */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}>
                    {/* Detalle abonos */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      {abonos.length > 0 && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                          <span style={{ fontWeight: 500, color: "#374151" }}>
                            {abonos.length} abono{abonos.length !== 1 ? "s" : ""}:
                          </span>{" "}
                          {abonos.slice(-3).map((ab, i) => (
                            <span key={i} style={{ marginRight: 6 }}>
                              ${Number(ab.valor || ab || 0).toLocaleString("es-CO")}
                              {ab.fecha ? ` (${soloFecha(ab.fecha)})` : ""}
                              {i < Math.min(abonos.length, 3) - 1 ? " ·" : ""}
                            </span>
                          ))}
                          {abonos.length > 3 && (
                            <span style={{ color: "#9ca3af" }}>+{abonos.length - 3} más</span>
                          )}
                        </div>
                      )}
                      {/* Saldo en rojo */}
                      <div style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#dc2626",
                        lineHeight: 1.2,
                      }}>
                        Saldo: ${saldo.toLocaleString("es-CO")}
                      </div>
                    </div>

                    {/* Botones */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {/* Registrar abono — botón destacado */}
                      <button
                        onClick={() => registrarAbono(orden)}
                        style={{
                          padding: "8px 14px",
                          background: "linear-gradient(135deg, #16a34a, #22c55e)",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontSize: 13,
                          color: "white",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 4px rgba(22,163,74,0.3)",
                        }}
                      >
                        💵 Registrar abono
                      </button>

                      <button
                        onClick={() => editarOrden(orden)}
                        title="Editar pedido"
                        style={{
                          padding: "7px 12px",
                          background: "rgba(109,40,217,0.07)",
                          border: "1px solid rgba(109,40,217,0.2)",
                          borderRadius: 7,
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#6d28d9",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        onClick={() => manejarPDF(orden)}
                        title="Descargar PDF"
                        style={{
                          padding: "7px 12px",
                          background: "rgba(100,116,139,0.07)",
                          border: "1px solid rgba(100,116,139,0.2)",
                          borderRadius: 7,
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#374151",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        📄 PDF
                      </button>

                      <button
                        onClick={() => manejarRemision(orden)}
                        title="Generar remisión"
                        style={{
                          padding: "7px 12px",
                          background: "rgba(16,185,129,0.07)",
                          border: "1px solid rgba(16,185,129,0.2)",
                          borderRadius: 7,
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#065f46",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        🚚 Remisión
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </Protegido>
  );
}
