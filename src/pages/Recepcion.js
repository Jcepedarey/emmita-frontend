// src/pages/Recepcion.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDFRecepcion } from "../utils/generarPDFRecepcion";
import { useLocation } from "react-router-dom";
import Protegido from "../components/Protegido";
import "../estilos/CrearDocumentoEstilo.css";

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

  // 🛡️ Garantía
  const [garantiaRetenida, setGarantiaRetenida] = useState("");  // monto retenido por daños/demora

  // Pagos a proveedores
  const [pagosProveedoresRecepcion, setPagosProveedoresRecepcion] = useState([]);

  // 🔒 Protección contra doble clic
  const [guardando, setGuardando] = useState(false);

  // ✅ Checkboxes de artículos devueltos
  const [articulosDevueltos, setArticulosDevueltos] = useState([]);

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
          .select("*, clientes(*), productos, abonos, fecha_entrega, fecha_devolucion, mercancia_devuelta, articulos_devueltos, gastos_extras_recepcion, abonos_recepcion")
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
          .select("*, clientes(*), fecha_entrega, fecha_devolucion, mercancia_devuelta, articulos_devueltos")
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

    // ✅ Precargar artículos devueltos desde guardado parcial anterior
    const devueltosGuardados = orden.articulos_devueltos || [];
    const devueltosInicial = productosConCampo.map((p) => {
      const guardado = devueltosGuardados.find((d) => d.nombre === p.nombre);
      return { nombre: p.nombre, devuelto: guardado ? guardado.devuelto : false };
    });
    setArticulosDevueltos(devueltosInicial);

    // ✅ Precargar gastos extras si había guardado parcial
    if (orden.gastos_extras_recepcion && orden.gastos_extras_recepcion.length > 0) {
      setGastosExtras(orden.gastos_extras_recepcion);
    } else {
      setGastosExtras([{ motivo: "", valor: "" }]);
    }

    // ✅ Precargar abonos de recepción si había guardado parcial
    if (orden.abonos_recepcion && orden.abonos_recepcion.length > 0) {
      setIngresosAdicionales(orden.abonos_recepcion);
    } else {
      setIngresosAdicionales([]);
    }

    // ✅ Precargar garantía retenida
    if (orden.garantia !== undefined && orden.garantia_devuelta !== undefined) {
      const retenida = Number(orden.garantia || 0) - Number(orden.garantia_devuelta || 0);
      if (retenida > 0) setGarantiaRetenida(String(retenida));
      else setGarantiaRetenida("");
    } else {
      setGarantiaRetenida("");
    }

    // ✅ Precargar comentario
    if (orden.comentario_revision) {
      setComentarioGeneral(orden.comentario_revision);
    } else {
      setComentarioGeneral("");
    }
  };

  // ✅ Toggle devuelto individual
  const toggleDevuelto = (index, valor) => {
    const copia = [...articulosDevueltos];
    copia[index] = { ...copia[index], devuelto: valor };
    setArticulosDevueltos(copia);
  };

  // ✅ Toggle todos los artículos devueltos
  const toggleTodos = (checked) => {
    setArticulosDevueltos(articulosDevueltos.map((a) => ({ ...a, devuelto: checked })));
  };

  // ✅ Computed: ¿todos los artículos están devueltos?
  const todosDevueltos = articulosDevueltos.length > 0 && articulosDevueltos.every((a) => a.devuelto);
  const algunoDevuelto = articulosDevueltos.some((a) => a.devuelto);

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

  // 🛡️ Anti-duplicados: borrar y re-insertar MC por categorías
  const limpiarYReinsertarMC = async (orden_id, categorias, insertar) => {
    for (const cat of categorias) {
      await supabase
        .from("movimientos_contables")
        .delete()
        .eq("orden_id", orden_id)
        .eq("categoria", cat);
    }
    await insertar();
  };

  // 🔧 Función central de guardado (parcial o definitivo)
  const guardarEstado = async (cerrar = false) => {
    if (!ordenSeleccionada) {
      Swal.fire("Error", "No hay una orden cargada para revisar", "error");
      return;
    }

    if (guardando) {
      console.log("⚠️ Ya se está guardando, ignorando clic adicional");
      return;
    }
    setGuardando(true);

    try {
      const numeroOP = String(ordenSeleccionada.numero || "");
      const numeroLimpio = numeroOP.startsWith("OP-") ? numeroOP : `OP-${numeroOP}`;
      const fechaHoy = new Date().toISOString().split("T")[0];

      // ✅ Calcular mercancia_devuelta automáticamente
      const mercanciaDevuelta = todosDevueltos;

      // 1️⃣ Guardar estado base en la orden (siempre)
      const updateData = {
        comentario_revision: comentarioGeneral,
        productos_revisados: productosRevisados,
        articulos_devueltos: articulosDevueltos,
        mercancia_devuelta: mercanciaDevuelta,
        gastos_extras_recepcion: gastosExtras.filter((g) => g.motivo && Number(g.valor) > 0),
        abonos_recepcion: ingresosAdicionales.filter((a) => Number(a.valor) > 0),
      };

      if (cerrar) {
        updateData.revisada = true;
        updateData.cerrada = true;
      }

      await supabase
        .from("ordenes_pedido")
        .update(updateData)
        .eq("id", ordenSeleccionada.id);

      // 2️⃣ Descontar stock (solo al cerrar definitivamente)
      if (cerrar) {
        for (const item of productosRevisados) {
          const diferencia = item.esperado - item.recibido;
          if (diferencia > 0 && item.producto_id) {
            await supabase.rpc("descontar_stock", {
              producto_id: item.producto_id,
              cantidad: diferencia,
            });
          }
        }
      }

      // 3️⃣ Daños — limpiar y re-insertar (anti-duplicados)
      await limpiarYReinsertarMC(
        ordenSeleccionada.id,
        ["Daños proveedor", "Daños propios"],
        async () => {
          for (let i = 0; i < productosRevisados.length; i++) {
            const p = productosRevisados[i];
            const monto = parseFloat(danos[i]?.monto || 0);
            if (monto > 0) {
              const cat = p.tipo_origen === "proveedor" ? "Daños proveedor" : "Daños propios";
              const desc =
                p.tipo_origen === "proveedor"
                  ? `[${numeroLimpio}] Daño en producto del proveedor: ${p.nombre}`
                  : `[${numeroLimpio}] Daño en producto propio: ${p.nombre}`;
              await insertMC(
                {
                  orden_id: ordenSeleccionada.id,
                  cliente_id: ordenSeleccionada.cliente_id,
                  fecha: fechaHoy,
                  tipo: "gasto",
                  monto: Math.abs(monto),
                  descripcion: desc,
                  categoria: cat,
                  estado: "activo",
                  usuario: usuario?.nombre || "Administrador",
                  fecha_modificacion: null,
                },
                "daño"
              );
            }
          }
        }
      );

      // 4️⃣ Descuentos y retenciones — solo al cerrar (son datos estáticos de la orden)
      if (cerrar) {
        await limpiarYReinsertarMC(
          ordenSeleccionada.id,
          ["Descuentos"],
          async () => {
            if (ordenSeleccionada.descuento && Number(ordenSeleccionada.descuento) > 0) {
              await insertMC(
                {
                  orden_id: ordenSeleccionada.id,
                  cliente_id: ordenSeleccionada.cliente_id,
                  fecha: fechaHoy,
                  tipo: "gasto",
                  monto: Number(ordenSeleccionada.descuento),
                  descripcion: `[${numeroLimpio}] Descuento aplicado`,
                  categoria: "Descuentos",
                  estado: "activo",
                  usuario: usuario?.nombre || "Administrador",
                  fecha_modificacion: null,
                },
                "descuento"
              );
            }
          }
        );

        await limpiarYReinsertarMC(
          ordenSeleccionada.id,
          ["Retenciones"],
          async () => {
            if (ordenSeleccionada.retencion && Number(ordenSeleccionada.retencion) > 0) {
              await insertMC(
                {
                  orden_id: ordenSeleccionada.id,
                  cliente_id: ordenSeleccionada.cliente_id,
                  fecha: fechaHoy,
                  tipo: "gasto",
                  monto: Number(ordenSeleccionada.retencion),
                  descripcion: `[${numeroLimpio}] Retención legal`,
                  categoria: "Retenciones",
                  estado: "activo",
                  usuario: usuario?.nombre || "Administrador",
                  fecha_modificacion: null,
                },
                "retención"
              );
            }
          }
        );
      }

      // 5️⃣ Gastos adicionales — limpiar y re-insertar (anti-duplicados)
      await limpiarYReinsertarMC(
        ordenSeleccionada.id,
        ["Gasto adicional (manual)"],
        async () => {
          for (const gasto of gastosExtras) {
            const valorNumerico = Number(gasto.valor);
            if (gasto.motivo && valorNumerico > 0) {
              await insertMC(
                {
                  orden_id: ordenSeleccionada.id,
                  cliente_id: ordenSeleccionada.cliente_id,
                  fecha: fechaHoy,
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
        }
      );

      // 6️⃣ Abonos (ingresos adicionales) — leer frescos de BD y re-insertar
      await limpiarYReinsertarMC(
        ordenSeleccionada.id,
        ["Abonos"],
        async () => {
          for (const ingreso of ingresosAdicionales) {
            const valorNumerico = Number(ingreso.valor);
            if (valorNumerico > 0) {
              await insertMC(
                {
                  orden_id: ordenSeleccionada.id,
                  cliente_id: ordenSeleccionada.cliente_id,
                  fecha: ingreso.fecha || fechaHoy,
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
        }
      );

      // 7️⃣ Garantía retenida — limpiar y re-insertar
      const valorGarantiaRetenida = Number(garantiaRetenida || 0);
      const garantiaTotal = Number(ordenSeleccionada.garantia || 0);
      const garantiaDevuelta = Math.max(0, garantiaTotal - valorGarantiaRetenida);

      await limpiarYReinsertarMC(
        ordenSeleccionada.id,
        ["Garantía retenida"],
        async () => {
          if (valorGarantiaRetenida > 0) {
            await insertMC(
              {
                orden_id: ordenSeleccionada.id,
                cliente_id: ordenSeleccionada.cliente_id,
                fecha: fechaHoy,
                tipo: "ingreso",
                monto: valorGarantiaRetenida,
                descripcion: `[${numeroLimpio}] Garantía retenida por daños/demora`,
                categoria: "Garantía retenida",
                estado: "activo",
                usuario: usuario?.nombre || "Administrador",
                fecha_modificacion: null,
              },
              "garantía retenida"
            );
          }
        }
      );

      // 💾 Guardar info de garantía en la orden
      if (garantiaTotal > 0) {
        await supabase
          .from("ordenes_pedido")
          .update({ garantia_devuelta: garantiaDevuelta })
          .eq("id", ordenSeleccionada.id);
      }

      // 8️⃣ Pagos a proveedores — leer frescos de BD (anti-duplicados)
      const { data: ordenFresca } = await supabase
        .from("ordenes_pedido")
        .select("pagos_proveedores")
        .eq("id", ordenSeleccionada.id)
        .single();

      const pagosActuales = ordenFresca?.pagos_proveedores || [];

      await limpiarYReinsertarMC(
        ordenSeleccionada.id,
        ["Pagos a proveedores"],
        async () => {
          for (const pago of pagosProveedoresRecepcion) {
            const valorAbono = Number(pago.abono_recepcion || 0);
            if (valorAbono > 0) {
              await insertMC(
                {
                  orden_id: ordenSeleccionada.id,
                  cliente_id: null,
                  fecha: pago.fecha_abono_recepcion || fechaHoy,
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
            }
          }
        }
      );

      // Actualizar pagos_proveedores en la orden
      const pagosActualizados = [...pagosActuales];
      for (const pago of pagosProveedoresRecepcion) {
        const valorAbono = Number(pago.abono_recepcion || 0);
        if (valorAbono > 0) {
          const abonosActualizados = [
            ...(pago.abonos_previos || []),
            { valor: valorAbono, fecha: pago.fecha_abono_recepcion },
          ];
          const indexPago = pagosActualizados.findIndex(
            (p) => p.proveedor_nombre === pago.proveedor_nombre
          );
          if (indexPago >= 0) {
            pagosActualizados[indexPago].abonos = abonosActualizados;
          } else {
            pagosActualizados.push({
              proveedor_nombre: pago.proveedor_nombre,
              proveedor_id: pago.proveedor_id,
              total: pago.total,
              abonos: abonosActualizados,
            });
          }
        }
      }

      if (pagosActualizados.length > 0) {
        await supabase
          .from("ordenes_pedido")
          .update({ pagos_proveedores: pagosActualizados })
          .eq("id", ordenSeleccionada.id);
      }

      if (cerrar) {
        Swal.fire("✅ Recepción cerrada", "La recepción se cerró y registró correctamente.", "success");
      } else {
        Swal.fire({
          title: "💾 Guardado parcial exitoso",
          text: "El estado fue guardado. Puedes seguir editando.",
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("❌ Error general:", error);
      Swal.fire("Error", "Hubo un problema al guardar la revisión", "error");
    } finally {
      // 🔓 Siempre liberar el bloqueo al terminar
      setGuardando(false);
    }
  };

  // 💾 Guardado parcial (sin marcar como cerrada/revisada)
  const guardarParcial = () => guardarEstado(false);

  // ✅ Cerrar recepción definitivamente
  const cerrarRecepcion = async () => {
    const confirm = await Swal.fire({
      title: "¿Cerrar definitivamente esta recepción?",
      text: "Una vez cerrada no se puede reabrir fácilmente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, cerrar",
      cancelButtonText: "Cancelar",
    });
    if (confirm.isConfirmed) {
      guardarEstado(true);
    }
  };

  // 🔁 Mantener guardarRevision por compatibilidad (ya no se usa en la UI)
  const guardarRevision = () => guardarEstado(true);

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
      <div className="sw-pagina">
        <div className="sw-pagina-contenido" style={{ maxWidth: 900 }}>
          {/* ========== HEADER ========== */}
          <div className="sw-header">
            <h1 className="sw-header-titulo">📦 Recepción de Pedidos</h1>
          </div>

        {!ordenSeleccionada ? (
          <div className="cd-card">
            <div className="cd-card-header">🔍 Selecciona una orden para revisar</div>
            <div className="cd-card-body" style={{ padding: 0 }}>
              {ordenes.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
                  No hay órdenes pendientes de revisión
                </div>
              ) : (
                ordenes.map((orden) => (
                  <div
                    key={orden.id}
                    onClick={() => seleccionarOrden(orden)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fff7ed"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#dc2626", fontSize: "14px" }}>
                        {orden.numero || "OP-???"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#111827", marginTop: "2px" }}>
                        {orden.clientes?.nombre || "Cliente"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                        📅 {new Date(orden.fecha_evento).toLocaleDateString("es-CO")}
                      </div>
                    </div>
                    <span style={{ fontSize: "20px" }}>→</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Info del pedido */}
            <div className="cd-card">
              <div className="cd-card-header cd-card-header-cyan" style={{ justifyContent: "space-between" }}>
                <span>
                  {ordenSeleccionada.numero || "OP-???"} — {ordenSeleccionada.clientes?.nombre || "Sin cliente"}
                </span>
                <span style={{ fontSize: "12px", opacity: 0.85 }}>
                  📅 {new Date(ordenSeleccionada.fecha_evento).toLocaleDateString("es-CO")}
                </span>
              </div>
              <div className="cd-card-body" style={{ padding: 0 }}>
                <div className="cd-tabla-wrap">
                  <table className="cd-tabla">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Esperado</th>
                        <th>Recibido</th>
                        <th>Daño ($)</th>
                        <th>Observación</th>
                        <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <span>Devuelto</span>
                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 400, fontSize: "11px", color: "#6b7280", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={todosDevueltos}
                                ref={(el) => {
                                  if (el) el.indeterminate = algunoDevuelto && !todosDevueltos;
                                }}
                                onChange={(e) => toggleTodos(e.target.checked)}
                                style={{ cursor: "pointer" }}
                              />
                              Todos
                            </label>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosRevisados.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <span style={{ fontWeight: item.proveedor_id ? 600 : 400 }}>{item.nombre}</span>
                            {item.proveedor && (
                              <span style={{ color: "#9ca3af", marginLeft: "4px", fontSize: "12px" }}>[{item.proveedor}]</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{item.esperado}</td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="number"
                              min="0"
                              value={item.recibido}
                              onChange={(e) => actualizarCampo(index, "recibido", e.target.value)}
                              style={{ width: "64px", textAlign: "center", padding: "6px", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="$"
                              value={danos[index]?.monto || ""}
                              onChange={(e) => actualizarDano(index, e.target.value)}
                              style={{ width: "90px", textAlign: "center", padding: "6px", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Opcional"
                              value={item.observacion}
                              onChange={(e) => actualizarCampo(index, "observacion", e.target.value)}
                              style={{ width: "100%", padding: "6px", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={articulosDevueltos[index]?.devuelto || false}
                              onChange={(e) => toggleDevuelto(index, e.target.checked)}
                              style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#16a34a" }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Indicador de mercancia devuelta */}
                {articulosDevueltos.length > 0 && (
                  <div style={{
                    padding: "8px 16px",
                    background: todosDevueltos ? "#f0fdf4" : algunoDevuelto ? "#fffbeb" : "#f9fafb",
                    borderTop: "1px solid #e5e7eb",
                    fontSize: "13px",
                    color: todosDevueltos ? "#166534" : algunoDevuelto ? "#92400e" : "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    {todosDevueltos
                      ? "✅ Toda la mercancía marcada como devuelta"
                      : algunoDevuelto
                      ? `⚠️ ${articulosDevueltos.filter((a) => a.devuelto).length} de ${articulosDevueltos.length} artículos devueltos`
                      : "⬜ Ningún artículo marcado como devuelto aún"}
                  </div>
                )}
              </div>
            </div>

            {/* 📊 RESUMEN DE PAGOS */}
            <div className="cd-card">
              <div className="cd-card-header">💰 Resumen de Pagos</div>
              <div className="cd-card-body">
                {/* Abonos previos */}
                {ordenSeleccionada.abonos && ordenSeleccionada.abonos.length > 0 && (
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#4b5563", marginBottom: "6px" }}>Abonos registrados:</div>
                    {ordenSeleccionada.abonos.map((abono, i) => (
                      <div key={i} style={{ fontSize: "13px", color: "#6b7280", padding: "4px 0" }}>
                        • Abono {i + 1}: ${Number(abono.valor || 0).toLocaleString("es-CO")}
                        {abono.fecha && ` — ${new Date(abono.fecha).toLocaleDateString("es-CO")}`}
                      </div>
                    ))}
                    <div style={{ fontWeight: 700, color: "#15803d", marginTop: "8px", fontSize: "14px" }}>
                      Total abonado: ${ordenSeleccionada.abonos.reduce((sum, a) => sum + Number(a.valor || 0), 0).toLocaleString("es-CO")}
                    </div>
                  </div>
                )}

                {/* Saldo pendiente */}
                <div style={{ background: "#fef9c3", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>
                    Saldo pendiente: ${(
                      Number(ordenSeleccionada.total_neto || 0) -
                      (ordenSeleccionada.abonos || []).reduce((sum, a) => sum + Number(a.valor || 0), 0) -
                      ingresosAdicionales.reduce((sum, ing) => sum + Number(ing.valor || 0), 0)
                    ).toLocaleString("es-CO")}
                  </div>
                </div>
              </div>
            </div>

            {/* 🛡️ GARANTÍA */}
            {Number(ordenSeleccionada.garantia || 0) > 0 && (
              <div className="cd-card">
                <div className="cd-card-header cd-card-header-amber">🛡️ Garantía del Cliente</div>
                <div className="cd-card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                    {/* Monto total */}
                    <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Garantía entregada</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#b45309" }}>
                        ${Number(ordenSeleccionada.garantia).toLocaleString("es-CO")}
                      </div>
                      {ordenSeleccionada.garantia_recibida && (
                        <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px" }}>
                          ✓ Recibida{ordenSeleccionada.fecha_garantia ? ` el ${ordenSeleccionada.fecha_garantia}` : ""}
                        </div>
                      )}
                    </div>

                    {/* Retener */}
                    <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Retener por daños/demora</div>
                      <input
                        type="number"
                        min="0"
                        max={Number(ordenSeleccionada.garantia || 0)}
                        placeholder="$0"
                        value={garantiaRetenida}
                        onChange={(e) => {
                          const val = Number(e.target.value || 0);
                          const max = Number(ordenSeleccionada.garantia || 0);
                          setGarantiaRetenida(val > max ? String(max) : e.target.value);
                        }}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "14px", fontWeight: 600 }}
                      />
                      {Number(garantiaRetenida || 0) > 0 && (
                        <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>
                          💰 Se registrará como ingreso
                        </div>
                      )}
                    </div>

                    {/* Devolver */}
                    <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Devolver al cliente</div>
                      <div style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: (Number(ordenSeleccionada.garantia || 0) - Number(garantiaRetenida || 0)) > 0 ? "#15803d" : "#9ca3af"
                      }}>
                        ${Math.max(0, Number(ordenSeleccionada.garantia || 0) - Number(garantiaRetenida || 0)).toLocaleString("es-CO")}
                      </div>
                    </div>
                  </div>

                  {Number(garantiaRetenida || 0) > 0 && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "10px", borderRadius: "6px", fontSize: "13px", color: "#b91c1c" }}>
                      ⚠️ Se retendrán <strong>${Number(garantiaRetenida).toLocaleString("es-CO")}</strong> de la garantía.
                      Se devolverán <strong>${Math.max(0, Number(ordenSeleccionada.garantia || 0) - Number(garantiaRetenida || 0)).toLocaleString("es-CO")}</strong> al cliente.
                      El monto retenido se registrará como <strong>ingreso</strong> en contabilidad.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 💵 INGRESOS ADICIONALES */}
            <div className="cd-card">
              <div className="cd-card-header">💵 Ingresos adicionales</div>
              <div className="cd-card-body">
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                  Registra aquí abonos o pagos que el cliente hizo después del evento o que olvidaste registrar antes.
                </div>

                {ingresosAdicionales.map((ingreso, index) => (
                  <div key={index} className="cd-abono-fila">
                    <input
                      type="number"
                      placeholder="Monto"
                      value={ingreso.valor}
                      onChange={(e) => {
                        const nuevos = [...ingresosAdicionales];
                        nuevos[index].valor = e.target.value;
                        setIngresosAdicionales(nuevos);
                      }}
                      style={{ width: "120px" }}
                    />
                    <input
                      type="date"
                      value={ingreso.fecha}
                      onChange={(e) => {
                        const nuevos = [...ingresosAdicionales];
                        nuevos[index].fecha = e.target.value;
                        setIngresosAdicionales(nuevos);
                      }}
                      style={{ width: "150px" }}
                    />
                    <button
                      onClick={() => {
                        const nuevos = [...ingresosAdicionales];
                        nuevos.splice(index, 1);
                        setIngresosAdicionales(nuevos);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                <button
                  className="cd-btn-agregar-abono"
                  onClick={() =>
                    setIngresosAdicionales([
                      ...ingresosAdicionales,
                      { valor: "", fecha: new Date().toISOString().slice(0, 10) },
                    ])
                  }
                >
                  ➕ Agregar ingreso adicional
                </button>
              </div>
            </div>

            {/* 💰 PAGOS A PROVEEDORES */}
{pagosProveedoresRecepcion.length > 0 && (
  <div className="cd-card">
    <div className="cd-card-header" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", borderBottom: "none" }}>
      💰 Pagos a Proveedores
    </div>
    <div className="cd-card-body">
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
        Registra aquí los pagos pendientes a proveedores. Los pagos previos ya están registrados en contabilidad.
      </div>

      {pagosProveedoresRecepcion.map((pago, index) => (
        <div
          key={pago.proveedor_nombre}
          style={{ background: "white", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "14px", marginBottom: "12px" }}
        >
          {/* Header del proveedor */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
              🏢 {pago.proveedor_nombre}
            </div>
            {pago.saldo_pendiente <= 0 ? (
              <span style={{ background: "#dcfce7", color: "#166534", fontSize: "11px", padding: "3px 8px", borderRadius: "10px" }}>
                ✓ Pagado
              </span>
            ) : (
              <span style={{ background: "#fef9c3", color: "#854d0e", fontSize: "11px", padding: "3px 8px", borderRadius: "10px" }}>
                Pendiente: ${Number(pago.saldo_pendiente).toLocaleString("es-CO")}
              </span>
            )}
          </div>

          {/* Productos */}
          <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
            {pago.productos.map((prod, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span>{prod.nombre} ({prod.cantidad} × ${Number(prod.precio_compra).toLocaleString("es-CO")})</span>
                <span style={{ fontWeight: 500 }}>${Number(prod.subtotal).toLocaleString("es-CO")}</span>
              </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: 600, color: "#111827" }}>
            <span>Total:</span>
            <span>${Number(pago.total).toLocaleString("es-CO")}</span>
          </div>
        </div>

        {/* Abonos previos */}
        {pago.abonos_previos.length > 0 && (
          <div style={{ marginBottom: "10px", padding: "8px", background: "#f0fdf4", borderRadius: "6px" }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#15803d", marginBottom: "4px" }}>Abonos previos:</div>
            {pago.abonos_previos.map((ab, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#16a34a", display: "flex", justifyContent: "space-between" }}>
                <span>{ab.fecha ? new Date(ab.fecha).toLocaleDateString("es-CO") : "Sin fecha"}</span>
                <span>${Number(ab.valor).toLocaleString("es-CO")}</span>
              </div>
            ))}
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534", marginTop: "4px", paddingTop: "4px", borderTop: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between" }}>
              <span>Total abonado:</span>
              <span>${Number(pago.total_abonado_previo).toLocaleString("es-CO")}</span>
            </div>
          </div>
        )}

        {/* Abono en recepción */}
        {pago.saldo_pendiente > 0 && (
          <div className="cd-abono-fila" style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>Pagar ahora:</span>
            <input
              type="number"
              placeholder="Monto"
              value={pago.abono_recepcion}
              onChange={(e) =>
                actualizarPagoProveedorRecepcion(index, "abono_recepcion", e.target.value)
              }
              style={{ width: "120px" }}
            />
            <input
              type="date"
              value={pago.fecha_abono_recepcion}
              onChange={(e) =>
                actualizarPagoProveedorRecepcion(index, "fecha_abono_recepcion", e.target.value)
              }
              style={{ width: "150px" }}
            />
          </div>
        )}
      </div>
    ))}
    </div>
  </div>
)}

            {/* 🧾 GASTOS ADICIONALES */}
            <div className="cd-card">
              <div className="cd-card-header">🧾 Gastos adicionales (opcional)</div>
              <div className="cd-card-body">
                {gastosExtras.map((gasto, index) => (
                  <div key={index} className="cd-abono-fila">
                    <input
                      type="text"
                      placeholder="Motivo del gasto"
                      value={gasto.motivo}
                      onChange={(e) => {
                        const nuevosGastos = [...gastosExtras];
                        nuevosGastos[index].motivo = e.target.value;
                        setGastosExtras(nuevosGastos);
                      }}
                      style={{ flex: 1, minWidth: "140px" }}
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
                      style={{ width: "120px" }}
                    />
                  </div>
                ))}
                <button
                  className="cd-btn-agregar-abono"
                  onClick={() => setGastosExtras([...gastosExtras, { motivo: "", valor: "" }])}
                >
                  ➕ Agregar otro gasto
                </button>
              </div>
            </div>

            {/* 💬 COMENTARIO */}
            <div className="cd-card">
              <div className="cd-card-header">💬 Comentario general (opcional)</div>
              <div className="cd-card-body">
                <textarea
                  rows={3}
                  value={comentarioGeneral}
                  onChange={(e) => setComentarioGeneral(e.target.value)}
                  placeholder="Escribe observaciones generales sobre la recepción..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", resize: "vertical" }}
                />
              </div>
            </div>

            {/* ========== BOTONES FINALES ========== */}
            <div className="cd-botones-finales">
              {/* 💾 Guardar Parcial */}
              <button
                onClick={guardarParcial}
                disabled={guardando}
                className={`cd-btn ${guardando ? "cd-btn-disabled" : "cd-btn-azul"}`}
              >
                {guardando ? "⏳ Guardando..." : "💾 Guardar Parcial"}
              </button>

              {/* ✅ Cerrar Recepción */}
              <button
                onClick={cerrarRecepcion}
                disabled={guardando}
                className={`cd-btn ${guardando ? "cd-btn-disabled" : "cd-btn-verde"}`}
              >
                {guardando ? "⏳ Cerrando..." : "✅ Cerrar Recepción"}
              </button>

              {/* 🧾 Descargar PDF */}
              <button
                className="cd-btn cd-btn-gris"
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
                    pagosProveedoresRecepcion,
                    {
                      garantiaTotal: Number(ordenSeleccionada.garantia || 0),
                      garantiaRetenida: Number(garantiaRetenida || 0),
                    }
                  );
                }}
              >
                🧾 Descargar PDF
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </Protegido>
  );
};

export default Recepcion;
