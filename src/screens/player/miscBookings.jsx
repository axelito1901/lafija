import { useEffect, useMemo, useRef, useState } from 'react'
import { m as motion } from 'motion/react'
import { BellRing, CalendarCheck, CalendarPlus, CalendarX, ChevronRight, Clock, Goal, Hourglass, MapPin, Repeat, Search, Star, Ticket, Wallet, X } from 'lucide-react'
import { addDays, cn, dateLong, dateShort, fromISO, mapsLink, mondayOf, money, monthStart, plural, relativeDay, slotEnd, toISO, todayISO } from '../../lib/format'
import { CountUp, Item, Stagger, spring } from '../../ui/motion'
import { useStore } from '../../lib/store'
import { STATUS, balanceOf, bookingStart, effStatus, getComplex, getCourt, isUpcoming, leaveWaitlist, paymentLabel, playedBookings, playerStats, rebookLink, rebookTarget, reviewOf } from '../../lib/domain'
import { downloadICS } from '../../lib/calendar'
import { navigate, useRoute } from '../../lib/router'
import { Button, Content, Empty, IconButton, PageHeader, Segmented, useToast } from '../../ui/kit'
import { BookingCard } from '../../ui/shared'
import { Cover } from '../../ui/Cover'
import { BookingDetail, RateCard, ReviewSheet } from './flow'
import './misc.css'

/* ---------- Utilidades ---------- */
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
const monthName = iso => cap(new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(fromISO(iso)))
const shiftMonth = (iso, n) => { const d = fromISO(monthStart(iso)); d.setMonth(d.getMonth() + n); return toISO(d) }
const byWhenAsc = (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
const byWhenDesc = (a, b) => (b.date + b.time).localeCompare(a.date + a.time)

/* Cuánto falta, en la unidad que mejor se entiende. */
function countdown(ms) {
  if (ms <= 0) return null
  const m = Math.ceil(ms / 60000)
  if (m < 60) return { n: m, unit: m === 1 ? 'minuto' : 'minutos' }
  const h = Math.round(m / 60)
  if (h < 48) return { n: h, unit: h === 1 ? 'hora' : 'horas' }
  return { n: Math.round(h / 24), unit: 'días' }
}

/* Número de ticket corto y estable, sale del id de la reserva. */
const codeOf = id => [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)

/* Código de barras decorativo, siempre igual para la misma reserva. */
function Bars({ seed }) {
  let x = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11)
  const bars = Array.from({ length: 26 }, () => { x = (x * 1664525 + 1013904223) >>> 0; return 1 + ((x >>> 28) % 3) })
  return <div className="pm-bars" aria-hidden="true">{bars.map((w, i) => <i key={i} style={{ width: w }} />)}</div>
}

function useAddToCalendar() {
  const { state } = useStore()
  const toast = useToast()
  return b => {
    const c = getComplex(state, b.complexId), ct = getCourt(state, b.courtId)
    if (!c) return
    downloadICS({ title: `Fútbol en ${c.name}`, date: b.date, time: b.time, minutes: b.durationMin || 60, place: `${c.name}, ${c.address}`, description: `${ct?.name || 'Cancha'}${ct?.sport ? ` · ${ct.sport}` : ''}` })
    toast('Listo: bajó el evento para tu calendario.')
  }
}

