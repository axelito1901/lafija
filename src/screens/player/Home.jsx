import { useMemo, useState } from 'react'
import { CalendarCheck, ChevronRight, LifeBuoy, Search } from 'lucide-react'
import { useEasy } from '../../lib/theme'
import { SUPPORT_WA } from '../../ui/Help'
import { useStore } from '../../lib/store'
import { nextTimes, balanceOf, effStatus, favsOf, getComplex, getCourt, isUpcoming, perPerson, publicComplexes, STATUS } from '../../lib/domain'
import { addDays, cn, waLink, dateLong, dayNum, money, relativeDay, todayISO, weekdayShort } from '../../lib/format'
import { useOrigin } from '../../lib/origin'
import { Link, navigate } from '../../lib/router'
import { Button, Content, Empty, PageHeader, Section } from '../../ui/kit'
import { complexView } from '../../ui/shared'
import { Item, Stagger } from '../../ui/motion'
import { BookingDetail, RateCard, ReviewSheet } from './flow'

/* Entrada de partido: lo primero que ve el jugador si tiene una reserva. */
function Ticket({ b, onOpen }) {
  const { state } = useStore()
  const c = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const st = effStatus(b), rest = balanceOf(b), each = perPerson(court, b.totalCents)
  return (
    <button type="button" onClick={onOpen} className="hero w-full text-left active:scale-[.985] transition-transform duration-200" aria-label={`Tu próximo partido: ${c.name}, ${relativeDay(b.date)} a las ${b.time}`}>
      <div className="p-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />Tu próximo partido</p>
        <div className="flex items-end justify-between gap-4 mt-2">
          <div className="min-w-0">
            <p className="display text-5xl font-bold leading-none tnum">{b.time}</p>
            <p className="mt-2 font-semibold">{relativeDay(b.date)}{b.date > todayISO() ? '' : ''} · {dateLong(b.date).split(', ')[1]}</p>
          </div>
          <div className="text-right min-w-0">
            <p className="display text-xl font-semibold leading-tight truncate">{c.name}</p>
            <p className="opacity-80 truncate">{court.name} · {court.sport}</p>
          </div>
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-current/25 mx-4" aria-hidden="true">
        <span className="absolute -left-7 -top-3 size-6 rounded-full bg-[var(--bg)]" /><span className="absolute -right-7 -top-3 size-6 rounded-full bg-[var(--bg)]" />
      </div>
      <div className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{STATUS[st].label}{rest > 0 && st !== 'pending' ? ` · resta ${money(rest)}` : ''}{each ? ` · ${money(each)} c/u` : ''}</span>
        <span className="font-semibold inline-flex items-center gap-1 flex-none">Ver<ChevronRight size={16} /></span>
      </div>
    </button>
  )
}

/* Inicio simple: tres botones grandes y nada más. */
function EasyHome({ user, next, onOpen, onRate }) {
  const big = 'w-full rounded-3xl p-5 flex items-center gap-4 text-left min-h-24 active:scale-[.98] transition-transform'
  return (
    <>
      <PageHeader logo />
      <Content className="max-w-[560px] lg:mx-0"><Stagger>
        <Item><p className="display text-3xl font-bold mb-5">Hola, {user.name.split(' ')[0]} 👋</p></Item>
        <Item><Link to="/buscar" data-tour="buscar" className={cn(big, 'bg-[image:var(--grad-brand)] text-[var(--on-grad)] shadow-[var(--sh-2)]')}><Search size={34} aria-hidden="true" /><span className="display text-2xl font-bold leading-tight">Reservar una cancha</span></Link></Item>
        {next && <Item className="mt-3"><Ticket b={next} onOpen={onOpen} /></Item>}
        <Item className="empty:hidden mt-3"><RateCard onRate={onRate} /></Item>
        <Item className="mt-3"><Link to="/reservas" className={cn(big, 'bg-surface border border-strong')}><CalendarCheck size={34} className="text-brand" aria-hidden="true" /><span className="display text-2xl font-bold leading-tight">Mis reservas</span></Link></Item>
        <Item className="mt-3"><a href={waLink(SUPPORT_WA, `Hola, necesito ayuda con La Fija. Soy ${user.name}.`)} target="_blank" rel="noreferrer" className={cn(big, 'bg-surface border border-strong')}><LifeBuoy size={34} className="text-brand" aria-hidden="true" /><span><span className="display text-2xl font-bold leading-tight block">Necesito ayuda</span><span className="text-muted">Te respondemos por WhatsApp</span></span></a></Item>
      </Stagger></Content>
    </>
  )
}

