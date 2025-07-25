import axios from "axios";
import {
  obtenerPedidosPorFecha,
  obtenerStockBajoParaFecha,
  buscarProducto,
  contarDocumentosPorTipo,
  contarClientes,
  obtenerPedidosPorFechaYCliente
} from "./consultasSupabase";

// 🔄 Convertir nombres de mes a rango de fechas
function convertirMesANumero(mensaje) {
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05",
    junio: "06", julio: "07", agosto: "08", septiembre: "09",
    octubre: "10", noviembre: "11", diciembre: "12"
  };

  for (const [nombreMes, numeroMes] of Object.entries(meses)) {
    if (mensaje.includes(nombreMes)) {
      const year = new Date().getFullYear();
      return {
        mesNombre: nombreMes,
        desde: `${year}-${numeroMes}-01`,
        hasta: `${year}-${numeroMes}-31`
      };
    }
  }

  return null;
}

function preprocesarMensaje(mensaje) {
  const palabrasInutiles = [
    "hola", "buenas", "por favor", "ayúdame", "quiero que", "necesito que",
    "sería posible", "tengo un cliente", "quisiera", "me gustaría",
    "es que", "mira", "gracias", "una consulta", "una pregunta"
  ];
  let mensajeLimpio = mensaje.toLowerCase();
  for (const palabra of palabrasInutiles) {
    mensajeLimpio = mensajeLimpio.replaceAll(palabra, "");
  }
  return mensajeLimpio.trim();
}

function formatearListaPedidos(pedidos) {
  return pedidos.map(p => {
    const fecha = new Date(p.fecha_evento).toLocaleDateString("es-CO");
    const cliente = p.clientes?.nombre || "Cliente desconocido";
    return `🔹 ${p.numero || p.id} | ${cliente} | ${fecha}`;
  }).join("\n");
}

export async function consultarIA(mensajeOriginal) {
  const mensaje = preprocesarMensaje(mensajeOriginal);

  try {
    // 📅 Pedidos para un mes específico
    const rango = convertirMesANumero(mensaje);
    if (rango) {
      const pedidos = await obtenerPedidosPorFecha(rango.desde, rango.hasta);
      if (pedidos.length === 0) {
        return `📭 No hay pedidos registrados para ${rango.mesNombre}.`;
      }
      return `📦 Pedidos registrados para ${rango.mesNombre}:\n${formatearListaPedidos(pedidos)}`;
    }

    // 📅 Pedidos de un cliente en un mes (ej. Jorge agosto)
    if (mensaje.includes("tiene") || mensaje.includes("pedidos de")) {
      const partes = mensaje.split(" ");
      const posibleNombre = partes.find(p => /^[a-záéíóúñ]+$/i.test(p) && p.length > 3);
      const rango = convertirMesANumero(mensaje);
      if (posibleNombre && rango) {
        const pedidos = await obtenerPedidosPorFechaYCliente(rango.desde, rango.hasta, posibleNombre);
        if (pedidos.length === 0) {
          return `📭 No se encontraron pedidos de ${posibleNombre} en ${rango.mesNombre}.`;
        }
        return `📋 Pedidos de ${posibleNombre} en ${rango.mesNombre}:\n${formatearListaPedidos(pedidos)}`;
      }
    }

    // 📆 Pedidos próximos 7 días
    if (mensaje.includes("cuantos pedidos") || mensaje.includes("ordenes")) {
      const hoy = new Date();
      const fin = new Date();
      fin.setDate(hoy.getDate() + 7);
      const pedidos = await obtenerPedidosPorFecha(hoy.toISOString(), fin.toISOString());
      return `📦 Hay ${pedidos.length} pedidos confirmados para los próximos 7 días.`;
    }

    // 🚨 Productos con bajo stock
    if (mensaje.includes("poco stock") || mensaje.includes("productos con bajo stock")) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 7);
      const productos = await obtenerStockBajoParaFecha(fecha.toISOString().slice(0, 10));
      if (productos.length === 0) return "🎉 Todos los productos tienen stock suficiente.";
      return `🚨 Productos con bajo stock para el ${fecha.toLocaleDateString()}:\n- ${productos.map(p => p.nombre).join("\n- ")}`;
    }

    // 👥 Número de clientes
    if (mensaje.includes("cuantos clientes")) {
      const total = await contarClientes();
      return `👥 Actualmente hay ${total} clientes registrados.`;
    }

    // 📊 Cantidad de cotizaciones u órdenes
    if (mensaje.includes("cuantas cotizaciones") || mensaje.includes("cuantas ordenes")) {
      const tipo = mensaje.includes("cotizacion") ? "cotizacion" : "orden";
      const total = await contarDocumentosPorTipo(tipo);
      return `📊 Hay ${total} ${tipo === "cotizacion" ? "cotizaciones" : "órdenes de pedido"}.`;
    }

    // 🔍 Buscar producto
    if (mensaje.includes("buscar producto") || mensaje.includes("producto llamado")) {
      const termino = mensaje.split("producto").pop()?.trim();
      const resultados = await buscarProducto(termino);
      if (resultados.length === 0) return "🔍 No se encontraron coincidencias.";
      return `🔎 Productos encontrados:\n- ${resultados.map(p => p.nombre).join("\n- ")}`;
    }

  } catch (error) {
    console.error("❌ Error interno de Supabase:", error.message);
    return "⚠️ Error al consultar la base de datos.";
  }

  // 🧠 Fallback a OpenAI si no se reconoce el patrón
  try {
    const respuesta = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres un asistente del sistema de alquiler llamado Emmita. Si no entiendes algo, responde de forma neutral o pregunta por más información.`,
          },
          {
            role: "user",
            content: mensajeOriginal,
          },
        ],
        temperature: 0.4,
        max_tokens: 800,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_KEY}`,
        },
      }
    );

    return respuesta.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Error al consultar OpenAI:", error.message);
    return "⚠️ Hubo un error al procesar tu solicitud. Intenta nuevamente.";
  }
}
