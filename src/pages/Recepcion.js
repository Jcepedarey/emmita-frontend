// src/pages/Recepcion.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDFRecepcion } from "../utils/generarPDFRecepcion";
import { useLocation } from "react-router-dom";
import Protegido from "../components/Protegido";

const Recepcion = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [productosRevisados, setProductosRevisados] = useState([]);
  const [danos, setDanos] = useState([]);
  const [comentarioGeneral, setComentarioGeneral] = useState("");
  const [usuario, setUsuario] = useState({ nombre: "Administrador" });
  const location = useLocation();
  const [gastosExtras, setGastosExtras] = useState([{ motivo: "", valor: "" }]);
  const [ingresosAdicionales, setIngresosAdicionales] = useState([]);

  const queryParams = new URLSearchParams(location.search);
  const ordenId = queryParams.get("id");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuario"));
    if (user) setUsuario(user);
  }, []);

  useEffect(() => {
    const cargarOrdenes = async () => {
      if (ordenId) {
        const { data, error } = await supabase
          .from("ordenes_pedido")
          .select("*, clientes(*), productos, abonos")
          .eq("id", ordenId)
          .single();

        if (error) {
          console.error("❌ Error cargando orden específica:", error);
          return;
        }

        setOrdenSeleccionada(data);
        seleccionarOrden(data);
      } else {
        const hoy = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("ordenes_pedido")
          .select("*, clientes(*)")
          .eq("revisada", false)
          .lt("fecha_evento", hoy)
          .order("fecha_evento", { ascending: true });

        if (error) {
          console.error("❌ Error cargando órdenes:", error);
          return;
        }

        setOrdenes(data);
      }
    };

    cargarOrdenes();
  }, [ordenId]);

  const seleccionarOrden = (orden) => {
    setOrdenSeleccionada(orden);
    const productosConCampo = [];

    orden.productos.forEach((p) => {
      if (p.es_grupo && Array.isArray(p.productos)) {
        p.productos.forEach((sub) => {
          productosConCampo.push({
            nombre: sub.nombre,
            esperado: sub.cantidad,
            recibido: sub.cantidad,
            observacion: "",
            producto_id: sub.id,
            proveedor: sub.proveedor || null,
            proveedor_id: sub.proveedor_id || null,
            tipo_origen: sub.proveedor_id ? "proveedor" : "propio",
          });
        });
      } else {
        productosConCampo.push({
          nombre: p.nombre,
          esperado: p.cantidad,
          recibido: p.cantidad,
          observacion: "",
          producto_id: p.id,
          proveedor: p.proveedor || null,
          proveedor_id: p.proveedor_id || null,
          tipo_origen: p.proveedor_id ? "proveedor" : "propio",
        });
      }
    });

    setProductosRevisados(productosConCampo);
    setDanos(productosConCampo.map(() => ({ monto: 0 })));
  };

  const actualizarCampo = (index, campo, valor) => {
    const copia = [...productosRevisados];
    copia[index][campo] = campo === "recibido" ? parseInt(valor) : valor;
    setProductosRevisados(copia);
  };

  const actualizarDano = (index, valor) => {
    const copia = [...danos];
    copia[index].monto = parseFloat(valor) || 0;
    setDanos(copia);
  };

  const insertMC = async (row, label = "") => {
    const { error } = await supabase.from("movimientos_contables").insert([row]);
    if (error) {
      console.error(`❌ Error insert ${label}:`, error);
      throw error;
    }
  };

  const guardarRevision = async () => {
    if (!ordenSeleccionada) {
      Swal.fire("Error", "No hay una orden cargada para revisar", "error");
      return;
    }

    await supabase
      .from("ordenes_pedido")
      .update({ cerrada: true })
      .eq("id", ordenSeleccionada.id);

    try {
      // 1️⃣ Descontar stock por diferencia esperada vs recibida
      for (const item of productosRevisados) {
        const diferencia = item.esperado - item.recibido;
        if (diferencia > 0 && item.producto_id) {
          await supabase.rpc("descontar_stock", {
            producto_id: item.producto_id,
            cantidad: diferencia,
          });
        }
      }

      // 🆕 CALCULAR COSTOS DE PROVEEDORES
      const calcularCostoProveedor = (productos) => {
        let total = 0;

        (productos || []).forEach((p) => {
          if (p.es_grupo && Array.isArray(p.productos)) {
            const factorGrupo = Number(p.cantidad) || 1;
            p.productos.forEach((sub) => {
              if (sub.es_proveedor && sub.precio_compra) {
                const cantidadTotal = (Number(sub.cantidad) || 0) * factorGrupo;
                total += cantidadTotal * Number(sub.precio_compra);
              }
            });
          } else if (p.es_proveedor && p.precio_compra) {
            const cantidad = Number(p.cantidad) || 0;
            total += cantidad * Number(p.precio_compra);
          }
        });

        return total;
      };

      const costosProveedores = calcularCostoProveedor(ordenSeleccionada.productos || []);

      // 3️⃣ Registrar movimientos contables
      await registrarContabilidadPorPedido(
  ordenSeleccionada,
  productosRevisados.map((p, i) => ({
    nombre: p.nombre,
    monto: parseInt(danos[i]?.monto || 0),
    tipo: p.tipo_origen,
  })),
  usuario,
  costosProveedores
);

      // 4️⃣ Marcar orden como revisada
      await supabase
  .from("ordenes_pedido")
  .update({
    revisada: true,
    comentario_revision: comentarioGeneral,
  })
  .match({ id: ordenSeleccionada.id });

      // ✅ Calcular ingresos
      const ingresos = (ordenSeleccionada.abonos || []).reduce(
        (acc, ab) => acc + Number(ab.valor || 0),
        0
      );

      const numeroOP = String(ordenSeleccionada.numero || "");
      const numeroLimpio = numeroOP.startsWith("OP-") ? numeroOP : `OP-${numeroOP}`;

      // ✅ Guardar los gastos adicionales ingresados manualmente
      for (const gasto of gastosExtras) {
        const valorNumerico = Number(gasto.valor);
        if (gasto.motivo && valorNumerico > 0) {
          await insertMC(
            {
              orden_id: ordenSeleccionada.id,
              cliente_id: ordenSeleccionada.cliente_id,
              fecha: new Date().toISOString().split("T")[0],
              tipo: "gasto",
              monto: valorNumerico,
              descripcion: `[${numeroLimpio}] ${gasto.motivo}`,
              categoria: "Gasto adicional (manual)",
              estado: "activo",
              usuario: usuario?.nombre || "Administrador",
              fecha_modificacion: null,
            },
            "gasto adicional"
          );
        }
      }

      // 🆕 Guardar ingresos adicionales (abonos en recepción)
      for (const ingreso of ingresosAdicionales) {
        const valorNumerico = Number(ingreso.valor);
        if (valorNumerico > 0) {
          await insertMC(
            {
              orden_id: ordenSeleccionada.id,
              cliente_id: ordenSeleccionada.cliente_id,
              fecha: ingreso.fecha || new Date().toISOString().split("T")[0],
              tipo: "ingreso",
              monto: valorNumerico,
              descripcion: `[${numeroLimpio}] Abono recibido en recepción`,
              categoria: "Abonos",
              estado: "activo",
              usuario: usuario?.nombre || "Administrador",
              fecha_modificacion: null,
            },
            "ingreso adicional"
          );
        }
      }

      Swal.fire("✅ Revisión guardada", "La recepción se ha registrado correctamente.", "success");
    } catch (error) {
      console.error("❌ Error general:", error);
      Swal.fire("Error", "Hubo un problema al guardar la revisión", "error");
    }
  };

  const registrarContabilidadPorPedido = async (
  orden,
  danos,
  usuario,
  costosProveedores
) => {
  try {
    const base = {
      orden_id: orden.id,
      cliente_id: orden.cliente_id,
      fecha: new Date().toISOString().split("T")[0],
      estado: "activo",
      usuario: usuario?.nombre || "Administrador",
      fecha_modificacion: null,
    };

    const numeroOP = String(orden.numero || "");
    const numeroLimpio = numeroOP.startsWith("OP-") ? numeroOP : `OP-${numeroOP}`;

    // 1. GASTOS POR PROVEEDORES
    if (costosProveedores > 0) {
      const proveedoresSet = new Set();
      (orden.productos || []).forEach((p) => {
        if (p.es_grupo && Array.isArray(p.productos)) {
          p.productos.forEach((sub) => {
            if (sub.es_proveedor && sub.proveedor_nombre) {
              proveedoresSet.add(sub.proveedor_nombre);
            }
          });
        } else if (p.es_proveedor && p.proveedor_nombre) {
          proveedoresSet.add(p.proveedor_nombre);
        }
      });

      const nombresProveedores = Array.from(proveedoresSet).join(", ") || "Proveedores";

      await insertMC(
        {
          ...base,
          tipo: "gasto",
          monto: costosProveedores,
          descripcion: `[${numeroLimpio}] Pago a proveedores: ${nombresProveedores}`,
          categoria: "Costos proveedores",
        },
        "costos proveedores"
      );
    }

    // 2. GASTOS POR DAÑOS
    for (const d of danos) {
      if (d.monto > 0) {
        if (d.tipo === "proveedor") {
          await insertMC(
            {
              ...base,
              tipo: "gasto",
              monto: Math.abs(d.monto),
              descripcion: `[${numeroLimpio}] Daño en producto del proveedor: ${d.nombre}`,
              categoria: "Daños proveedor",
            },
            "daño proveedor"
          );
        } else {
          await insertMC(
            {
              ...base,
              tipo: "gasto",
              monto: Math.abs(d.monto),
              descripcion: `[${numeroLimpio}] Daño en producto propio: ${d.nombre}`,
              categoria: "Daños propios",
            },
            "daño propio"
          );
        }
      }
    }

    // 3. DESCUENTOS
    if (orden.descuento && Number(orden.descuento) > 0) {
      await insertMC(
        {
          ...base,
          tipo: "gasto",
          monto: Number(orden.descuento),
          descripcion: `[${numeroLimpio}] Descuento aplicado`,
          categoria: "Descuentos",
        },
        "descuento"
      );
    }

    // 4. RETENCIONES (si existen en la orden)
    if (orden.retencion && Number(orden.retencion) > 0) {
      await insertMC(
        {
          ...base,
          tipo: "gasto",
          monto: Number(orden.retencion),
          descripcion: `[${numeroLimpio}] Retención legal`,
          categoria: "Retenciones",
        },
        "retención"
      );
    }
  } catch (error) {
    console.error("❌ Error registrando contabilidad del pedido:", error);
    throw error;
  }
};

  return (
    <Protegido>
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">📦 Recepción de pedidos</h2>

        {!ordenSeleccionada ? (
          <div>
            <p>Selecciona una orden para revisar:</p>
            <ul className="mt-2">
              <ul className="space-y-3">
                {ordenes.map((orden) => (
                  <li
                    key={orden.id}
                    className="bg-red-50 p-3 rounded-lg shadow flex justify-between items-center hover:bg-red-100 transition"
                  >
                    <div>
                      <p className="font-bold text-red-700">{orden.numero || "OP-???"}</p>
                      <p className="text-gray-800">{orden.clientes?.nombre || "Cliente"}</p>
                      <p className="text-gray-500 text-sm">
                        {new Date(orden.fecha_evento).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-lg">
                      <button
                        onClick={() => seleccionarOrden(orden)}
                        title="Revisar"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded"
                      >
                        🔍
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </ul>
          </div>
        ) : (
          <div className="bg-white p-4 rounded shadow mt-4">
            <h3 className="text-lg font-semibold mb-3">
              {ordenSeleccionada.clientes?.nombre || "Sin cliente"} —{" "}
              {new Date(ordenSeleccionada.fecha_evento).toLocaleDateString()}
            </h3>

            <table className="w-full mb-4 border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Producto</th>
                  <th className="border px-2 py-1">Esperado</th>
                  <th className="border px-2 py-1">Recibido</th>
                  <th className="border px-2 py-1">Daño ($)</th>
                  <th className="border px-2 py-1">Observación</th>
                </tr>
              </thead>
              <tbody>
                {productosRevisados.map((item, index) => (
                  <tr key={index}>
                    <td className="border px-2 py-1">
                      <span className={item.proveedor_id ? "font-bold" : ""}>{item.nombre}</span>
                      {item.proveedor && (
                        <span className="text-gray-500 ml-1">[{item.proveedor}]</span>
                      )}
                    </td>
                    <td className="border px-2 py-1 text-center">{item.esperado}</td>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.recibido}
                        onChange={(e) => actualizarCampo(index, "recibido", e.target.value)}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="$"
                        value={danos[index]?.monto || ""}
                        onChange={(e) => actualizarDano(index, e.target.value)}
                        className="w-24 text-center"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        placeholder="Opcional"
                        value={item.observacion}
                        onChange={(e) => actualizarCampo(index, "observacion", e.target.value)}
                        className="w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 📊 RESUMEN DE PAGOS */}
            <div className="bg-blue-50 p-4 rounded-lg shadow mt-6">
              <h3 className="text-lg font-semibold mb-3">💰 Resumen de Pagos</h3>

              {/* Abonos previos */}
              {ordenSeleccionada.abonos && ordenSeleccionada.abonos.length > 0 && (
                <div className="mb-4">
                  <p className="font-medium text-gray-700 mb-2">Abonos registrados:</p>
                  <ul className="space-y-1">
                    {ordenSeleccionada.abonos.map((abono, i) => (
                      <li key={i} className="text-sm text-gray-600">
                        • Abono {i + 1}: ${Number(abono.valor || 0).toLocaleString("es-CO")}
                        {abono.fecha &&
                          ` - ${new Date(abono.fecha).toLocaleDateString("es-CO")}`}
                      </li>
                    ))}
                  </ul>
                  <p className="font-bold text-green-700 mt-2">
                    Total abonado: $
                    {ordenSeleccionada.abonos
                      .reduce((sum, a) => sum + Number(a.valor || 0), 0)
                      .toLocaleString("es-CO")}
                  </p>
                </div>
              )}

              {/* Saldo pendiente */}
<div className="bg-yellow-100 p-3 rounded">
  <p className="font-bold text-lg">
    Saldo pendiente: $
    {(
      Number(ordenSeleccionada.total_neto || 0) -
      (ordenSeleccionada.abonos || []).reduce(
        (sum, a) => sum + Number(a.valor || 0),
        0
      ) -
      ingresosAdicionales.reduce(
        (sum, ing) => sum + Number(ing.valor || 0),
        0
      )
    ).toLocaleString("es-CO")}
  </p>
</div>
            </div>

            {/* 💵 INGRESOS ADICIONALES */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                💵 Ingresos adicionales (pagos recibidos en recepción)
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Registra aquí abonos o pagos que el cliente hizo después del evento o que olvidaste
                registrar antes.
              </p>

              {ingresosAdicionales.map((ingreso, index) => (
                <div key={index} className="flex items-center gap-4 mb-2">
                  <input
                    type="number"
                    placeholder="Monto"
                    value={ingreso.valor}
                    onChange={(e) => {
                      const nuevos = [...ingresosAdicionales];
                      nuevos[index].valor = e.target.value;
                      setIngresosAdicionales(nuevos);
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="date"
                    value={ingreso.fecha}
                    onChange={(e) => {
                      const nuevos = [...ingresosAdicionales];
                      nuevos[index].fecha = e.target.value;
                      setIngresosAdicionales(nuevos);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => {
                      const nuevos = [...ingresosAdicionales];
                      nuevos.splice(index, 1);
                      setIngresosAdicionales(nuevos);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <button
                onClick={() =>
                  setIngresosAdicionales([
                    ...ingresosAdicionales,
                    { valor: "", fecha: new Date().toISOString().slice(0, 10) },
                  ])
                }
                className="text-sm text-blue-600 hover:underline mt-2"
              >
                ➕ Agregar ingreso adicional
              </button>
            </div>

            <label className="block mt-4">Comentario general (opcional):</label>
            <textarea
              className="w-full mb-2 p-2 border rounded"
              rows={3}
              value={comentarioGeneral}
              onChange={(e) => setComentarioGeneral(e.target.value)}
            />

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">🧾 Gastos adicionales (opcional)</h3>
              {gastosExtras.map((gasto, index) => (
                <div key={index} className="flex items-center gap-4 mb-2">
                  <input
                    type="text"
                    placeholder="Motivo del gasto"
                    value={gasto.motivo}
                    onChange={(e) => {
                      const nuevosGastos = [...gastosExtras];
                      nuevosGastos[index].motivo = e.target.value;
                      setGastosExtras(nuevosGastos);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={gasto.valor}
                    onChange={(e) => {
                      const nuevosGastos = [...gastosExtras];
                      nuevosGastos[index].valor = e.target.value;
                      setGastosExtras(nuevosGastos);
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              ))}
              <button
                onClick={() => setGastosExtras([...gastosExtras, { motivo: "", valor: "" }])}
                className="text-sm text-blue-600 hover:underline"
              >
                ➕ Agregar otro gasto
              </button>
            </div>

            {/* ✅ Botones rediseñados */}
            <div className="flex flex-col md:flex-row gap-4 mt-6">
              <button
                onClick={guardarRevision}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:scale-105"
              >
                <span className="text-xl">💾</span>
                <span className="font-semibold text-lg">Guardar Revisión</span>
              </button>

              <button
                onClick={() => {
                  const productosParaPDF = productosRevisados.map((p) => ({
                    descripcion: p.nombre,
                    esperado: p.esperado,
                    recibido: p.recibido,
                    observacion: p.observacion || "",
                  }));

                  generarPDFRecepcion(
                    ordenSeleccionada,
                    ordenSeleccionada.clientes,
                    productosParaPDF,
                    ingresosAdicionales
                  );
                }}
                className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:scale-105"
              >
                <span className="text-xl">🧾</span>
                <span className="font-semibold text-lg">Descargar PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Protegido>
  );
};

export default Recepcion;