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
    <div className={cn('p-3.5 sm:p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] min-w-0 card-lift', className)}>
      <span className={cn('size-9 rounded-xl grid place-items-center', tones[tone])}><I size={18} aria-hidden="true" /></span>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-3">{label}</div>
      <div className={cn('display font-bold tnum mt-0.5 whitespace-nowrap leading-tight', String(value).length > 9 ? 'text-xl' : String(value).length > 6 ? 'text-2xl' : 'text-3xl')}><CountUp value={value} /></div>
    </div>
  )
}

/* Barra horizontal que crece al aparecer. */
export function HBar({ label, pct, strong, i = 0 }) {
  const tone = pct >= 70 ? 'var(--grad-brand)' : pct >= 35 ? 'color-mix(in srgb, var(--brand) 55%, var(--sunken))' : 'var(--line-strong)'
  return (
    <div className="flex items-center gap-3 min-h-8">
      {label && <span className={cn("w-14 flex-none text-sm tnum", strong ? "font-semibold" : "text-muted")}>{label}</span>}
      <span className="flex-1 h-3 rounded-full bg-sunken overflow-hidden">
        <motion.span className="block h-full rounded-full" style={{ background: tone }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(pct, 2)}%` }} viewport={{ once: true }} transition={{ duration: .7, delay: Math.min(i * .02, .5), ease: [.2, .8, .2, 1] }} />
      </span>
      <span className="w-10 text-right text-sm tnum flex-none">{pct}%</span>
    </div>
  )
}

/* Gráfico de columnas tocable: al tocar una columna muestra su valor. */
export function Columns({ items, selected, onSelect, labelFor, height = 112 }) {
  const max = Math.max(1, ...items.map(x => Math.max(x.v, x.ghost || 0)))
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="group" aria-label="Gráfico">
        {items.map((x, i) => {
          const on = selected === x.key
          return (
            <button key={x.key} type="button" aria-pressed={on} aria-label={x.aria} onClick={() => onSelect?.(on ? null : x.key)} className="relative flex-1 h-full flex items-end min-w-0 group">
              {x.ghost > 0 && <span className="absolute inset-x-0 border-t-2 border-dashed border-strong" style={{ bottom: `${(x.ghost / max) * 100}%` }} />}
              <motion.span className={cn('w-full rounded-t-md origin-bottom', x.future ? 'bg-sunken' : on ? 'bg-[image:var(--grad-brand)] shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--brand)]' : x.today ? 'bg-[image:var(--grad-brand)]' : 'bg-[color-mix(in_srgb,var(--brand)_45%,var(--sunken))] group-hover:bg-[color-mix(in_srgb,var(--brand)_70%,var(--sunken))]')}
                initial={{ height: 0 }} animate={{ height: `${Math.max(x.v ? 4 : 2, (x.v / max) * 100)}%` }} transition={{ ...spring, delay: Math.min(i * .015, .4) }} />
            </button>)
        })}
      </div>
      <div className="flex gap-[3px] mt-1 text-[11px] text-muted tnum">{items.map((x, i) => <span key={x.key} className={cn('flex-1 text-center truncate', selected === x.key && 'text-brand font-bold')}>{labelFor(x, i)}</span>)}</div>
    </div>
  )
}
