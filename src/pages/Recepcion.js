// src/pages/Recepcion.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";

export default function Recepcion() {
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [productosRevisados, setProductosRevisados] = useState([]);
  const [comentarioGeneral, setComentarioGeneral] = useState("");

  useEffect(() => {
    const cargarOrdenesPendientes = async () => {
      const hoy = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .eq("revisada", false)
        .lt("fecha_evento", hoy)
        .order("fecha_evento", { ascending: true });

      if (error) {
        console.error("❌ Error cargando órdenes:", error);
      } else {
        setOrdenes(data);
      }
    };

    cargarOrdenesPendientes();
  }, []);
  const seleccionarOrden = (orden) => {
    setOrdenSeleccionada(orden);
    // Copia los productos y agrega campo 'recibido'
    const productosConCampo = orden.productos.map((prod) => ({
      ...prod,
      recibido: prod.cantidad, // valor inicial igual al esperado
      observacion: "",
    }));
    setProductosRevisados(productosConCampo);
  };

  const actualizarCantidad = (index, nuevaCantidad) => {
    const nuevos = [...productosRevisados];
    nuevos[index].recibido = parseInt(nuevaCantidad) || 0;
    setProductosRevisados(nuevos);
  };

  const actualizarObservacion = (index, texto) => {
    const nuevos = [...productosRevisados];
    nuevos[index].observacion = texto;
    setProductosRevisados(nuevos);
  };
  const guardarRevision = async () => {
    if (!ordenSeleccionada) return;

    const fechaRevision = new Date().toISOString();

    // 1️⃣ Actualizar la orden como revisada
    const { error: errorActualizar } = await supabase
      .from("ordenes_pedido")
      .update({
        revisada: true,
        fecha_revision: fechaRevision,
        comentarios: comentarioGeneral,
        productos: productosRevisados
      })
      .eq("id", ordenSeleccionada.id);

    if (errorActualizar) {
      return Swal.fire("Error", "No se pudo guardar la revisión", "error");
    }

    // 2️⃣ Ajustar inventario por productos incompletos
    for (const prod of productosRevisados) {
      const diferencia = prod.cantidad - prod.recibido;

      if (diferencia > 0) {
        await supabase.from("inventario").insert([
          {
            producto_id: prod.producto_id || prod.id,
            cantidad: diferencia,
            tipo_movimiento: "salida",
            observaciones: `Faltante tras recepción de orden ${ordenSeleccionada.numero}`,
            fecha: fechaRevision
          }
        ]);
      }
    }

    Swal.fire("✅ Revisión guardada", "La orden fue registrada correctamente", "success");
    setOrdenSeleccionada(null);
    setProductosRevisados([]);
    setComentarioGeneral("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">📦 Recepción de pedidos</h2>

      {!ordenSeleccionada ? (
        <div>
          <p>Selecciona una orden para revisar:</p>
          <ul className="mt-2">
            {ordenes.map((orden) => (
              <li key={orden.id} className="mb-2">
                <button
                  onClick={() => {
                    setOrdenSeleccionada(orden);
                    setProductosRevisados(orden.productos.map(p => ({
                      ...p,
                      recibido: p.cantidad,
                      observacion: ""
                    })));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
                >
                  Revisar {orden.numero}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white p-4 rounded shadow mt-4">
          <h3 className="text-lg font-semibold mb-3">
            Revisando: {ordenSeleccionada.numero}
          </h3>

          <table className="w-full mb-4 border">
            <thead>
              <tr>
                <th className="border px-2 py-1">Descripción</th>
                <th className="border px-2 py-1">Esperado</th>
                <th className="border px-2 py-1">Recibido</th>
                <th className="border px-2 py-1">Observación</th>
              </tr>
            </thead>
            <tbody>
              {productosRevisados.map((item, index) => (
                <tr key={index}>
                  <td className="border px-2 py-1">{item.nombre}</td>
                  <td className="border px-2 py-1 text-center">{item.cantidad}</td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="number"
                      value={item.recibido}
                      min="0"
                      onChange={(e) => actualizarCantidad(index, e.target.value)}
                      className="w-16 text-center"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={item.observacion}
                      onChange={(e) => actualizarObservacion(index, e.target.value)}
                      className="w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <label>Comentario general (opcional):</label>
          <textarea
            className="w-full mb-2 p-2 border rounded"
            rows={3}
            value={comentarioGeneral}
            onChange={(e) => setComentarioGeneral(e.target.value)}
          />

          <button
            onClick={guardarRevision}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
          >
            Guardar Revisión
          </button>
        </div>
      )}
    </div>
  );
}
