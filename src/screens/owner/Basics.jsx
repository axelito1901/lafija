import { useMemo, useState } from 'react'
import { Star, CalendarDays, CalendarPlus, Check, ChevronRight, CircleCheck, Clock3, HandCoins, Lock, MessageCircle, Phone, Plus, Repeat2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { dayStatus, slotInfo, slotsFor, balanceOf, WEEKDAYS, decideFixed, activeCourts, bookingEnd, clientsOf, effStatus, freeSlots, getCourt, STATUS, STATUS_ORDER } from '../../lib/domain'
import { MessageSheet } from '../../ui/MessageSheet'
import { cn, dateLong, addDays, dateHeading, dateShort, money, relativeDay, telLink, todayISO, waLink } from '../../lib/format'
import { Link, navigate, useRoute } from '../../lib/router'
import { Avatar, Button, Empty, Field, Input, Section, Segmented, Select, Sheet, Stat, Textarea, useToast } from '../../ui/kit'
import { BookingRow } from '../../ui/shared'
import { Item, Stagger, CountUp } from '../../ui/motion'
import { HeatStrip, Kpi, Ring } from '../../ui/dash'
import { BlockSheet, BookingEditor, NewBookingSheet, OwnerPage, useOwner } from './common'

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
    <section className="mb-8 border border-line rounded-2xl bg-surface p-4 shadow-[var(--sh-1)]">
      <div className="flex items-baseline justify-between gap-3"><h2 className="text-lg">Completá tu complejo</h2><span className="text-sm text-muted tnum">{done} de {items.length}</span></div>
      <div className="h-2 rounded-full bg-sunken mt-2 overflow-hidden"><div className="h-full bg-[image:var(--grad-brand)] rounded-full transition-all duration-700" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <p className="text-sm text-muted mt-2">Los complejos con foto y ubicación reciben muchas más reservas.</p>
      <ul className="mt-3">{items.map(([label, ok, to]) => (
        <li key={label}><Link to={to} className={`flex items-center gap-3 min-h-11 ${ok ? 'text-muted line-through' : 'font-medium'}`}>
          <span className={`size-5 rounded-full border-2 grid place-items-center flex-none ${ok ? 'bg-brand border-brand text-[var(--brand-ink)]' : 'border-strong'}`}>{ok && <Check size={12} strokeWidth={3} />}</span>{label}{!ok && <ChevronRight size={16} className="ml-auto text-faint" />}
        </Link></li>))}</ul>
    </section>
  )
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches' }

const ATTN_TONE = { danger: 'bg-danger-soft text-danger', warn: 'bg-warn-soft text-warn', ok: 'bg-brand-soft text-brand' }