/* ---------- Próximo partido: entrada de partido ---------- */
function NextTicket({ b, state, onOpen, onCalendar }) {
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const st = effStatus(b), rest = balanceOf(b)
  const left = countdown(bookingStart(b) - new Date())
  const pending = st === 'pending'
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} aria-label="Tu próximo partido" className="pm-ticket-wrap">
      <div className="pm-ticket">
        <div className="p-7 xl:p-8 flex flex-col gap-5 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 pm-eyebrow opacity-95"><span className="live-dot" aria-hidden="true" />Próximo partido</span>
            <span className="pm-glass"><i className="size-2 rounded-full" style={{ background: pending ? 'var(--gold)' : '#fff' }} aria-hidden="true" />{STATUS[st].label}</span>
          </div>
          <div>
            <div className="flex items-end gap-3"><span className="display text-7xl font-bold tnum leading-[.9] tracking-tight">{b.time}</span><span className="pb-1.5 text-lg opacity-85 tnum">a {slotEnd(b.time, b.durationMin || 60)}</span></div>
            <p className="display text-2xl font-semibold mt-2.5">{dateLong(b.date)}</p>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center size-11 rounded-2xl flex-none bg-white/18 border border-white/25" aria-hidden="true"><Goal size={22} /></span>
            <div className="min-w-0"><p className="font-semibold text-lg leading-tight truncate">{complex?.name}</p><p className="text-sm opacity-85 truncate">{court?.name} · {court?.sport}{complex?.address ? ` · ${complex.address}` : ''}</p></div>
          </div>
          <p className="inline-flex items-center gap-2 text-sm opacity-95 tnum"><Wallet size={16} aria-hidden="true" />{rest > 0 && !pending ? `Resta ${money(rest)} en la cancha` : paymentLabel(b)}</p>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button type="button" className="pm-tbtn pm-tbtn-solid" onClick={onOpen}><Ticket size={18} aria-hidden="true" />{pending ? 'Ver y pagar' : 'Ver reserva'}</button>
            <a className="pm-tbtn" href={mapsLink(complex)} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden="true" />Cómo llegar</a>
            <button type="button" className="pm-tbtn col-span-2" onClick={onCalendar}><CalendarPlus size={18} aria-hidden="true" />Agregar a mi calendario</button>
          </div>
        </div>
        <div className="pm-stub">
          <Cover src={complex?.coverUrl} seed={complex?.id || b.id} />
          <div>
            <p className="pm-eyebrow opacity-90">{left ? 'Faltan' : 'Ahora'}</p>
          </div>
          {left
            ? <div><p className="display text-6xl font-bold tnum leading-none"><CountUp value={left.n} /></p><p className="text-base font-semibold mt-1">{left.unit}</p></div>
            : <div><span className="mx-auto grid place-items-center size-14 rounded-full bg-white/20 border border-white/30"><Goal size={28} aria-hidden="true" /></span><p className="display text-2xl font-bold mt-2">¡A jugar!</p></div>}
          <div className="w-full">
            <Bars seed={b.id} />
            <p className="text-[11px] tracking-[.2em] uppercase opacity-80 mt-1.5 tnum">N.º {codeOf(b.id)}</p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

/* Sin partidos a la vista: un empujón para reservar. */
function NoNext({ lastPlayed, state }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} aria-label="Sin partidos próximos" className="pm-card-soft relative overflow-hidden p-7 xl:p-8 flex items-center gap-6">
      <span className="pm-ico is-grad !size-[72px] !rounded-3xl pm-heart-float relative"><Goal size={34} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="pm-eyebrow text-brand">Sin partidos a la vista</p>
        <p className="display text-3xl font-bold leading-tight mt-1">¿Armamos el próximo?</p>
        <p className="text-muted mt-1">Elegí cancha y horario en menos de un minuto.</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-end flex-none">
        <Button onClick={() => navigate('/buscar')}><Search size={18} aria-hidden="true" />Buscar cancha</Button>
        {lastPlayed && <Button variant="secondary" onClick={() => navigate(rebookLink(state, lastPlayed))}><Repeat size={18} aria-hidden="true" />Repetir el último</Button>}
      </div>
    </motion.section>
  )
}