export default function PlayerHome() {
  const [easy] = useEasy()
  return easy ? <EasyWrap /> : <FullHome />
}
function EasyWrap() {
  const { state, user } = useStore()
  const [open, setOpen] = useState('')
  const [review, setReview] = useState(null)
  const [stars, setStars] = useState(0)
  const now = new Date()
  const next = state.bookings.filter(b => b.playerId === user.id && isUpcoming(b, now)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  return (
    <>
      <EasyHome user={user} next={next} onOpen={() => setOpen(next.id)} onRate={(b, n) => { setStars(n); setReview(b) }} />
      {open && <BookingDetail bookingId={open} onClose={() => setOpen('')} onReview={b => { setOpen(''); setReview(b) }} />}
      {review && <ReviewSheet booking={review} initialRating={stars} onClose={() => { setReview(null); setStars(0) }} />}
    </>
  )
}

function FullHome() {
  const { state, user } = useStore()
  const { origin } = useOrigin()
  const [open, setOpen] = useState('')
  const [review, setReview] = useState(null)
  const [stars, setStars] = useState(0)
  const now = new Date(), today = todayISO()

  const [day, setDay] = useState(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const mine = state.bookings.filter(b => b.playerId === user.id)
  const near = useMemo(() => publicComplexes(state).map(c => complexView(state, c, origin)).sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99))
    .map(c => ({ c, slots: nextTimes(state, c, day, 4, now) })).filter(x => x.slots.length).slice(0, 4), [state, day, origin]) // eslint-disable-line
  const next = mine.filter(b => isUpcoming(b, now)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  // Tus canchas: favoritas y donde ya jugaste, sin repetir (máximo 3)
  const lastCourt = {}
  for (const b of [...mine].sort((a, b) => a.date.localeCompare(b.date))) lastCourt[b.complexId] = b.courtId
  const yours = useMemo(() => {
    const ids = [...favsOf(state, user.id), ...[...mine].sort((a, b) => b.date.localeCompare(a.date)).map(b => b.complexId)]
    return [...new Set(ids)].map(id => publicComplexes(state).find(c => c.id === id)).filter(Boolean).slice(0, 3).map(c => complexView(state, c, origin))
  }, [state, origin]) // eslint-disable-line

  return (
    <>
      <PageHeader logo />
      <Content className="max-w-[640px] lg:mx-0"><Stagger>
        <Item><p className="display text-3xl font-bold mb-4">Hola, {user.name.split(' ')[0]} <span className="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span></p></Item>
        <Item className="empty:hidden mb-5"><RateCard onRate={(b, n) => { setStars(n); setReview(b) }} /></Item>
        {next && <Item className="mb-6"><Ticket b={next} onOpen={() => setOpen(next.id)} /></Item>}

        <section aria-labelledby="cuando">
          <h2 id="cuando" className="text-2xl">¿Cuándo querés jugar?</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-3 pb-1" role="group" aria-label="Día" data-tour="buscar">
            {days.map(d => (
              <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)}
                className={cn('flex-none min-w-16 h-14 px-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-200', day === d ? 'bg-[image:var(--grad-brand)] border-transparent text-[var(--on-grad)] shadow-[var(--sh-2)] scale-105' : 'bg-surface border-strong hover:bg-sunken')}>
                <span className="font-semibold leading-tight">{d === today ? 'Hoy' : d === addDays(today, 1) ? 'Mañana' : weekdayShort(d)}</span>
                <span className={cn('text-xs tnum', day !== d && 'text-muted')}>{dayNum(d)}/{Number(d.slice(5, 7))}</span>
              </button>))}
          </div>
          <div className="mt-4 space-y-3">
            {near.length === 0
              ? <div className="list"><Empty title={day === today ? 'Hoy ya no quedan horarios cerca' : 'No hay horarios libres ese día'} action={<Button variant="secondary" onClick={() => setDay(addDays(day, 1))}>Ver el día siguiente</Button>} /></div>
              : near.map(({ c, slots }) => (
                <Item key={c.id} className="border border-line rounded-2xl bg-surface p-4 shadow-[var(--sh-1)] card-lift">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link to={`/complejo/${c.slug}`} className="font-semibold text-lg leading-tight truncate inline-flex items-center min-h-11 -my-2.5">{c.name}</Link>
                    <span className="text-sm text-muted flex-none">{c.distanceLabel}</span>
                  </div>
                  <p className="text-sm text-muted truncate">{(c.tags || '').split(' · ').filter(t => t.startsWith('Fútbol')).join(' · ')} · desde {money(c.fromPrice)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">{slots.map(s2 => <Link key={s2.t} to={`/complejo/${c.slug}/reservar?fecha=${day}&cancha=${s2.courtId}&hora=${s2.t}`} className="chip !min-h-11 !px-3.5 tnum">{s2.t}</Link>)}
                    <Link to={`/complejo/${c.slug}/reservar?fecha=${day}`} className="chip !min-h-11 !px-3 !border-transparent text-brand">Más</Link></div>
                </Item>))}
          </div>
          <Button variant="secondary" className="w-full mt-3" onClick={() => navigate(`/buscar?fecha=${day}`)}><Search size={18} />Buscar por zona o en el mapa</Button>
        </section>

        {yours.length > 0 && (
          <Section title="Tus canchas" className="!mt-10">
            <div className="list">{yours.map(c => (
              <Link key={c.id} to={`/complejo/${c.slug}/reservar${lastCourt[c.id] ? `?cancha=${lastCourt[c.id]}` : ''}`} className="row">
                <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.name}</span><span className="block text-sm text-muted truncate">{c.city} · {c.distanceLabel}</span></span>
                <span className="text-brand font-semibold flex-none">Reservar</span><ChevronRight size={18} className="text-brand flex-none -mr-1" />
              </Link>))}</div>
          </Section>
        )}
      </Stagger></Content>
      {open && <BookingDetail bookingId={open} onClose={() => setOpen('')} onReview={b => { setOpen(''); setReview(b) }} />}
      {review && <ReviewSheet booking={review} initialRating={stars} onClose={() => { setReview(null); setStars(0) }} />}
    </>
  )
}
