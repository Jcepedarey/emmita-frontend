import React, { useState } from "react";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido";

export default function BuscarRecepcion() {
  const [cliente, setCliente] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [ordenes, setOrdenes] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const limite = 20;

  const buscarRecepciones = async (paginaActual = 1) => {
    setLoading(true);
    const desde = (paginaActual - 1) * limite;
    const hasta = desde + limite - 1;

    const { data, error, count } = await supabase
      .from("ordenes_pedido")
      .select("*, clientes(nombre)", { count: "exact" })
      .eq("revisada", true)
      .range(desde, hasta)
      .order("fecha_evento", { ascending: false });

    setLoading(false);

    if (error) {
      console.error("Error al buscar recepciones:", error);
      return Swal.fire("Error", "No se pudieron cargar las recepciones.", "error");
    }

    let filtradas = data || [];
    if (cliente.trim()) {
      filtradas = filtradas.filter((o) =>
        o.clientes?.nombre?.toLowerCase().includes(cliente.toLowerCase())
      );
    }
    if (inicio) {
      filtradas = filtradas.filter((o) => new Date(o.fecha_evento) >= new Date(inicio));
    }
    if (fin) {
      filtradas = filtradas.filter((o) => new Date(o.fecha_evento) <= new Date(fin));
    }

    setOrdenes(filtradas);
    setPagina(paginaActual);
    setTotalPaginas(Math.ceil((count || 1) / limite));
    setMostrar(true);
  };

  const limpiar = () => {
    setCliente("");
    setInicio("");
    setFin("");
    setOrdenes([]);
    setMostrar(false);
  };

  const eliminarRecepcionDefinitiva = async (id) => {
    try {
      // 1) Consultar movimientos vinculados
      const { data: movimientos } = await supabase
        .from("movimientos_contables")
        .select("id, tipo")
        .eq("orden_id", id);

      const tieneMovimientos = Array.isArray(movimientos) && movimientos.length > 0;

      let html = "";
      if (tieneMovimientos) {
        const ingresos = movimientos.filter((m) => m.tipo === "ingreso").length;
        const gastos = movimientos.filter((m) => m.tipo === "gasto").length;
        html = `
          <ul style="text-align:left;margin:10px 0;">
            ${ingresos ? `<li><strong>${ingresos}</strong> ingreso(s)</li>` : ""}
            ${gastos ? `<li><strong>${gastos}</strong> gasto(s)</li>` : ""}
          </ul>
          <p style="color:#ef4444;font-weight:bold;margin-top:8px;">⚠️ TODO será eliminado de Contabilidad</p>
        `;
      }

      // 2) Confirmación
      const confirm = await Swal.fire({
        title: tieneMovimientos
          ? "⚠️ Esta recepción tiene registros asociados:"
          : "¿Eliminar esta recepción?",
        html: html || "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar definitivamente",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#ef4444",
      });

      if (!confirm.isConfirmed) return;

      // 3) Borrar movimientos primero (si hay)
      if (tieneMovimientos) {
        const { error: errorMov } = await supabase
          .from("movimientos_contables")
          .delete()
          .eq("orden_id", id);
        if (errorMov) throw new Error("No se pudieron eliminar los movimientos contables");
      }

      // 4) Borrar recepción vinculada
      const { data: recs } = await supabase.from("recepcion").select("id").eq("orden_id", id);
      if (Array.isArray(recs) && recs.length > 0) {
        const { error: errorRec } = await supabase.from("recepcion").delete().eq("orden_id", id);
        if (errorRec) throw new Error("No se pudo eliminar la recepción asociada");
      }

      // 5) Borrar la orden revisada
      const { error: errorOrden } = await supabase.from("ordenes_pedido").delete().eq("id", id);
      if (errorOrden) throw new Error("No se pudo eliminar la orden/recepción");

      // 6) Éxito
      Swal.fire({ icon: "success", title: "Eliminado", text: "Recepción y registros eliminados", timer: 2000, showConfirmButton: false });
      buscarRecepciones(pagina);
    } catch (e) {
      console.error("Error completo:", e);
      Swal.fire("Error", e.message || "No se pudo completar la eliminación", "error");
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: "1px solid var(--sw-borde)", borderRadius: 8,
    fontSize: 14, boxSizing: "border-box"
  };

  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>

          {/* ═══ HEADER ═══ */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">🔍 Buscar Recepción</h1>
          </div>

          {/* ═══ FILTROS ═══ */}
          <div className="sw-card" style={{ marginBottom: 16 }}>
            <div className="sw-card-header sw-card-header-cyan">
              <h3 className="sw-card-titulo" style={{ color: "white", margin: 0 }}>🔎 Filtros de búsqueda</h3>
            </div>
            <div className="sw-card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Buscar por nombre de cliente..."
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>
                    📅 Fecha evento (desde)
                  </label>
                  <input
                    type="date"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>
                    📅 Fecha evento (hasta)
                  </label>
                  <input
                    type="date"
                    value={fin}
                    onChange={(e) => setFin(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button className="sw-btn sw-btn-primario" style={{ flex: 1, minWidth: 120 }} onClick={() => buscarRecepciones(1)}>
                  🔍 Buscar
                </button>
                <button className="sw-btn sw-btn-secundario" style={{ flex: 1, minWidth: 120 }} onClick={limpiar}>
                  🧹 Limpiar
                </button>
                {mostrar && (
                  <button className="sw-btn sw-btn-secundario" style={{ flex: 1, minWidth: 120 }} onClick={() => setMostrar(false)}>
                    👁️ Ocultar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RESULTADOS ═══ */}
          {mostrar && (
            <div className="sw-card">
              <div className="sw-card-header">
                <h3 className="sw-card-titulo">
                  📋 Resultados — Página {pagina} de {totalPaginas} ({ordenes.length} recepción{ordenes.length !== 1 ? "es" : ""})
                </h3>
              </div>
              <div className="sw-card-body" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--sw-texto-terciario)" }}>
                    Buscando recepciones...
                  </div>
                ) : ordenes.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                    <div style={{ fontSize: 14, color: "var(--sw-texto-terciario)" }}>
                      No se encontraron recepciones con esos filtros
                    </div>
                  </div>
                ) : (
                  ordenes.map((o) => (
                    <div key={o.id} style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--sw-texto)" }}>
                            {o.clientes?.nombre || "Sin cliente"}
                          </span>
                          {o.numero && (
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 20,
                              background: "var(--sw-cyan-muy-claro)", color: "var(--sw-azul)", fontWeight: 500
                            }}>
                              {o.numero}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 3, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          {o.fecha_evento && <span>📅 Evento: {o.fecha_evento.split("T")[0]}</span>}
                          {o.total && (
                            <span style={{ fontWeight: 600, color: "var(--sw-verde-oscuro)" }}>
                              💰 ${Number(o.total).toLocaleString("es-CO")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                        <button
                          className="sw-btn sw-btn-secundario"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => navigate(`/recepcion?id=${o.id}`)}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="sw-btn sw-btn-secundario"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => window.open(`/pdfrecepcion?id=${o.id}`, "_blank")}
                        >
                          📄 PDF
                        </button>
                        <button
                          className="sw-btn-icono"
                          onClick={() => eliminarRecepcionDefinitiva(o.id)}
                          title="Eliminar definitivamente"
                          style={{ color: "#ef4444" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Paginación */}
                {ordenes.length > 0 && totalPaginas > 1 && (
                  <div style={{
                    display: "flex", justifyContent: "center", gap: 12,
                    padding: "14px 16px", borderTop: "1px solid #f3f4f6"
                  }}>
                    <button
                      className="sw-btn sw-btn-secundario"
                      disabled={pagina <= 1}
                      onClick={() => buscarRecepciones(pagina - 1)}
                      style={{ opacity: pagina <= 1 ? 0.5 : 1 }}
                    >
                      ⬅️ Anterior
                    </button>
                    <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "var(--sw-texto-secundario)" }}>
                      {pagina} / {totalPaginas}
                    </span>
                    <button
                      className="sw-btn sw-btn-secundario"
                      disabled={pagina >= totalPaginas}
                      onClick={() => buscarRecepciones(pagina + 1)}
                      style={{ opacity: pagina >= totalPaginas ? 0.5 : 1 }}
                    >
                      Siguiente ➡️
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </Protegido>
  );
}