// src/components/BuscarProductoModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../supabaseClient";
import { v4 as uuidv4 } from "uuid";

const DEBOUNCE_MS = 250;
const PAGE_LIMIT = 50;

export default function BuscarProductoModal({
  onSelect,
  onAgregarProducto,
  onClose,
  persistOpen = true, // si false, cierra al seleccionar
}) {
  // 🔎 búsqueda
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  // ➕ formulario "nuevo producto"
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria: "",
    cantidad: 1,
  });
  const [temporal, setTemporal] = useState(false);

  const inputRef = useRef(null);

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce para q
  const debouncedQ = useMemo(() => {
    let h;
    return {
      set(value, setter) {
        clearTimeout(h);
        h = setTimeout(() => setter(value), DEBOUNCE_MS);
      },
    };
  }, []);

  // Ejecuta búsqueda con debounce
  useEffect(() => {
    let cancel = false;
    setError("");

    const run = async (term) => {
      // Evita traer todo si q vacío (muestra top N por nombre, opcional)
      if (!term || term.trim().length === 0) {
        setResultados([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("*")
          .ilike("nombre", `%${term}%`)
          .order("nombre", { ascending: true })
          .limit(PAGE_LIMIT);

        if (!cancel) {
          if (error) {
            setError("No se pudieron cargar productos.");
            setResultados([]);
          } else {
            setResultados(data || []);
          }
        }
      } catch (e) {
        if (!cancel) {
          setError("Error de conexión al buscar productos.");
          setResultados([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    debouncedQ.set(q, run);
    return () => {
      cancel = true;
    };
  }, [q, debouncedQ]);

  const limpiarYContinuar = () => {
    setQ("");
    inputRef.current?.focus();
  };

  // Agregar seleccionado desde inventario (no cierra, a menos que persistOpen=false)
  const handleAgregarSeleccion = (p) => {
    if (onSelect) onSelect(p);
    if (persistOpen) {
      limpiarYContinuar();
    } else {
      onClose?.();
    }
  };

  // Agregar como ítem temporal (a partir de un producto existente)
  const handleAgregarTemporalDesdeInventario = (p) => {
    if (onAgregarProducto) {
      onAgregarProducto({
        id: uuidv4(), // temporal independiente
        nombre: p.nombre,
        precio: Number(p.precio || 0),
        cantidad: 1,
        subtotal: Number(p.precio || 0),
        temporal: true,
        es_grupo: false,
      });
    }
    if (persistOpen) {
      limpiarYContinuar();
    } else {
      onClose?.();
    }
  };

  // Guardar nuevo producto (DB o temporal "desde cero")
  const guardarNuevoProducto = async () => {
    const { nombre, descripcion, precio, stock, categoria, cantidad } = form;

    if (!nombre || !precio || (!temporal && !stock)) {
      alert("Nombre y precio son obligatorios. Stock es obligatorio si no es temporal.");
      return;
    }

    // Si solo lo quieres para este documento (temporal puro)
    if (temporal) {
      const itemTemporal = {
        id: uuidv4(),
        nombre,
        precio: parseFloat(precio),
        cantidad: parseInt(cantidad, 10) || 1,
        subtotal: parseFloat(precio) * (parseInt(cantidad, 10) || 1),
        temporal: true,
        es_grupo: false,
      };
      onAgregarProducto?.(itemTemporal);
      if (persistOpen) {
        // limpiar form y mantener abierto
        setForm({
          nombre: "",
          descripcion: "",
          precio: "",
          stock: "",
          categoria: "",
          cantidad: 1,
        });
        inputRef.current?.focus();
      } else {
        onClose?.();
      }
      return;
    }

    // Guardar en DB y agregar al pedido
    try {
      const { data, error } = await supabase
        .from("productos")
        .insert([{ nombre, descripcion, precio: Number(precio), stock: Number(stock), categoria }])
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Error al guardar el producto.");
        return;
      }

      const nuevoProducto = {
        ...data,
        cantidad: parseInt(cantidad, 10) || 1,
        precio: Number(precio),
        subtotal: Number(precio) * (parseInt(cantidad, 10) || 1),
        temporal: false,
        es_grupo: false,
      };

      onAgregarProducto?.(nuevoProducto);

      if (persistOpen) {
        // limpiar form para seguir agregando
        setForm({
          nombre: "",
          descripcion: "",
          precio: "",
          stock: "",
          categoria: "",
          cantidad: 1,
        });
        inputRef.current?.focus();
      } else {
        onClose?.();
      }
    } catch (e) {
      console.error(e);
      alert("Error inesperado al guardar el producto.");
    }
  };

  // Enter para seleccionar primer resultado
  const onKeyDownBuscar = (e) => {
    if (e.key === "Enter" && resultados.length > 0) {
      handleAgregarSeleccion(resultados[0]);
    }
  };

  return (
     <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg w-[min(900px,92vw)] max-h-[90vh] overflow-y-auto p-5">
        <h2>🔍 Buscar producto</h2>

        <input
          ref={inputRef}
          type="text"
          placeholder="Escribe para buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDownBuscar}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        {loading && <div style={{ marginBottom: 8 }}>Cargando…</div>}
        {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}

        {q && resultados.length > 0 && (
          <ul style={{ maxHeight: 280, overflowY: "auto", padding: 0, listStyle: "none", margin: 0 }}>
            {resultados.map((p) => (
              <li
                key={p.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}
              >
                <div>
                  <strong>{p.nombre}</strong>
                  <br />
                  <small>Precio: ${Number(p.precio || 0).toLocaleString("es-CO")}</small>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleAgregarSeleccion(p)}>Agregar</button>
                  <button onClick={() => handleAgregarTemporalDesdeInventario(p)} title="Agregar como temporal">
                    Temp
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <hr style={{ margin: "20px 0" }} />

{/* ✅ Botón para mostrar/ocultar formulario */}
{!mostrarFormNuevo ? (
  <button
    onClick={() => setMostrarFormNuevo(true)}
    style={{
      backgroundColor: "#4CAF50",
      color: "white",
      padding: "10px 20px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "16px"
    }}
  >
    ➕ Agregar nuevo producto
  </button>
) : (
  <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
    <h3 style={{ marginTop: 0 }}>➕ Agregar nuevo producto</h3>

    <input
      type="text"
      placeholder="Nombre"
      value={form.nombre}
      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      style={{ width: "100%", marginBottom: 8, padding: 6 }}
    />
    <input
      type="text"
      placeholder="Descripción"
      value={form.descripcion}
      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      style={{ width: "100%", marginBottom: 8, padding: 6 }}
    />
    <input
      type="number"
      placeholder="Precio"
      value={form.precio}
      onChange={(e) => setForm({ ...form, precio: e.target.value })}
      style={{ width: "100%", marginBottom: 8, padding: 6 }}
    />
    <input
      type="number"
      placeholder="Stock"
      value={form.stock}
      onChange={(e) => setForm({ ...form, stock: e.target.value })}
      style={{ width: "100%", marginBottom: 8, padding: 6 }}
    />
    <input
      type="text"
      placeholder="Categoría"
      value={form.categoria}
      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
      style={{ width: "100%", marginBottom: 8, padding: 6 }}
    />
    <input
      type="number"
      placeholder="Cantidad"
      min="1"
      value={form.cantidad}
      onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
      style={{ width: "100%", marginBottom: 8, padding: 6 }}
    />

    <div style={{ marginTop: 10, marginBottom: 10 }}>
      <span style={{ display: "block", marginBottom: 4 }}>¿Producto temporal?</span>
      <input
        type="checkbox"
        checked={temporal}
        onChange={(e) => setTemporal(e.target.checked)}
        style={{ width: 16, height: 16, verticalAlign: "middle" }}
      />
    </div>

    <div style={{ display: "flex", gap: "10px", marginTop: 10 }}>
      <button
        onClick={guardarNuevoProducto}
        style={{
          backgroundColor: "#4CAF50",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        💾 Guardar producto
      </button>
      <button
        onClick={() => {
          setMostrarFormNuevo(false);
          setForm({
            nombre: "",
            descripcion: "",
            precio: "",
            stock: "",
            categoria: "",
            cantidad: 1,
          });
        }}
        style={{
          backgroundColor: "#9e9e9e",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        Cancelar
      </button>
    </div>
  </div>
)}

        <hr style={{ margin: "20px 0" }} />
        <button
  onClick={() => {
    setMostrarFormNuevo(false);
    onClose();
  }}
  style={{ backgroundColor: "#f44336", color: "#fff", padding: "8px 12px" }}
>
  ❌ Cerrar
</button>

        {!persistOpen && (
          <div style={{ marginTop: 8 }}>
            <small>Nota: <code>persistOpen=false</code> hará que el modal se cierre al agregar.</small>
          </div>
        )}
      </div>
    </div>
  );
}
