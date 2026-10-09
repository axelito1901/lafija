import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m as motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, LogoMark } from './kit'

export const TOURS = {
  player: [
    { target: '[data-tour="buscar"]', title: 'Elegí cuándo jugar', text: 'Tocá un día y abajo te mostramos los horarios libres de las canchas más cercanas. Tocá un horario para reservar.' },
    { target: '[data-tour="nav-reservas"]', title: 'Tus reservas', text: 'Lo que reserves queda acá. Podés pagar, cancelar o invitar a tus amigos.' },
    { target: '[data-tour="ayuda"]', title: '¿Tenés dudas?', text: 'Tocá el signo de pregunta cuando quieras. Ahí está la ayuda y el WhatsApp de soporte.' },
  ],
  owner: [
    { target: '[data-tour="nueva-reserva"]', title: 'Cargá una reserva', text: 'Cuando te llaman o te escriben, la anotás acá en segundos. También la podés dictar.' },
    { target: '[data-tour="nav-agenda"]', title: 'Tu agenda', text: 'Cada cancha y cada horario del día: libre, reservado o bloqueado.' },
    { target: '[data-tour="nav-reservas"]', title: 'Reservas y cobros', text: 'Tocá una reserva para cobrarla, avisarle al cliente por WhatsApp o cancelarla.' },
    { target: '[data-tour="ayuda"]', title: '¿Tenés dudas?', text: 'Tocá el signo de pregunta cuando quieras. Ahí está la ayuda.' },
  ],
}
export const tourKey = role => `lafija-tour-${role}`

const visible = sel => [...document.querySelectorAll(sel)].find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })

const WELCOME = {
  player: { title: '¡Bienvenido a La Fija!', text: 'Encontrá una cancha libre cerca tuyo, reservala en pocos toques y armá el partido con tus amigos. Te mostramos lo básico en un minuto.' },
  owner: { title: '¡Bienvenido a La Fija!', text: 'Acá manejás tu complejo: la agenda, las reservas, los cobros y los clientes. Te mostramos lo básico en un minuto.' },
}

/* Guía de primera vez: oscurece la pantalla y señala el botón real, un paso por vez. */
export function Tour({ role, onDone }) {
  const steps = [{ welcome: true, ...WELCOME[role] }, ...(TOURS[role] || [])]
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const step = steps[i]
  const finish = () => { localStorage.setItem(tourKey(role), '1'); onDone() }
  const next = () => (i === steps.length - 1 ? finish() : setI(i + 1))

  useLayoutEffect(() => {
    if (!step || step.welcome) { setRect(null); return }
    let tries = 0, raf, t, el
    const find = () => {
      el = visible(step.target)
      if (!el) { if (tries++ < 10) { t = setTimeout(find, 100); return } i < steps.length - 1 ? setI(i + 1) : finish(); return }
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      const loop = () => {
        const r = el.getBoundingClientRect()
        setRect(p => (p && p.x === r.left && p.y === r.top && p.w === r.width && p.h === r.height ? p : { x: r.left, y: r.top, w: r.width, h: r.height }))
        raf = requestAnimationFrame(loop)
      }
      loop()
    }
    find()
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [i]) // eslint-disable-line
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft' && i > 0) setI(i - 1) }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }) // eslint-disable-line

  if (!step || (!step.welcome && !rect)) return null
  const last = i === steps.length - 1
  const dots = <div className="flex gap-1.5" aria-hidden="true">{steps.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-6 bg-[image:var(--grad-brand)]' : 'w-1.5 bg-strong'}`} />)}</div>
  const actions = (
    <div className="flex items-center gap-2 mt-5">
      <Button variant="ghost" onClick={finish}>Saltar</Button>
      <span className="flex-1" />
      {i > 0 && <Button variant="secondary" onClick={() => setI(i - 1)} aria-label="Paso anterior"><ChevronLeft size={18} /></Button>}
      <Button onClick={next} autoFocus>{step.welcome ? 'Empezar' : last ? 'Entendido' : 'Siguiente'}{!last && <ChevronRight size={18} />}</Button>
    </div>
  )

  if (step.welcome) return createPortal(
    <motion.div className="fixed inset-0 z-[80] grid place-items-center p-5 bg-[rgba(6,10,7,.72)] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Bienvenida" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div initial={{ y: 30, scale: .94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="w-full max-w-[380px] bg-surface rounded-3xl overflow-hidden shadow-2xl">
        <div className="hero !rounded-none px-6 pt-8 pb-7 text-center">
          <motion.span initial={{ rotate: -20, scale: .5 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: .15, stiffness: 300, damping: 14 }} className="mx-auto grid place-items-center size-16 rounded-2xl bg-white/20 backdrop-blur"><LogoMark size={36} /></motion.span>
          <h2 className="display text-3xl font-bold mt-4 leading-tight">{step.title}</h2>
        </div>
        <div className="p-6"><p className="text-muted">{step.text}</p><div className="mt-4">{dots}</div>{actions}</div>
      </motion.div>
    </motion.div>, document.body)

  const pad = 8, W = window.innerWidth, H = window.innerHeight
  const hole = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }
  const cardW = Math.min(340, W - 32)
  const below = hole.y + hole.h + 230 < H
  const top = below ? hole.y + hole.h + 14 : Math.max(16, hole.y - 14 - 215)
  const left = Math.min(Math.max(16, rect.x + rect.w / 2 - cardW / 2), W - 16 - cardW)
  const cx = Math.min(Math.max(28, rect.x + rect.w / 2 - left), cardW - 28)

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Guía de La Fija">
      <div className="absolute rounded-2xl pointer-events-none transition-all duration-300 ease-out" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: '0 0 0 3px var(--brand), 0 0 0 9999px rgba(6,10,7,.72)' }}>
        <span className="absolute inset-0 rounded-2xl tour-pulse" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: below ? -8 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} className="absolute bg-surface rounded-2xl p-5 shadow-2xl" style={{ top, left, width: cardW }}>
          <span className="absolute size-3 bg-surface rotate-45 rounded-sm" style={{ left: cx - 6, [below ? 'top' : 'bottom']: -5 }} aria-hidden="true" />
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-brand">Paso {i} de {steps.length - 1}</p>{dots}</div>
          <h2 className="text-xl mt-2 display font-bold">{step.title}</h2>
          <p className="text-muted mt-1">{step.text}</p>
          {actions}
        </motion.div>
      </AnimatePresence>
    </div>, document.body)
}
