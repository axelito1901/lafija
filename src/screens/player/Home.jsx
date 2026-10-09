import { useMemo, useState } from 'react'
import { ArrowRight, CalendarCheck, ChevronRight, Clock3, Flame, Goal, LifeBuoy, Search, Star, Trophy } from 'lucide-react'
import { useEasy } from '../../lib/theme'
import { SUPPORT_WA } from '../../ui/Help'
import { useStore } from '../../lib/store'
import { nextTimes, balanceOf, effStatus, favsOf, freeCount, getComplex, getCourt, isUpcoming, perPerson, playerStats, publicComplexes, ratingLabel, STATUS, trustOf } from '../../lib/domain'
import { addDays, cn, waLink, dateLong, dateShort, dayNum, money, relativeDay, todayISO, weekdayShort } from '../../lib/format'
import { useOrigin } from '../../lib/origin'
import { Link, navigate } from '../../lib/router'
import { Button, Content, Empty, PageHeader, Section } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { VerifiedBadge } from '../../ui/trust'
import { complexView, untilLabel } from '../../ui/shared'
import { CountUp, Item, Stagger } from '../../ui/motion'
import { BookingDetail, RateCard, ReviewSheet } from './flow'
import './jugador.css'

const whenWord = d => (d === todayISO() ? 'hoy' : d === addDays(todayISO(), 1) ? 'mañana' : dateShort(d))

/* Entrada de partido: lo primero que ve el jugador si tiene una reserva. */
function Ticket({ b, onOpen }) {
  const { state } = useStore()
  const c = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const st = effStatus(b), rest = balanceOf(b), each = perPerson(court, b.totalCents)
  return (
    <button type="button" onClick={onOpen} className="hero @container w-full text-left active:scale-[.985] transition-transform duration-200 lg:hover:-translate-y-0.5" aria-label={`Tu próximo partido: ${c.name}, ${relativeDay(b.date)} a las ${b.time}`}>
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />Tu próximo partido</p>
          <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-white/20 whitespace-nowrap">{untilLabel(b)}</span>
        </div>
        <div className="flex flex-col items-start gap-3 @[22rem]:flex-row @[22rem]:items-end @[22rem]:justify-between @[22rem]:gap-4 mt-2">
          <div className="min-w-0">
            <p className="display text-5xl font-bold leading-none tnum">{b.time}</p>
            <p className="mt-2 font-semibold">{relativeDay(b.date)} · {dateLong(b.date).split(', ')[1]}</p>
          </div>
          <div className="min-w-0 max-w-full @[22rem]:text-right">
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

/* Sin partido a la vista: invitación en lugar de un hueco. */
function NoMatch() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-strong p-6 text-center bg-[color-mix(in_srgb,var(--sunken)_55%,transparent)]">
      <span className="mx-auto grid place-items-center size-14 rounded-2xl bg-brand-soft text-brand float-y"><Goal size={28} strokeWidth={1.75} aria-hidden="true" /></span>
      <p className="display text-2xl font-bold mt-3">Todavía no tenés partido</p>
      <p className="text-muted mt-1">Reservá una cancha y juntá a los pibes.</p>
      <Button as={Link} to="/buscar" className="mt-4"><Search size={18} />Buscar cancha</Button>
    </div>
  )
}

