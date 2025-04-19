// C:\Users\pc\frontend-emmita\src\components\AgregarGrupoModal.js
import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import "../estilos/GrupoModal.css";

const AgregarGrupoModal = ({ onAgregarGrupo, onClose }) => {
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [productos, setProductos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargarProductos = async () => {
      const { data: inventario } = await supabase.from("productos").select("*");
  
      const { data: proveedores } = await supabase
        .from("productos_proveedores") // ✅ nombre corregido
        .select("id, nombre, descripcion, precio_venta");
  
      const convertidos = (proveedores || []).map((p) => ({
        id: `prov-${p.id}`,
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        precio: parseFloat(p.precio_venta), // 👈 usamos precio de venta
        es_proveedor: true
      }));
  
      const todos = [...(inventario || []), ...convertidos];
      setProductos(todos);
    };
  
    cargarProductos();
  }, []);

  const agregarAlGrupo = (producto) => {
    if (seleccionados.some((p) => p.id === producto.id)) return;

    setSeleccionados([
      ...seleccionados,
      {
        ...producto,
        cantidad: 1,
        subtotal: parseFloat(producto.precio),
        precio: parseFloat(producto.precio),
        es_proveedor: !!producto.es_proveedor
      }
    ]);
  };

  const actualizarCantidadPrecio = (index, campo, valor) => {
    const actualizados = [...seleccionados];
    actualizados[index][campo] = parseFloat(valor);
    actualizados[index].subtotal =
      actualizados[index].cantidad * actualizados[index].precio;
    setSeleccionados(actualizados);
  };

  const eliminarDelGrupo = (index) => {
    const actualizados = [...seleccionados];
    actualizados.splice(index, 1);
    setSeleccionados(actualizados);
  };

  const guardarGrupo = () => {
    if (!nombreGrupo || seleccionados.length === 0) {
      alert("Debes nombrar el grupo y agregar artículos.");
      return;
    }

    const subtotalGrupo = seleccionados.reduce((acc, p) => acc + p.subtotal, 0);
    const grupo = {
      nombre: nombreGrupo,
      subtotal: subtotalGrupo,
      articulos: seleccionados
    };
    onAgregarGrupo(grupo);
    onClose();
  };

  const filtrados = productos.filter((p) => {
    const texto = busqueda.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(texto) ||
      p.descripcion?.toLowerCase().includes(texto)
    );
  });

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Crear Grupo de Artículos</h2>

        <input
          type="text"
          placeholder="Nombre del grupo (ej: Set de fotos)"
          value={nombreGrupo}
          onChange={(e) => setNombreGrupo(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <ul style={{ maxHeight: "150px", overflowY: "auto", padding: 0 }}>
          {filtrados.map((p) => (
            <li key={p.id} style={{ marginBottom: "6px", listStyle: "none" }}>
              {p.nombre} - ${parseFloat(p.precio).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => agregarAlGrupo(p)}
              >
                Agregar
              </button>
            </li>
          ))}
        </ul>

        <h4 style={{ marginTop: "15px" }}>Artículos del grupo:</h4>
        <ul style={{ padding: 0 }}>
          {seleccionados.map((item, index) => (
            <li
              key={item.id}
              style={{ listStyle: "none", marginBottom: "8px" }}
            >
              {item.nombre} <br />
              Cantidad:
              <input
                type="number"
                min="1"
                value={item.cantidad}
                onChange={(e) =>
                  actualizarCantidadPrecio(index, "cantidad", e.target.value)
                }
                style={{ width: "60px", margin: "0 5px" }}
              />
              Precio:
              <input
                type="number"
                min="0"
                value={item.precio}
                onChange={(e) =>
                  actualizarCantidadPrecio(index, "precio", e.target.value)
                }
                style={{ width: "70px", margin: "0 5px" }}
              />
              <strong>
                Subtotal: ${item.subtotal.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </strong>
              <button
                onClick={() => eliminarDelGrupo(index)}
                style={{ marginLeft: "10px" }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <button onClick={guardarGrupo}>Guardar grupo</button>
          <button onClick={onClose} style={{ marginLeft: "10px" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgregarGrupoModal;