export function OwnerHome() {
  const { state, user, update } = useStore()
  const toast = useToast()
  const { complex } = useOwner()
  const [editing, setEditing] = useState('')
  const [sheet, setSheet] = useState('')
  const [remind, setRemind] = useState('')
  const [preset, setPreset] = useState({})
  const [allTomorrow, setAllTomorrow] = useState(false)
  const now = new Date(), today = todayISO()
  const mine = complex ? state.bookings.filter(b => b.complexId === complex.id && !b._busy) : []
  const day = complex ? dayStatus(state, complex, today, now) : null
  const heat = useMemo(() => { // eslint-disable-line
    if (!complex) return []
    const cs = activeCourts(state, complex.id)
    return slotsFor(complex).map(t => { const n = cs.filter(c => slotInfo(state, complex, c, today, t, now).kind === 'booked').length; return { t, n, of: cs.length, pct: cs.length ? Math.round(n / cs.length * 100) : 0 } })
  }, [state, complex]) // eslint-disable-line
  const nowT = `${String(now.getHours()).padStart(2, '0')}:00`
  const live = b => ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(b, now)) && bookingEnd(b) >= now
  const pendingPay = mine.filter(b => effStatus(b, now) === 'pending' && bookingEnd(b) >= now)
  const owedToday = mine.filter(b => b.date === today && ['deposit_paid', 'confirmed'].includes(effStatus(b, now)) && balanceOf(b) > 0)
  const toRemind = mine.filter(b => live(b) && balanceOf(b) > 0 && b.date <= addDays(today, 7) && b.phone).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const blocked = complex ? state.courts.filter(c => c.complexId === complex.id && c.status === 'blocked') : []
  const newOnes = (state.notifications || []).filter(n => n.userId === user.id && n.type === 'booking_new' && !n.read && (!n.complexId || n.complexId === complex?.id))
  const unanswered = complex ? state.reviews.filter(r => r.complexId === complex.id && !r.hidden && !r.reply) : []
  const requests = complex ? (state.fixedRequests || []).filter(r => r.complexId === complex.id && r.status === 'pending') : []
  const tomorrow = mine.filter(b => b.date === addDays(today, 1) && ['deposit_paid', 'confirmed'].includes(effStatus(b, now))).sort((a, b) => a.time.localeCompare(b.time))
  const upcoming = mine.filter(live).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5)
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

  return (
    <OwnerPage title={`${greeting()}, ${user.name.split(' ')[0]}`} sub={`Hoy · ${dateLong(today)}`}>
      {complex && day && <>
        <Stagger>
        <Item className="hero p-5 lg:p-6">
          <div className="flex items-center gap-5">
            <Ring pct={day.pct}><div><div className="display text-4xl font-bold tnum leading-none"><CountUp value={`${day.pct}%`} /></div><div className="text-xs uppercase tracking-widest opacity-85 mt-1">ocupación</div></div></Ring>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />Hoy en {complex.name}</p>
              <p className="display text-2xl lg:text-3xl font-bold leading-tight mt-2">{day.taken} de {day.total} turnos ocupados</p>
              <p className="opacity-90 mt-1 text-sm">{day.peak ? `Mayor demanda a las ${day.peak.t}` : 'Todavía sin reservas'}{day.next ? <> · <button type="button" className="underline underline-offset-2 font-semibold" onClick={() => { setPreset({ date: today, courtId: day.next.court.id, time: day.next.t }); setSheet('new') }}>próximo libre {day.next.t}</button></> : ' · no quedan libres'}</p>
            </div>
          </div>
        </Item>

        <Item className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Kpi icon={CalendarDays} label="Reservas hoy" value={day.bookings.length} />
          <Kpi icon={HandCoins} label="Recaudado hoy" value={money(day.collected)} />
          <Kpi icon={CircleCheck} label="Confirmadas" value={day.confirmed} />
          <Kpi icon={Clock3} label="Pendientes" value={day.pending} tone={day.pending ? 'warn' : 'brand'} />
        </Item>

        <Item>
        <Section title="Demanda por horario" className="!mt-6">
          <div className="border border-line rounded-2xl bg-surface p-4 shadow-[var(--sh-1)]">
            <HeatStrip rows={heat} nowT={nowT} />
            <p className="text-sm text-muted mt-3 tnum"><strong className="text-ink">{day.free}</strong> {day.free === 1 ? 'turno disponible' : 'turnos disponibles'} · el borde dorado marca la hora actual</p>
          </div>
        </Section>
        </Item>
        </Stagger>

        <Section title="Atención">
          {attention.length === 0
            ? <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-soft text-brand"><span className="size-10 rounded-xl grid place-items-center bg-surface flex-none"><CircleCheck size={20} /></span><span className="font-semibold">Todo está en orden</span></div>
            : <Stagger className="grid gap-2.5 sm:grid-cols-2">{attention.map(a => (
              <Item as="button" key={a.text} type="button" whileTap={{ scale: .98 }} className="flex items-center gap-3 text-left p-3.5 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] card-lift" onClick={a.go}>
                <span className={cn('size-10 rounded-xl grid place-items-center flex-none', ATTN_TONE[a.tone])}><a.icon size={20} aria-hidden="true" /></span>
                <span className="flex-1 font-medium">{a.text}</span><ChevronRight size={18} className="text-faint flex-none" />
              </Item>))}</Stagger>}
        </Section>

        <Section title="Acciones rápidas">
          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[[Plus, 'Nueva reserva', () => { setPreset({}); setSheet('new') }, true], [Lock, 'Bloquear horario', () => setSheet('block')], [CalendarDays, 'Ver agenda', () => navigate('/dueno/agenda')], [HandCoins, 'Recordar pago', () => setSheet('remind')]].map(([I, l, fn, main]) => (
              <Item as="button" key={l} type="button" whileTap={{ scale: .95 }} whileHover={{ y: -2 }} onClick={fn} data-tour={main ? 'nueva-reserva' : undefined}
                className={cn('flex flex-col items-start gap-6 p-4 rounded-2xl text-left font-semibold min-h-28', main ? 'bg-[image:var(--grad-brand)] text-[var(--on-grad)] shadow-[0_14px_26px_-12px_color-mix(in_srgb,var(--brand)_80%,transparent)]' : 'bg-surface border border-line shadow-[var(--sh-1)]')}>
                <span className={cn('size-10 rounded-xl grid place-items-center', main ? 'bg-white/20' : 'bg-brand-soft text-brand')}><I size={20} aria-hidden="true" /></span>{l}
              </Item>))}
          </Stagger>
        </Section>

        <div className="mt-8"><Checklist complex={complex} courts={state.courts.filter(c => c.complexId === complex.id)} /></div>

        {requests.length > 0 && (
          <Section title={`Pedidos de turno fijo (${requests.length})`} className="!mt-0 scroll-mt-20"><div id="turnos-fijos" />
            <div className="space-y-3">{requests.map(r => (
              <div key={r.id} className="p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
                <div className="font-semibold">{r.playerName}</div>
                <div className="text-sm text-muted">Todos los {WEEKDAYS[r.weekday]} a las {r.time} · {state.courts.find(c => c.id === r.courtId)?.name} · {r.weeks} semanas</div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => decide(r, false)}>Rechazar</Button>
                  <Button size="sm" onClick={() => decide(r, true)}>Aprobar</Button>
                </div>
              </div>))}</div>
          </Section>
        )}
        {tomorrow.length > 0 && (
          <Section title={`Recordatorios de mañana (${tomorrow.length})`}>
            <div className="list">{tomorrow.slice(0, allTomorrow ? 99 : 3).map(b => (
              <div key={b.id} className="row">
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{b.playerName}</div><div className="text-sm text-muted tnum">{b.time} · {state.courts.find(c => c.id === b.courtId)?.name}</div></div>
                {b.reminderAt ? <span className="text-sm text-brand font-medium flex-none">Enviado</span> : <Button size="sm" variant="secondary" disabled={!b.phone} onClick={() => setRemind({ id: b.id, kind: 'recordatorio' })}>Recordar</Button>}
              </div>))}</div>
            {tomorrow.length > 3 && !allTomorrow && <Button variant="ghost" className="mt-2" onClick={() => setAllTomorrow(true)}>Ver los {tomorrow.length}</Button>}
          </Section>
        )}
        <Section title="Próximos turnos" action={<Link to="/dueno/agenda" className="btn btn-link btn-sm">Ver agenda</Link>}>
          {upcoming.length ? <div className="list">{upcoming.map(b => <BookingRow key={b.id} b={b} state={state} who onClick={() => setEditing(b.id)} />)}</div>
            : <div className="list"><Empty title="No hay turnos próximos" text="Cargá una reserva o compartí tu complejo para recibir las primeras." action={<Button onClick={() => { setPreset({}); setSheet('new') }}><Plus size={18} />Nueva reserva</Button>} /></div>}
        </Section>

        {sheet === 'new' && <NewBookingSheet open onClose={() => setSheet('')} complex={complex} preset={preset} />}
        {sheet === 'block' && <BlockSheet open onClose={() => setSheet('')} complex={complex} />}
        <Sheet open={sheet === 'remind'} onClose={() => setSheet('')} title="Recordar pago">
          {toRemind.length === 0 ? <Empty title="No hay pagos pendientes" text="Cuando un turno tenga saldo por cobrar, aparece acá." /> : (<>
            <p className="text-muted mb-3">Turnos de los próximos 7 días con saldo por cobrar.</p>
            <div className="list">{toRemind.map(b => (
              <div key={b.id} className="row">
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{b.playerName}</div><div className="text-sm text-muted tnum">{relativeDay(b.date)} · {b.time} · debe {money(balanceOf(b))}</div></div>
                <Button size="sm" variant="secondary" onClick={() => { setSheet(''); setRemind({ id: b.id, kind: 'pago' }) }}>Recordar</Button>
              </div>))}</div></>)}
        </Sheet>
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
        {remind && <MessageSheet bookingId={remind.id} initial={remind.kind} kinds={['pago', 'recordatorio', 'confirmacion']} onClose={() => setRemind('')} onSent={k => { if (k === 'recordatorio') update(s => { s.bookings.find(x => x.id === remind.id).reminderAt = new Date().toISOString() }) }} />}
      </>}
    </OwnerPage>
  )
}

