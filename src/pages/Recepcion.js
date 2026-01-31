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

  // Pagos a proveedores
const [pagosProveedoresRecepcion, setPagosProveedoresRecepcion] = useState([]);

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
        const cantidadGrupo = Number(p.cantidad || 1);
        
        p.productos.forEach((sub) => {
          const cantidadSub = Number(sub.cantidad || 0);
          const multiplicarSub = sub.multiplicar !== false; // por defecto true
          
          // ✅ Calcular cantidad esperada según checkbox
          const cantidadEsperada = multiplicarSub 
            ? cantidadSub * cantidadGrupo 
            : cantidadSub;
          
          productosConCampo.push({
            nombre: sub.nombre,
            esperado: cantidadEsperada,
            recibido: cantidadEsperada,
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

  // Extraer información de proveedores desde los productos
const extraerInfoProveedores = (productos) => {
  const mapa = new Map();

  (productos || []).forEach((item) => {
    if (item.es_grupo && Array.isArray(item.productos)) {
      const cantidadGrupo = Number(item.cantidad || 1);

      item.productos.forEach((sub) => {
        if (sub.es_proveedor) {
          const cantidadSub = Number(sub.cantidad || 0);
          const multiplicar = sub.multiplicar !== false;
          const cantidadFinal = multiplicar ? cantidadSub * cantidadGrupo : cantidadSub;
          const subtotal = cantidadFinal * Number(sub.precio_compra || 0);

          const key = sub.proveedor_nombre || "Proveedor";
          if (!mapa.has(key)) {
            mapa.set(key, {
              proveedor_id: sub.proveedor_id,
              proveedor_nombre: key,
              productos: [],
              total: 0,
            });
          }

          const grupo = mapa.get(key);
          grupo.productos.push({
            nombre: sub.nombre,
            cantidad: cantidadFinal,
            precio_compra: Number(sub.precio_compra || 0),
            subtotal,
          });
          grupo.total += subtotal;
        }
      });
    } else if (item.es_proveedor) {
      const cantidad = Number(item.cantidad || 0);
      const subtotal = cantidad * Number(item.precio_compra || 0);

      const key = item.proveedor_nombre || "Proveedor";
      if (!mapa.has(key)) {
        mapa.set(key, {
          proveedor_id: item.proveedor_id,
          proveedor_nombre: key,
          productos: [],
          total: 0,
        });
      }

      const grupo = mapa.get(key);
      grupo.productos.push({
        nombre: item.nombre,
        cantidad,
        precio_compra: Number(item.precio_compra || 0),
        subtotal,
      });
      grupo.total += subtotal;
    }
  });

  return Array.from(mapa.values());
};

// Actualizar abono de proveedor en recepción
const actualizarPagoProveedorRecepcion = (index, campo, valor) => {
  const nuevos = [...pagosProveedoresRecepcion];
  nuevos[index][campo] = valor;
  setPagosProveedoresRecepcion(nuevos);
};

// 🔧 CORREGIDO: Mover cálculo de pagos a proveedores a useEffect
useEffect(() => {
  if (!ordenSeleccionada) return; // ✅ Evitar error si no hay orden seleccionada

  // Cargar pagos a proveedores existentes
  const pagosExistentes = ordenSeleccionada.pagos_proveedores || [];

  // Calcular info de proveedores desde productos
  const proveedoresInfo = extraerInfoProveedores(ordenSeleccionada.productos);

  // Combinar pagos existentes con info actualizada
  const pagosParaRecepcion = proveedoresInfo.map((prov) => {
    const pagoExistente = pagosExistentes.find(
      (p) => p.proveedor_nombre === prov.proveedor_nombre
    );

    const abonosPrevios = pagoExistente?.abonos || [];
    const totalAbonado = abonosPrevios.reduce((sum, ab) => sum + Number(ab.valor || 0), 0);

    return {
      proveedor_id: prov.proveedor_id,
      proveedor_nombre: prov.proveedor_nombre,
      productos: prov.productos,
      total: prov.total,
      abonos_previos: abonosPrevios,
      total_abonado_previo: totalAbonado,
      abono_recepcion: "", // Nuevo abono en recepción
      fecha_abono_recepcion: new Date().toISOString().slice(0, 10),
      saldo_pendiente: prov.total - totalAbonado,
    };
  });

  setPagosProveedoresRecepcion(pagosParaRecepcion);
}, [ordenSeleccionada]); // ✅ Se ejecuta solo cuando cambia la orden

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

  try {
    // ✅ Cerrar y marcar como revisada EN UNA SOLA OPERACIÓN
    await supabase
      .from("ordenes_pedido")
      .update({ 
        cerrada: true,
        revisada: true,
        comentario_revision: comentarioGeneral 
      })
      .eq("id", ordenSeleccionada.id);

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

      // 3️⃣ Registrar movimientos contables
      await registrarContabilidadPorPedido(
  ordenSeleccionada,
  productosRevisados.map((p, i) => ({
    nombre: p.nombre,
    monto: parseInt(danos[i]?.monto || 0),
    tipo: p.tipo_origen,
  })),
  usuario
);

      // ✅ Calcular ingresos


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

      // 🆕 Registrar pagos a proveedores realizados en recepción
for (const pago of pagosProveedoresRecepcion) {
  const valorAbono = Number(pago.abono_recepcion || 0);
  if (valorAbono > 0) {
    await insertMC(
      {
        orden_id: ordenSeleccionada.id,
        cliente_id: null,
        fecha: pago.fecha_abono_recepcion || new Date().toISOString().split("T")[0],
        tipo: "gasto",
        monto: valorAbono,
        descripcion: `[${numeroLimpio}] Pago a proveedor: ${pago.proveedor_nombre}`,
        categoria: "Pagos a proveedores",
        estado: "activo",
        usuario: usuario?.nombre || "Administrador",
        fecha_modificacion: null,
      },
      "pago proveedor recepción"
    );

    // Actualizar los pagos en la orden
    const abonosActualizados = [
      ...(pago.abonos_previos || []),
      { valor: valorAbono, fecha: pago.fecha_abono_recepcion },
    ];

    // Actualizar pagos_proveedores en la orden
    const pagosActuales = ordenSeleccionada.pagos_proveedores || [];
    const indexPago = pagosActuales.findIndex(
      (p) => p.proveedor_nombre === pago.proveedor_nombre
    );

    if (indexPago >= 0) {
      pagosActuales[indexPago].abonos = abonosActualizados;
    } else {
      pagosActuales.push({
        proveedor_nombre: pago.proveedor_nombre,
        proveedor_id: pago.proveedor_id,
        total: pago.total,
        abonos: abonosActualizados,
      });
    }

    await supabase
      .from("ordenes_pedido")
      .update({ pagos_proveedores: pagosActuales })
      .eq("id", ordenSeleccionada.id);
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
  usuario
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

    // Los pagos a proveedores ahora se registran manualmente desde CrearDocumento
// y se pueden completar aquí en Recepción

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

            {/* 💰 PAGOS A PROVEEDORES */}
{pagosProveedoresRecepcion.length > 0 && (
  <div className="mt-6 bg-purple-50 p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-3 text-purple-800">
      💰 Pagos a Proveedores
    </h3>
    <p className="text-sm text-gray-600 mb-4">
      Registra aquí los pagos pendientes a proveedores. Los pagos previos ya están registrados en contabilidad.
    </p>

    {pagosProveedoresRecepcion.map((pago, index) => (
      <div
        key={pago.proveedor_nombre}
        className="bg-white border border-purple-200 rounded-lg p-4 mb-4"
      >
        {/* Header del proveedor */}
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-800">
            🏢 {pago.proveedor_nombre}
          </h4>
          {pago.saldo_pendiente <= 0 ? (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              ✓ Pagado
            </span>
          ) : (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
              Pendiente: ${Number(pago.saldo_pendiente).toLocaleString("es-CO")}
            </span>
          )}
        </div>

        {/* Productos */}
        <div className="text-sm text-gray-600 mb-3">
          {pago.productos.map((prod, i) => (
            <div key={i} className="flex justify-between py-1 border-b border-gray-100">
              <span>{prod.nombre} ({prod.cantidad} × ${Number(prod.precio_compra).toLocaleString("es-CO")})</span>
              <span className="font-medium">${Number(prod.subtotal).toLocaleString("es-CO")}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-semibold text-gray-800">
            <span>Total:</span>
            <span>${Number(pago.total).toLocaleString("es-CO")}</span>
          </div>
        </div>

        {/* Abonos previos */}
        {pago.abonos_previos.length > 0 && (
          <div className="mb-3 p-2 bg-green-50 rounded">
            <p className="text-xs font-medium text-green-700 mb-1">Abonos previos:</p>
            {pago.abonos_previos.map((ab, i) => (
              <div key={i} className="text-xs text-green-600 flex justify-between">
                <span>{ab.fecha ? new Date(ab.fecha).toLocaleDateString("es-CO") : "Sin fecha"}</span>
                <span>${Number(ab.valor).toLocaleString("es-CO")}</span>
              </div>
            ))}
            <div className="text-xs font-semibold text-green-800 mt-1 pt-1 border-t border-green-200 flex justify-between">
              <span>Total abonado:</span>
              <span>${Number(pago.total_abonado_previo).toLocaleString("es-CO")}</span>
            </div>
          </div>
        )}

        {/* Abono en recepción */}
        {pago.saldo_pendiente > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
            <span className="text-sm text-gray-600 whitespace-nowrap">Pagar ahora:</span>
            <input
              type="number"
              placeholder="Monto"
              value={pago.abono_recepcion}
              onChange={(e) =>
                actualizarPagoProveedorRecepcion(index, "abono_recepcion", e.target.value)
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="date"
              value={pago.fecha_abono_recepcion}
              onChange={(e) =>
                actualizarPagoProveedorRecepcion(index, "fecha_abono_recepcion", e.target.value)
              }
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        )}
      </div>
    ))}
  </div>
)}

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
                    ingresosAdicionales,
                    pagosProveedoresRecepcion  // 🆕 Agregar pagos a proveedores
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