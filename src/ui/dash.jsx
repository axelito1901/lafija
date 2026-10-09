import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../lib/format'
import { CountUp, spring } from './motion'

/* Anillo de ocupación que se dibuja al entrar. */
export function Ring({ pct, size = 132, stroke = 12, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const reduce = useReducedMotion()
  return (
    <div className="relative grid place-items-center flex-none" style={{ width: size, height: size }} role="img" aria-label={`Ocupación ${pct}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct / 100) : c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.1, ease: [.2, .8, .2, 1], delay: .15 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

/* Una barra por horario: cuanto más oscura, más canchas ocupadas. */
export function HeatStrip({ rows, nowT }) {
  return (
    <div>
      <div className="flex items-end gap-1 h-16" role="img" aria-label="Ocupación por horario">
        {rows.map((r, i) => (
          <motion.div key={r.t} className="flex-1 min-w-0 relative group" initial={{ height: 0 }} animate={{ height: `${Math.max(r.pct, 8)}%` }} transition={{ ...spring, delay: i * .015 }}>
            <div className={cn('absolute inset-0 rounded-md', r.pct === 0 ? 'bg-sunken' : 'bg-[image:var(--grad-brand)]', r.t === nowT && 'ring-2 ring-offset-2 ring-[var(--gold)] ring-offset-[var(--surface)]')} style={r.pct ? { opacity: .35 + r.pct / 160 } : undefined} />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold bg-ink text-bg rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 tnum">{r.t} · {r.n}/{r.of}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted tnum mt-1.5"><span>{rows[0]?.t}</span><span>{rows[Math.floor(rows.length / 2)]?.t}</span><span>{rows[rows.length - 1]?.t}</span></div>
    </div>
  )
}

export function Kpi({ icon: I, label, value, tone = 'brand', className }) {
  const tones = { brand: 'bg-brand-soft text-brand', warn: 'bg-warn-soft text-warn', info: 'bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-info' }
  return (
    <div className={cn('p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] min-w-0 card-lift', className)}>
      <span className={cn('size-9 rounded-xl grid place-items-center', tones[tone])}><I size={18} aria-hidden="true" /></span>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-3">{label}</div>
      <div className="display text-3xl font-bold tnum mt-0.5 truncate"><CountUp value={value} /></div>
    </div>
  )
}
