import { useEffect, useState, useSyncExternalStore } from 'react'
import { Check, ChevronDown, Flag, HandCoins, MessageCircle, Mic, Phone, Plus, Repeat2 } from 'lucide-react'
import { listen, parseDictation, speechSupported } from '../../lib/voice'
import { useStore } from '../../lib/store'
import { notify, reportOf, resolveReport, REPORT_KINDS, waitingFor, placeBooking, balanceOf, bookingStart, cancelBooking, clientsOf, courtsOf, depositFor, effStatus, getComplex, getCourt, ownerComplexes, paymentLabel, quote, slotInfo, slotsFor, STATUS } from '../../lib/domain'
import { dateShort, addDays, cn, dateLong, money, slotEnd, slugify, telLink, todayISO, uid, waLink } from '../../lib/format'
import { navigate } from '../../lib/router'
import { Button, Content, Empty, Field, Input, MoneyInput, PageHeader, Segmented, Select, Sheet, Textarea, useConfirm, useToast } from '../../ui/kit'
import { BookingStatus } from '../../ui/shared'
import { DateField } from '../../ui/DateField'
import { MessageSheet } from '../../ui/MessageSheet'
import './panel.css'

/* Media query reactiva (para elegir entre un panel lateral en PC y un Sheet en pantallas chicas). */
export function useMedia(query) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
  const [on, setOn] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query), f = () => setOn(mq.matches)
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [query])
  return on
}

/* ---------- Complejo seleccionado (compartido entre pantallas) ---------- */
const KEY = 'lafija-owner-complex'
let sel = localStorage.getItem(KEY) || ''
const subs = new Set()
const setSel = id => { sel = id; localStorage.setItem(KEY, id); subs.forEach(f => f()) }
export function useOwner() {
  const { state, user } = useStore()
  const picked = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => sel)
  const mine = ownerComplexes(state, user.id)
  const complex = mine.find(c => c.id === picked) || mine[0] || null
  return { mine, complex, courts: complex ? courtsOf(state, complex.id) : [], setComplexId: setSel }
}

