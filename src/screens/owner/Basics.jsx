import { Fragment, useMemo, useState } from 'react'
import { m as motion } from 'motion/react'
import { ArrowRight, CalendarDays, CalendarPlus, CalendarRange, Check, ChevronRight, CircleCheck, ClipboardList, Clock3, Copy, HandCoins, HeartHandshake, Lock, MessageCircle, Phone, Plus, Repeat2, Search, Send, Star, Trophy, Users, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { dayStatus, slotInfo, slotsFor, balanceOf, WEEKDAYS, decideFixed, activeCourts, bookingEnd, bookingStart, clientsOf, effStatus, getCourt, ownerStats, paymentLabel, weeklySummary, STATUS, STATUS_ORDER } from '../../lib/domain'
import { MessageSheet } from '../../ui/MessageSheet'
import { cn, dateLong, addDays, dateHeading, dateShort, fromISO, initials, money, relativeDay, telLink, todayISO, waLink } from '../../lib/format'
import { Link, navigate, useRoute } from '../../lib/router'
import { Avatar, Button, Chip, Empty, Field, IconButton, Input, Segmented, Select, Sheet, Stat, Textarea, useToast } from '../../ui/kit'
import { BookingRow, BookingStatus } from '../../ui/shared'
import { Item, Stagger, CountUp, spring } from '../../ui/motion'
import { Delta, Kpi, Ring, Spark, useStickyTop } from '../../ui/dash'
import { BlockSheet, BookingEditor, NewBookingSheet, OwnerPage, useMedia, useOwner } from './common'

const ACCENT = { pending: 'var(--warn)', deposit_paid: 'var(--info)', confirmed: 'var(--brand)', completed: 'var(--faint)', cancelled: 'var(--danger)', no_show: 'var(--danger)' }
const rel = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null)
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`
const LIVE = ['pending', 'deposit_paid', 'confirmed']

/* Título de sección con contador y acción opcional. */
function Head({ title, count, action, id, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3 min-h-8', className)}>
      <h2 id={id} className="display text-xl font-bold leading-tight flex items-center gap-2.5">{title}{count > 0 && <span className="ow-pill warn tnum">{count}</span>}</h2>
      {action}
    </div>
  )
}

/* Lo mínimo para que un complejo se vea completo y confiable. */
function Checklist({ complex, courts }) {
  const items = [
    ['Foto de portada', !!complex.coverUrl, '/dueno/complejo'],
    ['Ubicación en el mapa', complex.lat != null, '/dueno/complejo'],
    ['Descripción del complejo', (complex.description || '').trim().length >= 20, '/dueno/complejo'],
    ['Al menos una cancha con precio', courts.some(c => c.priceCents > 0), '/dueno/canchas'],
    ['WhatsApp de contacto', !!(complex.whatsapp || complex.phone), '/dueno/complejo'],
  ]
  const done = items.filter(i => i[1]).length
  if (done === items.length) return null
  return (
    <Item className="ow-card p-4 lg:p-5">
      <div className="flex items-center gap-3">
        <span className="ow-ico grad"><Trophy size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="display text-xl font-bold leading-tight">Completá tu complejo</h2><p className="text-sm text-muted">Los complejos con foto y ubicación reciben muchas más reservas.</p></div>
        <span className="text-sm font-semibold text-muted tnum flex-none">{done} de {items.length}</span>
      </div>
      <div className="ow-bar mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Avance del complejo"><motion.i initial={{ width: 0 }} animate={{ width: `${(done / items.length) * 100}%` }} transition={{ ...spring, delay: .2 }} /></div>
      <ul className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-6">{items.map(([label, ok, to]) => (
        <li key={label}><Link to={to} className={cn('flex items-center gap-3 min-h-11 rounded-lg', ok ? 'text-muted line-through' : 'font-medium hover:text-brand')}>
          <span className={cn('size-5 rounded-full border-2 grid place-items-center flex-none', ok ? 'bg-brand border-brand text-[var(--brand-ink)]' : 'border-strong')}>{ok && <Check size={12} strokeWidth={3} />}</span>{label}{!ok && <ChevronRight size={16} className="ml-auto text-faint" />}
        </Link></li>))}</ul>
    </Item>
  )
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches' }

const ATTN_TONE = { danger: 'danger', warn: 'warn', ok: '' }

/* Demanda por horario: una barra por turno, cuanto más oscura, más canchas ocupadas. */
function DemandBars({ rows, nowT }) {
  return (
    <div>
      <div className="ow-bars" role="img" aria-label="Ocupación por horario">
        {rows.map((r, i) => (
          <div key={r.t} className="flex-1 min-w-0 h-full flex items-end relative group">
            <motion.div className={cn('w-full rounded-lg', r.pct === 0 ? 'bg-sunken' : 'bg-[image:var(--grad-brand)]', r.t === nowT && 'ring-2 ring-offset-2 ring-[var(--gold)] ring-offset-[var(--surface)]')} style={r.pct ? { opacity: .4 + r.pct / 170 } : undefined}
              initial={{ height: 0 }} animate={{ height: `${Math.max(r.pct, 7)}%` }} transition={{ ...spring, delay: i * .02 }} />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold bg-ink text-bg rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 tnum">{r.t} · {r.n}/{r.of}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1 lg:gap-1.5 mt-1.5 text-[11px] text-muted tnum" aria-hidden="true">{rows.map((r, i) => <span key={r.t} className={cn('flex-1 min-w-0 text-center', rows.length > 16 && i % 2 && 'max-sm:invisible', r.t === nowT && 'text-ink font-bold')}>{r.t.slice(0, 2)}</span>)}</div>
    </div>
  )
}

/* Resumen de la semana: lo último de 7 días contra los 7 anteriores. */
function WeekCard({ week, series }) {
  const { st, prev, tips } = week
  const pp = prev ? st.occupancy - prev.occupancy : null
  return (
    <Item as="section" className="ow-card p-4 lg:p-5" aria-labelledby="ow-week">
      <header className="flex items-center gap-3">
        <span className="ow-ico"><CalendarRange size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 id="ow-week" className="display text-xl font-bold leading-tight">Resumen de la semana</h2><p className="text-sm text-muted">Últimos 7 días, hasta ayer</p></div>
      </header>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0"><p className="ow-eyebrow">Cobrado</p><p className="display text-4xl font-bold tnum leading-tight"><CountUp value={money(st.income)} /></p></div>
        <Delta value={rel(st.income, prev?.income)} className="mb-1.5" />
      </div>
      {series.some(v => v > 0) && <div className="text-brand mt-1" aria-hidden="true"><Spark data={series} height={44} /></div>}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl bg-sunken p-3 min-w-0">
          <p className="ow-eyebrow">Reservas</p>
          <div className="flex items-center justify-between gap-2 mt-0.5"><p className="display text-3xl font-bold tnum leading-tight"><CountUp value={st.bookingsN} /></p><Delta value={rel(st.bookingsN, prev?.bookingsN)} /></div>
        </div>
        <div className="rounded-2xl bg-sunken p-3 min-w-0">
          <p className="ow-eyebrow">Ocupación</p>
          <div className="flex items-center justify-between gap-2 mt-0.5"><p className="display text-3xl font-bold tnum leading-tight"><CountUp value={`${st.occupancy}%`} /></p><Delta value={pp} unit="pp" /></div>
        </div>
      </div>
      <p className="text-sm text-muted mt-3 leading-snug">{prev ? 'Comparado con los 7 días anteriores.' : 'Todavía no hay una semana anterior para comparar.'}{tips ? ` ${tips}` : ''}</p>
      <Link to="/dueno/estadisticas" className="btn btn-link mt-1 -ml-2">Ver estadísticas<ArrowRight size={16} aria-hidden="true" /></Link>
    </Item>
  )
}

export function OwnerHome() {
  const { state, user, update } = useStore()
  const toast = useToast()
  const { complex } = useOwner()
  const [editing, setEditing] = useState('')
  const [sheet, setSheet] = useState('')
  const [remind, setRemind] = useState('')
  const [preset, setPreset] = useState({})
  const [allTomorrow, setAllTomorrow] = useState(false)
  const stickyRef = useStickyTop(24)
  const now = new Date(), today = todayISO()
  const mine = complex ? state.bookings.filter(b => b.complexId === complex.id && !b._busy) : []
  const day = complex ? dayStatus(state, complex, today, now) : null
  const heat = useMemo(() => { // eslint-disable-line
    if (!complex) return []
    const cs = activeCourts(state, complex.id)
    return slotsFor(complex).map(t => { const n = cs.filter(c => slotInfo(state, complex, c, today, t, now).kind === 'booked').length; return { t, n, of: cs.length, pct: cs.length ? Math.round(n / cs.length * 100) : 0 } })
  }, [state, complex]) // eslint-disable-line
  /* Semana: los 7 días hasta ayer contra los 7 anteriores (se corren las reservas 7 días para reutilizar ownerStats). */
  const { week, series, spark } = useMemo(() => { // eslint-disable-line
    if (!complex) return {}
    const w = weeklySummary(state, complex)
    const p = ownerStats({ ...state, bookings: state.bookings.map(b => ({ ...b, date: addDays(b.date, 7) })) }, complex, 7)
    const i = w.text.indexOf('% de ocupación.')
    const mineB = state.bookings.filter(b => b.complexId === complex.id && !b._busy)
    const sum = d => mineB.filter(b => b.date === d).reduce((s, b) => s + (b.paidCents || 0), 0)
    return {
      week: { ...w, prev: p.counted > 0 && p.bookingsN > 0 ? p : null, tips: i >= 0 ? w.text.slice(i + 15).trim() : '' },
      series: Array.from({ length: 7 }, (_, k) => sum(addDays(today, k - 7))),
      spark: {
        n: Array.from({ length: 7 }, (_, k) => mineB.filter(b => b.date === addDays(today, k - 6) && effStatus(b) !== 'cancelled').length),
        inc: Array.from({ length: 7 }, (_, k) => sum(addDays(today, k - 6))),
      },
    }
  }, [state, complex]) // eslint-disable-line
  const nowT = `${String(now.getHours()).padStart(2, '0')}:00`
  const live = b => LIVE.includes(effStatus(b, now)) && bookingEnd(b) >= now
  const pendingPay = mine.filter(b => effStatus(b, now) === 'pending' && bookingEnd(b) >= now)
  const owedToday = mine.filter(b => b.date === today && ['deposit_paid', 'confirmed'].includes(effStatus(b, now)) && balanceOf(b) > 0)
  const toRemind = mine.filter(b => live(b) && balanceOf(b) > 0 && b.date <= addDays(today, 7) && b.phone).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const blocked = complex ? state.courts.filter(c => c.complexId === complex.id && c.status === 'blocked') : []
  const newOnes = (state.notifications || []).filter(n => n.userId === user.id && n.type === 'booking_new' && !n.read && (!n.complexId || n.complexId === complex?.id))
  const unanswered = complex ? state.reviews.filter(r => r.complexId === complex.id && !r.hidden && !r.reply) : []
  const requests = complex ? (state.fixedRequests || []).filter(r => r.complexId === complex.id && r.status === 'pending') : []
  const tomorrow = mine.filter(b => b.date === addDays(today, 1) && ['deposit_paid', 'confirmed'].includes(effStatus(b, now))).sort((a, b) => a.time.localeCompare(b.time))
  const upcoming = mine.filter(live).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 6)
  const nextB = upcoming[0]
  const owed = day ? day.bookings.reduce((s, b) => s + balanceOf(b), 0) : 0
  const decide = (r, ok) => {
    try { const out = update(s => decideFixed(s, r.id, ok)); toast(ok ? `Turno fijo aprobado: ${out.created} reservas${out.skipped.length ? `, ${out.skipped.length} semanas ya estaban ocupadas` : ''}.` : 'Pedido rechazado. Le avisamos al jugador.') }
    catch (e) { toast(e.message, 'error') }
  }
  const attention = [
    pendingPay.length && { tone: 'danger', icon: Clock3, text: `${pendingPay.length} ${pendingPay.length === 1 ? 'reserva pendiente' : 'reservas pendientes'} de pago`, go: () => navigate('/dueno/reservas?estado=pending') },
    owedToday.length && { tone: 'warn', icon: HandCoins, text: `${owedToday.length} ${owedToday.length === 1 ? 'turno' : 'turnos'} de hoy con saldo por cobrar`, go: () => navigate('/dueno/agenda') },
    blocked.length && { tone: 'warn', icon: Lock, text: `${blocked.length} ${blocked.length === 1 ? 'cancha bloqueada' : 'canchas bloqueadas'}`, go: () => navigate('/dueno/canchas') },
    requests.length && { tone: 'ok', icon: Repeat2, text: `${requests.length} ${requests.length === 1 ? 'pedido' : 'pedidos'} de turno fijo`, go: () => document.getElementById('turnos-fijos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    unanswered.length && { tone: 'warn', icon: Star, text: `${unanswered.length} ${unanswered.length === 1 ? 'reseña' : 'reseñas'} sin responder`, go: () => navigate('/dueno/resenas') },
    newOnes.length && { tone: 'ok', icon: CalendarPlus, text: `${newOnes.length} ${newOnes.length === 1 ? 'reserva nueva' : 'reservas nuevas'}`, go: () => { update(s => s.notifications.forEach(n => { if (newOnes.some(x => x.id === n.id)) n.read = true })); navigate('/dueno/reservas') } },
  ].filter(Boolean)
  const actions = [[Plus, 'Nueva reserva', () => { setPreset({}); setSheet('new') }, true], [Lock, 'Bloquear horario', () => setSheet('block')], [CalendarDays, 'Ver agenda', () => navigate('/dueno/agenda')], [HandCoins, 'Recordar pago', () => setSheet('remind')]]
  const courtName = id => state.courts.find(c => c.id === id)?.name

  return (
    <OwnerPage title={`${greeting()}, ${user.name.split(' ')[0]}`} sub={`Hoy · ${dateLong(today)}`} wide>
      {complex && day && <>
        <Stagger className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[auto_1fr] xl:gap-x-6">
          {/* ---------- Hoy ---------- */}
          <div className="flex flex-col gap-4 lg:gap-5 min-w-0 xl:col-start-1">
            <Item className="hero ow-hero p-5 lg:p-6">
              <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:gap-8">
                <div className="flex items-center gap-5 min-w-0 2xl:flex-1">
                  <Ring pct={day.pct}><div><div className="display text-4xl font-bold tnum leading-none"><CountUp value={`${day.pct}%`} /></div><div className="text-xs uppercase tracking-widest opacity-85 mt-1">ocupación</div></div></Ring>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />Hoy en {complex.name}</p>
                    <p className="display text-2xl lg:text-4xl font-bold leading-tight mt-2">{day.taken} de {day.total} turnos ocupados</p>
                    <p className="opacity-90 mt-1 text-sm lg:text-base">{day.peak ? `Mayor demanda a las ${day.peak.t}` : 'Todavía sin reservas'}{day.next ? <> · <button type="button" className="underline underline-offset-2 font-semibold min-h-8" onClick={() => { setPreset({ date: today, courtId: day.next.court.id, time: day.next.t }); setSheet('new') }}>próximo libre {day.next.t}</button></> : ' · no quedan libres'}</p>
                  </div>
                </div>
                {nextB && (
                  <button type="button" onClick={() => setEditing(nextB.id)} aria-label={`Abrir la reserva de ${nextB.playerName}, ${nextB.time}`}
                    className="ow-hero-glass flex items-center gap-3 p-3.5 text-left min-h-16 transition-colors hover:bg-white/20 2xl:w-[290px] flex-none">
                    <span className="size-11 rounded-full bg-white/20 grid place-items-center font-semibold text-sm flex-none" aria-hidden="true">{initials(nextB.playerName)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-widest opacity-85">{bookingStart(nextB) <= now ? 'Jugando ahora' : `Próximo turno · ${relativeDay(nextB.date)}`}</span>
                      <span className="block font-semibold truncate">{nextB.playerName}</span>
                      <span className="block text-sm opacity-90 tnum truncate">{nextB.time} · {courtName(nextB.courtId)}</span>
                    </span>
                    <ChevronRight size={18} className="flex-none opacity-80" aria-hidden="true" />
                  </button>)}
              </div>
            </Item>

            <Item className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={CalendarDays} label="Reservas hoy" value={day.bookings.length} hint={pl(day.free, 'turno libre', 'turnos libres')} spark={<Spark data={spark.n} height={32} />} />
              <Kpi icon={HandCoins} label="Recaudado hoy" value={money(day.collected)} hint={owed > 0 ? `${money(owed)} por cobrar` : 'Todo cobrado'} spark={<Spark data={spark.inc} height={32} />} />
              <Kpi icon={CircleCheck} label="Confirmadas" value={day.confirmed} hint={day.bookings.length ? `de ${day.bookings.length} reservas` : 'Sin reservas'} spark={<div className="ow-bar" aria-hidden="true"><motion.i initial={{ width: 0 }} animate={{ width: `${day.bookings.length ? Math.round(day.confirmed / day.bookings.length * 100) : 0}%` }} transition={{ ...spring, delay: .3 }} /></div>} />
              <Kpi icon={Clock3} label="Pendientes" value={day.pending} tone={day.pending ? 'warn' : 'brand'} hint={day.pending ? 'Esperan el pago' : 'Nada pendiente'} spark={<div className="ow-bar warn" aria-hidden="true"><motion.i initial={{ width: 0 }} animate={{ width: `${day.bookings.length ? Math.round(day.pending / day.bookings.length * 100) : 0}%` }} transition={{ ...spring, delay: .3 }} /></div>} />
            </Item>

            <Item as="section" className="ow-card p-4 lg:p-5" aria-labelledby="ow-demand">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0"><h2 id="ow-demand" className="display text-xl font-bold leading-tight">Demanda por horario</h2><p className="text-sm text-muted">El aro dorado marca la hora actual.</p></div>
                <span className="ow-pill flex-none tnum"><CalendarDays size={14} aria-hidden="true" />{pl(day.free, 'turno libre', 'turnos libres')}</span>
              </div>
              <DemandBars rows={heat} nowT={nowT} />
            </Item>
          </div>

          {/* ---------- Lateral: semana, atención y acciones ---------- */}
          <aside ref={stickyRef} className="flex flex-col gap-6 min-w-0 lg:grid lg:grid-cols-2 lg:items-start xl:flex xl:flex-col xl:items-stretch xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:self-start xl:sticky">
            {week && <WeekCard week={week} series={series} />}

            <Item as="section" className="ow-card overflow-hidden" aria-labelledby="ow-attn">
              <div className="px-4 pt-4 lg:px-5 lg:pt-5 pb-2"><Head id="ow-attn" title="Atención" count={attention.length} className="!mb-0" /></div>
              {attention.length === 0
                ? <div className="m-3 flex items-center gap-3 p-4 rounded-2xl bg-brand-soft text-brand"><span className="size-10 rounded-xl grid place-items-center bg-surface flex-none"><CircleCheck size={20} aria-hidden="true" /></span><span className="font-semibold">Todo está en orden</span></div>
                : <ul className="pb-1">{attention.map(a => (
                  <li key={a.text} className="border-t border-line first:border-t-0">
                    <button type="button" className="ow-rowbtn" onClick={a.go}>
                      <span className={cn('ow-ico', ATTN_TONE[a.tone])}><a.icon size={20} aria-hidden="true" /></span>
                      <span className="flex-1 font-medium leading-snug">{a.text}</span><ChevronRight size={18} className="text-faint flex-none ow-go" aria-hidden="true" />
                    </button>
                  </li>))}</ul>}
            </Item>

            <Item as="section" className="lg:col-span-2 xl:col-span-1" aria-labelledby="ow-quick">
              <Head id="ow-quick" title="Acciones rápidas" />
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-3">
                {actions.map(([I, l, fn, main]) => (
                  <motion.button key={l} type="button" whileTap={{ scale: .96 }} whileHover={{ y: -2 }} onClick={fn} data-tour={main ? 'nueva-reserva' : undefined}
                    className={cn('ow-act', main && 'main lg:col-span-1 xl:col-span-3 xl:!flex-row xl:!items-center xl:!min-h-16 xl:!gap-3')}>
                    <span className={cn('size-10 rounded-xl grid place-items-center flex-none', main ? 'bg-white/20' : 'bg-brand-soft text-brand')}><I size={20} aria-hidden="true" /></span>
                    <span className="xl:flex-1">{l}</span>
                    {main && <ArrowRight size={18} className="hidden xl:block flex-none opacity-85" aria-hidden="true" />}
                  </motion.button>))}
              </div>
            </Item>
          </aside>

          {/* ---------- Pendientes del día ---------- */}
          <div className="flex flex-col gap-6 min-w-0 xl:col-start-1">
            {requests.length > 0 && (
              <Item as="section" id="turnos-fijos" className="scroll-mt-6" aria-labelledby="ow-fixed">
                <Head id="ow-fixed" title="Pedidos de turno fijo" count={requests.length} />
                <div className="grid gap-3 lg:grid-cols-2">{requests.map(r => (
                  <div key={r.id} className="ow-card p-4">
                    <div className="flex items-center gap-3"><Avatar name={r.playerName} /><div className="min-w-0"><div className="font-semibold truncate">{r.playerName}</div>
                      <div className="text-sm text-muted">Todos los {WEEKDAYS[r.weekday]} a las {r.time} · {courtName(r.courtId)} · {r.weeks} semanas</div></div></div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button variant="secondary" onClick={() => decide(r, false)}>Rechazar</Button>
                      <Button onClick={() => decide(r, true)}>Aprobar</Button>
                    </div>
                  </div>))}</div>
              </Item>
            )}

            <Checklist complex={complex} courts={state.courts.filter(c => c.complexId === complex.id)} />

            {tomorrow.length > 0 && (
              <Item as="section" aria-labelledby="ow-tmr">
                <Head id="ow-tmr" title="Recordatorios de mañana" count={tomorrow.length} />
                <div className="list">{tomorrow.slice(0, allTomorrow ? 99 : 3).map(b => (
                  <div key={b.id} className="row">
                    <Avatar name={b.playerName} />
                    <div className="flex-1 min-w-0"><div className="font-semibold truncate">{b.playerName}</div><div className="text-sm text-muted tnum">{b.time} · {courtName(b.courtId)}</div></div>
                    {b.reminderAt ? <span className="ow-pill"><Check size={14} aria-hidden="true" />Enviado</span> : <Button size="sm" variant="secondary" className="!min-h-11" disabled={!b.phone} onClick={() => setRemind({ id: b.id, kind: 'recordatorio' })}><MessageCircle size={16} aria-hidden="true" />Recordar</Button>}
                  </div>))}</div>
                {tomorrow.length > 3 && !allTomorrow && <Button variant="ghost" className="mt-2" onClick={() => setAllTomorrow(true)}>Ver los {tomorrow.length}</Button>}
              </Item>
            )}

            <Item as="section" aria-labelledby="ow-next">
              <Head id="ow-next" title="Próximos turnos" action={<Link to="/dueno/agenda" className="btn btn-link !min-h-11">Ver agenda<ChevronRight size={16} aria-hidden="true" /></Link>} />
              {upcoming.length ? <div className="list">{upcoming.map(b => <BookingRow key={b.id} b={b} state={state} who onClick={() => setEditing(b.id)} />)}</div>
                : <div className="list"><Empty icon={CalendarDays} title="No hay turnos próximos" text="Cargá una reserva o compartí tu complejo para recibir las primeras." action={<Button onClick={() => { setPreset({}); setSheet('new') }}><Plus size={18} />Nueva reserva</Button>} /></div>}
            </Item>
          </div>
        </Stagger>

        {sheet === 'new' && <NewBookingSheet open onClose={() => setSheet('')} complex={complex} preset={preset} />}
        {sheet === 'block' && <BlockSheet open onClose={() => setSheet('')} complex={complex} />}
        <Sheet open={sheet === 'remind'} onClose={() => setSheet('')} title="Recordar pago">
          {toRemind.length === 0 ? <Empty icon={HandCoins} title="No hay pagos pendientes" text="Cuando un turno tenga saldo por cobrar, aparece acá." /> : (<>
            <p className="text-muted mb-3">Turnos de los próximos 7 días con saldo por cobrar.</p>
            <div className="list">{toRemind.map(b => (
              <div key={b.id} className="row">
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{b.playerName}</div><div className="text-sm text-muted tnum">{relativeDay(b.date)} · {b.time} · debe {money(balanceOf(b))}</div></div>
                <Button size="sm" variant="secondary" className="!min-h-11" onClick={() => { setSheet(''); setRemind({ id: b.id, kind: 'pago' }) }}>Recordar</Button>
              </div>))}</div></>)}
        </Sheet>
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
        {remind && <MessageSheet bookingId={remind.id} initial={remind.kind} kinds={['pago', 'recordatorio', 'confirmacion']} onClose={() => setRemind('')} onSent={k => { if (k === 'recordatorio') update(s => { s.bookings.find(x => x.id === remind.id).reminderAt = new Date().toISOString() }) }} />}
      </>}
    </OwnerPage>
  )
}

/* ---------- Reservas ---------- */

/* Detalle de la reserva elegida (panel lateral en PC). Lo básico se resuelve acá; lo demás, en el editor completo. */
function BookingPanel({ b, state, onEdit, onClose, onMessage }) {
  const { update } = useStore()
  const toast = useToast()
  const court = getCourt(state, b.courtId), st = effStatus(b)
  const live = LIVE.includes(st), rest = balanceOf(b)
  const pct = b.totalCents ? Math.min(100, Math.round(((b.paidCents || 0) / b.totalCents) * 100)) : 0
  const run = (fn, msg) => { try { update(s => fn(s.bookings.find(x => x.id === b.id), s)); toast(msg) } catch (e) { toast(e.message, 'error') } }
  return (
    <motion.section key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="ow-card overflow-hidden" aria-label={`Detalle de la reserva de ${b.playerName}`}>
      <div className="h-1.5" style={{ background: ACCENT[st] }} aria-hidden="true" />
      <header className="flex items-start gap-3 p-5 pb-4">
        <Avatar name={b.playerName} size={52} />
        <div className="min-w-0 flex-1">
          <p className="display text-2xl font-bold leading-tight truncate">{b.playerName}</p>
          <p className="text-sm text-muted truncate tnum">{b.phone || 'Sin celular'}</p>
          <div className="mt-1.5"><BookingStatus booking={b} /></div>
        </div>
        <IconButton label="Cerrar detalle" onClick={onClose} className="-mr-2 -mt-2"><X size={20} /></IconButton>
      </header>
      <div className="px-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sunken p-3 min-w-0"><p className="ow-eyebrow">Cuándo</p><p className="display text-2xl font-bold tnum leading-tight">{b.time}</p><p className="text-sm text-muted truncate">{dateShort(b.date)}</p></div>
        <div className="rounded-2xl bg-sunken p-3 min-w-0"><p className="ow-eyebrow">Cancha</p><p className="display text-2xl font-bold leading-tight truncate">{court?.name || '—'}</p><p className="text-sm text-muted truncate">{court?.sport}</p></div>
      </div>
      <div className="px-5 mt-4">
        <div className="flex items-baseline justify-between gap-3"><p className="ow-eyebrow">Importe</p><p className="text-sm text-muted">{paymentLabel(b)}</p></div>
        <p className="display text-4xl font-bold tnum leading-tight"><CountUp value={money(b.totalCents)} />{b.discountCents > 0 && <span className="text-sm font-medium text-muted font-[family-name:var(--font-sans)]"> · promo −{money(b.discountCents)}</span>}</p>
        <div className="ow-bar mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Porcentaje cobrado"><motion.i initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ ...spring, delay: .1 }} /></div>
        <p className="text-sm text-muted mt-1.5 tnum">Cobrado <strong className="text-ink">{money(b.paidCents || 0)}</strong>{live && rest > 0 && <> · falta <strong className="text-ink">{money(rest)}</strong></>}</p>
        {b.note && <p className="text-sm mt-3 rounded-xl bg-sunken px-3 py-2"><span className="text-muted">Nota: </span>{b.note}</p>}
        {b.seriesId && <p className="text-sm text-muted mt-2 inline-flex items-center gap-1.5"><Repeat2 size={15} aria-hidden="true" />Se repite todas las semanas</p>}
      </div>
      <div className="p-5 pt-4 space-y-2">
        {st === 'pending' && <Button className="w-full" onClick={() => run(x => { x.status = 'confirmed'; x.expiresAt = null }, 'Reserva confirmada.')}><Check size={18} aria-hidden="true" />Confirmar reserva</Button>}
        {live && rest > 0 && <Button className="w-full" variant={st === 'pending' ? 'secondary' : 'primary'} onClick={() => run(x => { x.paidCents = x.totalCents; x.paymentStatus = 'paid'; x.payMethod = 'efectivo'; if (x.status !== 'completed') x.status = 'confirmed'; x.expiresAt = null }, 'Cobro registrado.')}><HandCoins size={18} aria-hidden="true" />Registrar cobro de {money(rest)}</Button>}
        <div className="grid grid-cols-2 gap-2">
          <Button as="a" variant="secondary" href={telLink(b.phone)} aria-disabled={!b.phone}><Phone size={16} aria-hidden="true" />Llamar</Button>
          <Button variant="secondary" onClick={() => onMessage(b)} disabled={!b.phone}><MessageCircle size={16} aria-hidden="true" />WhatsApp</Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={onEdit}>Ver y editar todo<ChevronRight size={16} aria-hidden="true" /></Button>
      </div>
    </motion.section>
  )
}

/* Fila de la tabla de reservas (PC). */
function ResRow({ b, state, on, onClick }) {
  const court = getCourt(state, b.courtId), st = effStatus(b)
  return (
    <Item as="button" type="button" className={cn('ow-tr is-btn ow-bk', on && 'is-on')} style={{ '--accent': ACCENT[st] }} aria-pressed={on} onClick={onClick}>
      <span className="c-who"><Avatar name={b.playerName} size={40} /><span className="min-w-0"><span className="block font-semibold truncate">{b.playerName}</span><span className="block text-sm text-muted truncate tnum">{b.phone || 'Sin celular'}</span></span></span>
      <span className="c-when tnum font-semibold">{b.time}</span>
      <span className="c-court truncate">{court?.name || 'Cancha'}</span>
      <span className="c-status"><BookingStatus booking={b} /></span>
      <span className="c-amount tnum"><span className="block font-semibold">{money(b.totalCents)}</span>{effStatus(b) !== 'cancelled' && b.paidCents < b.totalCents && <span className="block text-sm text-muted truncate">{paymentLabel(b)}</span>}</span>
      <ChevronRight size={18} className="c-go" aria-hidden="true" />
    </Item>
  )
}

export function OwnerBookings() {
  const { state, update } = useStore()
  const toast = useToast()
  const { complex } = useOwner()
  const { query } = useRoute()
  const lg = useMedia('(min-width: 1024px)'), xl = useMedia('(min-width: 1280px)')
  const [period, setPeriod] = useState('next')
  const [estado, setEstado] = useState(query.estado || '')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(30)
  const [editing, setEditing] = useState('')
  const [creating, setCreating] = useState(false)
  const [sel, setSel] = useState('')
  const [msg, setMsg] = useState(null)
  const stickyRef = useStickyTop(24)
  const now = new Date(), today = todayISO()

  const list = useMemo(() => {
    if (!complex) return []
    const t = text.trim().toLowerCase()
    return state.bookings.filter(b => b.complexId === complex.id && !b._busy)
      .filter(b => period === 'today' ? b.date === today : period === 'next' ? b.date >= today : b.date < today)
      .filter(b => !estado || effStatus(b, now) === estado)
      .filter(b => !t || b.playerName.toLowerCase().includes(t) || (b.phone || '').includes(t))
      .sort((a, b) => period === 'past' ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time))
  }, [state.bookings, complex, period, estado, text]) // eslint-disable-line
  const shown = list.slice(0, limit)
  const groups = shown.reduce((m, b) => { (m[b.date] ||= []).push(b); return m }, {})
  const sums = useMemo(() => {
    const act = list.filter(b => effStatus(b, now) !== 'cancelled')
    return { n: act.length, total: act.reduce((s, b) => s + (b.totalCents || 0), 0), paid: act.reduce((s, b) => s + (b.paidCents || 0), 0), owe: act.filter(b => LIVE.includes(effStatus(b, now))).reduce((s, b) => s + balanceOf(b), 0) }
  }, [list]) // eslint-disable-line
  const picked = sel ? state.bookings.find(b => b.id === sel) : null
  const owedToday = complex ? state.bookings.filter(b => b.complexId === complex.id && !b._busy && b.date === today && ['deposit_paid', 'confirmed', 'pending'].includes(effStatus(b, now)) && balanceOf(b) > 0).sort((a, b) => a.time.localeCompare(b.time)) : []
  const pick = id => (xl ? setSel(id) : setEditing(id))
  const filtered = !!(estado || text)
  const empty = <Empty icon={ClipboardList} title={filtered ? 'No hay reservas con ese filtro' : period === 'today' ? 'No tenés reservas para hoy' : period === 'next' ? 'No tenés reservas próximas' : 'No hay reservas anteriores'} text={filtered ? 'Probá con otro estado o borrá la búsqueda.' : 'Cuando reciban una reserva, aparece acá.'} action={filtered ? <Button variant="secondary" onClick={() => { setEstado(''); setText('') }}>Ver todas</Button> : period !== 'past' && <Button onClick={() => setCreating(true)}><Plus size={18} />Crear reserva</Button>} />

  return (
    <OwnerPage title="Reservas" sub={complex ? pl(sums.n, 'reserva', 'reservas') : ''} actions={<Button size="sm" className="!min-h-11" onClick={() => setCreating(true)}><Plus size={16} />Nueva reserva</Button>} wide>
      {complex && <>
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6 xl:items-start">
          <div className="min-w-0">
            <div className="ow-fbar"><div className="ow-filters">
              <Segmented scrollTop value={period} onChange={v => { setPeriod(v); setLimit(30) }} label="Período" className="f-seg" options={[{ value: 'today', label: 'Hoy' }, { value: 'next', label: 'Próximas' }, { value: 'past', label: 'Anteriores' }]} />
              <div className="relative f-q"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden="true" /><Input value={text} onChange={e => setText(e.target.value)} placeholder="Cliente o celular" aria-label="Buscar cliente o celular" type="search" className="!pl-10" /></div>
              <Select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado" className="f-sel"><option value="">Todos los estados</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}</Select>
            </div></div>

            {lg && list.length > 0 && (
              <div className="ow-card ow-strip grid grid-cols-4 divide-x divide-line mt-4">
                {[['Reservas', sums.n, false], ['Importe', money(sums.total), false], ['Cobrado', money(sums.paid), false], ['Por cobrar', money(sums.owe), sums.owe > 0]].map(([k, v, warn]) => (
                  <div key={k} className="px-4 min-[1400px]:px-5 py-3.5 min-w-0"><p className="ow-eyebrow truncate">{k}</p><p className={cn('ow-strip-v display font-bold tnum leading-tight truncate', warn && 'text-warn')}><CountUp key={k + String(v)} value={v} /></p></div>))}
              </div>)}

            {list.length === 0 ? <div className="mt-5 list">{empty}</div> : lg ? (
              <div className="ow-card ow-table mt-4">
                <div className="ow-th ow-bk" aria-hidden="true"><span className="c-who">Cliente</span><span className="c-when">Hora</span><span className="c-court">Cancha</span><span className="c-status">Estado</span><span className="c-amount">Importe</span><span className="c-go" /></div>
                <Stagger step={.02} className="contents">
                  {Object.entries(groups).map(([d, bs]) => (
                    <Fragment key={d}>
                      <div className="ow-group"><h2 className="font-semibold">{dateHeading(d)}</h2><span className="tnum">· {pl(bs.length, 'turno', 'turnos')}</span></div>
                      {bs.map(b => <ResRow key={b.id} b={b} state={state} on={sel === b.id && xl} onClick={() => pick(b.id)} />)}
                    </Fragment>))}
                </Stagger>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {Object.entries(groups).map(([d, bs]) => (
                  <section key={d}><h2 className="text-sm font-semibold text-muted mb-2">{dateHeading(d)}</h2>
                    <div className="list">{bs.map(b => <BookingRow key={b.id} b={b} state={state} who showDate={false} onClick={() => setEditing(b.id)} />)}</div></section>
                ))}
              </div>
            )}
            {list.length > limit && <Button variant="secondary" className="w-full mt-4" onClick={() => setLimit(limit + 30)}>Ver más ({list.length - limit})</Button>}
          </div>

          {xl && (
            <aside ref={stickyRef} className="min-w-0 xl:sticky xl:self-start" aria-label="Detalle">
              {picked
                ? <BookingPanel b={picked} state={state} onClose={() => setSel('')} onEdit={() => setEditing(picked.id)} onMessage={b => setMsg({ id: b.id, kind: effStatus(b) === 'pending' ? 'pago' : b.date <= addDays(today, 1) ? 'recordatorio' : 'confirmacion' })} />
                : (<div className="flex flex-col gap-4">
                  <div className="ow-card p-6">
                    <Empty icon={ClipboardList} title="Elegí una reserva" text="Tocá una fila para ver el detalle, cobrar o escribirle al cliente sin salir de la lista." className="!py-6" />
                  </div>
                  <section className="ow-card p-5" aria-labelledby="ow-owed">
                    <div className="flex items-center gap-3"><span className="ow-ico warn"><HandCoins size={20} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1"><h2 id="ow-owed" className="display text-xl font-bold leading-tight">Por cobrar hoy</h2><p className="text-sm text-muted tnum">{owedToday.length ? `${pl(owedToday.length, 'turno', 'turnos')} · ${money(owedToday.reduce((a, b) => a + balanceOf(b), 0))}` : 'Todo cobrado'}</p></div></div>
                    {owedToday.length === 0
                      ? <p className="mt-4 rounded-2xl bg-brand-soft text-brand px-4 py-3 font-medium text-sm">No hay saldos pendientes en los turnos de hoy.</p>
                      : <ul className="mt-3 -mx-2">{owedToday.slice(0, 5).map(b => (
                        <li key={b.id}><button type="button" onClick={() => setSel(b.id)} className="flex items-center gap-3 px-2 py-2 w-full text-left rounded-xl hover:bg-sunken transition-colors min-h-14">
                          <Avatar name={b.playerName} />
                          <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{b.playerName}</span><span className="block text-sm text-muted tnum">{b.time} · {getCourt(state, b.courtId)?.name}</span></span>
                          <span className="font-semibold tnum text-warn">{money(balanceOf(b))}</span>
                        </button></li>))}</ul>}
                  </section>
                </div>)}
            </aside>)}
        </div>
        {creating && <NewBookingSheet open onClose={() => setCreating(false)} complex={complex} />}
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
        {msg && <MessageSheet bookingId={msg.id} initial={msg.kind} onClose={() => setMsg(null)} onSent={k => { if (k === 'recordatorio') update(s => { const x = s.bookings.find(y => y.id === msg.id); if (x) x.reminderAt = new Date().toISOString() }); toast('Listo, mensaje abierto en WhatsApp.') }} />}
      </>}
    </OwnerPage>
  )
}

/* ---------- Clientes ---------- */
const playedLast = x => x.bookings.reduce((m, b) => (effStatus(b) === 'completed' && b.date > m ? b.date : m), '')
const daysSince = iso => Math.max(0, Math.round((fromISO(todayISO()) - fromISO(iso)) / 864e5))
const hace = n => (n === 0 ? 'hoy' : n === 1 ? 'ayer' : n < 60 ? `hace ${n} días` : `hace ${Math.round(n / 30)} meses`)
const sentKey = id => `lafija-winback-${id}`
const readSent = id => { try { return JSON.parse(localStorage.getItem(sentKey(id)) || '{}') } catch { return {} } }

/* Mensaje amable para invitar a volver a un cliente que dejó de venir. Se puede editar antes de mandarlo. */
function WinbackSheet({ client, complex, ownerName, onClose, onSent }) {
  const { state } = useStore()
  const toast = useToast()
  const first = s => String(s || '').trim().split(/\s+/)[0]
  const court = client.habitualCourtId ? getCourt(state, client.habitualCourtId) : null
  const [text, setText] = useState(() => [
    `Hola ${first(client.name)}! 👋`,
    `Soy ${first(ownerName)} de *${complex.name}*. Hace ${hace(daysSince(client.last)).replace('hace ', '')} que no te vemos por la cancha y te extrañamos ⚽`,
    court ? `¿Te guardo tu cancha de siempre (${court.name})?` : '¿Armamos un partido esta semana?',
    'Escribime y te dejo el horario listo. ¡Un abrazo!',
  ].join('\n\n'))
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast('Mensaje copiado.') } catch { toast('No pudimos copiar. Seleccioná el texto a mano.', 'error') } }
  return (
    <Sheet open onClose={onClose} title="Invitar a volver" wide
      footer={<><Button variant="secondary" onClick={copy}><Copy size={16} />Copiar</Button>
        <Button as="a" href={waLink(client.phone, text)} target="_blank" rel="noreferrer" aria-disabled={!client.phone} onClick={() => { onSent?.(); setTimeout(onClose, 200) }}><Send size={16} />Enviar por WhatsApp</Button></>}>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={client.name} size={44} />
        <div className="min-w-0"><p className="font-semibold truncate">{client.name}</p><p className="text-sm text-muted tnum">{pl(client.completed, 'partido jugado', 'partidos jugados')} · última vez {hace(daysSince(client.last))}</p></div>
      </div>
      <Field label="Mensaje" hint="Podés cambiar el texto antes de enviarlo. Se abre WhatsApp con el mensaje listo."><Textarea value={text} onChange={e => setText(e.target.value)} rows={8} className="!min-h-44" data-autofocus /></Field>
      {!client.phone && <p className="err mt-3" role="alert">Este cliente no tiene celular cargado. Podés copiar el mensaje igual.</p>}
    </Sheet>
  )
}

export function OwnerClients() {
  const { state, user, update } = useStore()
  const toast = useToast()
  const { complex } = useOwner()
  const lg = useMedia('(min-width: 1024px)'), xl = useMedia('(min-width: 1280px)')
  const [text, setText] = useState('')
  const [seg, setSeg] = useState('all')
  const [open, setOpen] = useState(null)
  const [editing, setEditing] = useState('')
  const [note, setNote] = useState('')
  const [newFor, setNewFor] = useState(null)
  const [win, setWin] = useState(null)
  const [sent, setSent] = useState(() => (complex ? readSent(complex.id) : {}))
  const stickyRef = useStickyTop(24)
  const today = todayISO(), cut = addDays(today, -30)
  const clients = useMemo(() => complex ? clientsOf(state, [complex.id]) : [], [state, complex])
  /* A recuperar: jugaron 2 veces o más, no tienen nada próximo y hace más de 30 días que no vienen. */
  const lost = useMemo(() => clients.filter(x => x.completed >= 2 && x.last && x.last < cut && x.upcoming.length === 0).sort((a, b) => b.spent - a.spent), [clients, cut])
  const t = text.trim().toLowerCase()
  const base = seg === 'frequent' ? clients.filter(x => x.frequent) : seg === 'lost' ? lost : clients
  const list = base.filter(x => !t || x.name.toLowerCase().includes(t) || (x.phone || '').includes(t))
  const c = open && clients.find(x => x.key === open)
  const noteKey = c ? `${complex.id}|${c.key}` : ''
  const cUser = c?.playerId ? state.users.find(u => u.id === c.playerId) : null
  const frequentCount = clients.filter(x => x.frequent).length
  const top = useMemo(() => [...clients].sort((a, b) => b.spent - a.spent).filter(x => x.spent > 0).slice(0, 4), [clients])
  const isLost = x => lost.some(l => l.key === x.key)
  const openClient = x => { setOpen(x.key); setNote((state.clientNotes || {})[`${complex.id}|${x.key}`] || '') }
  const saveNote = () => { update(s => { s.clientNotes = { ...(s.clientNotes || {}), [noteKey]: note.trim() } }); toast('Nota guardada.') }
  const markSent = x => { const next = { ...sent, [x.key]: new Date().toISOString() }; setSent(next); try { localStorage.setItem(sentKey(complex.id), JSON.stringify(next)) } catch { /* sin almacenamiento */ } toast('Listo, mensaje abierto en WhatsApp.') }
  const invitedAgo = x => { const d = sent[x.key]; return d ? daysSince(d.slice(0, 10)) : null }
  const segs = [{ v: 'all', l: 'Todos', n: clients.length }, { v: 'frequent', l: 'Frecuentes', n: frequentCount }, { v: 'lost', l: 'A recuperar', n: lost.length }]

  const invite = (x, className) => {
    const ago = invitedAgo(x)
    return <Button variant={ago == null ? 'secondary' : 'ghost'} className={cn('!min-h-11', className)} onClick={() => setWin(x)} aria-label={`Invitar a volver a ${x.name} por WhatsApp`}><MessageCircle size={16} aria-hidden="true" /><span>{ago == null ? 'Invitar' : ago === 0 ? 'Invitado hoy' : 'Reinvitar'}</span></Button>
  }

  const detail = () => c && (<>
    <div className="flex items-center gap-3">
      <Avatar name={c.name} size={52} />
      <div className="min-w-0 flex-1"><p className="display text-2xl font-bold leading-tight truncate">{c.name}</p>
        <p className="text-sm text-muted truncate">{c.frequent ? '★ Cliente frecuente · ' : ''}{[c.phone, cUser?.email].filter(Boolean).join(' · ') || 'Sin contacto'}</p></div>
      {xl && <IconButton label="Cerrar detalle" onClick={() => setOpen(null)} className="-mr-2 -mt-6"><X size={20} /></IconButton>}
    </div>
    {isLost(c) && (
      <div className="mt-4 rounded-2xl bg-warn-soft text-warn p-3.5 flex items-center gap-3">
        <HeartHandshake size={22} className="flex-none" aria-hidden="true" />
        <p className="text-sm flex-1"><strong>Hace {daysSince(c.last)} días</strong> que no viene. Un mensaje amable puede traerlo de vuelta.</p>
        <Button size="sm" className="!min-h-11 flex-none" onClick={() => setWin(c)}>Invitar</Button>
      </div>)}
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-3 py-4 mt-2 [&>div]:p-3 [&>div]:rounded-2xl [&>div]:bg-sunken">
      <Stat label="Reservas" value={c.total} />
      <Stat label="Jugadas" value={c.completed} />
      <Stat label="Generado" value={money(c.spent)} />
      <Stat label="Cancelaciones" value={c.cancelled} />
      <Stat label="No vino" value={c.noShows} />
      <Stat label="Última" value={c.last ? relativeDay(c.last) : '—'} />
    </div>
    {c.habitualCourtId && <p className="mt-3 text-sm">Cancha habitual: <strong>{getCourt(state, c.habitualCourtId)?.name}</strong></p>}
    <div className="grid grid-cols-3 gap-2 mt-4">
      <Button as="a" variant="secondary" size="sm" className="!min-h-11" href={telLink(c.phone)} aria-disabled={!c.phone}><Phone size={16} />Llamar</Button>
      <Button as="a" variant="secondary" size="sm" className="!min-h-11" href={waLink(c.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} />WhatsApp</Button>
      <Button size="sm" className="!min-h-11" onClick={() => { setNewFor(c); setOpen(null) }}><Plus size={16} />Reservar</Button>
    </div>
    <Field label="Notas" className="mt-5" hint="Solo las ves vos. Ej: prefiere la cancha 2, paga siempre en efectivo."><Textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => note.trim() !== ((state.clientNotes || {})[noteKey] || '') && saveNote()} maxLength={500} /></Field>
    <h3 className="font-semibold mt-6 mb-2">Próximas reservas</h3>
    {c.upcoming.length ? <div className="list">{c.upcoming.slice(0, 5).map(b => <BookingRow key={b.id} b={b} state={state} onClick={() => { if (!xl) setOpen(null); setEditing(b.id) }} />)}</div> : <p className="text-sm text-muted">No tiene reservas próximas.</p>}
    <h3 className="font-semibold mt-6 mb-2">Historial</h3>
    <div className="list">{[...c.bookings].filter(b => !c.upcoming.includes(b)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6).map(b => <BookingRow key={b.id} b={b} state={state} onClick={() => { if (!xl) setOpen(null); setEditing(b.id) }} />)}</div>
  </>)

  return (
    <OwnerPage title="Clientes" sub={complex ? `${clients.length} clientes · ${frequentCount} frecuentes` : ''} wide>
      {complex && <>
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-6 xl:items-start">
          <div className="min-w-0">
            <div className="ow-fbar"><div className="ow-filters2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1 lg:pb-0" role="group" aria-label="Segmento">
                {segs.map(s => <Chip key={s.v} active={seg === s.v} onClick={() => setSeg(s.v)} className="!min-h-11">{s.v === 'lost' && <HeartHandshake size={16} aria-hidden="true" />}{s.l}<span className="tnum opacity-75">{s.n}</span></Chip>)}
              </div>
              <div className="relative"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden="true" /><Input type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Buscar por nombre o celular" aria-label="Buscar cliente" className="!pl-10" /></div>
            </div></div>

            {lg && clients.length > 0 && (
              <div className="ow-card ow-strip grid grid-cols-4 divide-x divide-line mt-4">
                {[['Clientes', clients.length, false], ['Frecuentes', frequentCount, false], ['Generado', money(clients.reduce((s, x) => s + x.spent, 0)), false], ['A recuperar', lost.length, lost.length > 0]].map(([k, v, warn]) => (
                  <div key={k} className="px-4 min-[1400px]:px-5 py-3.5 min-w-0"><p className="ow-eyebrow truncate">{k}</p><p className={cn('ow-strip-v display font-bold tnum leading-tight truncate', warn && 'text-warn')}><CountUp value={v} /></p></div>))}
              </div>)}

            {seg === 'lost' && <p className="text-sm text-muted mt-4 lg:mt-3">Jugaron 2 veces o más y hace más de 30 días que no reservan. Un mensaje amable ayuda a que vuelvan.</p>}

            <div className="mt-4">
              {list.length === 0 ? <div className="list"><Empty icon={seg === 'lost' ? HeartHandshake : Users} title={t ? 'No encontramos ese cliente' : seg === 'lost' ? 'Nadie para recuperar' : seg === 'frequent' ? 'Todavía no hay frecuentes' : 'Todavía no hay clientes'} text={t ? 'Probá con otro nombre o celular.' : seg === 'lost' ? 'Tus clientes siguen viniendo. Cuando alguien deje de venir un mes, aparece acá.' : seg === 'frequent' ? 'Un cliente es frecuente desde su quinta reserva.' : 'Se arman solos con cada reserva que recibís o cargás.'} /></div>
                : lg ? (
                  <div className="ow-card ow-table">
                    <div className={cn('ow-th ow-cl', seg === 'lost' && 'is-lost')} aria-hidden="true"><span className="c-who">Cliente</span><span className="c-cnt">Reservas</span><span className="c-last">Última vez</span><span className="c-next">Próxima</span><span className="c-amount">Generado</span><span className="c-act" /></div>
                    <Stagger step={.02} className="contents">{list.map(x => {
                      const lostX = isLost(x), nx = x.upcoming[0], pl0 = playedLast(x)
                      return (
                        <Item key={x.key} className={cn('ow-tr is-btn ow-cl', seg === 'lost' && 'is-lost', open === x.key && xl && 'is-on')} style={{ '--accent': lostX ? 'var(--warn)' : 'transparent' }}>
                          <div className="c-who">
                            <span className="relative flex-none"><Avatar name={x.name} />{x.frequent && <Star size={16} className="absolute -right-1 -bottom-1 fill-current text-warn bg-surface rounded-full" aria-label="Cliente frecuente" />}</span>
                            <span className="min-w-0"><button type="button" onClick={() => openClient(x)} className="block max-w-full font-semibold truncate text-left after:absolute after:inset-0 after:content-[''] focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-[var(--brand)]">{x.name}{x.frequent && <span className="sr-only"> (frecuente)</span>}</button>
                              <span className="block text-sm text-muted truncate tnum">{x.phone || 'Sin celular'}</span></span>
                          </div>
                          <span className="c-cnt tnum font-semibold">{x.total}</span>
                          <span className={cn('c-last tnum', lostX && '!text-warn font-medium')}><span className="ow-nonly">{pl(x.total, 'reserva', 'reservas')} · </span>{pl0 ? (lostX ? hace(daysSince(pl0)) : relativeDay(pl0)) : '—'}</span>
                          <span className="c-next text-muted tnum truncate">{nx ? relativeDay(nx.date) : '—'}</span>
                          <span className="c-amount tnum"><span className="block font-semibold">{money(x.spent)}</span></span>
                          <span className="c-act relative z-10">{lostX && seg === 'lost' ? invite(x) : <ChevronRight size={18} className="c-go" aria-hidden="true" />}</span>
                        </Item>)
                    })}</Stagger>
                  </div>
                ) : (
                  <Stagger className="list" step={.025}>{list.map(x => (
                    <Item key={x.key} className="row relative">
                      <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-left self-stretch -my-3 py-3" onClick={() => openClient(x)}>
                        <span className="relative flex-none"><Avatar name={x.name} />{x.frequent && <Star size={16} className="absolute -right-1 -bottom-1 fill-current text-warn bg-surface rounded-full" aria-label="Cliente frecuente" />}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold truncate">{x.name}{x.frequent && <span className="sr-only"> (frecuente)</span>}</span>
                          <span className={cn('block text-sm truncate tnum', seg === 'lost' ? 'text-warn' : 'text-muted')}>{pl(x.total, 'reserva', 'reservas')}{playedLast(x) ? ` · última ${seg === 'lost' ? hace(daysSince(playedLast(x))) : relativeDay(playedLast(x)).toLowerCase()}` : ''}</span>
                        </span>
                        {seg !== 'lost' && <span className="text-right flex-none"><span className="block font-semibold tnum">{money(x.spent)}</span><span className="block text-xs text-muted">generados</span></span>}
                      </button>
                      {seg === 'lost' ? invite(x, 'flex-none') : <ChevronRight size={18} className="text-faint flex-none -mr-1" aria-hidden="true" />}
                    </Item>))}</Stagger>)}
            </div>
          </div>

          {xl && (
            <aside ref={stickyRef} className="min-w-0 xl:sticky xl:self-start flex flex-col gap-4" aria-label="Detalle del cliente">
              {c ? <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="ow-card p-5">{detail()}</motion.div> : (<>
                <section className="ow-card p-5" aria-labelledby="ow-lost">
                  <div className="flex items-center gap-3"><span className="ow-ico warn"><HeartHandshake size={20} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1"><h2 id="ow-lost" className="display text-xl font-bold leading-tight">A recuperar</h2><p className="text-sm text-muted">Jugaban seguido y hace más de 30 días que no vienen.</p></div></div>
                  {lost.length === 0
                    ? <p className="mt-4 rounded-2xl bg-brand-soft text-brand px-4 py-3 font-medium text-sm">Nadie por ahora: tus clientes siguen viniendo.</p>
                    : <ul className="mt-3 -mx-2">{lost.slice(0, 4).map(x => (
                      <li key={x.key} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sunken transition-colors">
                        <Avatar name={x.name} />
                        <button type="button" onClick={() => openClient(x)} className="flex-1 min-w-0 text-left min-h-11"><span className="block font-semibold truncate">{x.name}</span><span className="block text-sm text-warn truncate tnum">{hace(daysSince(x.last))} · {pl(x.completed, 'partido', 'partidos')}</span></button>
                        {invite(x, 'flex-none')}
                      </li>))}</ul>}
                  {lost.length > 4 && <Button variant="ghost" className="w-full mt-2" onClick={() => setSeg('lost')}>Ver los {lost.length}<ChevronRight size={16} aria-hidden="true" /></Button>}
                </section>
                {top.length > 0 && (
                  <section className="ow-card p-5" aria-labelledby="ow-top">
                    <div className="flex items-center gap-3"><span className="ow-ico grad"><Trophy size={20} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1"><h2 id="ow-top" className="display text-xl font-bold leading-tight">Tus mejores clientes</h2><p className="text-sm text-muted">Los que más generaron.</p></div></div>
                    <ol className="mt-3 -mx-2">{top.map((x, i) => (
                      <li key={x.key}><button type="button" onClick={() => openClient(x)} className="flex items-center gap-3 px-2 py-2 w-full text-left rounded-xl hover:bg-sunken transition-colors min-h-14">
                        <span className="display text-2xl font-bold text-faint w-6 text-center tnum">{i + 1}</span><Avatar name={x.name} />
                        <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{x.name}</span><span className="block text-sm text-muted tnum">{pl(x.total, 'reserva', 'reservas')}</span></span>
                        <span className="font-semibold tnum">{money(x.spent)}</span>
                      </button></li>))}</ol>
                  </section>)}
              </>)}
            </aside>)}
        </div>

        <Sheet open={!!c && !xl} onClose={() => setOpen(null)} title="" wide>{!xl && detail()}</Sheet>
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
        {newFor && <NewBookingSheet open onClose={() => setNewFor(null)} complex={complex} preset={{ name: newFor.name, phone: newFor.phone, courtId: newFor.habitualCourtId || undefined }} />}
        {win && <WinbackSheet client={win} complex={complex} ownerName={user.name} onClose={() => setWin(null)} onSent={() => markSent(win)} />}
      </>}
    </OwnerPage>
  )
}
