import { Fragment, useId, useRef, useState } from 'react'
import { m as motion, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '../lib/format'
import { CountUp, spring } from './motion'
import './dash.css'

const EASE = [.2, .8, .2, 1]

/* Anillo de ocupación que se dibuja al entrar. */
export function Ring({ pct, size = 132, stroke = 12, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const reduce = useReducedMotion()
  return (
    <div className="relative grid place-items-center flex-none" style={{ width: size, height: size }} role="img" aria-label={`Ocupación ${pct}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct / 100) : c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.1, ease: EASE, delay: .15 }} />
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

/* Variación contra el período anterior. unit: '%' (relativa), 'pp' (puntos) o '' (cantidad).
   good = 'up' si subir es bueno, 'down' si bajar es bueno (faltas, cancelaciones). */
export function Delta({ value, unit = '%', good = 'up', onGrad, className }) {
  if (value == null || !Number.isFinite(value)) return null
  const n = Math.round(Math.abs(value)), flat = n === 0, up = value > 0
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  const ok = !flat && (good === 'up') === up
  const txt = flat ? 'Igual' : `${up ? '+' : '−'}${n}${unit === 'pp' ? ' pp' : unit}`
  const tone = onGrad ? 'bg-white/20 text-[var(--on-grad)]' : flat ? 'bg-sunken text-muted' : ok ? 'bg-brand-soft text-brand' : 'bg-warn-soft text-warn'
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full pl-1.5 pr-2 h-6 text-xs font-semibold tnum whitespace-nowrap flex-none', tone, className)}
      aria-label={`${flat ? 'Sin cambios' : `${up ? 'Subió' : 'Bajó'} ${n}${unit === 'pp' ? ' puntos' : unit}`} frente al período anterior`}>
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />{txt}
    </span>
  )
}

/* Mini tendencia sin ejes, para adornar una tarjeta. Hereda el color del texto. */
export function Spark({ data, height = 40, className }) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1), n = data.length
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (n - 1)) * 100).toFixed(2)} ${(96 - (v / max) * 88).toFixed(2)}`).join(' ')
  return (
    <motion.svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className={cn('w-full overflow-visible', className)} style={{ height }}
      initial={reduce ? false : { clipPath: 'inset(-4px 100% -4px -4px)' }} animate={{ clipPath: 'inset(-4px 0% -4px -4px)' }} transition={{ duration: .9, ease: EASE, delay: .2 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L100 100 L0 100 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </motion.svg>
  )
}

export function Kpi({ icon: I, label, value, tone = 'brand', className, delta, spark, hint, big }) {
  const tones = { brand: 'bg-brand-soft text-brand', warn: 'bg-warn-soft text-warn', info: 'bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-info' }
  const len = String(value).length
  const size = big ? (len > 11 ? 'text-3xl' : 'text-4xl') : len > 9 ? 'text-xl' : len > 6 ? 'text-2xl' : 'text-3xl'
  return (
    <div className={cn('relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] min-w-0 card-lift', className)}>
      {spark && <div className={cn('absolute right-0 bottom-0 pointer-events-none text-brand opacity-60', big ? 'w-[58%]' : 'hidden sm:block w-[55%]')} aria-hidden="true">{spark}</div>}
      <div className="relative flex items-start justify-between gap-2">
        <span className={cn('size-9 rounded-xl grid place-items-center flex-none', tones[tone])}><I size={18} aria-hidden="true" /></span>
        {delta}
      </div>
      <div className="relative text-xs font-semibold uppercase tracking-wider text-muted mt-3">{label}</div>
      <div className={cn('relative display font-bold tnum mt-0.5 whitespace-nowrap leading-tight', size)}><CountUp value={value} /></div>
      {hint && <div className="relative text-xs text-muted mt-1 truncate">{hint}</div>}
    </div>
  )
}

/* Barra horizontal que crece al aparecer. tone: 'brand' (por defecto) o 'warn' para resaltar oportunidades. */
export function HBar({ label, pct, strong, i = 0, tone = 'brand', labelClass = 'w-14', className }) {
  const fill = tone === 'warn'
    ? `linear-gradient(90deg, color-mix(in srgb, var(--gold) 70%, var(--sunken)), var(--gold))`
    : pct >= 60 ? 'var(--grad-brand)' : pct >= 25 ? 'color-mix(in srgb, var(--brand) 60%, var(--sunken))' : 'color-mix(in srgb, var(--brand) 38%, var(--sunken))'
  return (
    <div className={cn('flex items-center gap-3 min-h-8', className)}>
      {label && <span className={cn(labelClass, 'flex-none text-sm tnum', strong ? 'font-semibold' : 'text-muted')}>{label}</span>}
      <span className="flex-1 h-3 rounded-full bg-sunken overflow-hidden" role="img" aria-label={`${label ? `${label}: ` : ''}${pct}%`}>
        <motion.span className="block h-full rounded-full" style={{ background: fill }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(pct, 2)}%` }} viewport={{ once: true }} transition={{ duration: .7, delay: Math.min(i * .02, .5), ease: EASE }} />
      </span>
      <span className="w-10 text-right text-sm tnum flex-none">{pct}%</span>
    </div>
  )
}

/* Gráfico de columnas tocable: al tocar una columna muestra su valor (con mouse, también al pasar por encima).
   Un item con hot: true se resalta. */
export function Columns({ items, selected, onSelect, labelFor, height = 112 }) {
  const max = Math.max(1, ...items.map(x => Math.max(x.v, x.ghost || 0)))
  const n = items.length
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="group" aria-label="Gráfico">
        {items.map((x, i) => {
          const on = selected === x.key
          const side = n > 8 && i < 2 ? 'left-0' : n > 8 && i > n - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
          return (
            <button key={x.key} type="button" aria-pressed={on} aria-label={x.aria} onClick={() => onSelect?.(on ? null : x.key)} className="relative flex-1 h-full flex items-end min-w-0 group rounded-t-md focus-visible:outline-offset-1">
              {x.aria && <span aria-hidden="true" className={cn('pointer-events-none absolute z-10 mb-1.5 rounded-md bg-ink text-bg px-2 py-1 text-[11px] font-semibold whitespace-nowrap tnum opacity-0 transition-opacity duration-150 [@media(hover:hover)]:group-hover:opacity-100 group-focus-visible:opacity-100', side)} style={{ bottom: `${Math.max(x.v ? 4 : 2, (x.v / max) * 100)}%` }}>{x.aria}</span>}
              {x.ghost > 0 && <span className="absolute inset-x-0 border-t-2 border-dashed border-strong" style={{ bottom: `${(x.ghost / max) * 100}%` }} />}
              <motion.span className={cn('w-full rounded-t-md origin-bottom', x.future ? 'bg-sunken' : on ? 'bg-[image:var(--grad-brand)] shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--brand)]' : x.today || x.hot ? 'bg-[image:var(--grad-brand)]' : 'bg-[color-mix(in_srgb,var(--brand)_45%,var(--sunken))] group-hover:bg-[color-mix(in_srgb,var(--brand)_70%,var(--sunken))]')}
                initial={{ height: 0 }} animate={{ height: `${Math.max(x.v ? 4 : 2, (x.v / max) * 100)}%` }} transition={{ ...spring, delay: Math.min(i * .015, .4) }} />
            </button>)
        })}
      </div>
      <div className="flex gap-[3px] mt-1 text-[11px] text-muted tnum">{items.map((x, i) => <span key={x.key} className={cn('flex-1 text-center truncate', selected === x.key && 'text-brand font-bold')}>{labelFor(x, i)}</span>)}</div>
    </div>
  )
}

/* Tope "lindo" para el eje vertical: 1, 2, 2,5 o 5 por una potencia de diez. */
function niceMax(v) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v)), f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

/* Área con línea que se dibuja al entrar. Al pasar el mouse, tocar o usar las flechas muestra el valor.
   points: [{ v, g?, label, tip }]; format convierte v en texto. g (opcional) es el valor del período anterior:
   si algún punto lo trae, se dibuja como línea punteada para comparar. En pantallas anchas los ejes van en una columna propia. */
export function AreaChart({ points, height = 180, format = String, label = 'Gráfico', className, ghostLabel = 'Antes' }) {
  const n = points.length
  const [hov, setHov] = useState(null)
  const box = useRef(null)
  const reduce = useReducedMotion()
  const gid = useId().replace(/:/g, '')
  const hasG = points.some(p => p.g != null)
  const max = niceMax(Math.max(0, ...points.map(p => Math.max(p.v, p.g || 0))))
  const X = i => (n < 2 ? 50 : (i / (n - 1)) * 100)
  const Y = v => 100 - (v / max) * 96
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)} ${Y(p.v).toFixed(2)}`).join(' ')
  const gline = hasG ? points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)} ${Y(p.g || 0).toFixed(2)}`).join(' ') : ''
  const at = e => {
    const r = box.current?.getBoundingClientRect()
    if (!r?.width) return
    setHov(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
  }
  const onKey = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setHov(h => Math.max(0, Math.min(n - 1, (h ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1)))) }
    else if (e.key === 'Escape') setHov(null)
  }
  const ticks = n <= 8 ? points.map((_, i) => i) : [...new Set(Array.from({ length: 5 }, (_, k) => Math.round((k * (n - 1)) / 4)))]
  const p = hov == null ? null : points[hov]
  const axis = 'absolute left-0 -translate-y-full mb-1 px-1 rounded bg-surface/80 text-[11px] text-muted tnum leading-none sm:left-auto sm:right-full sm:translate-y-[-50%] sm:mb-0 sm:mr-2 sm:px-0 sm:bg-transparent'
  return (
    <div className={cn('relative pt-9', className)}>
      <div className="relative sm:ml-14">
        {p && <div className="ac-tip absolute -top-9 z-10 pointer-events-none -translate-x-1/2 rounded-lg bg-ink text-bg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap tnum shadow-[var(--sh-2)]" style={{ left: `${Math.min(88, Math.max(12, X(hov)))}%` }}>{p.tip || p.label} · {format(p.v)}{hasG && p.g != null && <span className="opacity-70 font-medium"> · {ghostLabel.toLowerCase()} {format(p.g)}</span>}</div>}
        <div ref={box} className="ac-wrap relative" style={{ height }} tabIndex={0} role="group" aria-label={`${label}. Usá las flechas para recorrer los valores.`}
          onPointerDown={at} onPointerMove={at} onPointerLeave={e => { if (e.pointerType === 'mouse') setHov(null) }} onKeyDown={onKey} onBlur={() => setHov(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
            {[4, 52].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
            <line x1="0" x2="100" y1="100" y2="100" stroke="var(--line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={cn(axis, 'top-[4%]')} aria-hidden="true">{format(max)}</span>
          <span className={cn(axis, 'top-[52%]')} aria-hidden="true">{format(max / 2)}</span>
          <span className="absolute left-0 top-full -translate-y-1/2 hidden sm:block sm:left-auto sm:right-full sm:mr-2 text-[11px] text-muted tnum leading-none" aria-hidden="true">{format(0)}</span>
          {hasG && (
            <motion.svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible text-faint" aria-hidden="true"
              initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6, delay: .5 }}>
              <path d={gline} fill="none" stroke="currentColor" strokeWidth="1.75" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </motion.svg>)}
          <motion.svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible text-brand" aria-hidden="true"
            initial={reduce ? false : { clipPath: 'inset(-6px 100% -6px -6px)' }} animate={{ clipPath: 'inset(-6px 0% -6px -6px)' }} transition={{ duration: 1, ease: EASE, delay: .1 }}>
            <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".32" /><stop offset="1" stopColor="currentColor" stopOpacity=".02" /></linearGradient></defs>
            <path d={`${line} L${X(n - 1).toFixed(2)} 100 L${X(0).toFixed(2)} 100 Z`} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </motion.svg>
          {p && <>
            <span className="absolute top-0 bottom-0 w-px bg-strong pointer-events-none" style={{ left: `${X(hov)}%` }} />
            {hasG && p.g != null && <span className="absolute size-2.5 rounded-full bg-faint pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_2px_var(--surface)]" style={{ left: `${X(hov)}%`, top: `${Y(p.g)}%` }} />}
            <span className="absolute size-3 rounded-full bg-brand pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_3px_var(--surface)]" style={{ left: `${X(hov)}%`, top: `${Y(p.v)}%` }} />
          </>}
        </div>
        <div className="relative h-5 mt-1.5 text-[11px] text-muted tnum" aria-hidden="true">
          {ticks.map(i => <span key={i} className="absolute whitespace-nowrap" style={{ left: `${X(i)}%`, transform: `translateX(${i === 0 ? '0' : i === n - 1 ? '-100%' : '-50%'})` }}>{points[i].label}</span>)}
        </div>
      </div>
    </div>
  )
}

/* Mapa de calor: filas por día, columnas por horario. Cada celda se puede tocar.
   rows: [{ key, label, cells: [{ pct, total }] }]; mark(rowKey, colIndex) devuelve 'weak' | 'strong' | undefined. */
export function HeatGrid({ cols, rows, selected, onSelect, mark, describe, label = 'Mapa de calor', showNum = true }) {
  const top = Math.max(30, ...rows.flatMap(r => r.cells.map(c => c.pct)))
  const step = cols.length > 16 ? 3 : 2
  return (
    <div className="grid gap-[3px]" role="group" aria-label={label} style={{ gridTemplateColumns: `2.25rem repeat(${cols.length}, minmax(0, 1fr))` }}>
      <span className="text-[11px] text-faint self-end pb-1">hs</span>
      {cols.map((t, i) => <span key={t} className={cn('text-[11px] text-muted tnum text-center pb-1 min-w-0', i % step && 'max-sm:invisible')}>{t.slice(0, 2)}</span>)}
      {rows.map((r, ri) => (
        <Fragment key={r.key}>
          <span className="text-xs text-muted self-center">{r.label}</span>
          {r.cells.map((c, ci) => {
            const t = c.total ? Math.min(1, c.pct / top) : 0
            const on = selected && selected.r === r.key && selected.c === ci
            const text = describe ? describe(r, c, ci) : `${r.label} ${cols[ci]}: ${c.pct}%`
            return (
              <motion.button key={ci} type="button" className="hg-cell h-8 sm:h-9" aria-pressed={!!on} aria-label={text} title={text}
                data-empty={c.total ? undefined : '1'} data-mark={mark?.(r.key, ci)} data-hot={t >= .8 ? 'hi' : t >= .5 ? 'mid' : undefined}
                style={{ '--p': `${Math.round(6 + t * 94)}%` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .3, delay: Math.min((ri + ci) * .012, .5) }}
                onClick={() => onSelect?.(on ? null : { r: r.key, c: ci })}>
                {showNum && c.total > 0 && <span className="hidden sm:inline">{c.pct}</span>}
              </motion.button>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