/* ---------- Tu mes: calendario + resumen ---------- */
function MonthPanel({ mine, month, setMonth, marks, selected, onPick }) {
  const now = new Date(), today = todayISO()
  const lead = (fromISO(month).getDay() + 6) % 7
  const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => `${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)]
  const inMonth = mine.filter(b => b.date.startsWith(month.slice(0, 7)))
  const played = inMonth.filter(b => effStatus(b, now) === 'completed'), coming = inMonth.filter(b => isUpcoming(b, now))
  const hours = Math.round(played.reduce((t, b) => t + (b.durationMin || 60) / 60, 0))
  const spent = [...played, ...coming].reduce((t, b) => t + (b.paidCents || 0), 0)
  const isNow = month === monthStart(today)
  const stats = [[CalendarCheck, 'Jugados', played.length], [Clock, 'Horas', hours], [Wallet, 'Gasto', money(spent)]]
  return (
    <section className="pm-card p-4 lg:p-5" aria-label="Tu mes">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="pm-eyebrow text-brand">Tu mes</p>
          <h2 className="display text-2xl font-bold leading-tight truncate">{monthName(month)} <span className="text-muted font-semibold">{month.slice(0, 4)}</span></h2>
        </div>
        <div className="flex items-center -mr-2">
          {!isNow && <button type="button" className="text-sm font-semibold text-brand px-2 min-h-11" onClick={() => setMonth(monthStart(today))}>Hoy</button>}
          <IconButton label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronRight size={20} className="rotate-180" /></IconButton>
          <IconButton label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={20} /></IconButton>
        </div>
      </div>
      <div className="pm-cal" role="group" aria-label={`Calendario de ${monthName(month)} ${month.slice(0, 4)}`}>
        {DOW.map((d, i) => <span key={i} className="pm-dow" aria-hidden="true">{d}</span>)}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`b${i}`} aria-hidden="true" />
          const mk = marks[iso], n = Number(iso.slice(8))
          const cls = cn('pm-day', iso === today && 'is-today', iso < today && !mk && 'is-past', mk?.played && !mk?.next && 'is-played', mk?.next && 'is-next', mk?.played && mk?.next && 'is-both', selected === iso && 'is-sel')
          if (!mk) return <span key={iso} className={cls}>{n}</span>
          const parts = [mk.played && `${plural(mk.played, 'partido jugado', 'partidos jugados')}`, mk.next && `${plural(mk.next, 'reserva próxima', 'reservas próximas')}`].filter(Boolean).join(' y ')
          return <button key={iso} type="button" className={cls} aria-pressed={selected === iso} aria-label={`${dateLong(iso)}: ${parts}`} onClick={() => onPick(iso)}>{n}{!!(mk.played && mk.next) && <i className="pm-pip" aria-hidden="true" />}</button>
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted mt-3" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="pm-dot bg-brand-soft border border-[var(--brand)]" />Jugado</span>
        <span className="inline-flex items-center gap-1.5"><i className="pm-dot bg-[image:var(--grad-brand)]" />Próximo</span>
        <span className="inline-flex items-center gap-1.5"><i className="pm-dot border border-[var(--line-strong)]" />Hoy</span>
      </div>
      <div className="grid grid-cols-3 mt-4 pt-4 border-t border-line" key={month}>
        {stats.map(([I, k, v]) => (
          <div key={k} className="text-center min-w-0 px-1">
            <I size={17} className="mx-auto text-brand" aria-hidden="true" />
            <div className="display text-xl lg:text-2xl font-bold tnum mt-1 truncate"><CountUp value={v} /></div>
            <div className="text-xs text-muted">{k}</div>
          </div>))}
      </div>
      <p className="text-sm text-muted text-center mt-3 min-h-5">{coming.length > 0 ? `Y ${plural(coming.length, 'partido más', 'partidos más')} por jugar este mes` : played.length === 0 ? 'Sin partidos este mes' : ' '}</p>
    </section>
  )
}

/* ---------- Reservar de nuevo ---------- */
function RebookCard({ state, user }) {
  const stats = useMemo(() => playerStats(state, user.id), [state, user.id])
  const played = useMemo(() => playedBookings(state, user.id), [state, user.id])
  const base = (stats.favoriteComplex && played.find(b => b.complexId === stats.favoriteComplex.id)) || played[0]
  const target = useMemo(() => (base ? rebookTarget(state, base) : null), [state, base])
  const complex = target?.complex
  if (!base || !complex) {
    return (
      <section className="pm-card-soft p-5" aria-label="Reservar">
        <span className="pm-ico is-grad"><Goal size={20} aria-hidden="true" /></span>
        <p className="display text-xl font-bold mt-3">Tu primer partido</p>
        <p className="text-sm text-muted mt-0.5">Buscá una cancha cerca y reservá en un toque.</p>
        <Button className="w-full mt-4" onClick={() => navigate('/buscar')}><Search size={18} aria-hidden="true" />Buscar cancha</Button>
      </section>
    )
  }
  return (
    <section className="pm-card overflow-hidden" aria-label="Reservar de nuevo">
      <div className="relative">
        <Cover src={complex.coverUrl} seed={complex.id} className="h-24" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-4 right-4 bottom-3 text-white min-w-0">
          <p className="text-[11px] font-bold tracking-[.14em] uppercase opacity-90">Tu cancha de siempre</p>
          <p className="display text-xl font-bold leading-tight truncate">{complex.name}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted">
          {target.free
            ? <>Tu horario de siempre está libre el <strong className="text-ink">{dateShort(target.date)} a las {base.time}</strong>.</>
            : <>Elegí un horario nuevo en {complex.name}.</>}
        </p>
        <Button className="w-full mt-3" onClick={() => navigate(rebookLink(state, base))}><Repeat size={18} aria-hidden="true" />Reservar de nuevo</Button>
      </div>
    </section>
  )
}

/* ---------- Lista de espera ---------- */
function WaitCard({ w, state, update }) {
  const c = state.complexes.find(x => x.id === w.complexId), ct = state.courts.find(x => x.id === w.courtId)
  const freed = !!w.notifiedAt
  return (
    <div className={cn('rounded-2xl border p-4 flex items-center gap-4', freed ? 'pm-card-soft' : 'pm-card')}>
      <span className={cn('pm-ico relative', freed ? 'is-grad' : 'is-sunken')}>{freed && <i className="pm-pulse-ring" aria-hidden="true" />}{freed ? <BellRing size={20} aria-hidden="true" /> : <Hourglass size={20} aria-hidden="true" />}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{c?.name}</p>
        <p className="text-sm text-muted truncate tnum">{relativeDay(w.date)} · {w.time} · {ct?.name}</p>
        <p className={cn('text-sm', freed ? 'text-brand font-semibold' : 'text-warn')}>{freed ? '¡Se liberó!' : 'Esperando que se libere'}</p>
      </div>
      {freed
        ? <Button size="sm" onClick={() => navigate(`/complejo/${c.slug}/reservar?fecha=${w.date}&cancha=${w.courtId}&hora=${w.time}`)}>Reservar</Button>
        : <Button size="sm" variant="ghost" onClick={() => update(s => leaveWaitlist(s, w.id))}>Quitar</Button>}
    </div>
  )
}

/* ---------- Agrupar la lista ---------- */
function group(list, tab) {
  const today = todayISO(), weekEnd = addDays(mondayOf(today), 6), out = []
  for (const b of list) {
    const label = tab === 'next' ? (b.date === today ? 'Hoy' : b.date <= weekEnd ? 'Esta semana' : 'Más adelante') : `${monthName(b.date)} ${b.date.slice(0, 4)}`
    const last = out[out.length - 1]
    if (last?.label === label) last.items.push(b); else out.push({ label, items: [b] })
  }
  return out
}

/* ---------- Pantalla ---------- */
export function PlayerBookings() {
  const { state, user, update } = useStore()
  const [tab, setTab] = useState('next')
  const [day, setDay] = useState(null)
  const [month, setMonth] = useState(() => monthStart(todayISO()))
  const [open, setOpen] = useState('')
  const [review, setReview] = useState(null)
  const [stars, setStars] = useState(0)
  const { query } = useRoute()
  const listRef = useRef(null)
  const addToCalendar = useAddToCalendar()
  const now = new Date()
  const mine = useMemo(() => state.bookings.filter(b => b.playerId === user.id), [state.bookings, user.id])
  // Llegó desde el aviso "¿Cómo estuvo el partido?": abrir la reseña directamente.
  useEffect(() => {
    if (!query.calificar) return
    const b = state.bookings.find(x => x.id === query.calificar && x.playerId === user.id)
    if (b && !reviewOf(state, b.id)) setReview(b)
    else if (b) { setTab('past'); setOpen(b.id) }
    navigate('/reservas', { replace: true })
  }, [query.calificar]) // eslint-disable-line
  const next = mine.filter(b => isUpcoming(b, now)).sort(byWhenAsc)
  const past = mine.filter(b => !isUpcoming(b, now)).sort(byWhenDesc)
  const waits = (state.waitlist || []).filter(w => w.playerId === user.id && w.date >= todayISO()).sort(byWhenAsc)
  const freed = waits.filter(w => w.notifiedAt)
  useEffect(() => { if (tab === 'wait' && !waits.length) setTab('next') }, [tab, waits.length])
  const marks = useMemo(() => {
    const m = {}, t = new Date()
    for (const b of mine) { const k = isUpcoming(b, t) ? 'next' : effStatus(b, t) === 'completed' ? 'played' : null; if (k) (m[b.date] ||= { next: 0, played: 0 })[k]++ }
    return m
  }, [mine])
  const featured = next[0]
  const lastPlayed = playedBookings(state, user.id, now)[0]
  const base = tab === 'wait' ? [] : tab === 'next' ? next : past
  const list = day ? base.filter(b => b.date === day) : base
  const groups = group(list, tab)
  const hideOnPc = b => tab === 'next' && !day && b.id === featured?.id
  const pcItems = list.filter(b => !hideOnPc(b))
  const multi = groups.length > 1 && list.length > 3, multiPc = groups.filter(g => !g.items.every(hideOnPc)).length > 1 && pcItems.length > 3
  const pickDay = iso => {
    if (day === iso) { setDay(null); return }
    setDay(iso); setTab(marks[iso]?.next ? 'next' : 'past')
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const options = [{ value: 'next', label: `Próximas (${next.length})` }, { value: 'past', label: `Historial (${past.length})` }, ...(waits.length ? [{ value: 'wait', label: `En espera (${waits.length})` }] : [])]
  const actionsFor = (b, done, rv) => {
    if (tab === 'past') return done && <>
      {rv ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted flex-1"><Star size={16} className="fill-[var(--gold)] text-[var(--gold)]" />Calificaste {rv.rating}/5</span> : <Button size="sm" variant="secondary" onClick={() => { setStars(0); setReview(b) }}><Star size={16} />Calificar</Button>}
      <Button size="sm" className={rv ? '' : 'ml-auto'} onClick={() => navigate(rebookLink(state, b))}>Volver a jugar</Button></>
    const c = getComplex(state, b.complexId)
    return <>
      {effStatus(b) === 'pending' && <Button size="sm" onClick={() => setOpen(b.id)}>Pagar</Button>}
      <Button size="sm" variant="ghost" onClick={() => addToCalendar(b)} aria-label={`Agregar a mi calendario: ${c?.name} ${relativeDay(b.date)} ${b.time}`}><CalendarPlus size={16} aria-hidden="true" />Calendario</Button>
      <Button as="a" size="sm" variant="ghost" href={mapsLink(c)} target="_blank" rel="noreferrer"><MapPin size={16} aria-hidden="true" />Cómo llegar</Button>
    </>
  }
  return (
    <>
      <PageHeader title="Mis reservas" />
      <Content>
        <div className="pm-bk">
          <div className="pm-bk-hero">
            {featured ? <NextTicket b={featured} state={state} onOpen={() => setOpen(featured.id)} onCalendar={() => addToCalendar(featured)} /> : <NoNext lastPlayed={lastPlayed} state={state} />}
          </div>

          <div className="pm-bk-main space-y-4">
            {tab === 'next' && <RateCard onRate={(b, n) => { setStars(n); setReview(b) }} />}
            {tab === 'next' && freed.length > 0 && (
              <button type="button" onClick={() => setTab('wait')} className="pm-card-soft w-full text-left p-4 flex items-center gap-3 min-h-14">
                <span className="pm-ico is-grad flex-none"><BellRing size={20} aria-hidden="true" /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold">{freed.length === 1 ? '¡Se liberó un horario!' : `¡Se liberaron ${freed.length} horarios!`}</span><span className="block text-sm text-muted truncate">Tocá para reservarlo antes de que se ocupe.</span></span>
                <ChevronRight size={18} className="text-brand flex-none" aria-hidden="true" />
              </button>)}

            <div ref={listRef} className="scroll-mt-20 lg:scroll-mt-6 space-y-4">
            <Segmented scrollTop={!window.matchMedia('(min-width: 1024px)').matches} value={tab} onChange={v => { setTab(v); setDay(null) }} label="Reservas" options={options} />
            {day && (
              <div className="flex items-center gap-2">
                <button type="button" className="chip !min-h-11" aria-pressed="true" onClick={() => setDay(null)} aria-label={`Quitar el filtro del ${dateLong(day)}`}>{dateLong(day)}<X size={16} aria-hidden="true" /></button>
                <span className="text-sm text-muted">{plural(list.length, 'reserva', 'reservas')}</span>
              </div>)}
            </div>

            <h2 className="sr-only">Reservas</h2>
            <div>
              {tab === 'wait'
                ? <Stagger key="wait" className="space-y-3">{waits.map(w => <Item key={w.id}><WaitCard w={w} state={state} update={update} /></Item>)}</Stagger>
                : list.length === 0
                  ? <div className={cn(tab === 'next' && !day && 'lg:hidden')}><Empty icon={day ? CalendarX : tab === 'next' ? CalendarX : CalendarCheck} title={day ? 'No hay reservas ese día' : tab === 'next' ? 'No tenés reservas próximas' : 'Todavía no jugaste'} text={day ? 'Tocá otro día marcado en el calendario.' : tab === 'next' ? 'Buscá una cancha y reservá un horario.' : 'Cuando juegues, tus partidos aparecen acá.'} action={!day && tab === 'next' && <Button onClick={() => navigate('/buscar')}>Buscar cancha</Button>} /></div>
                  : <Stagger key={`${tab}-${day}`} className="space-y-5">
                      {groups.map(g => {
                        const allHidden = g.items.every(hideOnPc)
                        return (
                          <section key={g.label} className={cn(allHidden && 'lg:hidden')} aria-label={g.label}>
                            <h3 className={cn('items-center gap-3 mb-2.5 pm-eyebrow text-muted', multi ? 'flex' : 'hidden', multiPc ? 'lg:flex' : 'lg:hidden')}><span>{g.label}</span><span className="h-px flex-1 bg-line" aria-hidden="true" /><span className="tnum">{g.items.length}</span></h3>
                            <div className="space-y-3">{g.items.map(b => {
                              const done = tab === 'past' && effStatus(b, now) === 'completed', rv = done && reviewOf(state, b.id)
                              return <Item key={b.id} className={cn(hideOnPc(b) && 'lg:hidden')}><BookingCard b={b} state={state} onClick={() => setOpen(b.id)} actions={actionsFor(b, done, rv)} /></Item>
                            })}</div>
                          </section>)
                      })}
                    </Stagger>}
              {tab === 'next' && !day && next.length === 1 && (
                <div className="hidden lg:flex items-center gap-4 rounded-2xl border border-dashed border-[var(--line-strong)] p-5 mt-1">
                  <span className="pm-ico is-sunken"><CalendarPlus size={20} aria-hidden="true" /></span>
                  <p className="flex-1 min-w-0"><span className="block font-semibold">Tu próximo partido es el de arriba</span><span className="block text-sm text-muted">¿Sumás otro durante la semana?</span></p>
                  <Button variant="secondary" onClick={() => navigate('/buscar')}>Buscar cancha</Button>
                </div>)}
            </div>
          </div>

          <aside className="pm-bk-side pm-sticky" aria-label="Resumen">
            <MonthPanel mine={mine} month={month} setMonth={setMonth} marks={marks} selected={day} onPick={pickDay} />
            <RebookCard state={state} user={user} />
          </aside>
        </div>
      </Content>
      {open && <BookingDetail bookingId={open} onClose={() => setOpen('')} onReview={b => { setOpen(''); setReview(b) }} />}
      {review && <ReviewSheet booking={review} initialRating={stars} onClose={() => { setReview(null); setStars(0) }} />}
    </>
  )
}
