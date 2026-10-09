import { useEffect, useRef, useState } from 'react'
import { m as motion } from 'motion/react'
import { Lock, ScrollText } from 'lucide-react'
import { Content, PageHeader } from '../ui/kit'
import { Item, Stagger } from '../ui/motion'
import { cn } from '../lib/format'

/* Textos legales base. Están escritos para una primera versión: conviene que los revise un abogado antes de crecer. */
const UPDATED = 'Octubre de 2026'

const TERMS = [
 [
  "1. Qué es La Fija",
  [
   "La Fija es una plataforma que conecta a personas que quieren alquilar canchas de fútbol (jugadores) con los complejos que las ofrecen (dueños). La Fija no es dueña de las canchas ni presta el servicio deportivo: cada complejo es responsable de sus instalaciones, sus precios, sus horarios y la atención."
  ]
 ],
 [
  "2. Cuentas",
  [
   "Para reservar o publicar un complejo necesitás una cuenta con datos reales. Sos responsable de lo que se haga con tu cuenta. Podemos suspender cuentas que den datos falsos, hagan reservas sin intención de usarlas o molesten a otros usuarios."
  ]
 ],
 [
  "3. Reservas, seña y cancelaciones",
  [
   "Cada complejo define el precio, si pide seña, el plazo para pagarla y su política de cancelación y devolución. Esas condiciones se muestran antes de confirmar la reserva y forman parte del acuerdo entre el jugador y el complejo. Una reserva con pago pendiente se libera sola si no se paga en el plazo indicado.",
   "Si no vas a poder ir, cancelá con tiempo desde \"Mis reservas\". Las faltas sin aviso pueden quedar registradas por el complejo."
  ]
 ],
 [
  "4. Pagos",
  [
   "Los pagos online se procesan con Mercado Pago. La Fija no guarda los datos de tu tarjeta. Las devoluciones se hacen por el mismo medio de pago, según la política de cada complejo."
  ]
 ],
 [
  "5. Complejos",
  [
   "Los dueños se comprometen a publicar información verdadera (dirección, fotos, precios, servicios) y a respetar las reservas confirmadas. La Fija revisa cada complejo antes de publicarlo y puede desactivar los que no cumplan estas condiciones."
  ]
 ],
 [
  "6. Reseñas",
  [
   "Las reseñas tienen que referirse a una experiencia real y ser respetuosas. Podemos ocultar las que contengan insultos, datos personales o información falsa."
  ]
 ],
 [
  "7. Responsabilidad",
  [
   "La Fija hace lo posible para que la información sea correcta y la app funcione sin cortes, pero no responde por el estado de las canchas, lesiones durante el juego ni por incumplimientos de un complejo o de un jugador."
  ]
 ],
 [
  "8. Cambios y contacto",
  [
   "Si cambiamos estos términos, lo avisamos en la app. Por cualquier consulta, escribinos desde el botón de Ayuda."
  ]
 ]
]

const PRIVACY = [
 [
  "Qué datos guardamos",
  [
   "Tu nombre, celular y email; tus reservas, pagos (sin datos de tarjeta), favoritos, reseñas y avisos. Si lo permitís, usamos tu ubicación solo en el momento para mostrarte las canchas más cercanas: no la guardamos en nuestros servidores."
  ]
 ],
 [
  "Para qué los usamos",
  [
   "Para que puedas reservar, para que el complejo sepa quién va a jugar y pueda contactarte por tu reserva, y para avisarte de pagos, cambios y recordatorios. No vendemos tus datos ni los usamos para publicidad de terceros."
  ]
 ],
 [
  "Con quién los compartimos",
  [
   "Con el complejo donde reservás (tu nombre y celular), con Mercado Pago para procesar pagos y con los proveedores que alojan la app (Supabase y el servicio de hosting), que los tratan solo para prestarnos el servicio."
  ]
 ],
 [
  "Tus derechos",
  [
   "Podés pedir ver, corregir o borrar tus datos en cualquier momento desde el botón de Ayuda. Como titular de los datos tenés la facultad de ejercer el derecho de acceso en forma gratuita a intervalos no inferiores a seis meses, salvo que acredites un interés legítimo (art. 14, inc. 3, Ley 25.326). La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias y reclamos de quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales."
  ]
 ],
 [
  "Seguridad",
  [
   "Los datos viajan cifrados (https) y cada usuario solo puede ver la información que le corresponde."
  ]
 ]
]