export function OwnerBookings() {
  const { state } = useStore()
  const { complex } = useOwner()
  const { query } = useRoute()
  const [period, setPeriod] = useState('next')
  const [estado, setEstado] = useState(query.estado || '')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(30)
  const [editing, setEditing] = useState('')
  const [creating, setCreating] = useState(false)
  const now = new Date(), today = todayISO()

  const list = useMemo(() => {
    if (!complex) return []
    const t = text.trim().toLowerCase()
    return state.bookings.filter(b => b.complexId === complex.id)
      .filter(b => period === 'today' ? b.date === today : period === 'next' ? b.date >= today : b.date < today)
      .filter(b => !estado || effStatus(b, now) === estado)
      .filter(b => !t || b.playerName.toLowerCase().includes(t) || (b.phone || '').includes(t))
      .sort((a, b) => period === 'past' ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time))
  }, [state.bookings, complex, period, estado, text]) // eslint-disable-line
  const shown = list.slice(0, limit)
  const groups = shown.reduce((m, b) => { (m[b.date] ||= []).push(b); return m }, {})

  return (
    <OwnerPage title="Reservas" actions={<Button size="sm" onClick={() => setCreating(true)}><Plus size={16} />Nueva reserva</Button>}>
      {complex && <>
        <Segmented scrollTop value={period} onChange={v => { setPeriod(v); setLimit(30) }} label="Período" options={[{ value: 'today', label: 'Hoy' }, { value: 'next', label: 'Próximas' }, { value: 'past', label: 'Anteriores' }]} />
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Buscar cliente o celular" aria-label="Buscar" type="search" />
          <Select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}</Select>
        </div>
        <div className="mt-5 space-y-5">
          {list.length === 0 && <Empty title={estado || text ? 'No hay reservas con ese filtro' : period === 'today' ? 'No tenés reservas para hoy' : period === 'next' ? 'No tenés reservas próximas' : 'No hay reservas anteriores'} text={estado || text ? 'Probá con otro estado o borrá la búsqueda.' : ''} action={estado || text ? <Button variant="secondary" onClick={() => { setEstado(''); setText('') }}>Ver todas</Button> : period !== 'past' && <Button onClick={() => setCreating(true)}><Plus size={18} />Crear reserva</Button>} />}
          {Object.entries(groups).map(([d, bs]) => (
            <section key={d}><h2 className="text-sm font-semibold text-muted mb-2">{dateHeading(d)}</h2>
              <div className="list">{bs.map(b => <BookingRow key={b.id} b={b} state={state} who showDate={false} onClick={() => setEditing(b.id)} />)}</div></section>
          ))}
          {list.length > limit && <Button variant="secondary" className="w-full" onClick={() => setLimit(limit + 30)}>Ver más ({list.length - limit})</Button>}
        </div>
        {creating && <NewBookingSheet open onClose={() => setCreating(false)} complex={complex} />}
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
      </>}
    </OwnerPage>
  )
}

