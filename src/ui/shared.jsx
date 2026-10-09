import { useEffect, useRef } from 'react'
import { CheckCheck, ChevronRight, CircleCheck, CircleX, Clock3, Coins, Heart, Star, UserX } from 'lucide-react'
import { complexFromPrice, complexTags, courtsOf, effStatus, getComplex, getCourt, paymentLabel, ratingOf, STATUS } from '../lib/domain'
import { cn, dateShort, dayNum, distanceKm, kmLabel, money, monthShort, relativeDay, slotEnd, todayISO, weekdayShort } from '../lib/format'
import { Link } from '../lib/router'
import { Avatar, Button, Rating, Status } from './kit'
import { Cover } from './Cover'
import { VerifiedBadge } from './trust'

/* Datos derivados de un complejo para listas, tarjetas y mapa */
export function complexView(state, c, origin) {
  const d = origin ? distanceKm(origin, c) : null
  const r = ratingOf(state, c.id)
  return { ...c, distance: d, distanceLabel: kmLabel(d), tags: complexTags(state, c.id), fromPrice: complexFromPrice(state, c.id), rating: r.avg, ratingCount: r.count }
}

const STATUS_ICON = { pending: Clock3, deposit_paid: Coins, confirmed: CircleCheck, completed: CheckCheck, cancelled: CircleX, no_show: UserX }
export const BookingStatus = ({ booking }) => {
  const s = effStatus(booking), I = STATUS_ICON[s]
  return <Status tone={STATUS[s].tone} icon={I}>{STATUS[s].label}</Status>
}