const BRIEF = {
  terms: ['La Fija conecta jugadores con complejos: no es dueña de las canchas.', 'Cada complejo fija su precio, su seña y su política de cancelación, y te las muestra antes de confirmar.', 'Si no podés ir, cancelá con tiempo desde "Mis reservas".'],
  privacy: ['Guardamos lo necesario para reservar: nombre, celular, email y tus reservas.', 'No vendemos tus datos ni los usamos para publicidad de terceros.', 'Podés pedir ver, corregir o borrar tus datos desde Ayuda.'],
}
const slug = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* Documento legal: resumen en palabras simples, índice que acompaña la lectura y secciones numeradas. */
function Doc({ kind, title, icon: Icon, sections }) {
  const [active, setActive] = useState(slug(sections[0][0]))
  const nav = useRef(null)
  useEffect(() => {
    const io = new IntersectionObserver(es => { const e = es.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (e) setActive(e.target.id) }, { rootMargin: '-90px 0px -65% 0px' })
    sections.forEach(([h]) => { const el = document.getElementById(slug(h)); el && io.observe(el) })
    return () => io.disconnect()
  }, []) // eslint-disable-line
  useEffect(() => { nav.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [active])
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const toc = sections.map(([h]) => [slug(h), h])
  return (
    <>
      <PageHeader back="history" title={title} />
      <Content className="max-w-[980px]">
        <div className="hero p-5 flex items-center gap-4">
          <span className="size-14 rounded-2xl grid place-items-center bg-white/20 backdrop-blur flex-none"><Icon size={28} aria-hidden="true" /></span>
          <div className="min-w-0"><h1 className="display text-2xl lg:text-3xl font-bold leading-tight">{title}</h1><p className="text-sm opacity-90">Última actualización: {UPDATED}</p></div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-brand-soft border border-[color-mix(in_srgb,var(--brand)_25%,transparent)]">
          <p className="text-sm font-semibold text-brand uppercase tracking-wider">En pocas palabras</p>
          <ul className="mt-2 space-y-1.5">{BRIEF[kind].map(t => <li key={t} className="flex gap-2.5"><span className="mt-2 size-1.5 rounded-full bg-brand flex-none" aria-hidden="true" /><span>{t}</span></li>)}</ul>
          <p className="text-xs text-muted mt-3">Es un resumen para entender rápido. Lo que vale es el texto completo de abajo.</p>
        </div>

        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 mt-6">
          <nav ref={nav} aria-label="Índice" className="sticky top-14 lg:top-6 z-10 -mx-4 px-4 lg:mx-0 lg:px-0 py-2 lg:py-0 bg-[var(--glass)] backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none self-start flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar border-b border-line lg:border-0">
            {toc.map(([id, h]) => (
              <button key={id} type="button" aria-current={active === id} onClick={() => go(id)} className={cn('relative flex-none text-left rounded-xl px-3 min-h-10 text-sm whitespace-nowrap lg:whitespace-normal transition-colors', active === id ? 'text-brand font-semibold' : 'text-muted hover:text-ink')}>
                {active === id && <motion.span layoutId={`toc-${kind}`} className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{h}</span>
              </button>))}
          </nav>
          <Stagger className="space-y-4 mt-4 lg:mt-0">
            {sections.map(([h, ps], i) => (
              <Item as="section" key={h} id={slug(h)} className="scroll-mt-32 lg:scroll-mt-8 p-5 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
                <h2 className="text-xl flex items-baseline gap-3"><span className="display text-brand font-bold tnum text-2xl">{String(i + 1).padStart(2, '0')}</span>{h.replace(/^\d+\.\s*/, '')}</h2>
                <div className="mt-3 space-y-3">{ps.map((p, k) => <p key={k} className="text-muted leading-relaxed">{p}</p>)}</div>
              </Item>))}
          </Stagger>
        </div>
      </Content>
    </>
  )
}

export const Terms = () => <Doc kind="terms" title="Términos y condiciones" icon={ScrollText} sections={TERMS} />
export const Privacy = () => <Doc kind="privacy" title="Política de privacidad" icon={Lock} sections={PRIVACY} />

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
