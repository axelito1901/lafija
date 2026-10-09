import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Lightbulb, Umbrella } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Cover } from '../../ui/Cover'
import { Item, Stagger, spring } from '../../ui/motion'
import { useStore } from '../../lib/store'
import { joinWaitlist, leaveWaitlist, perPerson, activeCourts, freeCount, freeSlots, getComplex, priceFor, publicComplexes, quote, slotInfo, slotsFor, SPORTS } from '../../lib/domain'
import { isApproved } from '../../lib/domain'
import { addDays, cn, dateLong, money, relativeDay, slotMoment, todayISO } from '../../lib/format'
import { useOrigin } from '../../lib/origin'
import { Link, navigate, useRoute } from '../../lib/router'
import { Button, Chip, Content, Empty, PageHeader, Sheet, useToast } from '../../ui/kit'
import { BellRing } from 'lucide-react'
import { DateField } from '../../ui/DateField'
import { complexView } from '../../ui/shared'
import { BookSheet, ConfirmedSheet } from './flow'

const STEPS = ['Día', 'Cancha', 'Horario', 'Confirmar']
const PARTS = [['Mañana', t => t < '12:00'], ['Tarde', t => t >= '12:00' && t < '18:00'], ['Noche', t => t >= '18:00' || t < '06:00']]

function Progress({ step }) {
  return (
    <div className="mb-6" aria-label={`Paso ${step + 1} de 4`}>
      <div className="flex gap-1.5" aria-hidden="true">{STEPS.map((_, i) => (
        <span key={i} className="relative h-1.5 flex-1 rounded-full bg-strong overflow-hidden">
          <motion.span className="absolute inset-0 rounded-full bg-[image:var(--grad-brand)] origin-left" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
        </span>))}</div>
      <p className="text-sm text-muted mt-2">Paso {step + 1} de 4 · <span className="font-semibold text-ink">{STEPS[step]}</span></p>
    </div>
  )
}

/* Cada paso entra deslizando desde la derecha (o la izquierda al volver). */
function StepView({ k, dir, children }) {
  return <motion.div key={k} initial={{ opacity: 0, x: dir * 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: .26, ease: [.2, .8, .2, 1] }}>{children}</motion.div>
}

