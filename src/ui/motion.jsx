import { useEffect, useRef } from 'react'
import { animate, m as motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react'

export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }

/* Entrada escalonada: los hijos suben y aparecen uno tras otro. */
export function Stagger({ children, className, delay = 0, step = 0.05, as = 'div' }) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M className={className} initial={reduce ? false : 'hide'} animate="show"
      variants={{ show: { transition: { delayChildren: delay, staggerChildren: step } } }}>{children}</M>
  )
}
export const Item = ({ children, className, as = 'div', ...p }) => {
  const M = motion[as]
  return <M className={className} variants={{ hide: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: spring } }} {...p}>{children}</M>
}

/* Aparece al entrar en pantalla. */
export function Reveal({ children, className, y = 16 }) {
  const reduce = useReducedMotion()
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={spring}>{children}</motion.div>
}

/* Micro-interacción: se levanta al pasar el mouse y se hunde al tocar. Para tarjetas clickeables. */
export function Lift({ children, className, as = 'div', y = -3, ...p }) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return <M className={className} whileHover={reduce ? undefined : { y }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={spring} {...p}>{children}</M>
}

/* Transición entre pantallas: sube apenas y aparece (sin desenfoque, para no costar en pantallas grandes). */
export function PageFade({ children, k }) {
  const reduce = useReducedMotion()
  return <motion.div key={k} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}>{children}</motion.div>
}

/* Número que cuenta hasta su valor. Acepta "$ 12.500" y conserva el formato. */
export function CountUp({ value, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const text = String(value)
  const m = text.match(/\d[\d.]*/)
  const mv = useMotionValue(0)
  const target = m ? Number(m[0].replace(/\./g, '')) : 0
  const out = useTransform(mv, v => m ? text.replace(m[0], Math.round(v).toLocaleString('es-AR')) : text)
  useEffect(() => {
    if (!m || !inView || reduce) { mv.set(target); return }
    const c = animate(mv, target, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] })
    return () => c.stop()
  }, [inView, target]) // eslint-disable-line
  useEffect(() => out.on('change', v => { if (ref.current) ref.current.textContent = v }), [out])
  return <span ref={ref} className={className}>{m && !reduce ? text.replace(m[0], '0') : text}</span>
}

/* Festejo de gol al confirmar una reserva. */
export async function celebrate() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#1b7a41', '#4fb878', '#f4c430', '#ffffff']
  confetti({ particleCount: 70, spread: 70, origin: { y: 0.65 }, colors, zIndex: 100 })
  setTimeout(() => confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 100 }), 180)
  setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 100 }), 180)
}
