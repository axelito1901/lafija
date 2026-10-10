import { useEffect, useRef, useState } from 'react'
import { m as motion } from 'motion/react'
import { ArrowRight, ArrowUp, Clock3, LifeBuoy, ListOrdered, Lock, Printer, ScrollText } from 'lucide-react'
import { Content, PageHeader } from '../ui/kit'
import { Reveal } from '../ui/motion'
import { Link } from '../lib/router'
import { cn } from '../lib/format'
import './legal.css'

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

/* Documento legal: resumen en palabras simples, índice que acompaña la lectura y secciones numeradas.
   El diseño responde al ancho de su propia caja (container queries), así se ve bien con o sin la barra lateral de la app. */
function Doc({ kind, title, icon: Icon, sections, other }) {
  const [active, setActive] = useState(slug(sections[0][0]))
  const [pct, setPct] = useState(0)
  const nav = useRef(null)
  const art = useRef(null)
  const mins = Math.max(1, Math.round(sections.reduce((n, [h, ps]) => n + `${h} ${ps.join(' ')}`.split(/\s+/).length, 0) / 200))
  useEffect(() => {
    const io = new IntersectionObserver(es => { const e = es.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (e) setActive(e.target.id) }, { rootMargin: '-90px 0px -65% 0px' })
    sections.forEach(([h]) => { const el = document.getElementById(slug(h)); el && io.observe(el) })
    return () => io.disconnect()
  }, []) // eslint-disable-line
  useEffect(() => {
    let raf = 0
    const calc = () => { raf = 0; const el = art.current; if (!el) return; const r = el.getBoundingClientRect(); setPct(Math.round(Math.min(1, Math.max(0, (window.innerHeight * .4 - r.top) / r.height)) * 100)) }
    const on = () => { if (!raf) raf = requestAnimationFrame(calc) }
    calc(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on)
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [])
  useEffect(() => {
    const n = nav.current, el = n?.querySelector('[aria-current="true"]')
    if (n && el && n.scrollWidth > n.clientWidth + 2) n.scrollTo({ left: el.offsetLeft - n.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
  }, [active])
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const toc = sections.map(([h]) => [slug(h), h.replace(/^\d+\.\s*/, '')])
  const brief = (
    <ul className="space-y-2">{BRIEF[kind].map(t => <li key={t} className="flex gap-2.5"><span className="mt-2.5 size-1.5 rounded-full bg-current flex-none" aria-hidden="true" /><span>{t}</span></li>)}</ul>
  )
  const extras = (
    <div className="grid gap-3">
      <Link to={other.to} className="lg-card card-lift group flex items-center gap-3 p-3.5">
        <span className="size-10 rounded-xl grid place-items-center flex-none bg-brand-soft text-brand"><other.icon size={20} aria-hidden="true" /></span>
        <span className="flex-1 min-w-0"><span className="block text-xs font-semibold uppercase tracking-wider text-muted">También leé</span><span className="block font-semibold truncate">{other.title}</span></span>
        <ArrowRight size={18} className="text-faint flex-none transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
      <div className="lg-card p-3.5 flex items-start gap-3">
        <span className="size-10 rounded-xl grid place-items-center flex-none bg-sunken text-muted"><LifeBuoy size={20} aria-hidden="true" /></span>
        <p className="text-sm text-muted"><span className="block font-semibold text-ink">¿Te quedó una duda?</span>Escribinos desde el botón de Ayuda y te respondemos.</p>
      </div>
      <button type="button" onClick={() => window.print()} className="lg-print inline-flex items-center justify-center gap-2 min-h-11 rounded-xl border border-strong bg-surface font-semibold text-sm shadow-[var(--sh-1)] hover:bg-sunken active:scale-[.98] transition-[transform,background-color]"><Printer size={18} aria-hidden="true" />Imprimir o guardar en PDF</button>
    </div>
  )
  return (
    <>
      <PageHeader back="history" title={title} />
      <Content className="max-w-[1360px] @container lg-doc">
        <header className="hero p-5 @min-[760px]:p-8 grid gap-5 @min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,400px)] @min-[760px]:items-center @min-[760px]:gap-10">
          <div className="flex items-center gap-4 @min-[760px]:items-start @min-[760px]:flex-col @min-[760px]:gap-5">
            <span className="size-14 @min-[760px]:size-16 rounded-2xl grid place-items-center bg-white/20 backdrop-blur flex-none"><Icon size={28} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h1 className="display text-2xl @min-[760px]:text-5xl font-bold leading-tight">{title}</h1>
              <p className="text-sm opacity-90 @min-[760px]:mt-1">Última actualización: {UPDATED}</p>
              <p className="hidden @min-[760px]:flex flex-wrap gap-2 mt-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 h-7"><Clock3 size={14} aria-hidden="true" />{mins} min de lectura</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 h-7"><ListOrdered size={14} aria-hidden="true" />{sections.length} secciones</span>
              </p>
            </div>
          </div>
          <div className="hidden @min-[760px]:block rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-90 mb-3">En pocas palabras</p>
            <div className="text-[15px] leading-snug">{brief}</div>
            <p className="text-xs opacity-80 mt-3">Es un resumen para entender rápido. Lo que vale es el texto completo.</p>
          </div>
        </header>

        <div className="@min-[760px]:hidden mt-4 p-4 rounded-2xl bg-brand-soft border border-[color-mix(in_srgb,var(--brand)_25%,transparent)]">
          <p className="text-sm font-semibold text-brand uppercase tracking-wider">En pocas palabras</p>
          <div className="mt-2">{brief}</div>
          <p className="text-xs text-muted mt-3">Es un resumen para entender rápido. Lo que vale es el texto completo de abajo.</p>
        </div>

        <div className="mt-6 grid gap-4 @min-[880px]:grid-cols-[232px_minmax(0,1fr)] @min-[880px]:gap-10 @min-[1200px]:grid-cols-[232px_minmax(0,1fr)_272px] @min-[1200px]:gap-9">
          <nav ref={nav} aria-label="Índice" className="lg-toc sticky top-14 @min-[880px]:top-20 lg:@min-[880px]:top-6 z-10 -mx-4 px-4 @min-[880px]:mx-0 @min-[880px]:px-0 py-2 @min-[880px]:py-0 bg-[var(--glass)] backdrop-blur-xl @min-[880px]:bg-transparent @min-[880px]:backdrop-blur-none self-start flex @min-[880px]:flex-col gap-1.5 overflow-x-auto @min-[880px]:overflow-visible no-scrollbar border-b border-line @min-[880px]:border-0">
            <p className="hidden @min-[880px]:block px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted">En este documento</p>
            {toc.map(([id, h], i) => (
              <button key={id} type="button" aria-current={active === id} onClick={() => go(id)} className={cn('relative flex-none text-left rounded-xl px-3 min-h-11 @min-[880px]:min-h-10 text-sm whitespace-nowrap @min-[880px]:whitespace-normal transition-colors flex items-center gap-2.5', active === id ? 'text-brand font-semibold' : 'text-muted hover:text-ink')}>
                {active === id && <motion.span layoutId={`toc-${kind}`} className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative hidden @min-[880px]:inline tnum text-xs opacity-70 w-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="relative">{h}</span>
              </button>))}
            <div className="hidden @min-[880px]:block mt-3 px-3 pt-3 border-t border-line">
              <div className="flex items-center justify-between text-xs text-muted tnum"><span>Lectura</span><span className="font-semibold text-ink">{pct}%</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-sunken overflow-hidden" role="progressbar" aria-label="Avance de lectura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div className="h-full rounded-full bg-[image:var(--grad-brand)] transition-[width] duration-200" style={{ width: `${pct}%` }} /></div>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-2 -mx-2 px-2 inline-flex items-center gap-1.5 min-h-10 rounded-lg text-sm font-semibold text-brand hover:bg-brand-soft transition-colors"><ArrowUp size={16} aria-hidden="true" />Ir al inicio</button>
            </div>
          </nav>

          <article ref={art} aria-label={title} className="min-w-0">
            <div className="space-y-4 @min-[880px]:space-y-5">
              {sections.map(([h, ps], i) => (
                <Reveal key={h}>
                  <section id={slug(h)} className="scroll-mt-32 @min-[880px]:scroll-mt-8 p-5 @min-[880px]:p-8 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] @min-[880px]:grid @min-[880px]:grid-cols-[64px_minmax(0,1fr)] @min-[880px]:gap-x-4">
                    <span className="hidden @min-[880px]:block display text-brand font-bold tnum text-5xl leading-none pt-0.5" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <h2 className="text-xl @min-[880px]:text-3xl flex items-baseline gap-3"><span className="@min-[880px]:hidden display text-brand font-bold tnum text-2xl" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{h.replace(/^\d+\.\s*/, '')}</h2>
                      <div className="mt-3 @min-[880px]:mt-4 space-y-3 @min-[880px]:space-y-4">{ps.map((p, k) => <p key={k} className="text-muted leading-relaxed @min-[880px]:text-[17px] @min-[880px]:leading-[1.8] max-w-[70ch]">{p}</p>)}</div>
                    </div>
                  </section>
                </Reveal>))}
            </div>
            <div className="lg-foot @min-[1200px]:hidden mt-5">{extras}</div>
          </article>

          <aside aria-label="Más información" className="hidden @min-[1200px]:block self-start sticky top-6 lg-rail">{extras}</aside>
        </div>
      </Content>
    </>
  )
}

export const Terms = () => <Doc kind="terms" title="Términos y condiciones" icon={ScrollText} sections={TERMS} other={{ to: '/privacidad', title: 'Política de privacidad', icon: Lock }} />
export const Privacy = () => <Doc kind="privacy" title="Política de privacidad" icon={Lock} sections={PRIVACY} other={{ to: '/terminos', title: 'Términos y condiciones', icon: ScrollText }} />

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