/* Reserva guiada: una pregunta por pantalla. */
export default function Wizard({ id, inShell = true }) {
  const { state, user } = useStore()
  const { query } = useRoute()
  const complex = getComplex(state, id)
  const today = todayISO()
  const courts = complex ? activeCourts(state, complex.id) : []
  const single = courts.length === 1
  const [date, setDate] = useState(query.fecha >= today ? query.fecha : '')
  const [courtId, setCourtId] = useState(query.cancha || (single ? courts[0]?.id : '') || '')
  const [time, setTime] = useState(query.hora || '')
  const [step, setStep] = useState(() => (!date ? 0 : !courtId ? 1 : 2))
  const [book, setBook] = useState(false)
  const [doneId, setDoneId] = useState('')
  const [wait, setWait] = useState('')
  const [dir, setDir] = useState(1)
  const prev = useRef(step)
  const now = new Date()
  useEffect(() => { setDir(step >= prev.current ? 1 : -1); prev.current = step; window.scrollTo({ top: 0, behavior: 'instant' }) }, [step])

  if (!complex || !complex.active || !complex.public || !isApproved(complex)) return <><PageHeader back="history" title="Reservar" /><Content><Empty title="Este complejo no está disponible" action={<Button onClick={() => navigate('/buscar')}>Buscar otra cancha</Button>} /></Content></>
  const court = courts.find(c => c.id === courtId)
  const valid = court && date && time && slotInfo(state, complex, court, date, time, now).kind === 'free'
  const back = () => { if (step === 2 && single) setStep(0); else if (step > 0) setStep(step - 1); else window.history.length > 1 ? window.history.back() : navigate(`/complejo/${complex.slug}`) }
  const pickDate = d => { setDate(d); setTime(''); setStep(single ? 2 : 1) }
  const go = () => {
    if (!user) { navigate(`/ingresar?volver=${encodeURIComponent(`/complejo/${complex.slug}/reservar?fecha=${date}&cancha=${courtId}&hora=${time}`)}`); return }
    setBook(true)
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const q = valid ? quote(state, court, date, time, user?.id) : null

  return (
    <>
      <header className="app-bar">
        <div className="flex items-center gap-2 min-h-14 px-4 md:px-6 max-w-[640px] mx-auto">
          <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={back}>← Atrás</button>
          <div className="flex-1 min-w-0 text-right text-sm text-muted truncate">{complex.name}</div>
        </div>
      </header>
      <Content className={cn('max-w-[640px]', valid && 'pb-32')}>
        <div className="flex items-center gap-3 mb-5 p-2 pr-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
          <Cover src={complex.coverUrl} seed={complex.id} className="size-14 rounded-xl flex-none" />
          <div className="min-w-0"><p className="font-semibold truncate leading-tight">{complex.name}</p><p className="text-sm text-muted truncate">{complex.city}</p></div>
        </div>
        <Progress step={book ? 3 : step} />
        <AnimatePresence mode="wait" initial={false}>
        {step === 0 && <StepView k="d" dir={dir}>
          <h1 className="text-2xl font-semibold tracking-tight mb-4">¿Qué día querés jugar?</h1>
          <Stagger className="grid grid-cols-2 gap-3">
            {days.map(d => {
              const n = freeCount(state, complex, d, now)
              const [wd, rest] = dateLong(d).split(', ')
              return (
                <Item key={d} as="button" type="button" disabled={!n} onClick={() => pickDate(d)} aria-pressed={date === d} whileTap={{ scale: .96 }}
                  className={cn('text-left p-4 rounded-2xl border bg-surface shadow-[var(--sh-1)] transition-[border-color,box-shadow] disabled:opacity-45 disabled:shadow-none enabled:hover:shadow-[var(--sh-2)] enabled:hover:border-brand', d === today && 'col-span-2 bg-[image:var(--grad-brand)] !border-transparent text-[var(--on-grad)]')}>
                  <span className="block display text-2xl font-bold leading-tight">{d === today ? 'Hoy' : d === addDays(today, 1) ? 'Mañana' : wd}</span>
                  <span className={cn('block text-sm', d === today ? 'opacity-85' : 'text-muted')}>{rest}</span>
                  <span className={cn('mt-3 inline-flex items-center gap-1 text-sm font-semibold', d === today ? '' : n ? 'text-brand' : 'text-muted')}>{n ? `${n} libres` : 'Sin horarios'}{n > 0 && <ChevronRight size={16} />}</span>
                </Item>
              )
            })}
          </Stagger>
          <div className="mt-5"><span className="label">¿Otro día?</span><DateField min={today} value={date && !days.includes(date) ? date : ''} placeholder="Elegir en el calendario" onChange={v => v && pickDate(v)} /></div>
        </StepView>}

        {step === 1 && <StepView k="c" dir={dir}>
          <h1 className="text-2xl font-semibold tracking-tight">¿En qué cancha?</h1>
          <p className="text-muted mt-1 mb-4">{relativeDay(date)} · {dateLong(date).split(', ')[1]}</p>
          <Stagger className="space-y-3">
            {courts.map((c, idx) => {
              const n = freeSlots(state, complex, c, date, now).length
              const photos = [complex.coverUrl, ...(complex.gallery || [])].filter(Boolean)
              return (
                <Item key={c.id} as="button" type="button" disabled={!n} whileTap={{ scale: .98 }} onClick={() => { setCourtId(c.id); setTime(''); setStep(2) }}
                  className={cn('w-full text-left rounded-2xl border bg-surface overflow-hidden shadow-[var(--sh-1)] transition-[border-color,box-shadow] disabled:opacity-50 enabled:hover:shadow-[var(--sh-2)]', courtId === c.id ? 'border-brand' : 'border-line')}>
                  <span className="relative block">
                    <Cover src={c.photo || photos[idx % Math.max(photos.length, 1)]} seed={c.id} className="aspect-[21/9]" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute left-4 bottom-3 text-white"><span className="block display text-2xl font-bold leading-none">{c.name}</span><span className="block text-sm opacity-90">{c.sport}</span></span>
                    <span className="absolute right-3 bottom-3 text-white text-right"><span className="block font-semibold tnum text-lg leading-none">{money(c.priceCents)}</span><span className="block text-xs opacity-85">por turno</span></span>
                  </span>
                  <span className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="flex-1 min-w-0 text-muted truncate inline-flex items-center gap-3">{c.surface}{c.covered && <span className="inline-flex items-center gap-1"><Umbrella size={14} />Techada</span>}{c.lighting && <span className="inline-flex items-center gap-1"><Lightbulb size={14} />Luz</span>}</span>
                    <span className={cn('font-semibold flex-none', n ? 'text-brand' : 'text-muted')}>{n ? `${n} libres` : 'Sin horarios'}</span>
                  </span>
                </Item>
              )
            })}
          </Stagger>
        </StepView>}

        {step === 2 && court && <StepView k="h" dir={dir}>
          <h1 className="text-2xl font-semibold tracking-tight">¿A qué hora?</h1>
          <p className="text-muted mt-1 mb-4">{relativeDay(date)} · {court.name} · {court.sport}</p>
          {freeSlots(state, complex, court, date, now).length === 0
            ? <Empty title="No quedan horarios" text="Probá con otro día u otra cancha." action={<Button variant="secondary" onClick={() => setStep(0)}>Elegir otro día</Button>} />
            : PARTS.map(([label, test]) => {
              const list = slotsFor(complex).filter(test)
              if (!list.length) return null
              return (
                <section key={label} className="mb-5">
                  <h2 className="font-semibold mb-2">{label}</h2>
                  <Stagger className="grid grid-cols-3 gap-2" step={.02}>
                    {list.map(t => {
                      const kind = slotInfo(state, complex, court, date, t, now).kind, free = kind === 'free', taken = kind === 'booked'
                      const waiting = user && (state.waitlist || []).some(w => w.playerId === user.id && w.courtId === court.id && w.date === date && w.time === t && !w.notifiedAt)
                      if (taken) return (
                        <Item as="button" key={t} type="button" onClick={() => setWait(t)} aria-label={`${t}, ocupado. ${waiting ? 'Te avisamos si se libera' : 'Tocá para que te avisemos si se libera'}`}
                          className="rounded-xl border border-dashed border-strong min-h-16 flex flex-col items-center justify-center text-muted hover:bg-sunken transition-colors">
                          <span className="text-lg font-semibold tnum opacity-60">{t}</span>
                          <span className={cn('text-xs', waiting && 'text-warn font-semibold')}>{waiting ? 'Te avisamos' : 'Ocupado · avisarme'}</span>
                        </Item>)
                      return (
                        <Item as="button" key={t} type="button" disabled={!free} aria-pressed={time === t} whileTap={{ scale: .94 }} onClick={() => setTime(t)} aria-label={`${t}${free ? `, ${money(quote(state, court, date, t, user?.id).totalCents)}` : ', ocupado'}`}
                          className={cn('rounded-xl border min-h-16 flex flex-col items-center justify-center transition-[background-color,box-shadow,transform] duration-200 disabled:opacity-35 disabled:cursor-not-allowed',
                            time === t ? 'bg-[image:var(--grad-brand)] border-transparent text-[var(--on-grad)] shadow-[0_10px_20px_-8px_color-mix(in_srgb,var(--brand)_80%,transparent)] scale-[1.04]' : 'bg-surface border-strong hover:bg-sunken')}>
                          <span className="text-lg font-semibold tnum">{t}</span>
                          <span className={cn('text-xs tnum', time !== t && 'text-muted')}>{free ? money(quote(state, court, date, t, user?.id).totalCents) : 'Ocupado'}{free && quote(state, court, date, t, user?.id).discountCents > 0 ? ' · promo' : ''}</span>
                        </Item>
                      )
                    })}
                  </Stagger>
                </section>
              )
            })}
        </StepView>}
        </AnimatePresence>
      </Content>

      <AnimatePresence>{step === 2 && valid && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring} className={cn('fixed inset-x-0 z-20 bg-[var(--glass)] backdrop-blur-xl border-t border-line', inShell ? 'bottom-[calc(var(--nav-h)+var(--safe-bottom))] lg:bottom-0 lg:left-64' : 'bottom-0 pb-[var(--safe-bottom)]')}>
          <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1"><div className="font-semibold tnum">{money(q.totalCents)}{perPerson(court, q.totalCents) && <span className="text-sm font-normal text-muted"> · {money(perPerson(court, q.totalCents))} c/u</span>}</div><div className="text-sm text-muted truncate">{court.name} · {relativeDay(date)} · {time}</div></div>
            <Button size="lg" onClick={go}>{user ? 'Continuar' : 'Ingresar para seguir'}</Button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      {wait && <WaitSheet complex={complex} court={court} date={date} time={wait} onClose={() => setWait('')} />}
      <BookSheet open={book} onClose={() => setBook(false)} complex={complex} court={court} date={date} time={time} onDone={bid => { setBook(false); setDoneId(bid) }} />
      {doneId && <ConfirmedSheet bookingId={doneId} onClose={() => { setDoneId(''); navigate('/reservas') }} />}
    </>
  )
}

/* Jugar hoy: todos los horarios libres que quedan hoy, del más próximo al más tarde. */
export function PlayToday() {
  const { state } = useStore()
  const { origin } = useOrigin()
  const [sport, setSport] = useState('')
  const today = todayISO(), now = new Date()
  const list = useMemo(() => {
    const out = []
    for (const c of publicComplexes(state).map(x => complexView(state, x, origin))) {
      for (const court of activeCourts(state, c.id)) {
        if (sport && court.sport !== sport) continue
        for (const t of freeSlots(state, c, court, today, now)) out.push({ c, court, t, at: slotMoment(c, today, t) })
      }
    }
    return out.sort((a, b) => a.at - b.at || (a.c.distance ?? 0) - (b.c.distance ?? 0)).slice(0, 40)
  }, [state, sport, origin]) // eslint-disable-line
  const sports = [...new Set(publicComplexes(state).flatMap(c => activeCourts(state, c.id).map(x => x.sport)))].filter(s => SPORTS.includes(s))
  return (
    <>
      <PageHeader back="/" title="Jugar hoy" sub="Horarios libres que quedan hoy" />
      <Content className="max-w-[720px] lg:mx-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1 mb-4" role="group" aria-label="Tipo de cancha">
          <Chip active={!sport} onClick={() => setSport('')}>Todas</Chip>
          {sports.map(s => <Chip key={s} active={sport === s} onClick={() => setSport(s)}>{s}</Chip>)}
        </div>
        {list.length === 0
          ? <Empty title="Hoy ya no quedan horarios" text="Mirá los de mañana." action={<Button onClick={() => navigate(`/buscar?fecha=${addDays(today, 1)}`)}>Ver mañana</Button>} />
          : <div className="list">{list.map(({ c, court, t }) => (
            <Link key={`${court.id}-${t}`} to={`/complejo/${c.slug}/reservar?fecha=${today}&cancha=${court.id}&hora=${t}`} className="row !min-h-16">
              <span className="text-xl font-semibold tnum w-16 flex-none">{t}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.name}</span><span className="block text-sm text-muted truncate">{court.name} · {court.sport} · {c.distanceLabel}</span></span>
              <span className="font-semibold tnum flex-none">{money(priceFor(court, t))}</span>
              <ChevronRight size={18} className="text-faint flex-none -mr-1" />
            </Link>))}</div>}
      </Content>
    </>
  )
}