export function ComplexSwitch() {
  const { mine, complex, setComplexId } = useOwner()
  const [open, setOpen] = useState(false)
  if (mine.length < 2) return null
  return (
    <>
      <button type="button" className="chip mb-4" onClick={() => setOpen(true)} aria-haspopup="dialog">{complex.name}<ChevronDown size={16} /></button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Elegir complejo">
        <div className="list">
          {mine.map(c => (
            <button key={c.id} type="button" className="row" onClick={() => { setComplexId(c.id); setOpen(false) }}>
              <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.name}</span><span className="block text-sm text-muted truncate">{c.city}{!c.active && ' · Desactivado por La Fija'}</span></span>
              {c.id === complex.id && <Check size={20} className="text-brand" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

export function NewComplexSheet({ open, onClose }) {
  const { update, user } = useStore()
  const { setComplexId } = useOwner()
  const toast = useToast()
  const [f, setF] = useState({ name: '', city: '', address: '' })
  const [err, setErr] = useState('')
  const save = () => {
    if (!f.name.trim()) { setErr('Escribí el nombre del complejo.'); return }
    const id = uid('complex')
    update(s => s.complexes.push({
      id, ownerId: user.id, name: f.name.trim(), slug: `${slugify(f.name)}-${id.slice(-4)}`, city: f.city.trim(), address: f.address.trim(), lat: null, lng: null,
      phone: user.phone || '', whatsapp: user.phone || '', description: '', services: [], coverUrl: '', gallery: [], active: true, public: true, createdAt: new Date().toISOString(),
      approval: 'pending',
      hours: { open: '10:00', close: '00:00', slotMinutes: 60 },
      booking: { depositRequired: true, depositType: 'percent', depositPercent: 30, depositFixedCents: 0, allowFullPayment: true, cancellationHours: 6, refundPolicy: 'full', payWithinMinutes: 30 },
    }))
    update(s => s.users.filter(u => u.role === 'admin').forEach(a => notify(s, { userId: a.id, type: 'complex_review', title: 'Complejo para revisar', text: `${f.name.trim()} · ${f.city.trim()}`, complexId: id, link: '/admin/complejos' })))
    setComplexId(id); toast('Complejo creado. Lo revisamos y te avisamos cuando esté publicado.'); setF({ name: '', city: '', address: '' }); onClose(); navigate('/dueno/complejo')
  }
  return (
    <Sheet open={open} onClose={onClose} title="Nuevo complejo" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>Crear complejo</Button></>}>
      <div className="space-y-4">
        <Field label="Nombre" error={err}><Input value={f.name} onChange={e => { setF({ ...f, name: e.target.value }); setErr('') }} /></Field>
        <Field label="Ciudad o barrio"><Input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></Field>
        <Field label="Dirección"><Input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} autoComplete="street-address" /></Field>
      </div>
    </Sheet>
  )
}

/* Envoltorio de pantallas del dueño: encabezado, selector de complejo y estado vacío */
export function OwnerPage({ title, sub, actions, children, wide }) {
  const { complex } = useOwner()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader title={title} sub={sub} actions={actions} />
      <Content className={wide ? 'max-w-[1536px] ow-wide' : ''}>
        {!complex
          ? <Empty title="Todavía no tenés complejos" text="Creá el primero para cargar canchas y recibir reservas." action={<Button onClick={() => setCreating(true)}><Plus size={18} />Crear complejo</Button>} />
          : <><ComplexSwitch />{complex.approval === 'pending' && <div className="mb-5 rounded-lg bg-warn-soft text-warn px-4 py-3"><p className="font-semibold">Tu complejo está en revisión</p><p className="text-sm">Lo revisamos en 24 a 48 horas. Mientras tanto podés cargar canchas, precios y fotos: los jugadores lo van a ver cuando esté aprobado.</p></div>}
            {complex.approval === 'rejected' && <div className="mb-5 rounded-lg bg-danger-soft text-danger px-4 py-3"><p className="font-semibold">No pudimos aprobar tu complejo</p><p className="text-sm">Escribinos desde Ayuda para ver qué falta.</p></div>}
            {children}</>}
      </Content>
      <NewComplexSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

const Info = ({ k, children }) => <div className="flex items-baseline justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right tnum">{children}</dd></div>

/* ---------- Ver / editar una reserva ---------- */
export function BookingEditor({ bookingId, onClose }) {
  const { state, update } = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const b = state.bookings.find(x => x.id === bookingId)
  const [f, setF] = useState(() => b && ({ name: b.playerName, phone: b.phone, courtId: b.courtId, date: b.date, time: b.time, total: b.totalCents, note: b.note || '' }))
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [reply, setReply] = useState('')
  if (!b) return null
  const rep = reportOf(state, b.id)
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const st = effStatus(b)
  const live = ['pending', 'deposit_paid', 'confirmed'].includes(st)
  const started = bookingStart(b) <= new Date()
  const rest = balanceOf(b)
  const dirty = f.name !== b.playerName || f.phone !== b.phone || f.courtId !== b.courtId || f.date !== b.date || f.time !== b.time || f.total !== b.totalCents || f.note !== (b.note || '')

  const run = (fn, msg) => { try { update(s => fn(s.bookings.find(x => x.id === bookingId), s)); toast(msg) } catch (e) { toast(e.message, 'error') } }
  const save = () => {
    if (!f.name.trim()) { setErr('Escribí el nombre del cliente.'); return }
    try {
      update(s => {
        const x = s.bookings.find(y => y.id === bookingId)
        const moved = f.courtId !== x.courtId || f.date !== x.date || f.time !== x.time
        if (moved) {
          const other = { ...s, bookings: s.bookings.filter(y => y.id !== bookingId) }
          const info = slotInfo(other, getComplex(s, x.complexId), getCourt(s, f.courtId), f.date, f.time)
          if (info.kind !== 'free') throw new Error(info.kind === 'past' ? 'Ese horario ya pasó.' : 'Ese horario no está libre.')
        }
        Object.assign(x, { playerName: f.name.trim(), phone: f.phone.trim(), courtId: f.courtId, date: f.date, time: f.time, totalCents: f.total, note: f.note.trim() })
        x.paymentStatus = x.paidCents >= x.totalCents && x.totalCents > 0 ? 'paid' : x.paidCents > 0 ? 'partial' : 'pending'
      })
      setErr(''); toast('Cambios guardados.')
    } catch (e) { setErr(e.message) }
  }
  const cancel = async () => {
    const msg = b.paidCents > 0 ? `Se le devuelven ${money(b.paidCents)} al cliente y el horario queda libre.` : 'El horario queda libre.'
    if (await confirm({ title: '¿Cancelar la reserva?', message: msg, confirmLabel: 'Cancelar reserva', cancelLabel: 'No cancelar', danger: true })) { update(s => cancelBooking(s, b.id, 'owner')); toast('Reserva cancelada.'); onClose() }
  }
  const slotChoices = court ? slotsFor(complex).filter(t => t === b.time && f.courtId === b.courtId && f.date === b.date || slotInfo({ ...state, bookings: state.bookings.filter(y => y.id !== bookingId) }, complex, getCourt(state, f.courtId), f.date, t).kind === 'free') : []

  const initialKind = st === 'cancelled' ? 'cancelacion' : st === 'pending' ? 'pago' : b.date <= addDays(todayISO(), 1) ? 'recordatorio' : 'confirmacion'
  const cancelSeries = async () => {
    const rest2 = state.bookings.filter(x => x.seriesId === b.seriesId && x.date >= b.date && ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(x)))
    if (!await confirm({ title: `¿Cancelar ${rest2.length} reservas?`, message: 'Se cancelan esta y todas las siguientes de la reserva fija.', confirmLabel: 'Cancelar todas', cancelLabel: 'No cancelar', danger: true })) return
    update(s2 => rest2.forEach(x => cancelBooking(s2, x.id, 'owner'))); toast('Reservas canceladas.'); onClose()
  }
  return (<>
    <Sheet open onClose={onClose} title="Reserva" wide footer={dirty ? <><Button variant="secondary" onClick={() => setF({ name: b.playerName, phone: b.phone, courtId: b.courtId, date: b.date, time: b.time, total: b.totalCents, note: b.note || '' })}>Descartar</Button><Button onClick={save}>Guardar cambios</Button></> : null}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="font-semibold text-lg leading-tight truncate">{b.playerName}</p><p className="text-muted">{court?.name} · {b.time} a {slotEnd(b.time, b.durationMin || 60)}</p></div>
        <BookingStatus booking={b} />
      </div>
      {rep && rep.status === 'open' && (
        <div className="mt-3 rounded-2xl bg-warn-soft text-warn p-3.5">
          <p className="font-semibold inline-flex items-center gap-2"><Flag size={16} />El jugador avisó un problema</p>
          <p className="text-sm mt-0.5">{REPORT_KINDS[rep.kind]}{rep.text ? ` — “${rep.text}”` : ''}</p>
          <Field label="Tu respuesta al jugador" className="mt-3 [&_label]:text-ink"><Textarea value={reply} maxLength={300} onChange={e => setReply(e.target.value)} placeholder="Pedí disculpas, explicá qué pasó o cómo lo resolvés…" /></Field>
          <Button size="sm" className="mt-2" onClick={() => { update(s => resolveReport(s, rep.id, reply)); toast('Respuesta enviada. El reporte quedó resuelto.') }}>Responder y marcar resuelto</Button>
        </div>)}
      <dl className="divide-y divide-line border-y border-line mt-3">
        <Info k="Día">{dateLong(b.date)}</Info>
        <Info k="Importe">{money(b.totalCents)}{b.discountCents > 0 && <span className="text-muted text-sm"> (promo −{money(b.discountCents)})</span>}</Info>
        <Info k="Pago">{paymentLabel(b)}</Info>
        {live && rest > 0 && <Info k="Falta cobrar"><strong>{money(rest)}</strong></Info>}
        <Info k="Origen">{b.source === 'manual' ? 'Cargada a mano' : 'App'}</Info>
        {b.seriesId && <Info k="Se repite">Todas las semanas</Info>}
        {b.reminderAt && <Info k="Recordatorio">Enviado</Info>}
        {waitingFor(state, b.courtId, b.date, b.time).length > 0 && <Info k="En lista de espera">{waitingFor(state, b.courtId, b.date, b.time).length} {waitingFor(state, b.courtId, b.date, b.time).length === 1 ? 'persona' : 'personas'}</Info>}
      </dl>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button as="a" variant="secondary" size="sm" href={telLink(b.phone)} aria-disabled={!b.phone}><Phone size={16} />Llamar</Button>
        <Button variant="secondary" size="sm" onClick={() => setMsg(true)} disabled={!b.phone}><MessageCircle size={16} />Enviar mensaje</Button>
        {live && rest > 0 && <Button variant="secondary" size="sm" onClick={() => setMsg('pago')} disabled={!b.phone}><HandCoins size={16} />Recordar pago</Button>}
        <Button variant="secondary" size="sm" onClick={() => setRepeat(true)}><Repeat2 size={16} />Repetir</Button>
      </div>

      <div className="mt-4 space-y-2">
        {st === 'pending' && <Button className="w-full" onClick={() => run(x => { x.status = 'confirmed'; x.expiresAt = null }, 'Reserva confirmada.')}>Confirmar reserva</Button>}
        {live && rest > 0 && <Button className="w-full" variant={st === 'pending' ? 'secondary' : 'primary'} onClick={() => run(x => { x.paidCents = x.totalCents; x.paymentStatus = 'paid'; x.payMethod = 'efectivo'; if (x.status !== 'completed') x.status = 'confirmed'; x.expiresAt = null }, 'Cobro registrado.')}>Registrar cobro de {money(rest)}</Button>}
        {(live || st === 'completed') && started && <Button className="w-full" variant="secondary" onClick={() => run(x => { x.status = 'no_show' }, 'Marcada como no se presentó.')}>No se presentó</Button>}
        {st === 'no_show' && <Button className="w-full" variant="secondary" onClick={() => run(x => { x.status = 'confirmed' }, 'Reserva restaurada.')}>Sí se presentó</Button>}
        {live && <Button className="w-full" variant="danger" onClick={cancel}>Cancelar reserva</Button>}
        {live && b.seriesId && <Button className="w-full" variant="ghost" onClick={cancelSeries}>Cancelar esta y las siguientes</Button>}
      </div>

      <h3 className="font-semibold mt-6 mb-3">Editar datos</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" error={err && !f.name.trim() ? err : ''}><Input value={f.name} onChange={e => { setF({ ...f, name: e.target.value }); setErr('') }} /></Field>
        <Field label="Celular"><Input type="tel" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Cancha"><Select value={f.courtId} onChange={e => setF({ ...f, courtId: e.target.value })}>{courtsOf(state, b.complexId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Importe"><MoneyInput value={f.total} onChange={v => setF({ ...f, total: v })} /></Field>
        <Field label="Día"><DateField value={f.date} onChange={v => setF({ ...f, date: v || f.date })} /></Field>
        <Field label="Horario"><Select value={f.time} onChange={e => setF({ ...f, time: e.target.value })}>{[...new Set([...slotChoices, ...(f.time ? [f.time] : [])])].sort().map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Nota" className="sm:col-span-2"><Textarea value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Ej: viene con pelota propia" /></Field>
      </div>
      {err && f.name.trim() && <p className="err mt-3" role="alert">{err}</p>}
    </Sheet>
    {repeat && <RepeatSheet booking={b} onClose={() => setRepeat(false)} />}
    {msg && <MessageSheet bookingId={b.id} initial={msg === 'pago' ? 'pago' : initialKind} onClose={() => setMsg(false)} onSent={k => run(x => { if (k === 'recordatorio') x.reminderAt = new Date().toISOString() }, 'Listo, mensaje abierto en WhatsApp.')} />}
  </>)
}

/* ---------- Repetir una reserva (mismo cliente, cancha y horario) ---------- */
const WD = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
function RepeatSheet({ booking, onClose }) {
  const { state, update } = useStore()
  const toast = useToast()
  const complex = getComplex(state, booking.complexId), court = getCourt(state, booking.courtId)
  const today = todayISO()
  const wd = new Date(`${booking.date}T12:00:00`).getDay()
  let next = addDays(today, 1); while (new Date(`${next}T12:00:00`).getDay() !== wd) next = addDays(next, 1)
  const [mode, setMode] = useState('next')
  const [weeks, setWeeks] = useState(4)
  const dates = mode === 'tomorrow' ? [addDays(today, 1)] : mode === 'next' ? [next] : Array.from({ length: weeks }, (_, i) => addDays(next, 7 * i))
  const check = dates.map(d => ({ d, free: slotInfo(state, complex, court, d, booking.time).kind === 'free' }))
  const ok = check.filter(x => x.free)
  const save = () => {
    const series = ok.length > 1 ? uid('serie') : null
    update(s => ok.forEach(({ d }) => { const b = placeManual(s, complex, { courtId: court.id, date: d, name: booking.playerName, phone: booking.phone, pay: 'none' }, booking.time, quote(s, court, d, booking.time, booking.playerId).totalCents); b.playerId = booking.playerId || null; if (series) b.seriesId = series }))
    toast(ok.length === 1 ? 'Reserva repetida.' : `${ok.length} reservas creadas.`); onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Repetir reserva" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={!ok.length}>{ok.length > 1 ? `Crear ${ok.length} reservas` : 'Crear reserva'}</Button></>}>
      <p className="text-muted mb-3">{booking.playerName} · {court.name} · {booking.time}</p>
      <div className="space-y-2" role="radiogroup" aria-label="Cuándo">
        {[['tomorrow', 'Mañana', dateShort(addDays(today, 1))], ['next', `Próximo ${WD[wd]}`, dateShort(next)], ['weeks', 'Varias semanas', `Todos los ${WD[wd]}${WD[wd].endsWith('s') ? '' : 's'}`]].map(([v, t, sub]) => (
          <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={cn('w-full text-left flex items-center gap-3 p-3 rounded-lg border min-h-14 transition-colors', mode === v ? 'border-brand bg-brand-soft' : 'border-strong hover:bg-sunken')}>
            <span className={cn('size-5 rounded-full border-2 flex-none grid place-items-center', mode === v ? 'border-brand' : 'border-strong')}>{mode === v && <span className="size-2.5 rounded-full bg-brand" />}</span>
            <span><span className="block font-semibold">{t}</span><span className="block text-sm text-muted">{sub}</span></span>
          </button>))}
      </div>
      {mode === 'weeks' && <Field label="Cantidad de semanas" className="mt-3"><Select value={weeks} onChange={e => setWeeks(Number(e.target.value))}>{[2, 4, 6, 8, 12].map(n => <option key={n} value={n}>{n} semanas</option>)}</Select></Field>}
      <ul className="mt-4 text-sm space-y-1">{check.map(x => <li key={x.d} className="flex items-center justify-between tnum"><span>{dateShort(x.d)} · {booking.time}</span>{x.free ? <span className="text-brand font-medium">Libre</span> : <span className="text-danger">Ocupado, se saltea</span>}</li>)}</ul>
    </Sheet>
  )
}

/* ---------- Nueva reserva manual ---------- */
export function NewBookingSheet({ open, onClose, complex, preset = {} }) {
  const { state, update } = useStore()
  const toast = useToast()
  const courts = courtsOf(state, complex.id).filter(c => c.status === 'active')
  const init = () => ({ courtId: preset.courtId || courts[0]?.id || '', date: preset.date || todayISO(), time: preset.time || '', name: preset.name || '', phone: preset.phone || '', total: null, pay: 'none', freq: 0, until: '' })
  const [f, setF] = useState(init)
  const [err, setErr] = useState({})
  const [voice, setVoice] = useState({ on: false, heard: '' })
  const clients = clientsOf(state, [complex.id])
  if (!open) return null
  const dictate = () => {
    setVoice({ on: true, heard: '' })
    listen({
      onResult: text => {
        const r = parseDictation(text, courts)
        const next = { ...f, name: r.name || f.name, date: r.date || f.date, courtId: r.courtId || f.courtId, time: r.time || f.time }
        const c2 = getCourt(state, next.courtId)
        const e = {}
        if (r.time && c2 && slotInfo(state, complex, c2, next.date, r.time).kind !== 'free') e.time = `A las ${r.time} no está libre. Elegí otro horario.`
        if (r.name) { const known = clients.find(x => x.name.toLowerCase() === r.name.toLowerCase()); if (known && !next.phone) next.phone = known.phone }
        setF(next); setErr(e); setVoice({ on: false, heard: text })
      },
      onError: code => { setVoice({ on: false, heard: '' }); toast(code === 'not-allowed' ? 'Permití el micrófono para dictar.' : 'No te escuchamos bien. Probá de nuevo.', 'error') },
      onEnd: () => setVoice(v => ({ ...v, on: false })),
    })
  }
  const court = getCourt(state, f.courtId)
  const free = court ? slotsFor(complex).filter(t => slotInfo(state, complex, court, f.date, t).kind === 'free') : []
  const time = free.includes(f.time) ? f.time : free[0] || ''
  const auto = court && time ? quote(state, court, f.date, time).totalCents : 0
  const occurrences = (() => { if (!f.freq) return [f.date]; const out = []; for (let d = f.date; d <= (f.until || f.date) && out.length < 52; d = addDays(d, f.freq)) out.push(d); return out.length ? out : [f.date] })()
  const total = f.total ?? auto
  const set = k => v => setF(x => ({ ...x, [k]: v?.target ? v.target.value : v }))
  const onName = e => { const v = e.target.value; const c = clients.find(x => x.name.toLowerCase() === v.toLowerCase()); setF(x => ({ ...x, name: v, phone: x.phone || c?.phone || '' })); setErr({}) }

  const save = () => {
    const e = {}
    if (!f.name.trim()) e.name = 'Escribí el nombre del cliente.'
    if (!time) e.time = 'No hay horarios libres ese día.'
    if (Object.keys(e).length) { setErr(e); return }
    try {
      let made = 0; const busy = []
      update(s => {
        const series = f.freq ? uid('serie') : null
        for (let i = 0; i < occurrences.length; i++) {
          const date = occurrences[i]
          try { const b = placeManual(s, complex, { ...f, date, pay: i === 0 ? f.pay : 'none' }, time, total); if (series) b.seriesId = series; made++ }
          catch (x) { if (i === 0) throw x; busy.push(date) }
        }
      })
      toast(f.freq ? `${made} reservas creadas${busy.length ? `. Ocupadas: ${busy.map(d => d.split('-').reverse().slice(0, 2).join('/')).join(', ')}.` : '.'}` : 'Reserva creada.', 'ok'); setF(init()); onClose()
    } catch (x) { setErr({ form: x.message }) }
  }
  return (
    <Sheet open onClose={onClose} title="Nueva reserva" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>Crear reserva</Button></>}>
      {speechSupported() && (
        <div className="mb-5 p-3 rounded-lg bg-sunken">
          <Button variant={voice.on ? 'primary' : 'secondary'} className="w-full" onClick={dictate} disabled={voice.on}><Mic size={18} />{voice.on ? 'Escuchando… hablá ahora' : 'Dictar la reserva'}</Button>
          <p className="hint text-center">{voice.heard ? <>Escuché: “{voice.heard}”. Revisá los datos.</> : <>Ej: “Juan Pérez, jueves a las 20, cancha 2”</>}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cancha"><Select value={f.courtId} onChange={set('courtId')}>{courts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.sport}</option>)}</Select></Field>
        <Field label="Día"><DateField min={todayISO()} value={f.date} onChange={v => set('date')(v || todayISO())} /></Field>
        <Field label="Horario" error={err.time}><Select value={time} onChange={set('time')} disabled={!free.length}>{free.length ? free.map(t => <option key={t}>{t}</option>) : <option>Sin horarios</option>}</Select></Field>
        <Field label="Importe"><MoneyInput value={total} onChange={set('total')} /></Field>
        <Field label="Cliente" error={err.name}><Input list="clientes" value={f.name} onChange={onName} autoComplete="off" /></Field>
        <datalist id="clientes">{clients.map(c => <option key={c.key} value={c.name} />)}</datalist>
        <Field label="Celular"><Input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <Field label="Repetir"><Select value={f.freq} onChange={e => setF(x => ({ ...x, freq: Number(e.target.value), until: x.until || addDays(x.date, 7 * 7) }))}><option value={0}>No se repite</option><option value={7}>Cada semana</option><option value={14}>Cada 2 semanas</option></Select></Field>
        {f.freq > 0 && <Field label="Hasta"><DateField min={f.date} value={f.until} onChange={v => setF(x => ({ ...x, until: v || addDays(x.date, 7 * 7) }))} title="Última fecha" /></Field>}
      </div>
      {f.freq > 0 && <p className="hint">Todos los {WD[new Date(`${f.date}T12:00:00`).getDay()]}{WD[new Date(`${f.date}T12:00:00`).getDay()].endsWith('s') ? '' : 's'}{f.freq === 14 ? ' (uno sí, uno no)' : ''} a las {time || '—'} · {occurrences.length} turnos, del {dateShort(f.date)} al {dateShort(occurrences[occurrences.length - 1])}. Las fechas ocupadas se saltean. Después podés cancelar una sola o toda la serie.</p>}
      <div className="mt-4"><span className="label">Pago</span>
        <Segmented value={f.pay} onChange={set('pay')} label="Pago" options={[{ value: 'none', label: 'Sin pagar' }, { value: 'deposit', label: 'Seña' }, { value: 'full', label: 'Pagó todo' }]} />
        {f.pay === 'deposit' && <p className="hint">Seña de {money(depositFor(complex, total) || Math.round(total * .3))}.</p>}
      </div>
      {err.form && <p className="err mt-3" role="alert">{err.form}</p>}
    </Sheet>
  )
}
function placeManual(s, complex, f, time, total) {
  const b = placeBooking(s, { complexId: complex.id, courtId: f.courtId, date: f.date, time, playerName: f.name.trim(), phone: f.phone.trim(), source: 'manual', manual: true, mode: 'onsite' })
  b.totalCents = total; b.baseCents = total; b.discountCents = 0; b.promoName = ''
  b.depositCents = depositFor(complex, total)
  const paid = f.pay === 'full' ? total : f.pay === 'deposit' ? (b.depositCents || Math.round(total * .3)) : 0
  b.paidCents = paid; b.paymentStatus = paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending'
  b.paymentMode = f.pay === 'full' ? 'full' : f.pay === 'deposit' ? 'deposit' : 'onsite'; b.payMethod = paid ? 'efectivo' : ''
  b.status = paid >= total && total > 0 ? 'confirmed' : paid > 0 ? 'deposit_paid' : 'confirmed'
  return b
}

/* ---------- Bloquear horarios ---------- */
export function BlockSheet({ open, onClose, complex, preset = {} }) {
  const { state, update } = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const courts = courtsOf(state, complex.id).filter(c => c.status !== 'inactive')
  const slots = slotsFor(complex)
  const init = () => ({ courtId: preset.courtId || 'all', date: preset.date || todayISO(), from: preset.time || slots[0], to: preset.time || slots[0], reason: '' })
  const [f, setF] = useState(init)
  if (!open) return null
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const range = slots.filter(t => t >= f.from && t <= f.to)
  const save = async () => {
    const nCourts = f.courtId === 'all' ? courts.length : 1
    if (!await confirm({ title: `¿Bloquear ${range.length * nCourts} ${range.length * nCourts === 1 ? 'horario' : 'horarios'}?`, message: `${f.courtId === 'all' ? 'Todas las canchas' : courts.find(c => c.id === f.courtId)?.name} · ${dateShort(f.date)} · ${f.from}${range.length > 1 ? ` a ${f.to}` : ''}. Los jugadores no van a poder reservarlos.`, confirmLabel: 'Bloquear' })) return
    let added = 0, skipped = 0
    update(s => {
      const targets = f.courtId === 'all' ? courts : courts.filter(c => c.id === f.courtId)
      for (const c of targets) for (const t of range) {
        const info = slotInfo(s, complex, c, f.date, t)
        if (info.kind === 'booked') { skipped++; continue }
        if (info.kind === 'blocked') continue
        s.blocks.push({ id: uid('bl'), complexId: complex.id, courtId: c.id, date: f.date, time: t, reason: f.reason.trim() }); added++
      }
    })
    toast(added ? `${added} ${added === 1 ? 'horario bloqueado' : 'horarios bloqueados'}${skipped ? `. ${skipped} ya tenían reserva.` : '.'}` : 'No se bloqueó nada: los horarios ya tenían reserva.', added ? 'ok' : 'error')
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Bloquear horario" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={!range.length}>Bloquear</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cancha"><Select value={f.courtId} onChange={set('courtId')}><option value="all">Todas las canchas</option>{courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Día"><DateField min={todayISO()} value={f.date} onChange={v => setF(x => ({ ...x, date: v || todayISO() }))} /></Field>
        <Field label="Desde"><Select value={f.from} onChange={e => setF(x => ({ ...x, from: e.target.value, to: x.to < e.target.value ? e.target.value : x.to }))}>{slots.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Hasta (inclusive)"><Select value={f.to} onChange={set('to')}>{slots.filter(t => t >= f.from).map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Motivo (opcional)" className="sm:col-span-2"><Input value={f.reason} onChange={set('reason')} placeholder="Mantenimiento, torneo, evento privado…" /></Field>
      </div>
    </Sheet>
  )
}
export { cn }
