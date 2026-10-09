import { Content, PageHeader } from '../ui/kit'

/* Textos legales base. Están escritos para una primera versión: conviene que los revise un abogado antes de crecer. */
const H = ({ children }) => <h2 className="text-xl mt-8 mb-2">{children}</h2>
const P = ({ children }) => <p className="text-muted mb-3 leading-relaxed">{children}</p>
const UPDATED = 'Octubre de 2026'

export function Terms() {
  return (
    <>
      <PageHeader back="history" title="Términos y condiciones" />
      <Content className="max-w-[720px]">
        <p className="text-sm text-muted">Última actualización: {UPDATED}</p>
        <H>1. Qué es La Fija</H>
        <P>La Fija es una plataforma que conecta a personas que quieren alquilar canchas de fútbol (jugadores) con los complejos que las ofrecen (dueños). La Fija no es dueña de las canchas ni presta el servicio deportivo: cada complejo es responsable de sus instalaciones, sus precios, sus horarios y la atención.</P>
        <H>2. Cuentas</H>
        <P>Para reservar o publicar un complejo necesitás una cuenta con datos reales. Sos responsable de lo que se haga con tu cuenta. Podemos suspender cuentas que den datos falsos, hagan reservas sin intención de usarlas o molesten a otros usuarios.</P>
        <H>3. Reservas, seña y cancelaciones</H>
        <P>Cada complejo define el precio, si pide seña, el plazo para pagarla y su política de cancelación y devolución. Esas condiciones se muestran antes de confirmar la reserva y forman parte del acuerdo entre el jugador y el complejo. Una reserva con pago pendiente se libera sola si no se paga en el plazo indicado.</P>
        <P>Si no vas a poder ir, cancelá con tiempo desde "Mis reservas". Las faltas sin aviso pueden quedar registradas por el complejo.</P>
        <H>4. Pagos</H>
        <P>Los pagos online se procesan con Mercado Pago. La Fija no guarda los datos de tu tarjeta. Las devoluciones se hacen por el mismo medio de pago, según la política de cada complejo.</P>
        <H>5. Complejos</H>
        <P>Los dueños se comprometen a publicar información verdadera (dirección, fotos, precios, servicios) y a respetar las reservas confirmadas. La Fija revisa cada complejo antes de publicarlo y puede desactivar los que no cumplan estas condiciones.</P>
        <H>6. Reseñas</H>
        <P>Las reseñas tienen que referirse a una experiencia real y ser respetuosas. Podemos ocultar las que contengan insultos, datos personales o información falsa.</P>
        <H>7. Responsabilidad</H>
        <P>La Fija hace lo posible para que la información sea correcta y la app funcione sin cortes, pero no responde por el estado de las canchas, lesiones durante el juego ni por incumplimientos de un complejo o de un jugador.</P>
        <H>8. Cambios y contacto</H>
        <P>Si cambiamos estos términos, lo avisamos en la app. Por cualquier consulta, escribinos desde el botón de Ayuda.</P>
      </Content>
    </>
  )
}

export function Privacy() {
  return (
    <>
      <PageHeader back="history" title="Política de privacidad" />
      <Content className="max-w-[720px]">
        <p className="text-sm text-muted">Última actualización: {UPDATED}</p>
        <H>Qué datos guardamos</H>
        <P>Tu nombre, celular y email; tus reservas, pagos (sin datos de tarjeta), favoritos, reseñas y avisos. Si lo permitís, usamos tu ubicación solo en el momento para mostrarte las canchas más cercanas: no la guardamos en nuestros servidores.</P>
        <H>Para qué los usamos</H>
        <P>Para que puedas reservar, para que el complejo sepa quién va a jugar y pueda contactarte por tu reserva, y para avisarte de pagos, cambios y recordatorios. No vendemos tus datos ni los usamos para publicidad de terceros.</P>
        <H>Con quién los compartimos</H>
        <P>Con el complejo donde reservás (tu nombre y celular), con Mercado Pago para procesar pagos y con los proveedores que alojan la app (Supabase y el servicio de hosting), que los tratan solo para prestarnos el servicio.</P>
        <H>Tus derechos</H>
        <P>Podés pedir ver, corregir o borrar tus datos en cualquier momento desde el botón de Ayuda. Como titular de los datos tenés la facultad de ejercer el derecho de acceso en forma gratuita a intervalos no inferiores a seis meses, salvo que acredites un interés legítimo (art. 14, inc. 3, Ley 25.326). La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias y reclamos de quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</P>
        <H>Seguridad</H>
        <P>Los datos viajan cifrados (https) y cada usuario solo puede ver la información que le corresponde.</P>
      </Content>
    </>
  )
}

/* Casilla "Acepto" para los formularios de alta */
export function TermsCheck({ checked, onChange, error }) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer min-h-11">
        <input type="checkbox" className="mt-1 size-5 flex-none accent-[var(--brand)]" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="text-sm">Acepto los <a href="#/terminos" target="_blank" className="text-brand underline underline-offset-2">términos y condiciones</a> y la <a href="#/privacidad" target="_blank" className="text-brand underline underline-offset-2">política de privacidad</a>.</span>
      </label>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  )
}
