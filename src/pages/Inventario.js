import React, { useState, useEffect, useRef, useMemo } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Protegido from "../components/Protegido";
import { useNavigationState } from "../context/NavigationContext";
import useLimites from "../hooks/useLimites";
import EditarPaqueteModal from "../components/EditarPaqueteModal";

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Inventario() {
  const { saveModuleState, getModuleState } = useNavigationState();
  const estadoGuardado = useRef(getModuleState("/inventario")).current;

  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(estadoGuardado?.form || {
    nombre: "", descripcion: "", precio: "", stock: "", categoria: ""
  });
  const [buscar, setBuscar] = useState(estadoGuardado?.buscar || "");
  const [categoriaFiltro, setCategoriaFiltro] = useState(estadoGuardado?.categoriaFiltro || "");
  const [editandoId, setEditandoId] = useState(estadoGuardado?.editandoId || null);
  const [mostrarFormulario, setMostrarFormulario] = useState(estadoGuardado?.mostrarFormulario || false);
  const [loading, setLoading] = useState(true);
  const { puedeCrearProducto, mensajeBloqueo } = useLimites();

  // ── Paquetes de eventos ──
  const [tabActivo, setTabActivo] = useState(estadoGuardado?.tabActivo || "todos");
  const [paquetes, setPaquetes] = useState([]);
  const [loadingPaquetes, setLoadingPaquetes] = useState(false);
  const [modalPaquete, setModalPaquete] = useState(false);
  const [paqueteEditar, setPaqueteEditar] = useState(null);

  // Guardar estado
  useEffect(() => {
    saveModuleState("/inventario", { form, buscar, categoriaFiltro, editandoId, mostrarFormulario, tabActivo });
  }, [JSON.stringify(form), buscar, categoriaFiltro, editandoId, mostrarFormulario, tabActivo, saveModuleState]);

  useEffect(() => { obtenerProductos(); obtenerPaquetes(); }, []);

  const obtenerProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("productos").select("*").order("nombre");
    if (error) console.error("Error al obtener productos:", error);
    else setProductos(data || []);
    setLoading(false);
  };

  // ── Paquetes CRUD ──
  const obtenerPaquetes = async () => {
    setLoadingPaquetes(true);
    const { data, error } = await supabase.from("paquetes_eventos").select("*").order("nombre");
    if (error) console.error("Error al obtener paquetes:", error);
    else setPaquetes(data || []);
    setLoadingPaquetes(false);
  };

  const eliminarPaquete = async (id, nombre) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar "${nombre}"?`,
      text: "El paquete se eliminará permanentemente. Los pedidos que ya usaron su contenido NO se afectan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const { error } = await supabase.from("paquetes_eventos").delete().eq("id", id);
    if (!error) {
      Swal.fire({ icon: "success", title: "Paquete eliminado", timer: 1500, showConfirmButton: false });
      obtenerPaquetes();
    } else {
      Swal.fire("Error", "No se pudo eliminar el paquete.", "error");
    }
  };

  const abrirEditarPaquete = (paquete) => {
    setPaqueteEditar(paquete);
    setModalPaquete(true);
  };

  const abrirNuevoPaquete = () => {
    setPaqueteEditar(null);
    setModalPaquete(true);
  };

  const guardarProducto = async () => {
    if (!editandoId && !puedeCrearProducto()) {
      const msg = mensajeBloqueo("producto");
      return Swal.fire(msg.titulo, msg.mensaje, msg.icono);
    }
    const { nombre, descripcion, precio, stock, categoria } = form;
    if (!nombre || !precio || !stock) {
      return Swal.fire("Campos requeridos", "Nombre, precio y stock son obligatorios.", "warning");
    }
    if (precio < 0 || stock < 0) {
      return Swal.fire("Valores inválidos", "Precio y stock deben ser positivos.", "error");
    }
    const operacion = editandoId
      ? supabase.from("productos").update({ nombre, descripcion, precio: Number(precio), stock: Number(stock), categoria }).eq("id", editandoId)
      : supabase.from("productos").insert([{ nombre, descripcion, precio: Number(precio), stock: Number(stock), categoria }]);
    const { error } = await operacion;
    if (!error) {
      Swal.fire({ icon: "success", title: editandoId ? "Actualizado" : "Guardado", timer: 1500, showConfirmButton: false });
      limpiarFormulario();
      obtenerProductos();
    } else Swal.fire("Error", "No se pudo guardar el producto.", "error");
  };

  const eliminarProducto = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar este producto?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (!error) {
      Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false });
      obtenerProductos();
    }
  };

  const editarProducto = (producto) => {
    setEditandoId(producto.id);
    setForm({
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precio: producto.precio,
      stock: producto.stock,
      categoria: producto.categoria || "",
    });
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limpiarFormulario = () => {
    setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "" });
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  const borrarTodo = async () => {
    if (productos.length === 0) return Swal.fire("Sin datos", "No hay productos para eliminar.", "info");
    const { isConfirmed } = await Swal.fire({
      title: "⚠️ ¿Eliminar TODO el inventario?",
      html: `<p>Esta acción borrará <strong>${productos.length} producto(s)</strong> y no se puede deshacer.</p>
             <p style="color:#ef4444;font-weight:600;margin-top:8px;">Los documentos que ya usen estos productos NO se afectan.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todo",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const { error } = await supabase.from("productos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) {
      Swal.fire({ icon: "success", title: "Inventario eliminado", timer: 2000, showConfirmButton: false });
      obtenerProductos();
    } else Swal.fire("Error", "No se pudo eliminar el inventario.", "error");
  };

  /* ─── Exportar Excel (.xlsx) ─── */
  const exportarExcel = () => {
    if (productos.length === 0) return Swal.fire("Sin datos", "No hay productos para exportar.", "info");

    const datosLimpios = productos.map((p, i) => ({
      "#": i + 1,
      "Nombre": p.nombre || "",
      "Descripción": p.descripcion || "",
      "Precio": Number(p.precio || 0),
      "Stock": Number(p.stock || 0),
      "Categoría": p.categoria || ""
    }));

    const ws = XLSX.utils.json_to_sheet(datosLimpios);
    ws["!cols"] = [
      { wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 8 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const fecha = new Date().toLocaleDateString("es-CO").replaceAll("/", "-");
    XLSX.writeFile(wb, `inventario_${fecha}.xlsx`);
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

      const mapCol = (row, opciones) => {
        for (const key of opciones) {
          const val = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
          if (val !== undefined && val !== "") return String(val).trim();
        }
        return "";
      };

      const productosValidos = json
        .map((row) => ({
          nombre: mapCol(row, ["nombre", "Nombre", "NOMBRE", "producto", "Producto", "PRODUCTO"]),
          descripcion: mapCol(row, ["descripcion", "Descripción", "Descripcion", "DESCRIPCION"]),
          precio: parseFloat(mapCol(row, ["precio", "Precio", "PRECIO", "price", "valor", "Valor"]) || "0"),
          stock: parseInt(mapCol(row, ["stock", "Stock", "STOCK", "cantidad", "Cantidad", "CANTIDAD", "unidades"]) || "0", 10),
          categoria: mapCol(row, ["categoria", "Categoría", "Categoria", "CATEGORIA", "tipo", "Tipo"])
        }))
        .filter((p) => p.nombre && !isNaN(p.precio) && p.precio >= 0 && !isNaN(p.stock) && p.stock >= 0);

      if (productosValidos.length === 0) {
        return Swal.fire("Sin datos válidos", "No se encontraron productos con nombre, precio y stock válidos.", "error");
      }

      const { error } = await supabase.from("productos").insert(productosValidos);
      if (error) {
        console.error(error);
        return Swal.fire("Error", "No se pudieron importar los productos.", "error");
      }
      Swal.fire("Importación exitosa", `${productosValidos.length} producto(s) importados correctamente.`, "success");
      obtenerProductos();
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
              <td style="border:1px solid #e5e7eb;padding:6px;">Silla Tiffany</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;font-weight:600;">precio</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#ef4444;">✅ Sí</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">15000</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;font-weight:600;">stock</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#ef4444;">✅ Sí</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">50</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">descripcion</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">Silla dorada elegante</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">categoria</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">Mobiliario</td>
            </tr>
          </table>
          <p style="margin-top:10px;">💡 <strong>Tips:</strong></p>
          <ul style="margin:4px 0 0 16px;padding:0;">
            <li>El sistema acepta variantes como "Nombre", "NOMBRE", "Producto", "cantidad", "Valor", etc.</li>
            <li>Precio y stock deben ser números positivos.</li>
            <li>Las filas sin nombre, precio o stock serán ignoradas.</li>
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
  const categoriasUnicas = useMemo(() =>
    [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort(),
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    let lista = productos;
    // Filtrar por tipo según tab activo
    if (tabActivo === "articulo") {
      lista = lista.filter((p) => (p.tipo || "articulo") === "articulo");
    } else if (tabActivo === "servicio") {
      lista = lista.filter((p) => p.tipo === "servicio");
    }
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      lista = lista.filter((p) =>
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.descripcion || "").toLowerCase().includes(q) ||
        (p.categoria || "").toLowerCase().includes(q)
      );
    }
    if (categoriaFiltro) {
      lista = lista.filter((p) => (p.categoria || "").toLowerCase() === categoriaFiltro.toLowerCase());
    }
    return lista;
  }, [productos, buscar, categoriaFiltro, tabActivo]);

  /* ─── KPIs ─── */
  const valorTotal = productos.reduce((s, p) => s + (Number(p.precio || 0) * Number(p.stock || 0)), 0);
  const stockTotal = productos.reduce((s, p) => s + Number(p.stock || 0), 0);
  const sinStock = productos.filter((p) => Number(p.stock || 0) === 0).length;

  /* ═══ RENDER ═══ */
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 950 }}>

          {/* ═══ HEADER ═══ */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">📦 Gestión de Inventario</h1>
          </div>

          {/* ═══ TABS ═══ */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 16, borderRadius: 10,
            border: "1px solid var(--sw-borde)", overflow: "hidden", background: "white",
          }}>
            {[
              { id: "todos", label: "📋 Todos", count: productos.length },
              { id: "articulo", label: "📦 Artículos", count: productos.filter((p) => (p.tipo || "articulo") === "articulo").length },
              { id: "servicio", label: "🔧 Servicios", count: productos.filter((p) => p.tipo === "servicio").length },
              { id: "paquete", label: "🎁 Paquetes", count: paquetes.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                style={{
                  flex: 1, padding: "10px 8px", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                  background: tabActivo === tab.id
                    ? (tab.id === "paquete" ? "linear-gradient(135deg, #0891b2, #0e7490)" : "var(--sw-gradiente-primario)")
                    : "transparent",
                  color: tabActivo === tab.id ? "white" : "var(--sw-texto-secundario)",
                  borderRight: "1px solid var(--sw-borde)",
                }}
              >
                {tab.label} <span style={{ opacity: 0.8 }}>({tab.count})</span>
              </button>
            ))}
          </div>

          {/* ═══ VISTA PAQUETES ═══ */}
          {tabActivo === "paquete" ? (
            <>
              {/* KPIs Paquetes */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12, marginBottom: 20,
              }}>
                <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Paquetes</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#0891b2", marginTop: 4 }}>{paquetes.length}</div>
                </div>
                <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Precio promedio</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0e7490", marginTop: 4 }}>
                    {money(paquetes.length > 0 ? paquetes.reduce((s, p) => s + Number(p.precio_total || 0), 0) / paquetes.length : 0)}
                  </div>
                </div>
              </div>

              {/* Acciones Paquetes */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  onClick={abrirNuevoPaquete}
                  style={{
                    padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontWeight: 600, fontSize: 13, color: "white", display: "inline-flex",
                    alignItems: "center", gap: 6,
                    background: "linear-gradient(135deg, #0891b2, #0e7490)",
                    boxShadow: "0 2px 6px rgba(8,145,178,0.25)",
                    transition: "all 0.2s",
                  }}
                >
                  ＋ Nuevo paquete
                </button>
              </div>

              {/* Lista Paquetes */}
              <div className="sw-card">
                <div className="sw-card-header">
                  <h3 className="sw-card-titulo" style={{ color: "#0e7490" }}>
                    🎁 Paquetes de Eventos ({paquetes.length})
                  </h3>
                </div>
                <div className="sw-card-body" style={{ padding: 0 }}>
                  {loadingPaquetes ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--sw-texto-terciario)" }}>
                      Cargando paquetes...
                    </div>
                  ) : paquetes.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
                      <div style={{ fontSize: 14, color: "var(--sw-texto-terciario)" }}>
                        No hay paquetes creados
                      </div>
                      <p style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                        Crea tu primer paquete con los productos que más uses juntos
                      </p>
                    </div>
                  ) : (
                    paquetes.map((paq) => {
                      const totalItems = (paq.productos || []).reduce((acc, item) => {
                        if (item.es_grupo && Array.isArray(item.productos)) return acc + item.productos.length;
                        return acc + 1;
                      }, 0);
                      return (
                        <div
                          key={paq.id}
                          style={{
                            padding: "14px 16px", borderBottom: "1px solid #f3f4f6",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            gap: 10, transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdfa")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--sw-texto)" }}>
                                {paq.nombre}
                              </span>
                              <span style={{
                                fontSize: 10, padding: "2px 8px", borderRadius: 20,
                                background: "#f0fdfa", color: "#0891b2", fontWeight: 600,
                              }}>
                                {totalItems} items
                              </span>
                            </div>
                            <div style={{
                              fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 3,
                              display: "flex", flexWrap: "wrap", gap: "4px 14px",
                            }}>
                              <span style={{ fontWeight: 600, color: "#059669" }}>{money(paq.precio_total)}</span>
                              {paq.descripcion && <span style={{ color: "#9ca3af" }}>{paq.descripcion}</span>}
                              <span style={{ color: "#d1d5db" }}>
                                {new Date(paq.created_at).toLocaleDateString("es-CO")}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button className="sw-btn-icono" onClick={() => abrirEditarPaquete(paq)} title="Editar paquete">
                              ✏️
                            </button>
                            <button
                              className="sw-btn-icono"
                              onClick={() => eliminarPaquete(paq.id, paq.nombre)}
                              title="Eliminar paquete"
                              style={{ color: "#ef4444" }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
          <>
          {/* ═══ KPI CARDS (productos) ═══ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 20
          }}>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Productos</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-azul)", marginTop: 4 }}>{productos.length}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Stock total</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-verde)", marginTop: 4 }}>{stockTotal.toLocaleString("es-CO")}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Valor inventario</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sw-morado)", marginTop: 4 }}>{money(valorTotal)}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Sin stock</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: sinStock > 0 ? "var(--sw-rojo)" : "var(--sw-verde)", marginTop: 4 }}>{sinStock}</div>
            </div>
          </div>

          {/* ═══ ACCIONES ═══ */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="sw-btn sw-btn-primario" onClick={() => { limpiarFormulario(); setMostrarFormulario(true); }}>
              ＋ Nuevo producto
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={exportarExcel}>
              📊 Exportar Excel
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={() => document.getElementById("archivoExcelInv").click()}>
              📥 Importar Excel
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={mostrarGuia}>
              ❓ Guía importación
            </button>
            <button className="sw-btn" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }} onClick={borrarTodo}>
              🗑️ Eliminar todo
            </button>
          </div>

          <input type="file" accept=".xlsx,.xls" onChange={importarDesdeExcel} id="archivoExcelInv" style={{ display: "none" }} />

          {/* ═══ FORMULARIO ═══ */}
          {mostrarFormulario && (
            <div className="sw-card" style={{ marginBottom: 16 }}>
              <div className="sw-card-header sw-card-header-cyan">
                <h3 className="sw-card-titulo" style={{ color: "white", margin: 0 }}>
                  {editandoId ? "✏️ Editar Producto" : "➕ Nuevo Producto"}
                </h3>
              </div>
              <div className="sw-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Nombre *</label>
                    <input type="text" placeholder="Nombre del producto" value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Descripción</label>
                    <input type="text" placeholder="Descripción opcional" value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Precio *</label>
                    <input type="number" placeholder="0" value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Stock *</label>
                    <input type="number" placeholder="0" value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Categoría</label>
                    <input type="text" placeholder="Ej: Mobiliario, Decoración, Carpas..." value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      list="categorias-list"
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                    <datalist id="categorias-list">
                      {categoriasUnicas.map((cat) => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="sw-btn sw-btn-primario" style={{ flex: 1 }} onClick={guardarProducto}>
                    {editandoId ? "💾 Actualizar" : "💾 Guardar"}
                  </button>
                  <button className="sw-btn sw-btn-secundario" style={{ flex: 1 }} onClick={limpiarFormulario}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ BÚSQUEDA Y FILTROS ═══ */}
          <div className="sw-card" style={{ marginBottom: 16 }}>
            <div className="sw-card-body" style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {/* Búsqueda */}
                <div style={{ position: "relative", flex: "1 1 250px", minWidth: 200 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--sw-texto-terciario)" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, descripción, categoría..."
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
                {/* Filtro categoría */}
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  style={{
                    padding: "10px 12px", border: "1px solid var(--sw-borde)",
                    borderRadius: 8, fontSize: 14, background: "var(--sw-fondo)",
                    color: "var(--sw-texto)", minWidth: 160
                  }}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasUnicas.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              {(buscar || categoriaFiltro) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--sw-texto-terciario)" }}>
                    {productosFiltrados.length} de {productos.length} productos
                  </span>
                  {(buscar || categoriaFiltro) && (
                    <button
                      onClick={() => { setBuscar(""); setCategoriaFiltro(""); }}
                      style={{
                        fontSize: 11, padding: "2px 10px", borderRadius: 20,
                        background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca",
                        cursor: "pointer"
                      }}
                    >
                      ✕ Limpiar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══ LISTADO ═══ */}
          <div className="sw-card">
            <div className="sw-card-header">
              <h3 className="sw-card-titulo">
                📋 {buscar || categoriaFiltro ? "Resultados" : "Todos los productos"} ({productosFiltrados.length})
              </h3>
            </div>
            <div className="sw-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--sw-texto-terciario)" }}>
                  Cargando inventario...
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                  <div style={{ fontSize: 14, color: "var(--sw-texto-terciario)" }}>
                    {buscar || categoriaFiltro ? "No se encontraron productos con esos filtros" : "No hay productos registrados"}
                  </div>
                  {!buscar && !categoriaFiltro && (
                    <p style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                      Agrega tu primer producto o importa desde Excel
                    </p>
                  )}
                </div>
              ) : (
                productosFiltrados.map((p) => (
                  <div key={p.id} style={{
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
                          {p.nombre}
                        </span>
                        {p.categoria && (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 20,
                            background: "var(--sw-cyan-muy-claro)", color: "var(--sw-azul)",
                            fontWeight: 500
                          }}>
                            {p.categoria}
                          </span>
                        )}
                        {Number(p.stock || 0) === 0 && (
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20,
                            background: "#fef2f2", color: "#ef4444", fontWeight: 600
                          }}>
                            Sin stock
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 3, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
                        <span style={{ fontWeight: 600, color: "var(--sw-verde-oscuro)" }}>{money(p.precio)}</span>
                        <span>Stock: <strong>{Number(p.stock || 0)}</strong></span>
                        {p.descripcion && <span style={{ color: "#9ca3af" }}>{p.descripcion}</span>}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="sw-btn-icono" onClick={() => editarProducto(p)} title="Editar">
                        ✏️
                      </button>
                      <button className="sw-btn-icono" onClick={() => eliminarProducto(p.id)} title="Eliminar"
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

          </>
          )}

          {/* ═══ MODAL PAQUETE ═══ */}
          {modalPaquete && (
            <EditarPaqueteModal
              paqueteEnEdicion={paqueteEditar}
              onGuardar={obtenerPaquetes}
              onClose={() => { setModalPaquete(false); setPaqueteEditar(null); }}
            />
          )}

        </div>
      </div>
    </Protegido>
  );
}