export function ComplexCard({ c, free, selected, fav, onFav, id, slots, date }) {
  return (
    <article id={id} className={cn('tile', selected && '!border-brand ring-1 ring-brand')}>
      <div className="relative">
        <Link to={`/complejo/${c.slug}`} tabIndex={-1} aria-hidden="true" className="block relative overflow-hidden group/cover">
          <Cover src={c.coverUrl} seed={c.id} className="aspect-[16/9] lg:aspect-[2/1] [&>img]:transition-transform [&>img]:duration-700 group-hover/cover:[&>img]:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </Link>
        {c.fromPrice != null && <span className="absolute left-3 bottom-3 text-white font-semibold tnum text-sm bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">Desde {money(c.fromPrice)}</span>}
        {c.ratingCount > 0 && <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 text-white text-sm font-semibold bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1"><Star size={13} className="fill-[var(--gold)] text-[var(--gold)]" />{c.rating.toFixed(1).replace('.', ',')}</span>}
        {onFav && (
          <button type="button" onClick={onFav} aria-pressed={fav} aria-label={fav ? `Quitar ${c.name} de favoritos` : `Guardar ${c.name} en favoritos`}
            className="absolute top-2 right-2 grid place-items-center w-11 h-11 rounded-full bg-black/35 backdrop-blur-md border border-white/25 active:scale-90 transition-transform">
            <Heart size={20} className={fav ? 'fill-current text-[#ff6b6b] pop-in' : 'text-white'} />
          </button>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base leading-snug"><Link to={`/complejo/${c.slug}`} className="inline-flex items-center gap-1.5 min-h-11 -my-2.5">{c.name}{c.verified && <VerifiedBadge label={false} />}</Link></h3>
          
        </div>
        <p className="text-sm text-muted truncate mt-0.5">{c.city}{c.distance != null ? ` · ${c.distanceLabel}` : ''}</p>
        <p className="text-sm truncate mt-1">{(c.tags || 'Sin canchas activas').split(' · ').filter(t => t.startsWith('Fútbol')).join(' · ') || c.tags}</p>
        {slots ? (slots.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Libres {date === todayISO() ? 'hoy' : relativeDay(date).toLowerCase()}</p>
            <div className="flex flex-wrap gap-1.5">{slots.slice(0, 4).map(s => <Link key={s.t} to={`/complejo/${c.slug}/reservar?fecha=${date}&cancha=${s.courtId}&hora=${s.t}`} className="chip !min-h-10 !px-3 tnum">{s.t}</Link>)}</div>
          </div>) : <p className="text-sm text-muted mt-2">Sin horarios libres ese día</p>)
          : free != null && <p className={cn('text-sm mt-1', free ? 'text-brand font-medium' : 'text-muted')}>{free ? `${free} ${free === 1 ? 'horario libre' : 'horarios libres'}` : 'Sin horarios libres'}</p>}
        <div className="mt-auto pt-3">
          <Button as={Link} to={`/complejo/${c.slug}/reservar${date ? `?fecha=${date}` : ''}`} variant="secondary" className="w-full mt-3">Reservar</Button>
        </div>
      </div>
    </article>
  )
}

/* Cuánto falta para el partido, en palabras. */
export function untilLabel(b, now = new Date()) {
  const ms = new Date(`${b.date}T${b.time}:00`) - now
  if (ms <= 0) return 'En juego'
  const m = Math.round(ms / 60000), h = Math.floor(m / 60)
  if (m < 60) return `En ${m} min`
  if (h < 24) return `En ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Mañana' : `En ${d} días`
}
const ACCENT = { pending: 'var(--warn)', deposit_paid: 'var(--info)', confirmed: 'var(--brand)', completed: 'var(--faint)', cancelled: 'var(--danger)', no_show: 'var(--danger)' }

/* Tarjeta de reserva del jugador: foto del complejo, hora grande y estado. */
export function BookingCard({ b, state, onClick, actions }) {
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const st = effStatus(b), live = ['pending', 'deposit_paid', 'confirmed'].includes(st)
  return (
    <div className="rounded-2xl bg-surface border border-line overflow-hidden card-lift" style={{ boxShadow: `inset 4px 0 0 ${ACCENT[st]}, var(--sh-1)` }}>
    <button type="button" onClick={onClick} className="w-full text-left flex items-stretch active:opacity-90 transition-opacity">
      <Cover src={complex?.coverUrl} seed={complex?.id || b.id} className="w-24 flex-none ml-1" />
      <span className="flex-1 min-w-0 p-3.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="display text-2xl font-bold tnum leading-none">{b.time}</span>
          {live ? <span className="text-xs font-semibold text-brand bg-brand-soft rounded-full px-2.5 py-1 whitespace-nowrap">{untilLabel(b)}</span> : null}
        </span>
        <span className="block text-sm text-muted mt-1">{/\d/.test(relativeDay(b.date)) ? relativeDay(b.date) : `${relativeDay(b.date)} · ${dateShort(b.date)}`}</span>
        <span className="block font-semibold truncate mt-1.5">{complex?.name}</span>
        <span className="flex items-center justify-between gap-2 mt-0.5"><span className="text-sm text-muted truncate">{court?.name} · {court?.sport}</span><BookingStatus booking={b} /></span>
      </span>
    </button>
    {actions && <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-line bg-[color-mix(in_srgb,var(--sunken)_55%,transparent)]">{actions}</div>}
    </div>
  )
}

/* Fila de reserva. `who` muestra el cliente (vista dueño/admin); si no, muestra el complejo. */
export function BookingRow({ b, state, onClick, who = false, showDate = true }) {
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const when = `${showDate ? `${relativeDay(b.date)} · ` : ''}${b.time}`
  return (
    <button type="button" className="row" onClick={onClick} style={{ boxShadow: `inset 4px 0 0 ${ACCENT[effStatus(b)]}` }}>
      {who && <Avatar name={b.playerName} size={40} />}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{who ? b.playerName : complex?.name}</div>
        <div className="text-sm text-muted truncate tnum">{when} · {court?.name || 'Cancha'}</div>
      </div>
      <div className="text-right flex-none">
        {who && <div className="font-semibold tnum">{money(b.totalCents)}</div>}
        <BookingStatus booking={b} />
        {who && effStatus(b) !== 'cancelled' && b.paidCents < b.totalCents && <div className="text-sm text-muted">{paymentLabel(b)}</div>}
      </div>
      <ChevronRight size={18} className="text-faint flex-none -mr-1" aria-hidden="true" />
    </button>
  )
}

/* Tira de días: scroll horizontal contenido dentro de su caja. */
export function DateStrip({ value, onChange, days = 21, from = todayISO() }) {
  const ref = useRef(null)
  const list = Array.from({ length: days }, (_, i) => { const d = new Date(`${from}T12:00:00`); d.setDate(d.getDate() + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })
  useEffect(() => { ref.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [value])
  return (
    <div ref={ref} className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="group" aria-label="Elegir día">
      {list.map(d => (
        <button key={d} type="button" aria-pressed={value === d} onClick={() => onChange(d)}
          className={cn('flex-none w-14 h-16 rounded-lg border flex flex-col items-center justify-center transition-colors',
            value === d ? 'bg-brand text-[var(--brand-ink)] border-brand' : 'bg-surface border-strong hover:bg-sunken')}>
          <span className={cn('text-xs font-medium', value !== d && 'text-muted')}>{d === todayISO() ? 'Hoy' : weekdayShort(d)}</span>
          <span className="text-lg font-semibold tnum leading-tight">{dayNum(d)}</span>
          <span className={cn('text-xs', value !== d && 'text-muted')}>{monthShort(d)}</span>
        </button>
      ))}
    </div>
  )
}
export { dateShort, courtsOf }
