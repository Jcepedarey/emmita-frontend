// src/pages/Terminos.js
import React from "react";
import { Link } from "react-router-dom";

export default function Terminos() {
  return (
    <div style={estilos.container}>
      {/* Navbar simple */}
      <nav style={estilos.nav}>
        <Link to="/" style={estilos.navLogo}>
          <img src="/icons/swalquiler-logo.png" alt="SwAlquiler" style={{ width: 32, height: 32 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0077B6" }}>SwAlquiler</span>
        </Link>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/faq" style={estilos.navLink}>Preguntas frecuentes</Link>
          <Link to="/login" style={estilos.navBtn}>Iniciar sesión</Link>
        </div>
      </nav>

      <div style={estilos.card}>
        <div style={estilos.badge}>Documento legal</div>
        <h1 style={estilos.titulo}>Términos y Condiciones de Uso</h1>
        <p style={estilos.fecha}>Última actualización: 20 de marzo de 2026</p>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>1. Aceptación de los Términos</h2>
          <p>Al registrarte y utilizar SwAlquiler ("la Plataforma"), aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no debes utilizar la Plataforma.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>2. Descripción del Servicio</h2>
          <p>SwAlquiler es una plataforma de gestión de alquileres que permite a empresas del sector de eventos y alquiler de mobiliario administrar cotizaciones, pedidos, inventario, clientes, contabilidad y otros procesos operativos.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>3. Registro y Cuenta</h2>
          <p>Para usar la Plataforma debes crear una cuenta proporcionando información veraz y actualizada. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas bajo tu cuenta.</p>
          <p>Cada empresa registrada constituye un "tenant" independiente. Los datos de cada empresa son privados y están aislados de otras empresas registradas mediante controles de seguridad a nivel de base de datos.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>4. Planes y Pagos</h2>
          <p><strong>Plan de Prueba (Trial):</strong> Al registrarte, obtienes acceso gratuito por 14 días con funcionalidades limitadas. Al vencer el período de prueba, podrás consultar tus datos pero no crear nuevos registros hasta activar un plan de pago.</p>
          <p><strong>Planes de Pago:</strong> Los planes disponibles y sus precios serán comunicados directamente. El pago es mensual y debe realizarse de forma oportuna para mantener el acceso completo al servicio.</p>
          <p>SwAlquiler se reserva el derecho de modificar los precios de los planes con previo aviso de al menos 30 días.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>5. Uso Aceptable</h2>
          <p>Te comprometes a usar la Plataforma únicamente para gestionar actividades legítimas de alquiler de bienes y servicios para eventos; a no intentar acceder a datos de otras empresas registradas; a no utilizar la Plataforma para actividades ilegales, fraudulentas o que infrinjan derechos de terceros; a no intentar vulnerar la seguridad del sistema ni realizar ingeniería inversa; y a no compartir tus credenciales de acceso con personas no autorizadas.</p>
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SECCIÓN NUEVA: Seguridad y Privacidad (robusta)        */}
        {/* ═══════════════════════════════════════════════════════ */}

        <section style={estilos.seccionDestacada}>
          <h2 style={estilos.subtituloDestacado}>6. Privacidad y Protección de Datos Personales</h2>

          <p>SwAlquiler se compromete a proteger la información personal y comercial de sus usuarios de conformidad con la Ley Estatutaria 1581 de 2012 de Protección de Datos Personales de la República de Colombia, el Decreto Reglamentario 1377 de 2013 y demás normativa vigente aplicable.</p>

          <h3 style={estilos.subtitulo3}>6.1 Datos que recopilamos</h3>
          <p>En el ejercicio de la prestación del servicio, SwAlquiler recopila y procesa los siguientes tipos de datos:</p>
          <p><strong>Datos de la empresa:</strong> nombre comercial, dirección, teléfono, correo electrónico, NIT o identificación fiscal, logotipo e imagen corporativa.</p>
          <p><strong>Datos del usuario:</strong> nombre completo, correo electrónico de acceso y rol dentro de la empresa.</p>
          <p><strong>Datos operativos:</strong> registros de clientes, inventario de productos, cotizaciones, órdenes de pedido, movimientos contables y demás información que el usuario genere durante el uso de la Plataforma.</p>

          <h3 style={estilos.subtitulo3}>6.2 Finalidad del tratamiento</h3>
          <p>Los datos recopilados se utilizan exclusivamente para la prestación del servicio contratado, el mantenimiento y mejora de la Plataforma, la generación de documentos y reportes solicitados por el usuario, la comunicación de actualizaciones, cambios en el servicio o asuntos de soporte técnico, y el cumplimiento de obligaciones legales aplicables.</p>

          <h3 style={estilos.subtitulo3}>6.3 Principio de confidencialidad</h3>
          <p>SwAlquiler garantiza que los datos comerciales ingresados por cada empresa son tratados con estricta confidencialidad. El equipo de SwAlquiler no accederá, consultará, copiará, modificará ni divulgará los datos comerciales de ningún usuario, salvo en los siguientes casos expresamente autorizados: cuando sea estrictamente necesario para la resolución de un incidente técnico reportado por el usuario y con su autorización previa; cuando sea requerido por autoridad judicial o administrativa competente mediante orden debidamente fundamentada; o cuando sea necesario para proteger la integridad y seguridad de la Plataforma ante amenazas o vulnerabilidades detectadas.</p>

          <h3 style={estilos.subtitulo3}>6.4 Medidas de seguridad técnicas</h3>
          <p>Para garantizar la protección de los datos, SwAlquiler implementa las siguientes medidas de seguridad:</p>
          <p><strong>Aislamiento de datos por empresa (Multi-tenancy):</strong> cada empresa registrada opera en un espacio de datos completamente aislado. Las políticas de seguridad a nivel de base de datos (Row Level Security) garantizan que ningún usuario de una empresa pueda acceder, visualizar o modificar datos pertenecientes a otra empresa, bajo ninguna circunstancia.</p>
          <p><strong>Cifrado de contraseñas:</strong> las contraseñas de acceso de los usuarios son procesadas mediante algoritmos de hash criptográfico (bcrypt) antes de ser almacenadas. Esto significa que las contraseñas nunca se guardan en texto legible. Ni el equipo técnico de SwAlquiler ni ningún tercero puede conocer, recuperar o visualizar la contraseña original de un usuario.</p>
          <p><strong>Cifrado en tránsito:</strong> toda la comunicación entre el dispositivo del usuario y los servidores de SwAlquiler se realiza mediante protocolo HTTPS con cifrado TLS, lo que impide la interceptación de datos durante su transmisión.</p>
          <p><strong>Autenticación segura:</strong> el sistema de autenticación está gestionado por infraestructura certificada que implementa estándares de seguridad de la industria, incluyendo manejo seguro de sesiones y tokens de acceso con expiración automática.</p>
          <p><strong>Protección perimetral:</strong> la Plataforma cuenta con reglas de firewall de aplicación web (WAF) para la prevención de ataques comunes como inyección SQL, cross-site scripting (XSS) y otros vectores de ataque reconocidos por OWASP.</p>

          <h3 style={estilos.subtitulo3}>6.5 No comercialización de datos</h3>
          <p>SwAlquiler declara de forma expresa e inequívoca que no vende, cede, alquila, comparte ni transfiere a terceros, bajo ninguna modalidad, los datos personales ni comerciales de sus usuarios. Los datos son propiedad exclusiva de cada empresa registrada y su tratamiento se limita estrictamente a la prestación del servicio.</p>

          <h3 style={estilos.subtitulo3}>6.6 Derechos del titular de los datos</h3>
          <p>De conformidad con la Ley 1581 de 2012, como titular de tus datos personales tienes derecho a: conocer, actualizar y rectificar tus datos personales; solicitar prueba de la autorización otorgada para el tratamiento de tus datos; ser informado sobre el uso que se ha dado a tus datos; revocar la autorización y solicitar la supresión de tus datos cuando consideres que no se respetan los principios, derechos y garantías constitucionales y legales; y acceder en forma gratuita a tus datos personales que hayan sido objeto de tratamiento.</p>
          <p>Para el ejercicio de estos derechos, puedes comunicarte a través de los canales indicados en la sección de Contacto de estos Términos.</p>

          <h3 style={estilos.subtitulo3}>6.7 Exportación y eliminación de datos</h3>
          <p>Puedes solicitar la exportación completa de tus datos en cualquier momento. En caso de cancelación de tu cuenta, tus datos serán eliminados de forma permanente dentro de los 30 días calendario siguientes, salvo que solicites su exportación previamente. Esta eliminación incluye todos los registros operativos, documentos generados, datos de clientes y cualquier otra información asociada a tu empresa dentro de la Plataforma.</p>

          <h3 style={estilos.subtitulo3}>6.8 Retención y almacenamiento</h3>
          <p>Los datos se almacenan en servidores seguros con infraestructura de nivel empresarial, ubicados en centros de datos que cumplen con estándares internacionales de seguridad. SwAlquiler conservará los datos durante la vigencia de la relación contractual con el usuario y por el período adicional que establezca la legislación colombiana aplicable.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>7. Seguridad de tu Cuenta</h2>
          <p>La seguridad de tu cuenta es una responsabilidad compartida entre SwAlquiler y tú como usuario. Nosotros protegemos tu información con cifrado y controles de acceso. De tu parte, te recomendamos seguir estas buenas prácticas:</p>
          <p><strong>Contraseña segura:</strong> tu contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una minúscula y un número. Evita usar datos personales como tu nombre, fecha de nacimiento o número de teléfono.</p>
          <p><strong>Contraseña única:</strong> no uses la misma contraseña que utilizas en otros servicios como redes sociales o correo electrónico.</p>
          <p><strong>No compartas tu contraseña:</strong> tu contraseña es personal e intransferible. Ningún miembro del equipo de SwAlquiler te pedirá tu contraseña por ningún medio.</p>
          <p><strong>Equipos de uso público:</strong> si accedes a SwAlquiler desde un computador público o compartido, asegúrate de cerrar sesión al terminar y no guardes la contraseña en el navegador.</p>
          <p><strong>Redes Wi-Fi públicas:</strong> evita acceder a tu cuenta desde redes Wi-Fi abiertas o sin contraseña, ya que tu información podría ser interceptada.</p>
          <p><strong>Correos sospechosos:</strong> si recibes un correo que te pide tu contraseña o te invita a hacer clic en un enlace para "verificar tu cuenta", no respondas. Repórtalo a nuestro equipo de soporte.</p>
          <p>SwAlquiler no será responsable por accesos no autorizados que resulten del incumplimiento de estas recomendaciones de seguridad por parte del usuario.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>8. Disponibilidad del Servicio</h2>
          <p>SwAlquiler se esfuerza por mantener la Plataforma disponible las 24 horas del día, los 7 días de la semana. Sin embargo, no garantizamos disponibilidad ininterrumpida y pueden existir períodos de mantenimiento programado o interrupciones por causas de fuerza mayor.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>9. Limitación de Responsabilidad</h2>
          <p>SwAlquiler proporciona la Plataforma "tal como está". No somos responsables por pérdidas económicas derivadas del uso o imposibilidad de uso de la Plataforma, errores en los datos ingresados por los usuarios, ni daños causados por acceso no autorizado a tu cuenta debido a negligencia en el manejo de credenciales.</p>
          <p>En todo caso, la responsabilidad máxima de SwAlquiler estará limitada al valor pagado por el usuario en los últimos 3 meses de servicio.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>10. Suspensión y Terminación</h2>
          <p>SwAlquiler puede suspender o terminar tu cuenta si incumples estos Términos y Condiciones, no realizas el pago correspondiente a tu plan, o realizas un uso abusivo o fraudulento de la Plataforma.</p>
          <p>Puedes cancelar tu cuenta en cualquier momento contactando al equipo de soporte.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>11. Propiedad Intelectual</h2>
          <p>SwAlquiler, su logotipo, diseño, código fuente y documentación son propiedad exclusiva de SwAlquiler. Se prohíbe su reproducción, distribución o modificación sin autorización previa por escrito.</p>
          <p>Los datos que ingreses en la Plataforma son de tu propiedad y SwAlquiler no adquiere ningún derecho sobre ellos más allá de lo necesario para la prestación del servicio.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>12. Modificaciones</h2>
          <p>SwAlquiler se reserva el derecho de modificar estos Términos y Condiciones. Las modificaciones serán notificadas a los usuarios registrados y entrarán en vigor 15 días después de su publicación.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>13. Legislación Aplicable</h2>
          <p>Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia será resuelta ante los tribunales competentes de la ciudad de Villavicencio, Meta.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>14. Contacto</h2>
          <p>Para cualquier consulta sobre estos Términos, el ejercicio de tus derechos como titular de datos o cualquier asunto relacionado con la privacidad y seguridad de tu información, puedes contactarnos a través de:</p>
          <p><strong>WhatsApp:</strong> 321 490 9600</p>
          <p><strong>Email:</strong> soporte@swalquiler.com</p>
          <p><strong>Sitio web:</strong> www.swalquiler.com</p>
        </section>

        <div style={{ textAlign: "center", marginTop: 30, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/registro" style={estilos.botonVolver}>
            ← Volver al registro
          </Link>
          <Link to="/faq" style={{ ...estilos.botonVolver, background: "#64748b" }}>
            Preguntas frecuentes →
          </Link>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)",
    padding: "20px",
    paddingTop: 80,
  },
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    padding: "0 24px",
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
  },
  navLink: {
    textDecoration: "none",
    color: "#475569",
    fontSize: 14,
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: 8,
  },
  navBtn: {
    textDecoration: "none",
    padding: "8px 20px",
    background: "linear-gradient(135deg, #0077B6, #00B4D8)",
    color: "white",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  card: {
    maxWidth: 800,
    margin: "0 auto",
    background: "white",
    borderRadius: 16,
    padding: "40px 36px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  badge: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: 20,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  titulo: {
    color: "#0077B6",
    fontSize: "clamp(22px, 4vw, 30px)",
    fontWeight: 800,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  fecha: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: "1px solid #e2e8f0",
  },
  seccion: {
    marginBottom: 28,
    lineHeight: 1.7,
    fontSize: 15,
    color: "#334155",
  },
  seccionDestacada: {
    marginBottom: 28,
    lineHeight: 1.7,
    fontSize: 15,
    color: "#334155",
    padding: "24px 20px",
    background: "linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)",
    borderRadius: 12,
    border: "1px solid #bae6fd",
  },
  subtitulo: {
    fontSize: 17,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 10,
  },
  subtituloDestacado: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0077B6",
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  subtitulo3: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1e40af",
    marginTop: 16,
    marginBottom: 6,
  },
  botonVolver: {
    display: "inline-block",
    padding: "12px 28px",
    background: "#0077B6",
    color: "white",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    transition: "transform 0.2s",
  },
};