export function OwnerClients() {
  const { state, update } = useStore()
  const toast = useToast()
  const { complex } = useOwner()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(null)
  const [editing, setEditing] = useState('')
  const [note, setNote] = useState('')
  const [newFor, setNewFor] = useState(null)
  const clients = useMemo(() => complex ? clientsOf(state, [complex.id]) : [], [state, complex])
  const t = text.trim().toLowerCase()
  const list = clients.filter(c => !t || c.name.toLowerCase().includes(t) || (c.phone || '').includes(t))
  const c = open && clients.find(x => x.key === open)
  const noteKey = c ? `${complex.id}|${c.key}` : ''
  const user = c?.playerId ? state.users.find(u => u.id === c.playerId) : null
  const frequentCount = clients.filter(x => x.frequent).length
  const openClient = x => { setOpen(x.key); setNote((state.clientNotes || {})[`${complex.id}|${x.key}`] || '') }
  const saveNote = () => { update(s => { s.clientNotes = { ...(s.clientNotes || {}), [noteKey]: note.trim() } }); toast('Nota guardada.') }
  return (
    <OwnerPage title="Clientes" sub={complex ? `${clients.length} clientes · ${frequentCount} frecuentes` : ''}>
      {complex && <>
        <Input type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Buscar por nombre o celular" aria-label="Buscar cliente" className="sm:max-w-sm" />
        <div className="mt-4">
          {list.length === 0 ? <Empty title={t ? 'No encontramos ese cliente' : 'Todavía no hay clientes'} text={t ? 'Probá con otro nombre o celular.' : 'Se arman solos con cada reserva que recibís o cargás.'} /> : (
            <Stagger className="list" step={.025}>{list.map(x => (
              <Item as="button" key={x.key} type="button" className="row" onClick={() => openClient(x)}>
                <span className="relative flex-none"><Avatar name={x.name} />{x.frequent && <Star size={16} className="absolute -right-1 -bottom-1 fill-current text-warn bg-surface rounded-full" aria-label="Cliente frecuente" />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{x.name}{x.frequent && <span className="sr-only"> (frecuente)</span>}</span>
                  <span className="block text-sm text-muted truncate tnum">{x.total} {x.total === 1 ? 'reserva' : 'reservas'}{x.last ? ` · última ${relativeDay(x.last).toLowerCase()}` : ''}</span>
                </span>
                <span className="text-right flex-none"><span className="block font-semibold tnum">{money(x.spent)}</span><span className="block text-xs text-muted">generados</span></span>
                <ChevronRight size={18} className="text-faint flex-none -mr-1" />
              </Item>))}</Stagger>)}
        </div>
        <Sheet open={!!c} onClose={() => setOpen(null)} title="" wide>
          {c && <>
            <div className="flex items-center gap-3">
              <Avatar name={c.name} size={48} />
              <div className="min-w-0"><p className="display text-2xl font-bold leading-tight truncate">{c.name}</p>
                <p className="text-sm text-muted truncate">{c.frequent ? '★ Cliente frecuente · ' : ''}{[c.phone, user?.email].filter(Boolean).join(' · ') || 'Sin contacto'}</p></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 mt-2 [&>div]:p-3 [&>div]:rounded-2xl [&>div]:bg-sunken">
              <Stat label="Reservas" value={c.total} />
              <Stat label="Jugadas" value={c.completed} />
              <Stat label="Generado" value={money(c.spent)} />
              <Stat label="Cancelaciones" value={c.cancelled} />
              <Stat label="No vino" value={c.noShows} />
              <Stat label="Última" value={c.last ? relativeDay(c.last) : '—'} />
            </div>
            {c.habitualCourtId && <p className="mt-3 text-sm">Cancha habitual: <strong>{getCourt(state, c.habitualCourtId)?.name}</strong></p>}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Button as="a" variant="secondary" size="sm" href={telLink(c.phone)} aria-disabled={!c.phone}><Phone size={16} />Llamar</Button>
              <Button as="a" variant="secondary" size="sm" href={waLink(c.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} />WhatsApp</Button>
              <Button size="sm" onClick={() => { setNewFor(c); setOpen(null) }}><Plus size={16} />Reservar</Button>
            </div>
            <Field label="Notas" className="mt-5" hint="Solo las ves vos. Ej: prefiere la cancha 2, paga siempre en efectivo."><Textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => note.trim() !== ((state.clientNotes || {})[noteKey] || '') && saveNote()} maxLength={500} /></Field>
            <h3 className="font-semibold mt-6 mb-2">Próximas reservas</h3>
            {c.upcoming.length ? <div className="list">{c.upcoming.slice(0, 5).map(b => <BookingRow key={b.id} b={b} state={state} onClick={() => { setOpen(null); setEditing(b.id) }} />)}</div> : <p className="text-sm text-muted">No tiene reservas próximas.</p>}
            <h3 className="font-semibold mt-6 mb-2">Historial</h3>
            <div className="list">{[...c.bookings].filter(b => !c.upcoming.includes(b)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6).map(b => <BookingRow key={b.id} b={b} state={state} onClick={() => { setOpen(null); setEditing(b.id) }} />)}</div>
          </>}
        </Sheet>
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
        {newFor && <NewBookingSheet open onClose={() => setNewFor(null)} complex={complex} preset={{ name: newFor.name, phone: newFor.phone, courtId: newFor.habitualCourtId || undefined }} />}
      </>}
    </OwnerPage>
  )
}
