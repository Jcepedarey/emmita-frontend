// src/pages/PreguntasFrecuentes.js
import React, { useState } from "react";
import { Link } from "react-router-dom";

const CATEGORIAS = [
  {
    nombre: "General",
    color: "#0077B6",
    preguntas: [
      {
        q: "¿Qué es SwAlquiler?",
        a: "SwAlquiler es un software de gestión diseñado específicamente para empresas de alquiler de mobiliario y eventos en Colombia. Te permite administrar cotizaciones, pedidos, inventario, clientes, contabilidad, agenda y más, todo desde una sola plataforma accesible desde cualquier dispositivo.",
      },
      {
        q: "¿Necesito instalar algo en mi computador?",
        a: "No. SwAlquiler funciona completamente en la nube. Solo necesitas un navegador web (Chrome, Safari, Edge, Firefox) y conexión a internet. También puedes instalarlo como aplicación en tu celular desde el navegador para acceso rápido sin pasar por tiendas de aplicaciones.",
      },
      {
        q: "¿Puedo usar SwAlquiler desde mi celular?",
        a: "Sí. La plataforma está optimizada para funcionar tanto en computador como en celular o tablet. La interfaz se adapta automáticamente al tamaño de tu pantalla para que puedas gestionar tu negocio desde cualquier lugar.",
      },
      {
        q: "¿Cuántas personas pueden usar una misma cuenta de empresa?",
        a: "Depende de tu plan. El plan de prueba gratuita incluye 1 usuario, el plan Básico permite 2 usuarios, el Profesional hasta 5 y el Enterprise hasta 10. Cada usuario tiene su propio acceso con correo y contraseña independiente, y puedes asignarles roles y permisos según sus funciones.",
      },
      {
        q: "¿SwAlquiler funciona sin internet?",
        a: "SwAlquiler requiere conexión a internet para funcionar, ya que tus datos se guardan en servidores seguros en la nube. Esto garantiza que tu información esté respaldada y accesible desde cualquier dispositivo en cualquier momento.",
      },
    ],
  },
  {
    nombre: "Seguridad y Privacidad",
    color: "#059669",
    preguntas: [
      {
        q: "¿Mis datos están seguros en SwAlquiler?",
        a: "Sí. Implementamos múltiples capas de seguridad: cifrado HTTPS en todas las comunicaciones, contraseñas protegidas con hash criptográfico (bcrypt) que hace imposible su lectura incluso para nuestro equipo técnico, aislamiento completo de datos entre empresas mediante políticas de seguridad a nivel de base de datos (Row Level Security), y protección perimetral con firewall de aplicación web (WAF) contra ataques conocidos.",
      },
      {
        q: "¿El equipo de SwAlquiler puede ver mis datos, contraseñas o información de mis clientes?",
        a: "Las contraseñas son imposibles de ver para cualquier persona, incluyendo nuestro equipo, porque se almacenan cifradas con algoritmos de hash criptográfico (bcrypt). En cuanto a tus datos comerciales (clientes, inventario, pedidos, contabilidad), nuestros Términos y Condiciones establecen un compromiso legal de confidencialidad: no accedemos, consultamos ni divulgamos tus datos salvo que tú lo solicites expresamente para soporte técnico, o que una autoridad judicial lo requiera por orden formal.",
      },
      {
        q: "¿Otros usuarios o empresas pueden ver mi información?",
        a: "No, bajo ninguna circunstancia. Cada empresa opera en un espacio de datos completamente aislado. Las políticas de seguridad están configuradas a nivel de base de datos, lo que significa que aunque dos empresas usen el mismo sistema, técnicamente es imposible que una acceda a los datos de la otra. Esto se conoce como arquitectura multi-tenant con Row Level Security.",
      },
      {
        q: "¿SwAlquiler vende o comparte mis datos con terceros?",
        a: "No. SwAlquiler declara de forma expresa e inequívoca que no vende, cede, alquila, comparte ni transfiere a terceros los datos personales ni comerciales de sus usuarios, bajo ninguna modalidad. Esto está respaldado legalmente en nuestros Términos y Condiciones y en cumplimiento con la Ley 1581 de 2012 de Protección de Datos Personales de Colombia.",
      },
      {
        q: "¿Qué pasa con mis datos si cancelo mi cuenta?",
        a: "Si cancelas tu cuenta, tienes 30 días para solicitar una exportación completa de tu información. Después de ese período, todos tus datos son eliminados de forma permanente de nuestros servidores: registros de clientes, inventario, pedidos, contabilidad y cualquier otra información asociada a tu empresa.",
      },
      {
        q: "¿Qué normativa de protección de datos cumple SwAlquiler?",
        a: "SwAlquiler cumple con la Ley Estatutaria 1581 de 2012 de Protección de Datos Personales de la República de Colombia y su Decreto Reglamentario 1377 de 2013. Como titular de tus datos, tienes derecho a conocerlos, actualizarlos, rectificarlos y solicitar su eliminación en cualquier momento.",
      },
    ],
  },
  {
    nombre: "Planes y Pagos",
    color: "#d97706",
    preguntas: [
      {
        q: "¿La prueba gratuita tiene algún compromiso?",
        a: "No. La prueba gratuita de 14 días no requiere tarjeta de crédito ni ningún compromiso de pago. Al finalizar, simplemente dejarás de poder crear nuevos registros hasta que actives un plan de pago. Tus datos existentes seguirán disponibles para consulta.",
      },
      {
        q: "¿Cómo se realiza el pago?",
        a: "El pago es mensual y se gestiona directamente con nuestro equipo. Aceptamos transferencias bancarias y otros medios de pago disponibles en Colombia. Te contactamos antes del vencimiento para facilitar la renovación.",
      },
      {
        q: "¿Puedo cambiar de plan en cualquier momento?",
        a: "Sí. Puedes subir o bajar de plan en cualquier momento contactando a nuestro equipo. El cambio se aplica de inmediato y se ajusta proporcionalmente según los días restantes de tu período actual.",
      },
      {
        q: "¿Qué pasa si no pago a tiempo?",
        a: "Si tu plan vence, tu cuenta pasa a estado suspendido. Podrás consultar tus datos pero no crear registros nuevos ni generar documentos. Una vez realices el pago, tu cuenta se reactiva inmediatamente con todos tus datos intactos.",
      },
      {
        q: "¿Hay descuentos por pago trimestral o anual?",
        a: "Contáctanos directamente para conocer promociones y descuentos especiales por pagos anticipados o referidos. Estamos siempre dispuestos a encontrar la mejor opción para tu empresa.",
      },
    ],
  },
  {
    nombre: "Funcionalidades",
    color: "#7c3aed",
    preguntas: [
      {
        q: "¿Puedo generar PDFs con el logo de mi empresa?",
        a: "Sí. Desde el módulo 'Mi Empresa' puedes subir tu logotipo y una marca de agua. Estos se incluyen automáticamente en todas las cotizaciones, órdenes de pedido y remisiones que generes. Los PDFs se ven profesionales y personalizados con la imagen de tu negocio.",
      },
      {
        q: "¿El sistema controla el inventario automáticamente?",
        a: "Sí. SwAlquiler calcula la disponibilidad real de tu inventario en tiempo real, considerando las fechas de entrega y devolución de cada pedido. Cuando creas un nuevo pedido, el sistema te muestra cuánto stock hay disponible para la fecha del evento, evitando que alquiles más de lo que tienes.",
      },
      {
        q: "¿Puedo trabajar con proveedores externos?",
        a: "Sí. Puedes registrar proveedores y sus productos, incluirlos en tus cotizaciones y pedidos, gestionar pagos a proveedores y llevar el control de costos por proveedor. Esto te permite ofrecer servicios completos a tus clientes aunque parte del inventario sea de terceros.",
      },
      {
        q: "¿La contabilidad se genera automáticamente?",
        a: "Sí. Cada vez que registras un abono, una garantía, un pago a proveedor o cualquier movimiento financiero, el sistema lo registra automáticamente en el módulo de contabilidad. Puedes ver tus ingresos, gastos y balance en tiempo real, y exportar reportes a Excel.",
      },
      {
        q: "¿Puedo registrar eventos con alquiler de varios días?",
        a: "Sí. SwAlquiler permite manejar tanto eventos de un solo día como alquileres de varios días. En los pedidos multi-día, puedes elegir qué artículos se multiplican por los días y cuáles tienen tarifa fija. El cálculo de disponibilidad también considera los rangos de fechas.",
      },
      {
        q: "¿El sistema incluye asistente de inteligencia artificial?",
        a: "Sí, en los planes Profesional y Enterprise. El asistente con IA te permite hacer consultas sobre tu negocio, generar reportes rápidos y obtener respuestas sobre inventario, clientes y pedidos de forma conversacional.",
      },
    ],
  },
  {
    nombre: "Soporte",
    color: "#dc2626",
    preguntas: [
      {
        q: "¿Cómo puedo contactar a soporte técnico?",
        a: "Puedes contactarnos por WhatsApp al 321 490 9600, por correo electrónico a soporte@swalquiler.com o a través del botón de soporte dentro de la plataforma. Nuestro horario de atención es de lunes a sábado.",
      },
      {
        q: "¿Ofrecen capacitación para usar el sistema?",
        a: "Sí. Todos los planes incluyen soporte para resolver dudas. El plan Enterprise incluye capacitación personalizada. Además, estamos trabajando en tutoriales en video para que puedas aprender a tu ritmo.",
      },
      {
        q: "¿Puedo solicitar funcionalidades nuevas?",
        a: "Por supuesto. Escuchamos activamente a nuestros usuarios. Puedes enviarnos sugerencias por WhatsApp o correo, y evaluamos cada propuesta para incluirla en futuras actualizaciones del sistema.",
      },
    ],
  },
];

