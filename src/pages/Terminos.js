// src/pages/Terminos.js
import React from "react";
import { Link } from "react-router-dom";

export default function Terminos() {
  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <h1 style={estilos.titulo}>Términos y Condiciones de Uso</h1>
        <p style={estilos.fecha}>Última actualización: 20 de febrero de 2026</p>

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
          <p>Cada empresa registrada constituye un "tenant" independiente. Los datos de cada empresa son privados y están aislados de otras empresas registradas.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>4. Planes y Pagos</h2>
          <p><strong>Plan de Prueba (Trial):</strong> Al registrarte, obtienes acceso gratuito por 7 días con funcionalidades limitadas. Al vencer el período de prueba, podrás consultar tus datos pero no crear nuevos registros hasta activar un plan de pago.</p>
          <p><strong>Planes de Pago:</strong> Los planes disponibles y sus precios serán comunicados directamente. El pago es mensual y debe realizarse de forma oportuna para mantener el acceso completo al servicio.</p>
          <p>SwAlquiler se reserva el derecho de modificar los precios de los planes con previo aviso de al menos 30 días.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>5. Uso Aceptable</h2>
          <p>Te comprometes a:</p>
          <p>• Usar la Plataforma únicamente para gestionar actividades legítimas de alquiler de bienes y servicios para eventos.</p>
          <p>• No intentar acceder a datos de otras empresas registradas.</p>
          <p>• No utilizar la Plataforma para actividades ilegales, fraudulentas o que infrinjan derechos de terceros.</p>
          <p>• No intentar vulnerar la seguridad del sistema ni realizar ingeniería inversa.</p>
          <p>• No compartir tus credenciales de acceso con personas no autorizadas.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>6. Propiedad de los Datos</h2>
          <p>Los datos que ingreses en la Plataforma (clientes, productos, cotizaciones, pedidos, etc.) son de tu propiedad. SwAlquiler no utilizará tus datos comerciales para fines distintos a la prestación del servicio.</p>
          <p>Puedes solicitar la exportación de tus datos en cualquier momento. En caso de cancelación de tu cuenta, tus datos serán eliminados dentro de los 30 días siguientes, salvo que solicites su exportación previamente.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>7. Privacidad y Protección de Datos</h2>
          <p>SwAlquiler se compromete a proteger tu información personal de acuerdo con la Ley 1581 de 2012 de Protección de Datos Personales de Colombia y demás normativa aplicable.</p>
          <p>Recopilamos y procesamos los siguientes datos:</p>
          <p>• <strong>Datos de la empresa:</strong> Nombre, dirección, teléfono, email, NIT, logotipo.</p>
          <p>• <strong>Datos del usuario:</strong> Nombre, email de acceso, rol dentro de la empresa.</p>
          <p>• <strong>Datos operativos:</strong> Clientes, productos, cotizaciones, pedidos y demás registros que generes en el uso de la Plataforma.</p>
          <p>Estos datos se almacenan en servidores seguros con cifrado y controles de acceso. No compartimos, vendemos ni cedemos tus datos personales a terceros, excepto cuando sea requerido por autoridad competente.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>8. Disponibilidad del Servicio</h2>
          <p>SwAlquiler se esfuerza por mantener la Plataforma disponible las 24 horas del día, los 7 días de la semana. Sin embargo, no garantizamos disponibilidad ininterrumpida y pueden existir períodos de mantenimiento programado o interrupciones por causas de fuerza mayor.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>9. Limitación de Responsabilidad</h2>
          <p>SwAlquiler proporciona la Plataforma "tal como está". No somos responsables por:</p>
          <p>• Pérdidas económicas derivadas del uso o imposibilidad de uso de la Plataforma.</p>
          <p>• Errores en los datos ingresados por los usuarios.</p>
          <p>• Daños causados por acceso no autorizado a tu cuenta debido a negligencia en el manejo de credenciales.</p>
          <p>En todo caso, la responsabilidad máxima de SwAlquiler estará limitada al valor pagado por el usuario en los últimos 3 meses de servicio.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>10. Suspensión y Terminación</h2>
          <p>SwAlquiler puede suspender o terminar tu cuenta si:</p>
          <p>• Incumples estos Términos y Condiciones.</p>
          <p>• No realizas el pago correspondiente a tu plan.</p>
          <p>• Realizas un uso abusivo o fraudulento de la Plataforma.</p>
          <p>Puedes cancelar tu cuenta en cualquier momento contactando al equipo de soporte.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>11. Modificaciones</h2>
          <p>SwAlquiler se reserva el derecho de modificar estos Términos y Condiciones. Las modificaciones serán notificadas a los usuarios registrados y entrarán en vigor 15 días después de su publicación.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>12. Legislación Aplicable</h2>
          <p>Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia será resuelta ante los tribunales competentes de la ciudad de Villavicencio, Meta.</p>
        </section>

        <section style={estilos.seccion}>
          <h2 style={estilos.subtitulo}>13. Contacto</h2>
          <p>Para cualquier consulta sobre estos Términos y Condiciones, puedes contactarnos a través de:</p>
          <p>• WhatsApp: 3166534685</p>
          <p>• Email: soporte@swalquiler.com</p>
        </section>

        <div style={{ textAlign: "center", marginTop: 30 }}>
          <Link to="/registro" style={estilos.botonVolver}>
            ← Volver al registro
          </Link>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "20px",
  },
  card: {
    maxWidth: 800,
    margin: "0 auto",
    background: "white",
    borderRadius: 12,
    padding: "32px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  titulo: {
    color: "#0077B6",
    fontSize: "clamp(20px, 4vw, 28px)",
    textAlign: "center",
    marginBottom: 4,
  },
  fecha: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 24,
  },
  seccion: {
    marginBottom: 20,
  },
  subtitulo: {
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 8,
  },
  botonVolver: {
    display: "inline-block",
    padding: "10px 24px",
    background: "#0077B6",
    color: "white",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  },
};