/* Anotarse en la lista de espera de un horario ocupado. */
function WaitSheet({ complex, court, date, time, onClose }) {
  const { state, user, update } = useStore()
  const toast = useToast()
  const mine = user && (state.waitlist || []).find(w => w.playerId === user.id && w.courtId === court.id && w.date === date && w.time === time && !w.notifiedAt)
  const join = () => {
    if (!user) { navigate(`/ingresar?volver=${encodeURIComponent(`/complejo/${complex.slug}/reservar?fecha=${date}&cancha=${court.id}`)}`); return }
    try { update(s => joinWaitlist(s, { complexId: complex.id, courtId: court.id, date, time, player: user })); toast('Listo. Si se libera, te avisamos.'); onClose() }
    catch (e) { toast(e.message, 'error') }
  }
  const leave = () => { update(s => leaveWaitlist(s, mine.id)); toast('Te sacamos de la lista de espera.'); onClose() }
  return (
    <Sheet open onClose={onClose} title={mine ? 'Ya estás anotado' : 'Horario ocupado'}
      footer={mine ? <><Button variant="secondary" onClick={onClose}>Cerrar</Button><Button variant="danger" onClick={leave}>Salir de la lista</Button></>
        : <><Button variant="secondary" onClick={onClose}>Volver</Button><Button onClick={join}><BellRing size={18} />Avisarme si se libera</Button></>}>
      <p className="text-lg"><strong className="tnum">{time}</strong> · {court.name} · {relativeDay(date)}</p>
      <p className="text-muted mt-2">{mine ? 'Si la persona que reservó cancela, te llega un aviso para reservarlo. El primero que reserva se lo queda.' : 'Alguien ya lo reservó. Si cancela, te avisamos para que puedas reservarlo antes que otro.'}</p>
    </Sheet>
  )
}
