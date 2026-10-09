import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './kit'

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

/* Guía de primera vez: oscurece la pantalla y señala el botón real, un paso por vez. */
export function Tour({ role, onDone }) {
  const steps = TOURS[role] || []
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const step = steps[i]
  const finish = () => { localStorage.setItem(tourKey(role), '1'); onDone() }

  useLayoutEffect(() => {
    if (!step) return
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
  useEffect(() => { const k = e => { if (e.key === 'Escape') finish() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }) // eslint-disable-line

  if (!step || !rect) return null
  const pad = 8, W = window.innerWidth, H = window.innerHeight
  const hole = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }
  const cardW = Math.min(340, W - 32)
  const below = hole.y + hole.h + 200 < H
  const top = below ? hole.y + hole.h + 12 : Math.max(16, hole.y - 12 - 190)
  const left = Math.min(Math.max(16, rect.x + rect.w / 2 - cardW / 2), W - 16 - cardW)
  const last = i === steps.length - 1

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Guía de La Fija">
      <div className="absolute rounded-xl pointer-events-none transition-all duration-200" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: '0 0 0 3px var(--brand), 0 0 0 9999px rgba(6,10,7,.72)' }} />
      <div className="absolute bg-surface rounded-xl p-5 shadow-2xl" style={{ top, left, width: cardW }}>
        <p className="text-sm font-semibold text-brand">Paso {i + 1} de {steps.length}</p>
        <h2 className="text-xl mt-1">{step.title}</h2>
        <p className="text-muted mt-1">{step.text}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={finish}>Saltar</Button>
          <Button className="flex-1" onClick={() => (last ? finish() : setI(i + 1))} autoFocus>{last ? 'Entendido' : 'Siguiente'}</Button>
        </div>
      </div>
    </div>, document.body)
}
