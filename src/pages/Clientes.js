import React, { useState, useEffect, useRef } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Protegido from "../components/Protegido";
import { useNavigationState } from "../context/NavigationContext";
import useLimites from "../hooks/useLimites";

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Clientes() {
  const { saveModuleState, getModuleState } = useNavigationState();
  const estadoGuardado = useRef(getModuleState("/clientes")).current;

  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState(estadoGuardado?.buscar || "");
  const [form, setForm] = useState(estadoGuardado?.form || {
    nombre: "", identificacion: "", telefono: "", direccion: "", email: ""
  });
  const [editando, setEditando] = useState(estadoGuardado?.editando || null);
  const [mostrarFormulario, setMostrarFormulario] = useState(estadoGuardado?.mostrarFormulario || false);
  const [loading, setLoading] = useState(true);
  const { puedeCrearCliente, mensajeBloqueo } = useLimites();

  // Guardar estado
  useEffect(() => {
    saveModuleState("/clientes", { buscar, form, editando, mostrarFormulario });
  }, [buscar, JSON.stringify(form), editando, mostrarFormulario, saveModuleState]);

  useEffect(() => { cargarClientes(); }, []);

  const cargarClientes = async () => {
    setLoading(true);
    const { data } = await supabase.from("clientes").select("*").order("nombre");
    if (data) setClientes(data);
    setLoading(false);
  };

  const generarCodigoCliente = () => {
    const codigos = clientes
      .map(c => c.codigo).filter(Boolean)
      .filter(c => c.startsWith("C") && !isNaN(parseInt(c.slice(1))))
      .map(c => parseInt(c.slice(1)));
    const siguiente = Math.max(...codigos, 1000) + 1;
    if (siguiente > 9999) {
      Swal.fire("Límite alcanzado", "No se pueden generar más códigos de cliente", "error");
      return null;
    }
    return `C${siguiente}`;
  };

  const guardarCliente = async () => {
    if (!editando && !puedeCrearCliente()) {
      const msg = mensajeBloqueo("cliente");
      return Swal.fire(msg.titulo, msg.mensaje, msg.icono);
    }
    const { nombre, identificacion, telefono, direccion, email } = form;
    if (!nombre.trim()) return Swal.fire("Campo requerido", "El nombre del cliente es obligatorio.", "warning");

    const clienteCompleto = {
      nombre: nombre.trim(),
      identificacion: identificacion?.trim() || null,
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
      email: email?.trim() || null
    };

    if (!editando && clienteCompleto.identificacion) {
      const { data: existentes } = await supabase
        .from("clientes").select("id").eq("identificacion", clienteCompleto.identificacion);
      if (existentes && existentes.length > 0) {
        return Swal.fire("Ya existe", "Ya hay un cliente con esa identificación.", "warning");
      }
    }

    if (editando) {
      const { error } = await supabase.from("clientes").update(clienteCompleto).eq("id", editando);
      if (!error) {
        Swal.fire({ icon: "success", title: "Actualizado", timer: 1500, showConfirmButton: false });
        cerrarFormulario();
        cargarClientes();
      } else Swal.fire("Error", "No se pudo actualizar el cliente.", "error");
    } else {
      const nuevoCodigo = generarCodigoCliente();
      if (!nuevoCodigo) return;
      const { error } = await supabase.from("clientes").insert([{ codigo: nuevoCodigo, ...clienteCompleto }]);
      if (!error) {
        Swal.fire({ icon: "success", title: "Cliente guardado", timer: 1500, showConfirmButton: false });
        cerrarFormulario();
        cargarClientes();
      } else Swal.fire("Error", "No se pudo guardar el cliente.", "error");
    }
  };

  const editarCliente = (cliente) => {
    setEditando(cliente.id);
    setForm({
      nombre: cliente.nombre || "",
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      email: cliente.email || ""
    });
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cerrarFormulario = () => {
    setEditando(null);
    setForm({ nombre: "", identificacion: "", telefono: "", direccion: "", email: "" });
    setMostrarFormulario(false);
  };

  const eliminarCliente = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar este cliente?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (!error) {
      Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false });
      cargarClientes();
    }
  };

  const borrarTodo = async () => {
    if (clientes.length === 0) return Swal.fire("Sin datos", "No hay clientes para eliminar.", "info");
    const { isConfirmed } = await Swal.fire({
      title: "⚠️ ¿Eliminar TODOS los clientes?",
      html: `<p>Esta acción borrará <strong>${clientes.length} cliente(s)</strong> y no se puede deshacer.</p>
             <p style="color:#ef4444;font-weight:600;margin-top:8px;">Los documentos asociados NO se eliminarán.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todo",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const { error } = await supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) {
      Swal.fire({ icon: "success", title: "Todos los clientes eliminados", timer: 2000, showConfirmButton: false });
      cargarClientes();
    } else Swal.fire("Error", "No se pudieron eliminar los clientes. Puede haber documentos asociados.", "error");
  };

  /* ─── Exportar Excel (.xlsx) ─── */
  const exportarExcel = () => {
    if (clientes.length === 0) return Swal.fire("Sin datos", "No hay clientes para exportar.", "info");

    const datosLimpios = clientes.map((c, i) => ({
      "#": i + 1,
      "Código": c.codigo || "",
      "Nombre": c.nombre || "",
      "Identificación": c.identificacion || "",
      "Teléfono": c.telefono || "",
      "Dirección": c.direccion || "",
      "Email": c.email || ""
    }));

    const ws = XLSX.utils.json_to_sheet(datosLimpios);
    // Ancho de columnas
    ws["!cols"] = [
      { wch: 5 }, { wch: 10 }, { wch: 30 }, { wch: 18 },
      { wch: 15 }, { wch: 35 }, { wch: 28 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    const fecha = new Date().toLocaleDateString("es-CO").replaceAll("/", "-");
    XLSX.writeFile(wb, `clientes_${fecha}.xlsx`);
    Swal.fire({ icon: "success", title: "Excel descargado", timer: 1500, showConfirmButton: false });
  };

  /* ─── Importar desde Excel ─── */
  const importarDesdeExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = "";

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Mapeo flexible de columnas (acepta variantes)
      const mapCol = (row, opciones) => {
        for (const key of opciones) {
          const val = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
          if (val !== undefined && val !== "") return String(val).trim();
        }
        return "";
      };

      const clientesValidos = json
        .map((row) => ({
          nombre: mapCol(row, ["nombre", "Nombre", "NOMBRE", "name", "Name"]),
          identificacion: mapCol(row, ["identificacion", "Identificación", "Identificacion", "IDENTIFICACION", "cedula", "Cedula", "CC", "NIT", "nit"]),
          telefono: mapCol(row, ["telefono", "Teléfono", "Telefono", "TELEFONO", "cel", "celular", "Celular"]),
          direccion: mapCol(row, ["direccion", "Dirección", "Direccion", "DIRECCION", "address"]),
          email: mapCol(row, ["email", "Email", "EMAIL", "correo", "Correo", "CORREO"])
        }))
        .filter((c) => c.nombre);

      if (clientesValidos.length === 0) {
        return Swal.fire("Sin datos válidos", "No se encontraron clientes con nombre. Revisa que la columna 'nombre' exista.", "error");
      }

      // Generar códigos automáticos
      let maxCodigo = Math.max(
        ...clientes.map(c => c.codigo).filter(Boolean)
          .filter(c => c.startsWith("C") && !isNaN(parseInt(c.slice(1))))
          .map(c => parseInt(c.slice(1))),
        1000
      );

      const clientesConCodigo = clientesValidos.map((c) => {
        maxCodigo++;
        return { codigo: `C${maxCodigo}`, ...c };
      });

      const { error } = await supabase.from("clientes").insert(clientesConCodigo);
      if (error) {
        console.error(error);
        return Swal.fire("Error", "No se pudieron importar los clientes.", "error");
      }
      Swal.fire("Importación exitosa", `${clientesConCodigo.length} cliente(s) importados correctamente.`, "success");
      cargarClientes();
    } catch (err) {
      console.error(err);
      Swal.fire("Error al leer archivo", "Verifica que sea un archivo Excel (.xlsx) válido.", "error");
    }
  };

  /* ─── Guía de importación ─── */
  const mostrarGuia = () => {
    Swal.fire({
      title: "📥 Guía de importación desde Excel",
      html: `
        <div style="text-align:left;font-size:13px;line-height:1.7;">
          <p>Tu archivo Excel debe tener estas columnas en la <strong>primera fila</strong>:</p>
          <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;">
            <tr style="background:#f0f9ff;">
              <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Columna</th>
              <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">¿Obligatoria?</th>
              <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Ejemplo</th>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;font-weight:600;">nombre</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#ef4444;">✅ Sí</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">María López</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">identificacion</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">1234567890</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">telefono</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">3001234567</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">direccion</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">Calle 10 #5-20</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">email</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">maria@email.com</td>
            </tr>
          </table>
          <p style="margin-top:10px;">💡 <strong>Tips:</strong></p>
          <ul style="margin:4px 0 0 16px;padding:0;">
            <li>El sistema acepta variantes como "Nombre", "NOMBRE", "Teléfono", "celular", etc.</li>
            <li>Las filas sin nombre serán ignoradas.</li>
            <li>Se asigna código automático a cada cliente.</li>
            <li>Formatos aceptados: <strong>.xlsx</strong> y <strong>.xls</strong></li>
          </ul>
        </div>
      `,
      width: 560,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#0077B6"
    });
  };

  /* ─── Filtrar ─── */
  const filtrados = clientes.filter((c) =>
    !buscar.trim() ? true :
    [c.codigo, c.nombre, c.identificacion, c.telefono, c.direccion, c.email]
      .some((campo) => campo?.toLowerCase().includes(buscar.toLowerCase()))
  );

  /* ═══ RENDER ═══ */
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>

          {/* ═══ HEADER ═══ */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">👥 Gestión de Clientes</h1>
          </div>

          {/* ═══ KPI CARDS ═══ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 20
          }}>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Total clientes</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-azul)", marginTop: 4 }}>{clientes.length}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Con email</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-verde)", marginTop: 4 }}>
                {clientes.filter(c => c.email).length}
              </div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Con identificación</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-morado)", marginTop: 4 }}>
                {clientes.filter(c => c.identificacion).length}
              </div>
            </div>
          </div>

          {/* ═══ ACCIONES ═══ */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="sw-btn sw-btn-primario" onClick={() => { cerrarFormulario(); setMostrarFormulario(true); }}>
              ＋ Nuevo cliente
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={exportarExcel}>
              📊 Exportar Excel
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={() => document.getElementById("archivoExcelClientes").click()}>
              📥 Importar Excel
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={mostrarGuia}>
              ❓ Guía importación
            </button>
            <button className="sw-btn" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }} onClick={borrarTodo}>
              🗑️ Eliminar todo
            </button>
          </div>

          <input type="file" accept=".xlsx,.xls" onChange={importarDesdeExcel} id="archivoExcelClientes" style={{ display: "none" }} />

          {/* ═══ FORMULARIO ═══ */}
          {mostrarFormulario && (
            <div className="sw-card" style={{ marginBottom: 16 }}>
              <div className="sw-card-header sw-card-header-cyan">
                <h3 className="sw-card-titulo" style={{ color: "white", margin: 0 }}>
                  {editando ? "✏️ Editar Cliente" : "➕ Nuevo Cliente"}
                </h3>
              </div>
              <div className="sw-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Nombre *</label>
                    <input type="text" placeholder="Nombre completo" value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Identificación</label>
                    <input type="text" placeholder="CC / NIT" value={form.identificacion}
                      onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Teléfono</label>
                    <input type="text" placeholder="300 123 4567" value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Dirección</label>
                    <input type="text" placeholder="Dirección del cliente" value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Email</label>
                    <input type="email" placeholder="correo@ejemplo.com" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="sw-btn sw-btn-primario" style={{ flex: 1 }} onClick={guardarCliente}>
                    {editando ? "💾 Actualizar" : "💾 Guardar"}
                  </button>
                  <button className="sw-btn sw-btn-secundario" style={{ flex: 1 }} onClick={cerrarFormulario}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ BÚSQUEDA ═══ */}
          <div className="sw-card" style={{ marginBottom: 16 }}>
            <div className="sw-card-body" style={{ padding: "12px 16px" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--sw-texto-terciario)" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, código, teléfono, dirección, email..."
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px 10px 38px",
                    border: "1px solid var(--sw-borde)", borderRadius: 8,
                    fontSize: 14, boxSizing: "border-box",
                    background: "var(--sw-fondo)"
                  }}
                />
              </div>
              {buscar && (
                <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                  {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""} de {clientes.length} clientes
                </div>
              )}
            </div>
          </div>

          {/* ═══ LISTADO ═══ */}
          <div className="sw-card">
            <div className="sw-card-header">
              <h3 className="sw-card-titulo">
                📋 {buscar ? "Resultados" : "Todos los clientes"} ({filtrados.length})
              </h3>
            </div>
            <div className="sw-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--sw-texto-terciario)" }}>
                  Cargando clientes...
                </div>
              ) : filtrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 14, color: "var(--sw-texto-terciario)" }}>
                    {buscar ? `No se encontraron resultados para "${buscar}"` : "No hay clientes registrados"}
                  </div>
                  {!buscar && (
                    <p style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                      Agrega tu primer cliente o importa desde Excel
                    </p>
                  )}
                </div>
              ) : (
                filtrados.map((c) => (
                  <div key={c.id} style={{
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
                          {c.nombre}
                        </span>
                        {c.codigo && (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 20,
                            background: "var(--sw-cyan-muy-claro)", color: "var(--sw-azul)",
                            fontWeight: 500
                          }}>
                            {c.codigo}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 3, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                        {c.identificacion && <span>🆔 {c.identificacion}</span>}
                        {c.telefono && <span>📞 {c.telefono}</span>}
                        {c.email && <span>📧 {c.email}</span>}
                        {c.direccion && <span>📍 {c.direccion}</span>}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="sw-btn-icono" onClick={() => editarCliente(c)} title="Editar">
                        ✏️
                      </button>
                      <button className="sw-btn-icono" onClick={() => eliminarCliente(c.id)} title="Eliminar"
                        style={{ color: "#ef4444" }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </Protegido>
  );
}