// Componente de pregunta individual con acordeón
const PreguntaItem = ({ pregunta, respuesta, abierta, onClick }) => (
  <div
    style={{
      borderBottom: "1px solid #e2e8f0",
      overflow: "hidden",
    }}
  >
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "18px 20px",
        background: abierta ? "#f8fafc" : "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        textAlign: "left",
        transition: "background 0.2s",
        minHeight: "auto",
      }}
    >
      <span style={{
        fontSize: 15,
        fontWeight: 600,
        color: abierta ? "#0077B6" : "#1e293b",
        lineHeight: 1.4,
        flex: 1,
      }}>
        {pregunta}
      </span>
      <span style={{
        fontSize: 20,
        color: abierta ? "#0077B6" : "#94a3b8",
        transition: "transform 0.3s ease",
        transform: abierta ? "rotate(45deg)" : "rotate(0deg)",
        flexShrink: 0,
        lineHeight: 1,
      }}>
        +
      </span>
    </button>
    <div style={{
      maxHeight: abierta ? "500px" : "0px",
      overflow: "hidden",
      transition: "max-height 0.35s ease, padding 0.35s ease",
      padding: abierta ? "0 20px 18px 20px" : "0 20px 0 20px",
    }}>
      <p style={{
        margin: 0,
        fontSize: 14,
        lineHeight: 1.7,
        color: "#475569",
      }}>
        {respuesta}
      </p>
    </div>
  </div>
);

