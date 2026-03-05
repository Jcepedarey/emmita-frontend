import React, { useEffect, useState, useMemo } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Protegido from "../components/Protegido";

const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [formProv, setFormProv] = useState({ nombre: "", telefono: "", tipo_servicio: "" });
  const [formProd, setFormProd] = useState({ proveedor_id: "", nombre: "", precio_compra: "", precio_venta: "" });

  const [buscar, setBuscar] = useState("");
  const [editandoProveedor, setEditandoProveedor] = useState(null);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [mostrarFormProv, setMostrarFormProv] = useState(false);
  const [mostrarFormProd, setMostrarFormProd] = useState(false);
  const [proveedorExpandido, setProveedorExpandido] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const [{ data: provs }, { data: prods }] = await Promise.all([
      supabase.from("proveedores").select("*").order("nombre"),
      supabase.from("productos_proveedores").select("*")
    ]);
    if (provs) setProveedores(provs);
    if (prods) setProductosProveedor(prods);
    setLoading(false);
  };

  /* ─── CRUD Proveedores ─── */
  const guardarProveedor = async () => {
    if (!formProv.nombre.trim()) return Swal.fire("Campo requerido", "El nombre del proveedor es obligatorio.", "warning");

    if (editandoProveedor) {
      const { error } = await supabase.from("proveedores").update(formProv).eq("id", editandoProveedor);
      if (!error) {
        Swal.fire({ icon: "success", title: "Actualizado", timer: 1500, showConfirmButton: false });
        setEditandoProveedor(null);
      }
    } else {
      const { error } = await supabase.from("proveedores").insert([formProv]);
      if (!error) {
        Swal.fire({ icon: "success", title: "Proveedor guardado", timer: 1500, showConfirmButton: false });
      }
    }
    cerrarFormProv();
    cargarDatos();
  };

  const editarProveedor = (prov) => {
    setEditandoProveedor(prov.id);
    setFormProv({ nombre: prov.nombre, telefono: prov.telefono || "", tipo_servicio: prov.tipo_servicio || "" });
    setMostrarFormProv(true);
    setProveedorExpandido(prov.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarProveedor = async (id) => {
    const prodsDelProv = productosProveedor.filter(p => p.proveedor_id === id);
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar este proveedor?",
      html: prodsDelProv.length > 0
        ? `<p>Esto eliminará también <strong>${prodsDelProv.length} producto(s)</strong> asociados.</p>`
        : "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;

    await supabase.from("productos_proveedores").delete().eq("proveedor_id", id);
    const { error } = await supabase.from("proveedores").delete().eq("id", id);
    if (!error) {
      Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false });
      if (proveedorExpandido === id) setProveedorExpandido(null);
      cargarDatos();
    }
  };

  const cerrarFormProv = () => {
    setFormProv({ nombre: "", telefono: "", tipo_servicio: "" });
    setEditandoProveedor(null);
    setMostrarFormProv(false);
  };

  /* ─── CRUD Productos de Proveedor ─── */
  const guardarProductoProveedor = async () => {
    const { proveedor_id, nombre, precio_compra, precio_venta } = formProd;
    if (!proveedor_id || !nombre || !precio_compra || !precio_venta) {
      return Swal.fire("Faltan datos", "Completa todos los campos requeridos.", "warning");
    }
    if (Number(precio_compra) < 0 || Number(precio_venta) < 0) {
      return Swal.fire("Valores inválidos", "Los precios deben ser positivos.", "error");
    }

    const datos = { proveedor_id, nombre: nombre.trim(), precio_compra: Number(precio_compra), precio_venta: Number(precio_venta) };
    const operacion = editandoProducto
      ? supabase.from("productos_proveedores").update(datos).eq("id", editandoProducto)
      : supabase.from("productos_proveedores").insert([datos]);
    const { error } = await operacion;
    if (!error) {
      Swal.fire({ icon: "success", title: editandoProducto ? "Actualizado" : "Guardado", timer: 1500, showConfirmButton: false });
      cerrarFormProd();
      cargarDatos();
    } else Swal.fire("Error", "No se pudo guardar el producto.", "error");
  };

  const editarProducto = (producto) => {
    setEditandoProducto(producto.id);
    setFormProd({
      proveedor_id: producto.proveedor_id,
      nombre: producto.nombre || "",
      precio_compra: producto.precio_compra,
      precio_venta: producto.precio_venta,
    });
    setMostrarFormProd(true);
    setProveedorExpandido(producto.proveedor_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    const { error } = await supabase.from("productos_proveedores").delete().eq("id", id);
    if (!error) {
      Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false });
      cargarDatos();
    }
  };

  const cerrarFormProd = () => {
    setFormProd({ proveedor_id: formProd.proveedor_id, nombre: "", precio_compra: "", precio_venta: "" });
    setEditandoProducto(null);
    setMostrarFormProd(false);
  };

  const abrirFormProducto = (provId) => {
    setFormProd({ proveedor_id: provId, nombre: "", precio_compra: "", precio_venta: "" });
    setEditandoProducto(null);
    setMostrarFormProd(true);
    setProveedorExpandido(provId);
  };

  const borrarTodo = async () => {
    if (proveedores.length === 0) return Swal.fire("Sin datos", "No hay proveedores para eliminar.", "info");
    const { isConfirmed } = await Swal.fire({
      title: "⚠️ ¿Eliminar TODOS los proveedores?",
      html: `<p>Esto borrará <strong>${proveedores.length} proveedor(es)</strong> y <strong>${productosProveedor.length} producto(s)</strong> asociados.</p>
             <p style="color:#ef4444;font-weight:600;margin-top:8px;">Esta acción no se puede deshacer.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todo",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    await supabase.from("productos_proveedores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("proveedores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) {
      Swal.fire({ icon: "success", title: "Todo eliminado", timer: 2000, showConfirmButton: false });
      setProveedorExpandido(null);
      cargarDatos();
    } else Swal.fire("Error", "No se pudieron eliminar los proveedores.", "error");
  };

  /* ─── Exportar Excel ─── */
  const exportarExcel = () => {
    if (proveedores.length === 0) return Swal.fire("Sin datos", "No hay proveedores para exportar.", "info");

    // Hoja 1: Proveedores
    const datosProvs = proveedores.map((p, i) => ({
      "#": i + 1,
      "Nombre": p.nombre || "",
      "Teléfono": p.telefono || "",
      "Tipo de servicio": p.tipo_servicio || "",
      "Productos": productosProveedor.filter(pp => pp.proveedor_id === p.id).length
    }));

    const ws1 = XLSX.utils.json_to_sheet(datosProvs);
    ws1["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 10 }];

    // Hoja 2: Productos
    const datosProds = productosProveedor.map((pp, i) => {
      const prov = proveedores.find(p => p.id === pp.proveedor_id);
      return {
        "#": i + 1,
        "Proveedor": prov?.nombre || "",
        "Producto": pp.nombre || "",
        "Precio compra": Number(pp.precio_compra || 0),
        "Precio venta": Number(pp.precio_venta || 0),
        "Margen": Number(pp.precio_venta || 0) - Number(pp.precio_compra || 0)
      };
    });

    const ws2 = XLSX.utils.json_to_sheet(datosProds);
    ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Proveedores");
    XLSX.utils.book_append_sheet(wb, ws2, "Productos");
    const fecha = new Date().toLocaleDateString("es-CO").replaceAll("/", "-");
    XLSX.writeFile(wb, `proveedores_${fecha}.xlsx`);
    Swal.fire({ icon: "success", title: "Excel descargado", text: "Incluye 2 hojas: Proveedores y Productos", timer: 2000, showConfirmButton: false });
  };

  /* ─── Importar desde Excel ─── */
  const importarDesdeExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = "";

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      // ─── Hoja 1: Proveedores ───
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const mapCol = (row, opciones) => {
        for (const key of opciones) {
          const val = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
          if (val !== undefined && val !== "") return String(val).trim();
        }
        return "";
      };

      const provsValidos = json
        .map((row) => ({
          nombre: mapCol(row, ["nombre", "Nombre", "NOMBRE", "proveedor", "Proveedor", "PROVEEDOR"]),
          telefono: mapCol(row, ["telefono", "Teléfono", "Telefono", "TELEFONO", "cel", "celular", "Celular"]) || null,
          tipo_servicio: mapCol(row, ["tipo_servicio", "Tipo de servicio", "tipo", "Tipo", "TIPO", "servicio", "Servicio"]) || null
        }))
        .filter((p) => p.nombre);

      if (provsValidos.length === 0) {
        return Swal.fire("Sin datos válidos", "No se encontraron proveedores con nombre. Revisa que la columna 'nombre' exista.", "error");
      }

      // Insertar proveedores uno por uno para obtener IDs y manejar duplicados
      let provsImportados = 0;
      let provsErrores = 0;
      const mapaProveedores = {}; // nombre -> id

      for (const prov of provsValidos) {
        // Verificar si ya existe
        const { data: existente } = await supabase
          .from("proveedores")
          .select("id, nombre")
          .ilike("nombre", prov.nombre)
          .limit(1);

        if (existente && existente.length > 0) {
          // Ya existe: usar su ID para los productos
          mapaProveedores[prov.nombre.toLowerCase()] = existente[0].id;
          provsErrores++;
        } else {
          const { data: nuevo, error } = await supabase
            .from("proveedores")
            .insert([prov])
            .select("id")
            .single();
          if (error) {
            console.warn(`⚠️ No se importó proveedor "${prov.nombre}":`, error.message);
            provsErrores++;
          } else {
            mapaProveedores[prov.nombre.toLowerCase()] = nuevo.id;
            provsImportados++;
          }
        }
      }

      // ─── Hoja 2: Productos (si existe) ───
      let prodsImportados = 0;
      if (workbook.SheetNames.length >= 2) {
        const wsProds = workbook.Sheets[workbook.SheetNames[1]];
        const jsonProds = XLSX.utils.sheet_to_json(wsProds, { defval: "" });

        for (const row of jsonProds) {
          const provNombre = mapCol(row, ["proveedor", "Proveedor", "PROVEEDOR", "nombre_proveedor"]);
          const prodNombre = mapCol(row, ["producto", "Producto", "PRODUCTO", "nombre", "Nombre"]);
          const precioCompra = parseFloat(mapCol(row, ["precio_compra", "Precio compra", "Precio Compra", "costo", "Costo"]) || 0);
          const precioVenta = parseFloat(mapCol(row, ["precio_venta", "Precio venta", "Precio Venta", "precio", "Precio"]) || 0);

          if (!prodNombre || !provNombre) continue;

          const provId = mapaProveedores[provNombre.toLowerCase()];
          if (!provId) {
            console.warn(`⚠️ Producto "${prodNombre}" ignorado: proveedor "${provNombre}" no encontrado`);
            continue;
          }

          const { error } = await supabase.from("productos_proveedores").insert([{
            proveedor_id: provId,
            nombre: prodNombre,
            precio_compra: precioCompra,
            precio_venta: precioVenta,
            stock: 0
          }]);
          if (!error) prodsImportados++;
        }
      }

      // ─── Resultado ───
      let msg = "";
      if (provsImportados > 0) msg += `✅ ${provsImportados} proveedor(es) nuevos\n`;
      if (provsErrores > 0) msg += `⚠️ ${provsErrores} proveedor(es) ya existían o con error\n`;
      if (prodsImportados > 0) msg += `📦 ${prodsImportados} producto(s) importados`;
      if (!msg) msg = "No se importó nada nuevo.";

      Swal.fire("Importación completada", msg, provsImportados > 0 || prodsImportados > 0 ? "success" : "info");
      cargarDatos();
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
              <td style="border:1px solid #e5e7eb;padding:6px;">Decoraciones María</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">telefono</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">3001234567</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">tipo_servicio</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">Decoración floral</td>
            </tr>
          </table>
          <p style="margin-top:10px;">💡 <strong>Tips:</strong></p>
          <ul style="margin:4px 0 0 16px;padding:0;">
            <li>Acepta variantes como "Nombre", "Proveedor", "Teléfono", "celular", "Tipo", etc.</li>
            <li>Las filas sin nombre serán ignoradas.</li>
            <li>Si el proveedor ya existe, se reutiliza para asignarle productos.</li>
            <li>Formatos aceptados: <strong>.xlsx</strong> y <strong>.xls</strong></li>
          </ul>

          <hr style="margin:14px 0;border:none;border-top:1px solid #e5e7eb;" />

          <p><strong>📦 Hoja 2 (opcional): Productos de proveedores</strong></p>
          <p>Si tu archivo tiene una segunda hoja, puedes incluir los productos de cada proveedor:</p>
          <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;">
            <tr style="background:#f0fdf4;">
              <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Columna</th>
              <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">¿Obligatoria?</th>
              <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Ejemplo</th>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;font-weight:600;">Proveedor</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#ef4444;">✅ Sí</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">Decoraciones María</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;font-weight:600;">Producto</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#ef4444;">✅ Sí</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">Arreglo floral grande</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">Precio compra</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">25000</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:6px;">Precio venta</td>
              <td style="border:1px solid #e5e7eb;padding:6px;color:#9ca3af;">Opcional</td>
              <td style="border:1px solid #e5e7eb;padding:6px;">45000</td>
            </tr>
          </table>
          <p style="font-size:12px;color:#6b7280;">💡 El nombre del proveedor debe coincidir con los de la Hoja 1. Si el proveedor ya existe en el sistema, los productos se le asignan automáticamente.</p>
          <p style="font-size:12px;color:#6b7280;">💡 <strong>Tip:</strong> Usa "Exportar Excel" para descargar un ejemplo con el formato correcto de ambas hojas.</p>
        </div>
      `,
      width: 560,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#0077B6"
    });
  };

  /* ─── Filtrar ─── */
  const proveedoresFiltrados = useMemo(() => {
    if (!buscar.trim()) return proveedores;
    const q = buscar.toLowerCase();
    return proveedores.filter((p) =>
      (p.nombre || "").toLowerCase().includes(q) ||
      (p.telefono || "").toLowerCase().includes(q) ||
      (p.tipo_servicio || "").toLowerCase().includes(q) ||
      productosProveedor.some(pp => pp.proveedor_id === p.id && (pp.nombre || "").toLowerCase().includes(q))
    );
  }, [proveedores, productosProveedor, buscar]);

  /* ─── KPIs ─── */
  const tiposUnicos = [...new Set(proveedores.map(p => p.tipo_servicio).filter(Boolean))].length;

  /* ─── Input style helper ─── */
  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: "1px solid var(--sw-borde)", borderRadius: 8,
    fontSize: 14, boxSizing: "border-box"
  };

  /* ═══ RENDER ═══ */
  return (
    <Protegido>
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 950 }}>

          {/* ═══ HEADER ═══ */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">🏢 Gestión de Proveedores</h1>
          </div>

          {/* ═══ KPI CARDS ═══ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12, marginBottom: 20
          }}>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Proveedores</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-azul)", marginTop: 4 }}>{proveedores.length}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Productos</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-verde)", marginTop: 4 }}>{productosProveedor.length}</div>
            </div>
            <div className="sw-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", fontWeight: 500 }}>Tipos de servicio</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--sw-morado)", marginTop: 4 }}>{tiposUnicos}</div>
            </div>
          </div>

          {/* ═══ ACCIONES ═══ */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="sw-btn sw-btn-primario" onClick={() => { cerrarFormProv(); setMostrarFormProv(true); }}>
              ＋ Nuevo proveedor
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={exportarExcel}>
              📊 Exportar Excel
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={() => document.getElementById("archivoExcelProvs").click()}>
              📥 Importar Excel
            </button>
            <button className="sw-btn sw-btn-secundario" onClick={mostrarGuia}>
              ❓ Guía importación
            </button>
            <button className="sw-btn" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }} onClick={borrarTodo}>
              🗑️ Eliminar todo
            </button>
          </div>

          <input type="file" accept=".xlsx,.xls" onChange={importarDesdeExcel} id="archivoExcelProvs" style={{ display: "none" }} />

          {/* ═══ FORMULARIO PROVEEDOR ═══ */}
          {mostrarFormProv && (
            <div className="sw-card" style={{ marginBottom: 16 }}>
              <div className="sw-card-header sw-card-header-cyan">
                <h3 className="sw-card-titulo" style={{ color: "white", margin: 0 }}>
                  {editandoProveedor ? "✏️ Editar Proveedor" : "➕ Nuevo Proveedor"}
                </h3>
              </div>
              <div className="sw-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Nombre *</label>
                    <input type="text" placeholder="Nombre del proveedor" value={formProv.nombre}
                      onChange={(e) => setFormProv({ ...formProv, nombre: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Teléfono</label>
                    <input type="text" placeholder="300 123 4567" value={formProv.telefono}
                      onChange={(e) => setFormProv({ ...formProv, telefono: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Tipo de servicio</label>
                    <input type="text" placeholder="Ej: Decoración, Catering, Sonido..." value={formProv.tipo_servicio}
                      onChange={(e) => setFormProv({ ...formProv, tipo_servicio: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="sw-btn sw-btn-primario" style={{ flex: 1 }} onClick={guardarProveedor}>
                    {editandoProveedor ? "💾 Actualizar" : "💾 Guardar"}
                  </button>
                  <button className="sw-btn sw-btn-secundario" style={{ flex: 1 }} onClick={cerrarFormProv}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ FORMULARIO PRODUCTO ═══ */}
          {mostrarFormProd && (
            <div className="sw-card" style={{ marginBottom: 16 }}>
              <div className="sw-card-header" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                <h3 className="sw-card-titulo" style={{ color: "white", margin: 0 }}>
                  {editandoProducto ? "✏️ Editar Producto" : "📦 Nuevo Producto de Proveedor"}
                </h3>
              </div>
              <div className="sw-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Proveedor *</label>
                    <select value={formProd.proveedor_id}
                      onChange={(e) => setFormProd({ ...formProd, proveedor_id: e.target.value })} style={inputStyle}>
                      <option value="">— Selecciona proveedor —</option>
                      {proveedores.map((prov) => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Nombre del producto *</label>
                    <input type="text" placeholder="Nombre del producto" value={formProd.nombre}
                      onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Precio compra *</label>
                    <input type="number" placeholder="0" value={formProd.precio_compra}
                      onChange={(e) => setFormProd({ ...formProd, precio_compra: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", marginBottom: 4, display: "block" }}>Precio venta *</label>
                    <input type="number" placeholder="0" value={formProd.precio_venta}
                      onChange={(e) => setFormProd({ ...formProd, precio_venta: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="sw-btn" style={{ flex: 1, background: "var(--sw-gradiente-verde)", color: "white" }} onClick={guardarProductoProveedor}>
                    {editandoProducto ? "💾 Actualizar" : "💾 Guardar producto"}
                  </button>
                  <button className="sw-btn sw-btn-secundario" style={{ flex: 1 }} onClick={cerrarFormProd}>
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
                  placeholder="Buscar proveedor, teléfono, tipo de servicio o producto..."
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px 10px 38px",
                    border: "1px solid var(--sw-borde)", borderRadius: 8,
                    fontSize: 14, boxSizing: "border-box", background: "var(--sw-fondo)"
                  }}
                />
              </div>
              {buscar && (
                <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                  {proveedoresFiltrados.length} resultado{proveedoresFiltrados.length !== 1 ? "s" : ""} de {proveedores.length} proveedores
                </div>
              )}
            </div>
          </div>

          {/* ═══ LISTADO DE PROVEEDORES ═══ */}
          <div className="sw-card">
            <div className="sw-card-header">
              <h3 className="sw-card-titulo">
                📋 {buscar ? "Resultados" : "Todos los proveedores"} ({proveedoresFiltrados.length})
              </h3>
            </div>
            <div className="sw-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--sw-texto-terciario)" }}>
                  Cargando proveedores...
                </div>
              ) : proveedoresFiltrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontSize: 14, color: "var(--sw-texto-terciario)" }}>
                    {buscar ? `No se encontraron resultados para "${buscar}"` : "No hay proveedores registrados"}
                  </div>
                  {!buscar && (
                    <p style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 6 }}>
                      Agrega tu primer proveedor o importa desde Excel
                    </p>
                  )}
                </div>
              ) : (
                proveedoresFiltrados.map((prov) => {
                  const prodsDelProv = productosProveedor.filter(pp => pp.proveedor_id === prov.id);
                  const expandido = proveedorExpandido === prov.id;

                  return (
                    <div key={prov.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      {/* Fila del proveedor */}
                      <div style={{
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        transition: "background 0.15s",
                        background: expandido ? "#f0f9ff" : "transparent"
                      }}
                        onClick={() => setProveedorExpandido(expandido ? null : prov.id)}
                        onMouseEnter={(e) => { if (!expandido) e.currentTarget.style.background = "#f9fafb"; }}
                        onMouseLeave={(e) => { if (!expandido) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--sw-texto)" }}>
                              {prov.nombre}
                            </span>
                            {prov.tipo_servicio && (
                              <span style={{
                                fontSize: 11, padding: "2px 8px", borderRadius: 20,
                                background: "var(--sw-cyan-muy-claro)", color: "var(--sw-azul)", fontWeight: 500
                              }}>
                                {prov.tipo_servicio}
                              </span>
                            )}
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 20,
                              background: prodsDelProv.length > 0 ? "#ecfdf5" : "#f9fafb",
                              color: prodsDelProv.length > 0 ? "#059669" : "#9ca3af", fontWeight: 500
                            }}>
                              {prodsDelProv.length} producto{prodsDelProv.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 3 }}>
                            {prov.telefono && <span>📞 {prov.telefono}</span>}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button className="sw-btn-icono" onClick={() => abrirFormProducto(prov.id)} title="Agregar producto">
                            📦
                          </button>
                          <button className="sw-btn-icono" onClick={() => editarProveedor(prov)} title="Editar">
                            ✏️
                          </button>
                          <button className="sw-btn-icono" onClick={() => eliminarProveedor(prov.id)} title="Eliminar"
                            style={{ color: "#ef4444" }}>
                            🗑️
                          </button>
                          <span style={{ fontSize: 16, color: "var(--sw-texto-terciario)", marginLeft: 4 }}>
                            {expandido ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* Productos expandidos */}
                      {expandido && (
                        <div style={{ padding: "0 16px 14px 16px", background: "#f8fafc" }}>
                          {prodsDelProv.length === 0 ? (
                            <div style={{ padding: "12px 0", textAlign: "center", fontSize: 13, color: "var(--sw-texto-terciario)" }}>
                              Sin productos registrados —{" "}
                              <span style={{ color: "var(--sw-azul)", cursor: "pointer", fontWeight: 600 }}
                                onClick={() => abrirFormProducto(prov.id)}>
                                Agregar uno
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sw-texto-secundario)", padding: "8px 0 4px" }}>
                                Productos de {prov.nombre}:
                              </div>
                              {prodsDelProv.map((prod) => (
                                <div key={prod.id} style={{
                                  padding: "10px 12px",
                                  background: "white",
                                  borderRadius: 8,
                                  border: "1px solid var(--sw-borde)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 8
                                }}>
                                  <div>
                                    <div style={{ fontWeight: 500, fontSize: 13, color: "var(--sw-texto)" }}>{prod.nombre}</div>
                                    <div style={{ fontSize: 12, color: "var(--sw-texto-terciario)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                                      <span>Compra: <strong style={{ color: "var(--sw-rojo)" }}>{money(prod.precio_compra)}</strong></span>
                                      <span>Venta: <strong style={{ color: "var(--sw-verde-oscuro)" }}>{money(prod.precio_venta)}</strong></span>
                                      <span>Margen: <strong style={{ color: "var(--sw-azul)" }}>{money(Number(prod.precio_venta || 0) - Number(prod.precio_compra || 0))}</strong></span>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                    <button className="sw-btn-icono" onClick={() => editarProducto(prod)} title="Editar" style={{ width: 24, height: 24, fontSize: 12 }}>
                                      ✏️
                                    </button>
                                    <button className="sw-btn-icono" onClick={() => eliminarProducto(prod.id)} title="Eliminar"
                                      style={{ width: 24, height: 24, fontSize: 12, color: "#ef4444" }}>
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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