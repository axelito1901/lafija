import { useEffect, useState } from 'react'
import { Search, ShieldCheck, Store, User, X } from 'lucide-react'
import { m as motion } from 'motion/react'
import { cn } from '../../lib/format'
import { CountUp } from '../../ui/motion'
import { useStickyTop } from '../../ui/dash'
import './admin.css'

/* true cuando la pantalla es lo bastante ancha para mostrar el detalle en un panel al costado (en vez de una ventana) */
export function useWide(q = '(min-width: 1280px)') {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches
  const [w, setW] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return
    const m = window.matchMedia(q), on = () => setW(m.matches)
    on(); m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [q])
  return w
}

export const Pill = ({ tone = 'muted', icon: I, children, className }) => (
  <span className={cn('ad-pill', className)} data-tone={tone}>{I && <I size={13} strokeWidth={2.4} aria-hidden="true" />}{children}</span>
)

export const ROLE_META = { player: { tone: 'info', icon: User }, owner: { tone: 'ok', icon: Store }, admin: { tone: 'warn', icon: ShieldCheck } }

/* Color de la franja de cada estado de reserva (igual que en las listas del resto de la app) */
export const ACCENT = { pending: 'var(--warn)', deposit_paid: 'var(--info)', confirmed: 'var(--brand)', completed: 'var(--faint)', cancelled: 'var(--danger)', no_show: 'var(--danger)' }

export function SearchField({ value, onChange, placeholder, label, className }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <input type="search" className="input ad-search !pl-10 !pr-11" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label || placeholder} autoComplete="off" />
      {value && <button type="button" className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2" aria-label="Borrar búsqueda" onClick={() => onChange('')}><X size={18} aria-hidden="true" /></button>}
    </div>
  )
}

/* Mosaicos que cuentan y filtran a la vez. options: [{ value, label, count, tone? }] */
export function FilterTiles({ value, onChange, options, label, className }) {
  return (
    <div role="group" aria-label={label} className={cn('grid gap-2 sm:gap-3', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => (
        <button key={String(o.value)} type="button" className="ad-tile" aria-pressed={value === o.value} data-tone={o.count > 0 ? o.tone : undefined} onClick={() => onChange(o.value)}>
          <span className="ad-tile-n"><CountUp value={String(o.count)} /></span>
          <span className="ad-tile-k">{o.short ? <><span className="sm:hidden">{o.short}</span><span className="max-sm:hidden">{o.label}</span></> : o.label}</span>
        </button>
      ))}
    </div>
  )
}

/* Columna lateral que acompaña el scroll (sólo en pantallas anchas) */
export function Aside({ children, className }) {
  const ref = useStickyTop(24)
  return <aside ref={ref} className={cn('hidden xl:block self-start xl:sticky', className)}>{children}</aside>
}

/* Detalle vacío del panel lateral */
export function PanelEmpty({ icon: I, title, text }) {
  return (
    <div className="ad-card p-8 text-center">
      <span className="mx-auto mb-4 grid place-items-center size-14 rounded-2xl bg-brand-soft text-brand float-y"><I size={26} strokeWidth={1.75} aria-hidden="true" /></span>
      <p className="font-semibold">{title}</p>
      {text && <p className="text-sm text-muted mt-1">{text}</p>}
    </div>
  )
}

/* Barra de proporción que crece al entrar */
export function Bar({ pct, i = 0, tone = 'brand', className }) {
  const fill = tone === 'warn' ? 'linear-gradient(90deg, color-mix(in srgb, var(--gold) 70%, var(--sunken)), var(--gold))' : tone === 'danger' ? 'var(--danger)' : pct >= 60 ? 'var(--grad-brand)' : 'color-mix(in srgb, var(--brand) 62%, var(--sunken))'
  return (
    <span className={cn('block h-2.5 rounded-full bg-sunken overflow-hidden', className)} role="img" aria-label={`${Math.round(pct)}%`}>
      <motion.span className="block h-full rounded-full" style={{ background: fill }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(pct, 2)}%` }} viewport={{ once: true }} transition={{ duration: .7, delay: Math.min(i * .05, .4), ease: [.2, .8, .2, 1] }} />
    </span>
  )
}

/* Una sola barra partida en tramos de color, con la leyenda abajo. items: [{ label, n, color }] */
export function Breakdown({ items, title }) {
  const total = items.reduce((s, x) => s + x.n, 0) || 1
  return (
    <div>
      {title && <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{title}</p>}
      <div className="flex gap-[3px] h-3 rounded-full overflow-hidden" role="img" aria-label={items.map(x => `${x.label}: ${x.n}`).join(', ')}>
        {items.filter(x => x.n > 0).map((x, i) => <motion.span key={x.label} className="h-full rounded-full" style={{ background: x.color }} initial={{ flexGrow: 0 }} animate={{ flexGrow: x.n / total }} transition={{ duration: .8, delay: .1 + i * .08, ease: [.2, .8, .2, 1] }} />)}
      </div>
      <ul className="mt-2.5 grid gap-1.5 text-sm">
        {items.map(x => <li key={x.label} className="flex items-center gap-2 min-w-0"><span className="size-2.5 rounded-full flex-none" style={{ background: x.color }} aria-hidden="true" /><span className="flex-1 min-w-0 truncate text-muted">{x.label}</span><span className="font-semibold tnum">{x.n}</span></li>)}
      </ul>
    </div>
  )
}

/* Título de panel con ícono */
export function PanelTitle({ icon: I, title, sub, tone = 'ok', right }) {
  const tones = { ok: 'bg-brand-soft text-brand', warn: 'bg-warn-soft text-warn', info: 'bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-info' }
  return (
    <div className="flex items-center gap-3">
      <span className={cn('size-10 rounded-xl grid place-items-center flex-none', tones[tone])}><I size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><h2 className="text-lg leading-tight">{title}</h2>{sub && <p className="text-sm text-muted truncate">{sub}</p>}</div>
      {right}
    </div>
  )
}

/* Datos de contacto: botones de 44px para WhatsApp, llamar y mail */
export const contactBtn = 'inline-flex items-center justify-center gap-2 min-h-11 px-3.5 rounded-xl border border-strong bg-surface text-sm font-semibold hover:bg-sunken active:scale-[.97] transition-[transform,background-color] shadow-[var(--sh-1)]'
