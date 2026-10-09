import { forwardRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, cn, dateShort, fromISO, toISO, todayISO } from '../lib/format'
import { Button, IconButton, Sheet } from './kit'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export const dateLabel = v => {
  if (!v) return ''
  const y = fromISO(v).getFullYear()
  return `${dateShort(v)}${y !== new Date().getFullYear() ? ` ${y}` : ''}`
}

function Calendar({ value, onPick, min, max }) {
  const start = value ? fromISO(value) : new Date()
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() })
  const first = new Date(view.y, view.m, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => toISO(new Date(view.y, view.m, i + 1)))]
  const today = todayISO()
  const move = n => setView(v => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const canPrev = !min || toISO(new Date(view.y, view.m, 0)) >= min
  const canNext = !max || toISO(new Date(view.y, view.m + 1, 1)) <= max
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <IconButton label="Mes anterior" onClick={() => move(-1)} disabled={!canPrev}><ChevronLeft size={22} /></IconButton>
        <div className="font-semibold capitalize" aria-live="polite">{MONTHS[view.m]} {view.y}</div>
        <IconButton label="Mes siguiente" onClick={() => move(1)} disabled={!canNext}><ChevronRight size={22} /></IconButton>
      </div>
      <div className="grid grid-cols-7 text-center text-sm text-muted mb-1" aria-hidden="true">{DOW.map((d, i) => <div key={i} className="py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-y-1" role="grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const off = (min && d < min) || (max && d > max)
          const on = d === value
          return (
            <button key={d} type="button" disabled={off} onClick={() => onPick(d)} aria-pressed={on} aria-label={dateLabel(d)}
              className={cn('mx-auto size-11 rounded-full grid place-items-center tnum text-base transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
                on ? 'bg-brand text-[var(--brand-ink)] font-semibold' : 'hover:bg-sunken', !on && d === today && 'ring-1 ring-brand text-brand font-semibold')}>
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Reemplazo del <input type="date">: se ve igual en todos los celulares y se toca con el dedo. */
export const DateField = forwardRef(function DateField({ value, onChange, min, max, clearable, placeholder = 'Elegir fecha', className, title = 'Elegir fecha', ...rest }, ref) {
  const [open, setOpen] = useState(false)
  const pick = d => { onChange(d); setOpen(false) }
  const today = todayISO()
  return (
    <>
      <button ref={ref} type="button" className={cn('input flex items-center justify-between gap-2 text-left', className)} onClick={() => setOpen(true)} aria-haspopup="dialog" {...rest}>
        <span className={cn('truncate', !value && 'text-faint')}>{value ? dateLabel(value) : placeholder}</span>
        <CalendarDays size={18} className="text-muted flex-none" aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}
        footer={clearable && value ? <Button variant="secondary" onClick={() => pick('')}>Borrar fecha</Button> : null}>
        <div className="flex gap-2 mb-4">
          {[['Hoy', today], ['Mañana', addDays(today, 1)]].map(([l, d]) => <Button key={l} size="sm" variant="secondary" disabled={(min && d < min) || (max && d > max)} onClick={() => pick(d)}>{l}</Button>)}
        </div>
        <Calendar key={String(open)} value={value} onPick={pick} min={min} max={max} />
      </Sheet>
    </>
  )
})