/* Inicio simple: tres botones grandes y nada más. */
function EasyHome({ user, next, onOpen, onRate }) {
  const big = 'w-full rounded-3xl p-5 flex items-center gap-4 text-left min-h-24 active:scale-[.98] transition-transform'
  return (
    <>
      <PageHeader logo />
      <Content className="max-w-[560px] lg:max-w-[880px]"><Stagger>
        <Item><p className="display text-3xl lg:text-5xl font-bold mb-5">Hola, {user.name.split(' ')[0]} 👋</p></Item>
        <Item><Link to="/buscar" data-tour="buscar" className={cn(big, 'bg-[image:var(--grad-brand)] text-[var(--on-grad)] shadow-[var(--sh-2)]')}><Search size={34} aria-hidden="true" /><span className="display text-2xl font-bold leading-tight">Reservar una cancha</span></Link></Item>
        {next && <Item className="mt-3"><Ticket b={next} onOpen={onOpen} /></Item>}
        <Item className="empty:hidden mt-3"><RateCard onRate={onRate} /></Item>
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-3">
          <Item className="mt-3"><Link to="/reservas" className={cn(big, 'bg-surface border border-strong')}><CalendarCheck size={34} className="text-brand" aria-hidden="true" /><span className="display text-2xl font-bold leading-tight">Mis reservas</span></Link></Item>
          <Item className="mt-3"><a href={waLink(SUPPORT_WA, `Hola, necesito ayuda con La Fija. Soy ${user.name}.`)} target="_blank" rel="noreferrer" className={cn(big, 'bg-surface border border-strong')}><LifeBuoy size={34} className="text-brand" aria-hidden="true" /><span><span className="display text-2xl font-bold leading-tight block">Necesito ayuda</span><span className="text-muted">Te respondemos por WhatsApp</span></span></a></Item>
        </div>
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

/* Saludo grande para PC: fecha, frase según tu agenda y tus números. */
function Greeting({ first, next, stats, upcoming }) {
  const { state } = useStore()
  const c = next && getComplex(state, next.complexId)
  const items = [[stats.played, 'Partidos jugados', Trophy], [stats.thisStreak, 'Semanas seguidas', Flame], [upcoming, 'Reservas próximas', CalendarCheck]]
  return (
    <div className="hidden lg:flex items-end justify-between gap-8 mb-8">
      <div className="min-w-0">
        <p className="pj-eyebrow">{dateLong(todayISO())}</p>
        <h1 className="display text-5xl 2xl:text-6xl font-bold leading-[1.02] mt-1.5">Hola, {first} <span className="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span></h1>
        <p className="text-lg text-muted mt-2 max-w-xl">{next ? <>Tu próximo partido es <strong className="text-ink">{whenWord(next.date)} a las {next.time}</strong> en {c?.name}.</> : '¿Armamos el partido? Elegí día y horario y reservá en minutos.'}</p>
      </div>
      <div className="hidden xl:flex items-stretch rounded-2xl border border-line bg-surface shadow-[var(--sh-1)] divide-x divide-line flex-none">
        {items.map(([n, l, I]) => (
          <div key={l} className="px-6 py-3.5 min-w-[140px]">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted"><I size={15} className="text-brand" aria-hidden="true" />{l}</span>
            <p className="display text-4xl font-bold tnum leading-none mt-1.5"><CountUp value={String(n)} /></p>
          </div>))}
      </div>
    </div>
  )
}

/* Progreso hacia el próximo logro. */
const TARGET = { first: 1, p5: 5, p10: 10, p25: 25 }
function Pulse({ stats }) {
  const nb = stats.badges.find(b => !b.earned)
  const target = nb ? TARGET[nb.id] : null
  const pct = target ? Math.min(100, Math.round(stats.played / target * 100)) : 0
  const left = target ? Math.max(0, target - stats.played) : 0
  const nums = [[stats.played, 'Partidos'], [Math.round(stats.hours), 'Horas en cancha'], [stats.thisStreak, 'Semanas en racha']]
  return (
    <section aria-labelledby="tu-juego" className="pj-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="tu-juego" className="text-base font-semibold">Tu juego</h2>
        <Link to="/cuenta" className="text-sm font-semibold text-brand inline-flex items-center gap-1 min-h-11 -my-3">Ver perfil<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {nums.map(([n, l]) => <div key={l} className="min-w-0"><p className="display text-4xl font-bold tnum leading-none"><CountUp value={String(n)} /></p><p className="text-sm text-muted mt-1.5 leading-tight">{l}</p></div>)}
      </div>
      <div className="mt-5 pj-soft p-3.5">
        {nb ? (
          <>
            <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold inline-flex items-center gap-1.5"><Trophy size={16} className="text-brand" aria-hidden="true" />Próximo logro: {nb.title}</span>{target && <span className="text-muted tnum">{Math.min(stats.played, target)}/{target}</span>}</div>
            {target && <div className="pj-bar mt-2.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso hacia ${nb.title}`}><span style={{ width: `${Math.max(pct, 4)}%` }} /></div>}
            <p className="text-sm text-muted mt-2">{target ? (left > 0 ? `Jugá ${left === 1 ? '1 partido más' : `${left} partidos más`} y lo conseguís.` : `${nb.text}.`) : `${nb.text}.`}</p>
          </>
        ) : <p className="text-sm font-semibold inline-flex items-center gap-2"><Trophy size={16} className="text-brand" aria-hidden="true" />¡Tenés todos los logros!</p>}
      </div>
    </section>
  )
}

/* Tarjeta de "Lo más reservado". */
function PopularCard({ c, rank }) {
  return (
    <Link to={`/complejo/${c.slug}`} aria-label={`${c.name}, número ${rank} entre los más reservados`} className="group block rounded-2xl overflow-hidden bg-surface border border-line shadow-[var(--sh-1)] pj-lift">
      <div className="relative">
        <Cover src={c.coverUrl} seed={c.id} className="aspect-[4/3] [&>img]:transition-transform [&>img]:duration-700 group-hover:[&>img]:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        <span className={cn('absolute left-3 top-3 grid place-items-center min-w-9 h-9 px-2 rounded-full display text-lg font-bold tnum', rank === 1 ? 'bg-[var(--gold)] text-black' : 'bg-black/45 backdrop-blur-md text-white border border-white/20')} aria-hidden="true">{rank}</span>
        {c.fromPrice != null && <span className="absolute left-3 bottom-3 text-white font-semibold tnum text-sm bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">Desde {money(c.fromPrice)}</span>}
        {c.ratingCount > 0 && <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 text-white text-sm font-semibold bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1"><Star size={13} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" />{ratingLabel(c.rating)}</span>}
      </div>
      <div className="p-4">
        <p className="font-semibold text-lg leading-tight flex items-center gap-1.5 min-w-0"><span className="truncate">{c.name}</span>{c.verified && <VerifiedBadge label={false} className="flex-none" />}</p>
        <p className="text-sm text-muted truncate mt-0.5">{c.city}{c.distance != null ? ` · ${c.distanceLabel}` : ''}</p>
        <div className="flex items-center justify-between gap-2 mt-3 text-sm">
          <span className="text-muted"><strong className="text-ink tnum"><CountUp value={String(c.played)} /></strong> partidos</span>
          <span className="text-brand font-semibold inline-flex items-center gap-1">Ver<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
        </div>
      </div>
    </Link>
  )
}

function FullHome() {
  const { state, user } = useStore()
  const { origin } = useOrigin()
  const [open, setOpen] = useState('')
  const [review, setReview] = useState(null)
  const [stars, setStars] = useState(0)
  const now = new Date(), today = todayISO()

  const [picked, setDay] = useState('')
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const mine = state.bookings.filter(b => b.playerId === user.id)
  // Si hoy ya no queda nada, arrancamos en el primer día con horarios libres (se puede cambiar a mano).
  const autoDay = useMemo(() => days.find(d => publicComplexes(state).some(c => nextTimes(state, c, d, 1, now).length)) || today, [state, today]) // eslint-disable-line
  const day = picked || autoDay
  const near = useMemo(() => publicComplexes(state).map(c => complexView(state, c, origin)).sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99))
    .map(c => ({ c, slots: nextTimes(state, c, day, 4, now), free: freeCount(state, c, day, now) })).filter(x => x.slots.length).slice(0, 6), [state, day, origin]) // eslint-disable-line
  const next = mine.filter(b => isUpcoming(b, now)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const upcoming = mine.filter(b => isUpcoming(b, now)).length
  const stats = useMemo(() => playerStats(state, user.id), [state, user.id]) // eslint-disable-line
  // Tus canchas: favoritas y donde ya jugaste, sin repetir (máximo 3)
  const lastCourt = {}
  for (const b of [...mine].sort((a, b) => a.date.localeCompare(b.date))) lastCourt[b.complexId] = b.courtId
  const yours = useMemo(() => {
    const ids = [...favsOf(state, user.id), ...[...mine].sort((a, b) => b.date.localeCompare(a.date)).map(b => b.complexId)]
    return [...new Set(ids)].map(id => publicComplexes(state).find(c => c.id === id)).filter(Boolean).slice(0, 3).map(c => complexView(state, c, origin))
  }, [state, origin]) // eslint-disable-line
  // Lo más reservado: los complejos con más partidos jugados de verdad (sale de las reservas, no se carga a mano).
  const popular = useMemo(() => publicComplexes(state).map(c => ({ ...complexView(state, c, origin), played: trustOf(state, c.id).played }))
    .sort((a, b) => b.played - a.played || b.rating - a.rating).slice(0, 5), [state, origin]) // eslint-disable-line
  const first = user.name.split(' ')[0]

  return (
    <div className="pj-wide contents">
      <PageHeader logo />
      <Content className="max-w-[640px] md:max-w-[1120px] lg:max-w-[1480px]"><Stagger>
        <Item className="lg:hidden"><p className="display text-3xl font-bold mb-4">Hola, {first} <span className="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span></p></Item>
        <Item className="hidden lg:block"><Greeting first={first} next={next} stats={stats} upcoming={upcoming} /></Item>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] 2xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8 xl:gap-x-10 lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
        <Item className="empty:hidden mb-5"><RateCard onRate={(b, n) => { setStars(n); setReview(b) }} /></Item>
        <Item className="mb-6">{next ? <Ticket b={next} onOpen={() => setOpen(next.id)} /> : <NoMatch />}</Item>
        </div>
        <section aria-labelledby="cuando" className="lg:col-start-2 lg:row-start-1 lg:row-span-3">
          <h2 id="cuando" className="text-2xl lg:text-3xl">¿Cuándo querés jugar?</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-3 pb-1" role="group" aria-label="Día" data-tour="buscar">
            {days.map(d => (
              <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)}
                className={cn('flex-none lg:flex-1 min-w-16 h-14 lg:h-16 px-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-200', day === d ? 'bg-[image:var(--grad-brand)] border-transparent text-[var(--on-grad)] shadow-[var(--sh-2)] scale-105' : 'bg-surface border-strong hover:bg-sunken')}>
                <span className="font-semibold leading-tight">{d === today ? 'Hoy' : d === addDays(today, 1) ? 'Mañana' : weekdayShort(d)}</span>
                <span className={cn('text-xs tnum', day !== d && 'text-muted')}>{dayNum(d)}/{Number(d.slice(5, 7))}</span>
              </button>))}
          </div>
          <div className="mt-4 space-y-3 2xl:space-y-0 2xl:grid 2xl:grid-cols-2 2xl:gap-3">
            {near.length === 0
              ? <div className="list 2xl:col-span-2"><Empty icon={Clock3} title={day === today ? 'Hoy ya no quedan horarios cerca' : 'No hay horarios libres ese día'} action={<Button variant="secondary" onClick={() => setDay(addDays(day, 1))}>Ver el día siguiente</Button>} /></div>
              : near.map(({ c, slots, free }, i) => (
                <Item key={c.id} className={cn('border border-line rounded-2xl bg-surface p-4 shadow-[var(--sh-1)] card-lift', i >= 4 && 'max-2xl:hidden')}>
                  <div className="flex items-start gap-3">
                    <Link to={`/complejo/${c.slug}`} tabIndex={-1} aria-hidden="true" className="flex-none"><Cover src={c.coverUrl} seed={c.id} className="size-16 lg:size-[72px] rounded-xl" /></Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link to={`/complejo/${c.slug}`} className="font-semibold text-lg leading-tight truncate inline-flex items-center gap-1.5 min-h-11 -my-2.5">{c.name}{c.verified && <VerifiedBadge label={false} />}</Link>
                        <span className="text-sm text-muted flex-none">{c.distanceLabel}</span>
                      </div>
                      <p className="text-sm text-muted truncate inline-flex items-center gap-2 max-w-full">
                        {c.ratingCount > 0 && <span className="inline-flex items-center gap-1 text-ink font-medium flex-none"><Star size={13} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" />{ratingLabel(c.rating)}</span>}
                        <span className="truncate">{(c.tags || '').split(' · ').filter(t => t.startsWith('Fútbol')).join(' · ')}</span>
                      </p>
                      <p className="text-sm text-muted">desde {money(c.fromPrice)} · <span className="text-brand font-medium">{free} {free === 1 ? 'libre' : 'libres'}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">{slots.map(s2 => <Link key={s2.t} to={`/complejo/${c.slug}/reservar?fecha=${day}&cancha=${s2.courtId}&hora=${s2.t}`} className="chip !min-h-11 !px-3.5 tnum">{s2.t}</Link>)}
                    <Link to={`/complejo/${c.slug}/reservar?fecha=${day}`} className="chip !min-h-11 !px-3 !border-transparent !shadow-none text-brand">Más</Link></div>
                </Item>))}
          </div>
          <Button variant="secondary" className="w-full mt-3" onClick={() => navigate(`/buscar?fecha=${day}`)}><Search size={18} />Buscar por zona o en el mapa</Button>
        </section>

        {yours.length > 0 && (
          <Section title="Tus canchas" className="!mt-10 lg:!mt-2 lg:mb-6 lg:col-start-1 lg:row-start-2">
            <div className="list">{yours.map(c => (
              <Link key={c.id} to={`/complejo/${c.slug}/reservar${lastCourt[c.id] ? `?cancha=${lastCourt[c.id]}` : ''}`} className="row">
                <Cover src={c.coverUrl} seed={c.id} className="size-12 rounded-xl flex-none" />
                <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.name}</span><span className="block text-sm text-muted truncate">{c.city} · {c.distanceLabel}</span></span>
                <span className="text-brand font-semibold flex-none">Reservar</span><ChevronRight size={18} className="text-brand flex-none -mr-1" />
              </Link>))}</div>
          </Section>
        )}

        <div className="mt-8 lg:mt-0 lg:col-start-1 lg:row-start-3"><Item><Pulse stats={stats} /></Item></div>
      </div>

        {popular.length > 0 && (
          <section aria-labelledby="top" className="mt-10 lg:mt-14">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div className="min-w-0"><h2 id="top" className="text-2xl lg:text-3xl">Lo más reservado</h2><p className="text-muted text-sm lg:text-base mt-0.5">Donde más se juega en La Fija, según partidos reales.</p></div>
              <Link to="/buscar" className="btn btn-link flex-none">Ver todos<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="pj-rail lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 lg:[&>*:nth-child(5)]:hidden 2xl:[&>*:nth-child(5)]:block">
              {popular.map((c, i) => <PopularCard key={c.id} c={c} rank={i + 1} />)}
            </div>
          </section>
        )}
      </Stagger></Content>
      {open && <BookingDetail bookingId={open} onClose={() => setOpen('')} onReview={b => { setOpen(''); setReview(b) }} />}
      {review && <ReviewSheet booking={review} initialRating={stars} onClose={() => { setReview(null); setStars(0) }} />}
    </div>
  )
}