export default function PreguntasFrecuentes() {
  const [abiertas, setAbiertas] = useState({});
  const [categoriaActiva, setCategoriaActiva] = useState("General");

  const togglePregunta = (key) => {
    setAbiertas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const categoriaData = CATEGORIAS.find((c) => c.nombre === categoriaActiva);

  return (
    <div style={{
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/icons/swalquiler-logo.png" alt="SwAlquiler" style={{ width: 32, height: 32 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0077B6" }}>SwAlquiler</span>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link to="/terminos" style={{
            textDecoration: "none", color: "#475569", fontSize: 14, fontWeight: 500,
            padding: "8px 16px", borderRadius: 8,
          }}>Términos</Link>
          <Link to="/login" style={{
            textDecoration: "none", padding: "8px 20px",
            background: "linear-gradient(135deg, #0077B6, #00B4D8)",
            color: "white", borderRadius: 8, fontSize: 14, fontWeight: 600,
          }}>Iniciar sesión</Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{
        paddingTop: 110, paddingBottom: 40, textAlign: "center", padding: "110px 24px 40px",
      }}>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20,
          background: "#eff6ff", color: "#1d4ed8", fontSize: 12,
          fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          Centro de ayuda
        </div>
        <h1 style={{
          fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 800,
          color: "#0f172a", lineHeight: 1.2, marginBottom: 12,
        }}>
          Preguntas Frecuentes
        </h1>
        <p style={{
          fontSize: 16, color: "#64748b", maxWidth: 600, margin: "0 auto",
          lineHeight: 1.6,
        }}>
          Encuentra respuestas a las dudas más comunes sobre SwAlquiler, seguridad de datos, planes y funcionalidades.
        </p>
      </div>

      {/* Contenido */}
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "0 24px 60px",
      }}>
        {/* Tabs de categorías */}
        <div style={{
          display: "flex", gap: 8, overflowX: "auto",
          paddingBottom: 8, marginBottom: 24,
          WebkitOverflowScrolling: "touch",
        }}>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.nombre}
              onClick={() => setCategoriaActiva(cat.nombre)}
              style={{
                padding: "10px 20px",
                borderRadius: 24,
                border: categoriaActiva === cat.nombre
                  ? `2px solid ${cat.color}`
                  : "2px solid #e2e8f0",
                background: categoriaActiva === cat.nombre ? cat.color : "white",
                color: categoriaActiva === cat.nombre ? "white" : "#475569",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                minHeight: "auto",
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Preguntas de la categoría activa */}
        <div style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {categoriaData?.preguntas.map((p, i) => {
            const key = `${categoriaActiva}-${i}`;
            return (
              <PreguntaItem
                key={key}
                pregunta={p.q}
                respuesta={p.a}
                abierta={!!abiertas[key]}
                onClick={() => togglePregunta(key)}
              />
            );
          })}
        </div>

        {/* CTA final */}
        <div style={{
          marginTop: 48, textAlign: "center",
          padding: "32px 24px",
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          borderRadius: 16,
          border: "1px solid #bae6fd",
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            ¿No encontraste lo que buscabas?
          </h3>
          <p style={{ fontSize: 15, color: "#475569", marginBottom: 20 }}>
            Nuestro equipo está listo para ayudarte.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="https://wa.me/573214909600?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20SwAlquiler"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 10,
                background: "#25D366", color: "white",
                fontSize: 14, fontWeight: 600, textDecoration: "none",
              }}
            >
              💬 WhatsApp
            </a>
            <a
              href="mailto:soporte@swalquiler.com"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 10,
                background: "linear-gradient(135deg, #0077B6, #00B4D8)", color: "white",
                fontSize: 14, fontWeight: 600, textDecoration: "none",
              }}
            >
              📧 soporte@swalquiler.com
            </a>
          </div>
        </div>

        {/* Links */}
        <div style={{ textAlign: "center", marginTop: 24, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{ color: "#0077B6", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            ← Volver al inicio
          </Link>
          <Link to="/terminos" style={{ color: "#64748b", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            Términos y condiciones
          </Link>
          <Link to="/registro" style={{ color: "#0077B6", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            Registrarse gratis →
          </Link>
        </div>
      </div>
    </div>
  );
}