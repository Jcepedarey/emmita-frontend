import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../supabaseClient";
import "../estilos/GrupoModal.css";

const AgregarGrupoModal = ({
  onAgregarGrupo,
  onClose,
  stockDisponible = {},
  grupoEnEdicion,
  persistOpen = true, // si false, cierra al guardar
}) => {
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [cantidadGrupo, setCantidadGrupo] = useState(1);
  const [productos, setProductos] = useState([]); // inventario + proveedores normalizado
  const [seleccionados, setSeleccionados] = useState([]); // items del grupo
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const buscarRef = useRef(null);

  // Precarga para edición
  useEffect(() => {
    if (grupoEnEdicion) {
      setNombreGrupo(grupoEnEdicion.nombre || "");
      setCantidadGrupo(grupoEnEdicion.cantidad || 1);
      // Asegurar campos clave en items
      const items = (grupoEnEdicion.productos || []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        precio: typeof p.precio === "number" ? p.precio : Number(p.precio || 0),
        cantidad: typeof p.cantidad === "number" ? p.cantidad : Number(p.cantidad || 1),
        subtotal:
          (typeof p.subtotal === "number" ? p.subtotal : Number(p.precio || 0) * Number(p.cantidad || 1)) || 0,
        temporal: !!p.temporal,
        es_proveedor: !!p.es_proveedor,
      }));
      setSeleccionados(items);
    }
  }, [grupoEnEdicion]);

  // Carga inventario + proveedores
  useEffect(() => {
    let cancel = false;
    const cargarProductos = async () => {
      setLoading(true);
      setError("");
      try {
        const [{ data: inventario, error: e1 }, { data: proveedores, error: e2 }] = await Promise.all([
          supabase.from("productos").select("id, nombre, descripcion, precio"),
           supabase.from("productos_proveedores").select("id, nombre, precio_venta"),
        ]);

        if (e1 || e2) {
          setError("No se pudieron cargar los productos.");
          setProductos([]);
          return;
        }

        const inventarioNormalizado = (inventario || []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          precio: Number(p.precio || 0),
          es_proveedor: false,
        }));

        const proveedoresNormalizado = (proveedores || []).map((p) => ({
  id: `prov-${p.id}`,
  nombre: p.nombre,
  descripcion: "",                // ← antes intentaba leer p.descripcion
  precio: Number(p.precio_venta || 0),
  es_proveedor: true,
}));

        if (!cancel) {
          setProductos([...inventarioNormalizado, ...proveedoresNormalizado]);
        }
      } catch (e) {
        if (!cancel) {
          setError("Error de conexión al cargar productos.");
          setProductos([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    cargarProductos();
    return () => {
      cancel = true;
    };
  }, []);

  // Foco en buscar al abrir
  useEffect(() => {
    buscarRef.current?.focus();
  }, []);

  const filtrados = useMemo(() => {
    const t = (busqueda || "").toLowerCase();
    if (!t) return [];
    return productos.filter(
      (p) => p.nombre?.toLowerCase().includes(t) || p.descripcion?.toLowerCase().includes(t)
    );
  }, [productos, busqueda]);

  const agregarAlGrupo = (producto) => {
    if (seleccionados.some((p) => p.id === producto.id)) return;
    const nuevo = {
      ...producto,
      cantidad: 1,
      subtotal: producto.precio,
      temporal: false,
    };
    setSeleccionados((prev) => [...prev, nuevo]);
    setBusqueda("");
    buscarRef.current?.focus();
  };

  const actualizarCampo = (index, campo, valor) => {
    setSeleccionados((prev) => {
      const arr = [...prev];
      if (campo === "temporal") {
        arr[index][campo] = !!valor;
      } else if (campo === "cantidad") {
        const v = Math.max(1, parseInt(valor || 1, 10));
        arr[index].cantidad = v;
      } else if (campo === "precio") {
        const v = Math.max(0, Number(valor || 0));
        arr[index].precio = v;
      }
      arr[index].subtotal = Number(arr[index].precio || 0) * Number(arr[index].cantidad || 0);
      return arr;
    });
  };

  const eliminarDelGrupo = (index) => {
    setSeleccionados((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotalGrupo = useMemo(
    () => seleccionados.reduce((acc, it) => acc + Number(it.subtotal || 0), 0),
    [seleccionados]
  );

  const guardarGrupo = () => {
    if (!nombreGrupo || seleccionados.length === 0) {
      alert("Debes nombrar el grupo y agregar artículos.");
      return;
    }

    const grupo = {
      es_grupo: true,
      nombre: nombreGrupo,
      cantidad: Number(cantidadGrupo || 1),
      productos: seleccionados,
      subtotal: subtotalGrupo,
      precio: subtotalGrupo, // precio unitario del grupo (por día, según tu flujo)
    };

    onAgregarGrupo?.(grupo);

    if (persistOpen) {
      // Reiniciar para crear otro
      setNombreGrupo("");
      setCantidadGrupo(1);
      setSeleccionados([]);
      setBusqueda("");
      buscarRef.current?.focus();
    } else {
      onClose?.();
    }
  };

  // Enter para agregar primer filtrado
  const onKeyDownBuscar = (e) => {
    if (e.key === "Enter" && filtrados.length > 0) {
      agregarAlGrupo(filtrados[0]);
    }
  };

  const handleClose = () => {
  setNombreGrupo("");
  setCantidadGrupo(1);
  setSeleccionados([]);
  setBusqueda("");
  onClose?.();
};

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg w-[min(1000px,95vw)] max-h-[90vh] overflow-y-auto p-5">
        <h2>📦 Crear Grupo de Artículos</h2>

        <input
          type="text"
          placeholder="Nombre del grupo (ej: Set de fotos)"
          value={nombreGrupo}
          onChange={(e) => setNombreGrupo(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <label style={{ whiteSpace: "nowrap" }}>Cantidad del grupo:</label>
          <input
            type="number"
            min="1"
            value={cantidadGrupo}
            onChange={(e) => setCantidadGrupo(Math.max(1, parseInt(e.target.value || 1, 10)))}
            style={{ width: 90 }}
          />
        </div>

        <input
          ref={buscarRef}
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={onKeyDownBuscar}
          style={{ width: "100%", marginBottom: 10 }}
        />

        {loading && <div style={{ marginBottom: 8 }}>Cargando productos…</div>}
        {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}

        {busqueda && filtrados.length > 0 && (
          <ul style={{ maxHeight: 180, overflowY: "auto", padding: 0 }}>
            {filtrados.map((p) => (
              <li key={p.id} style={{ listStyle: "none", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{p.nombre}</strong>{" "}
                  <small>
                    ${Number(p.precio || 0).toLocaleString("es-CO")}
                    {p.es_proveedor ? " · Proveedor" : ""}
                  </small>
                </div>
                <div style={{ fontSize: 12, color: "#666", marginRight: 10 }}>
                  Stock: {stockDisponible?.[p.id] ?? "N/A"}
                </div>
                <button onClick={() => agregarAlGrupo(p)}>Agregar</button>
              </li>
            ))}
          </ul>
        )}

        <h4 style={{ marginTop: 15 }}>Artículos del grupo:</h4>
        <ul style={{ padding: 0 }}>
          {seleccionados.map((item, index) => (
            <li key={`${item.id}-${index}`} style={{ listStyle: "none", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ minWidth: 200 }}>
                  <strong>{item.nombre}</strong>{" "}
                  <small style={{ color: "gray" }}>
                    {item.es_proveedor ? "· Proveedor" : "· Inventario"} · Stock: {stockDisponible?.[item.id] ?? "N/A"}
                  </small>
                </div>

                <div>
                  Cant:
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => actualizarCampo(index, "cantidad", e.target.value)}
                    style={{ width: 70, marginLeft: 6 }}
                  />
                </div>

                <div>
                  Precio:
                  <input
                    type="number"
                    min="0"
                    value={item.precio}
                    onChange={(e) => actualizarCampo(index, "precio", e.target.value)}
                    style={{ width: 90, marginLeft: 6 }}
                  />
                </div>

                <strong style={{ marginLeft: "auto" }}>
                  Subtotal: ${Number(item.subtotal || 0).toLocaleString("es-CO")}
                </strong>

                <button onClick={() => eliminarDelGrupo(index)} style={{ marginLeft: 8 }}>
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 12, textAlign: "right" }}>
          <strong>Total grupo:</strong> ${subtotalGrupo.toLocaleString("es-CO")}
        </div>

        <div style={{ marginTop: 15, textAlign: "center" }}>
          <button onClick={guardarGrupo}>➕ Agregar grupo</button>
          <button onClick={handleClose} style={{ marginLeft: 10 }}>
  Cerrar
</button>
          {!persistOpen && (
            <div style={{ marginTop: 6 }}>
              <small>Nota: <code>persistOpen=false</code> cerrará la ventana al guardar.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgregarGrupoModal;