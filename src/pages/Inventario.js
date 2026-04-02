import React, { useState, useEffect, useRef, useMemo } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Protegido from "../components/Protegido";
import { useNavigationState } from "../context/NavigationContext";
import useLimites from "../hooks/useLimites";

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Inventario() {
  const { saveModuleState, getModuleState } = useNavigationState();
  const estadoGuardado = useRef(getModuleState("/inventario")).current;

  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(estadoGuardado?.form || {
    nombre: "", descripcion: "", precio: "", stock: "", categoria: "", tipo: "articulo", costo: "",
    valor_adquisicion: "", fecha_adquisicion: "", registrar_gasto_compra: false
  });
  const [buscar, setBuscar] = useState(estadoGuardado?.buscar || "");
  const [categoriaFiltro, setCategoriaFiltro] = useState(estadoGuardado?.categoriaFiltro || "");
  const [tipoFiltro, setTipoFiltro] = useState(estadoGuardado?.tipoFiltro || "");
  const [editandoId, setEditandoId] = useState(estadoGuardado?.editandoId || null);
  const [mostrarFormulario, setMostrarFormulario] = useState(estadoGuardado?.mostrarFormulario || false);
  const [loading, setLoading] = useState(true);
  const { puedeCrearProducto, mensajeBloqueo } = useLimites();

  // Guardar estado
  useEffect(() => {
    saveModuleState("/inventario", { form, buscar, categoriaFiltro, tipoFiltro, editandoId, mostrarFormulario });
  }, [JSON.stringify(form), buscar, categoriaFiltro, tipoFiltro, editandoId, mostrarFormulario, saveModuleState]);

  useEffect(() => { obtenerProductos(); }, []);

  const obtenerProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("productos").select("*").order("nombre");
    if (error) console.error("Error al obtener productos:", error);
    else setProductos(data || []);
    setLoading(false);
  };

  const guardarProducto = async () => {
    if (!editandoId && !puedeCrearProducto()) {
      const msg = mensajeBloqueo("producto");
      return Swal.fire(msg.titulo, msg.mensaje, msg.icono);
    }
    const { nombre, descripcion, precio, stock, categoria, tipo, costo } = form;
    const esServicio = tipo === "servicio";
    const stockFinal = esServicio ? 999 : Number(stock);
    if (!nombre || !precio || (!esServicio && !stock)) {
      return Swal.fire("Campos requeridos", esServicio ? "Nombre y precio son obligatorios." : "Nombre, precio y stock son obligatorios.", "warning");
    }
    if (precio < 0 || stockFinal < 0) {
      return Swal.fire("Valores inválidos", "Precio y stock deben ser positivos.", "error");
    }
    const valorAdq = Number(form.valor_adquisicion || 0);
    const fechaAdq = form.fecha_adquisicion || null;
    const registrarGasto = !!form.registrar_gasto_compra;
    const datos = {
      nombre, descripcion, precio: Number(precio), stock: stockFinal, categoria, tipo, costo: Number(costo || 0),
      valor_adquisicion: valorAdq, fecha_adquisicion: fechaAdq,
      registrar_gasto_compra: registrarGasto,
    };
    const operacion = editandoId
      ? supabase.from("productos").update(datos).eq("id", editandoId)
      : supabase.from("productos").insert([datos]);
    const { error } = await operacion;
    if (!error) {
      // 📊 Registrar gasto en contabilidad si el checkbox está activo y es creación nueva
      if (!editandoId && registrarGasto && valorAdq > 0) {
        const totalGasto = valorAdq * stockFinal;
        try {
          await supabase.from("movimientos_contables").insert([{
            fecha: fechaAdq || new Date().toISOString().slice(0, 10),
            tipo: "gasto",
            monto: totalGasto,
            descripcion: `Compra de inventario: ${nombre} (${stockFinal} und × ${money(valorAdq)})`,
            categoria: "Compra de inventario",
            estado: "activo",
          }]);
        } catch (err) {
          console.error("Error registrando gasto de compra:", err);
        }
      }
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
      stock: producto.tipo === "servicio" ? 999 : producto.stock,
      categoria: producto.categoria || "",
      tipo: producto.tipo || "articulo",
      costo: producto.costo || "",
      valor_adquisicion: producto.valor_adquisicion || "",
      fecha_adquisicion: producto.fecha_adquisicion || "",
      registrar_gasto_compra: false, // Al editar nunca re-registrar el gasto
    });
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limpiarFormulario = () => {
    setForm({ nombre: "", descripcion: "", precio: "", stock: "", categoria: "", tipo: "articulo", costo: "", valor_adquisicion: "", fecha_adquisicion: "", registrar_gasto_compra: false });
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
      "Tipo": (p.tipo || "articulo") === "servicio" ? "Servicio" : "Artículo",
      "Nombre": p.nombre || "",
      "Descripción": p.descripcion || "",
      "Precio": Number(p.precio || 0),
      "Costo": Number(p.costo || 0),
      "V. Adquisición": Number(p.valor_adquisicion || 0),
      "Fecha Adq.": p.fecha_adquisicion || "",
      "Stock": (p.tipo || "articulo") === "servicio" ? "∞" : Number(p.stock || 0),
      "Categoría": p.categoria || ""
    }));

    const ws = XLSX.utils.json_to_sheet(datosLimpios);
    ws["!cols"] = [
      { wch: 5 }, { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 20 }
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
        .map((row) => {
          const tipoRaw = mapCol(row, ["tipo", "Tipo", "TIPO"]).toLowerCase();
          const esServicio = tipoRaw === "servicio" || tipoRaw === "service";
          return {
            nombre: mapCol(row, ["nombre", "Nombre", "NOMBRE", "producto", "Producto", "PRODUCTO"]),
            descripcion: mapCol(row, ["descripcion", "Descripción", "Descripcion", "DESCRIPCION"]),
            precio: parseFloat(mapCol(row, ["precio", "Precio", "PRECIO", "price", "valor", "Valor"]) || "0"),
            stock: esServicio ? 999 : parseInt(mapCol(row, ["stock", "Stock", "STOCK", "cantidad", "Cantidad", "CANTIDAD", "unidades"]) || "0", 10),
            categoria: mapCol(row, ["categoria", "Categoría", "Categoria", "CATEGORIA"]),
            tipo: esServicio ? "servicio" : "articulo",
            costo: parseFloat(mapCol(row, ["costo", "Costo", "COSTO", "costo_interno", "Costo interno"]) || "0"),
          };
        })
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
              <td style="border:1px solid #e5e7eb;padding:6px;color:#ef4444;">✅ Sí (artículos)</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">50</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">tipo</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">articulo / servicio</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">costo</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">80000</td>
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
            <li>Si la columna <strong>tipo</strong> dice "servicio", el stock se ignora (se pone ilimitado).</li>
            <li>La columna <strong>costo</strong> registra el costo interno de producción/prestación.</li>
            <li>Precio y stock deben ser números positivos.</li>
            <li>Las filas sin nombre o precio serán ignoradas.</li>
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
    if (tipoFiltro) {
      lista = lista.filter((p) => (p.tipo || "articulo") === tipoFiltro);
    }
    return lista;
  }, [productos, buscar, categoriaFiltro, tipoFiltro]);

  /* ─── KPIs ─── */
  const articulos = productos.filter((p) => (p.tipo || "articulo") === "articulo");
  const servicios = productos.filter((p) => p.tipo === "servicio");
  const valorAlquiler = articulos.reduce((s, p) => s + (Number(p.precio || 0) * Number(p.stock || 0)), 0);
  const valorReal = articulos.reduce((s, p) => s + (Number(p.valor_adquisicion || 0) * Number(p.stock || 0)), 0);
  const stockTotal = articulos.reduce((s, p) => s + Number(p.stock || 0), 0);
  const sinStock = articulos.filter((p) => Number(p.stock || 0) === 0).length;

  /* ═══ RENDER ═══ */
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 950 }}>

          {/* ═══ HEADER ═══ */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">📦 Gestión de Inventario</h1>
          </div>

          {/* ═══ KPI CARDS ═══ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginBottom: 20
          }}>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Artículos</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-azul)", marginTop: 4 }}>{articulos.length}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Servicios</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>{servicios.length}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Stock total</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-verde)", marginTop: 4 }}>{stockTotal.toLocaleString("es-CO")}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Valor real inventario</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sw-morado)", marginTop: 4 }}>{money(valorReal)}</div>
              {valorAlquiler > 0 && (
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Alquiler: {money(valorAlquiler)}</div>
              )}
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Sin stock</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: sinStock > 0 ? "var(--sw-rojo)" : "var(--sw-verde)", marginTop: 4 }}>{sinStock}</div>
            </div>
          </div>

          {/* ═══ ACCIONES ═══ */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="sw-btn sw-btn-primario" onClick={() => { limpiarFormulario(); setMostrarFormulario(true); }}>
              ＋ Nuevo artículo o servicio
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
              <div className="sw-card-header" style={{ background: form.tipo === "servicio" ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "linear-gradient(135deg, var(--sw-cyan), var(--sw-azul))", borderBottom: "none" }}>
                <h3 className="sw-card-titulo" style={{ color: "white", margin: 0 }}>
                  {editandoId
                    ? `✏️ Editar ${form.tipo === "servicio" ? "Servicio" : "Artículo"}`
                    : `➕ Nuevo ${form.tipo === "servicio" ? "Servicio" : "Artículo"}`
                  }
                </h3>
              </div>
              <div className="sw-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Selector de tipo */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 6, display: "block" }}>Tipo *</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { id: "articulo", label: "📦 Artículo", desc: "Producto físico con stock" },
                        { id: "servicio", label: "🔧 Servicio", desc: "Servicio sin stock físico" },
                      ].map((t) => (
                        <button key={t.id} type="button"
                          onClick={() => setForm({ ...form, tipo: t.id, stock: t.id === "servicio" ? 999 : (form.tipo === "servicio" ? "" : form.stock) })}
                          style={{
                            flex: 1, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                            border: form.tipo === t.id ? `2px solid ${t.id === "servicio" ? "#7c3aed" : "var(--sw-azul)"}` : "1px solid var(--sw-borde)",
                            background: form.tipo === t.id ? (t.id === "servicio" ? "#f3e8ff" : "var(--sw-cyan-muy-claro)") : "white",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: "var(--sw-texto-terciario)", marginTop: 2 }}>{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Nombre *</label>
                    <input type="text" placeholder={form.tipo === "servicio" ? "Ej: Montaje de evento, Arreglo de globos..." : "Nombre del producto"} value={form.nombre}
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
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Precio de venta *</label>
                    <input type="number" placeholder="0" value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  {form.tipo === "articulo" ? (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Stock *</label>
                      <input type="number" placeholder="0" value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Stock</label>
                      <input type="text" value="∞ Ilimitado" disabled
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#f3f4f6", color: "#9ca3af" }}
                      />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>
                      Costo interno {form.tipo === "servicio" ? "(producción)" : "(opcional)"}
                    </label>
                    <input type="number" placeholder="0" value={form.costo}
                      onChange={(e) => setForm({ ...form, costo: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                    <div style={{ fontSize: 11, color: "var(--sw-texto-terciario)", marginTop: 3 }}>
                      {form.tipo === "servicio"
                        ? "Lo que te cuesta prestar este servicio (materiales, ayudantes, etc.)"
                        : "Lo que te cuesta este artículo (compra, mantenimiento, etc.)"
                      }
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Categoría</label>
                    <input type="text" placeholder={form.tipo === "servicio" ? "Ej: Montaje, Decoración, Transporte..." : "Ej: Mobiliario, Decoración, Carpas..."} value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      list="categorias-list"
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--sw-borde)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                    />
                    <datalist id="categorias-list">
                      {categoriasUnicas.map((cat) => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                </div>

                {/* ═══ VALOR DE ADQUISICIÓN (solo artículos) ═══ */}
                {form.tipo === "articulo" && (
                  <div style={{
                    marginTop: 12, padding: "14px", borderRadius: 10,
                    background: "linear-gradient(135deg, #fefce8, #fef9c3)",
                    border: "1px solid #fde68a",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 10 }}>
                      💰 Valor de adquisición
                    </div>
                    <div style={{ fontSize: 11, color: "#a16207", marginBottom: 10 }}>
                      Registra cuánto pagaste por este artículo. Esto permite calcular el valor real de tu inventario.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 4, display: "block" }}>
                          Valor por unidad ($)
                        </label>
                        <input type="number" placeholder="0" value={form.valor_adquisicion}
                          onChange={(e) => setForm({ ...form, valor_adquisicion: e.target.value })}
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid #fde68a", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "white" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 4, display: "block" }}>
                          Fecha de compra
                        </label>
                        <input type="date" value={form.fecha_adquisicion}
                          onChange={(e) => setForm({ ...form, fecha_adquisicion: e.target.value })}
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid #fde68a", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "white" }}
                        />
                      </div>
                    </div>
                    {/* Checkbox registrar gasto */}
                    {!editandoId && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          id="registrar-gasto-check"
                          checked={form.registrar_gasto_compra}
                          onChange={(e) => setForm({ ...form, registrar_gasto_compra: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#f59e0b" }}
                        />
                        <label htmlFor="registrar-gasto-check" style={{ fontSize: 12, color: "#92400e", cursor: "pointer" }}>
                          Registrar como gasto en contabilidad (artículo nuevo, no existía antes)
                        </label>
                      </div>
                    )}
                    {form.registrar_gasto_compra && Number(form.valor_adquisicion || 0) > 0 && Number(form.stock || 0) > 0 && (
                      <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#991b1b" }}>
                        Se registrará un gasto de <strong>{money(Number(form.valor_adquisicion) * Number(form.stock))}</strong> en contabilidad al guardar
                      </div>
                    )}
                  </div>
                )}

                {/* Margen calculado */}
                {Number(form.precio || 0) > 0 && Number(form.costo || 0) > 0 && (
                  <div style={{
                    marginTop: 12, padding: "10px 14px", borderRadius: 8,
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    fontSize: 13, color: "#166534", display: "flex", gap: 16, flexWrap: "wrap",
                  }}>
                    <span>💰 Ganancia estimada: <strong>{money(Number(form.precio) - Number(form.costo))}</strong></span>
                    <span>📊 Margen: <strong>{Math.round(((Number(form.precio) - Number(form.costo)) / Number(form.precio)) * 100)}%</strong></span>
                  </div>
                )}

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
                {/* Filtro tipo */}
                <select
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  style={{
                    padding: "10px 12px", border: "1px solid var(--sw-borde)",
                    borderRadius: 8, fontSize: 14, background: "var(--sw-fondo)",
                    color: "var(--sw-texto)", minWidth: 130
                  }}
                >
                  <option value="">Todos los tipos</option>
                  <option value="articulo">📦 Artículos</option>
                  <option value="servicio">🔧 Servicios</option>
                </select>
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
              {(buscar || categoriaFiltro || tipoFiltro) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--sw-texto-terciario)" }}>
                    {productosFiltrados.length} de {productos.length} items
                  </span>
                  <button
                    onClick={() => { setBuscar(""); setCategoriaFiltro(""); setTipoFiltro(""); }}
                    style={{
                      fontSize: 11, padding: "2px 10px", borderRadius: 20,
                      background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca",
                      cursor: "pointer"
                    }}
                  >
                    ✕ Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ═══ LISTADO ═══ */}
          <div className="sw-card">
            <div className="sw-card-header">
              <h3 className="sw-card-titulo">
                📋 {buscar || categoriaFiltro || tipoFiltro ? "Resultados" : "Inventario completo"} ({productosFiltrados.length})
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
                    {buscar || categoriaFiltro || tipoFiltro ? "No se encontraron items con esos filtros" : "No hay productos ni servicios registrados"}
                  </div>
                  {!buscar && !categoriaFiltro && !tipoFiltro && (
                    <p style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                      Agrega tu primer artículo o servicio, o importa desde Excel
                    </p>
                  )}
                </div>
              ) : (
                productosFiltrados.map((p) => {
                  const esServicio = p.tipo === "servicio";
                  return (
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
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                            background: esServicio ? "#f3e8ff" : "#eff6ff",
                            color: esServicio ? "#7c3aed" : "#2563eb",
                          }}>
                            {esServicio ? "🔧 Servicio" : "📦 Artículo"}
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
                          {!esServicio && Number(p.stock || 0) === 0 && (
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
                          {!esServicio && <span>Stock: <strong>{Number(p.stock || 0)}</strong></span>}
                          {Number(p.valor_adquisicion || 0) > 0 && <span style={{ color: "#b45309" }}>Adq: {money(p.valor_adquisicion)}</span>}
                          {Number(p.costo || 0) > 0 && <span style={{ color: "#dc2626" }}>Costo: {money(p.costo)}</span>}
                          {Number(p.costo || 0) > 0 && Number(p.precio || 0) > 0 && (
                            <span style={{ color: "var(--sw-verde)", fontWeight: 500 }}>
                              Margen: {Math.round(((Number(p.precio) - Number(p.costo)) / Number(p.precio)) * 100)}%
                            </span>
                          )}
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
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </Protegido>
  );
}