import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { celebrate, spring } from '../../ui/motion'
import { Cover } from '../../ui/Cover'
import { CalendarPlus, Check, MapPin, MessageCircle, Phone, Repeat, Share2, Shuffle, Star, Ticket, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { WEEKDAYS, requestFixed, weekdayOf, PLAYERS, perPerson, applyPayment, balanceOf, bookingStart, cancelBooking, cancelPolicyText, depositFor, effStatus, getComplex, getCourt, paymentLabel, placeBooking, quote, refundFor, STATUS } from '../../lib/domain'
import { addDays, cn, dateLong, mapsLink, money, slotEnd, telLink, todayISO, waLink } from '../../lib/format'
import { downloadICS } from '../../lib/calendar'
import { providerLabel, startPayment } from '../../lib/payments'
import { navigate } from '../../lib/router'
import { Button, Field, Segmented, Sheet, Status, Textarea, useConfirm, useToast } from '../../ui/kit'
import { BookingStatus } from '../../ui/shared'
import { MessageSheet } from '../../ui/MessageSheet'
import { Explain } from '../../ui/Help'

/* ---------- Pagos ---------- */
export function usePayment() {
  const { update } = useStore()
  return async (booking, kind) => {
    const due = kind === 'deposit' ? Math.max(0, booking.depositCents - booking.paidCents) : balanceOf(booking)
    const res = await startPayment({ booking, amountCents: due, kind })
    if (res.status === 'redirect') { window.location.href = res.url; return false }
    if (res.status !== 'approved') throw new Error('El pago no se aprobó. Probá con otro medio de pago.')
    update(s => applyPayment(s, booking.id, kind))
    return true
  }
}

const Line = ({ k, children, strong }) => (
  <div className="flex items-baseline justify-between gap-4 py-2">
    <dt className="text-muted">{k}</dt><dd className={cn('text-right tnum', strong && 'font-semibold')}>{children}</dd>
  </div>
)

/* ---------- Confirmar y pagar ---------- */
export function BookSheet({ open, onClose, complex, court, date, time, onDone }) {
  const { state, user, update } = useStore()
  const pay = usePayment()
  const toast = useToast()
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!open || !court || !time) return null

  const q = quote(state, court, date, time, user?.id)
  const cfg = complex.booking || {}
  const dep = depositFor(complex, q.totalCents)
  const missed = user ? state.bookings.filter(x => x.playerId === user.id && x.complexId === complex.id && effStatus(x) === 'no_show' && x.date >= addDays(todayISO(), -120)).length : 0
  const options = []
  if (cfg.depositRequired) options.push({ v: 'deposit', title: 'Pagar seña', amount: dep, note: `El resto, ${money(q.totalCents - dep)}, se paga en la cancha.` })
  if (cfg.allowFullPayment) options.push({ v: 'full', title: 'Pagar total', amount: q.totalCents, note: 'No pagás nada más en la cancha.' })
  if (!cfg.depositRequired) options.unshift({ v: 'onsite', title: 'Pagar en la cancha', amount: 0, note: 'Reservás sin pagar ahora.' })
  const current = mode && options.some(o => o.v === mode) ? mode : options[0].v
  const chosen = options.find(o => o.v === current)

  const go = async () => {
    setBusy(true); setError('')
    let booking
    try { booking = update(s => placeBooking(s, { complexId: complex.id, courtId: court.id, date, time, player: user, mode: current })) }
    catch (e) { setError(e.message); setBusy(false); return }
    if (current === 'onsite') { setBusy(false); onDone(booking.id); return }
    try {
      const ok = await pay(booking, current)
      setBusy(false)
      if (ok) onDone(booking.id)
    } catch (e) {
      setBusy(false); onClose()
      navigate('/reservas')
      toast(`${e.message} Tu horario queda guardado ${cfg.payWithinMinutes || 30} minutos.`, 'error')
    }
  }

  return (
    <Sheet open onClose={onClose} busy={busy} title="Confirmar reserva"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Volver</Button>
        <Button onClick={go} loading={busy} size="lg" className="!flex-[2]">{busy ? (current === 'onsite' ? 'Reservando…' : 'Procesando pago…') : current === 'onsite' ? 'Reservar' : `${chosen.title} · ${money(chosen.amount)}`}</Button></>}>
      <dl className="divide-y divide-line border-y border-line">
        <Line k="Complejo">{complex.name}</Line>
        <Line k="Cancha">{court.name} · {court.sport}</Line>
        <Line k="Día">{dateLong(date)}</Line>
        <Line k="Horario">{time} a {slotEnd(time, complex.hours.slotMinutes)}</Line>
        {q.discountCents > 0 && <Line k="Precio">{money(q.baseCents)}</Line>}
        {q.discountCents > 0 && <Line k={q.promo?.name ? `Promo ${q.promo.name}` : 'Promoción'}>−{money(q.discountCents)}</Line>}
        <Line k="Total" strong>{money(q.totalCents)}</Line>
        {perPerson(court, q.totalCents) && <Line k={`Cada uno (${PLAYERS[court.sport]} jugadores)`}>{money(perPerson(court, q.totalCents))}</Line>}
      </dl>

      <fieldset className="mt-5">
        <legend className="label">¿Cómo querés pagar?</legend>
        <div className="space-y-2">
          {options.map(o => (
            <label key={o.v} className={cn('relative flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer min-h-14 transition-all duration-200', current === o.v ? 'border-brand bg-brand-soft shadow-[var(--sh-2)]' : 'border-line hover:border-strong')}>
              <input type="radio" name="pago" className="mt-1 size-5 accent-[var(--brand)]" checked={current === o.v} onChange={() => setMode(o.v)} />
              <span className="flex-1 min-w-0"><span className="block font-semibold">{o.title}{o.amount > 0 && <span className="tnum"> · {money(o.amount)}</span>}</span><span className="block text-sm text-muted">{o.note}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {missed > 0 && <p className="mt-4 rounded-lg bg-warn-soft text-warn px-3 py-2 text-sm">La última vez no pudiste venir a {complex.name}. Si te surge algo, cancelá con tiempo así otro puede jugar.</p>}
      {cfg.depositRequired && <Explain term="sena" className="mt-2" />}
      <p className="text-sm text-muted mt-2">{cancelPolicyText(complex)}</p>
      {current !== 'onsite' && <p className="text-sm text-muted mt-1">Pagás con {providerLabel}. Tenés {cfg.payWithinMinutes || 30} minutos para completar el pago.</p>}
      {error && <p className="err mt-3" role="alert">{error}</p>}
    </Sheet>
  )
}

/* ---------- Reserva hecha ---------- */
export function ConfirmedSheet({ bookingId, onClose }) {
  const { state } = useStore()
  const [share, setShare] = useState(false)
  useEffect(() => { celebrate() }, [])
  const b = state.bookings.find(x => x.id === bookingId)
  if (!b) return null
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const rest = balanceOf(b)
  const payNote = b.paidCents === 0 ? `Pagás ${money(b.totalCents)} en la cancha.` : rest > 0 ? `Seña pagada. Resta ${money(rest)} en la cancha.` : 'Pagada completa.'
  return (<>
    <Sheet open onClose={onClose} title="" footer={<Button onClick={() => setShare(true)} size="lg" className="!flex-1"><Share2 size={18} />Compartir reserva</Button>}>
      <div className="text-center pt-1 pb-4">
        <span className="mx-auto grid place-items-center size-16 rounded-full bg-brand text-[var(--brand-ink)] pop-in"><Check size={34} strokeWidth={2.75} /></span>
        <p className="display text-2xl font-bold uppercase mt-3">Reserva confirmada</p>
        <p className="text-muted">{payNote}</p>
      </div>
      <dl className="divide-y divide-line border-y border-line">
        <Line k="Cancha">{court.name} · {court.sport}</Line>
        <Line k="Fecha">{dateLong(b.date)}</Line>
        <Line k="Hora">{b.time} a {slotEnd(b.time, b.durationMin || 60)}</Line>
        <Line k="Precio" strong>{money(b.totalCents)}</Line>
        <Line k="Ubicación"><span className="block">{complex.name}</span><span className="block text-sm text-muted">{complex.address}</span></Line>
      </dl>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <Button variant="secondary" size="sm" className="!flex-col !h-auto !py-2" onClick={() => { onClose(); navigate('/reservas') }}><Ticket size={18} />Ver reserva</Button>
        <Button as="a" variant="secondary" size="sm" className="!flex-col !h-auto !py-2" href={mapsLink(complex)} target="_blank" rel="noreferrer"><MapPin size={18} />Cómo llegar</Button>
        <Button variant="secondary" size="sm" className="!flex-col !h-auto !py-2 !whitespace-normal" onClick={() => downloadICS({ title: `Fútbol en ${complex.name}`, date: b.date, time: b.time, minutes: b.durationMin, place: `${complex.name}, ${complex.address}`, description: `${court.name} · ${court.sport}` })}><CalendarPlus size={18} />Al calendario</Button>
      </div>
    </Sheet>
    {share && <MessageSheet bookingId={b.id} kinds={['invitacion', 'equipos']} initial="invitacion" toPhone="" title="Compartir reserva" onClose={() => setShare(false)} />}
  </>)
}

/* ---------- Pantalla de resultado: un tilde grande y una frase clara ---------- */
export function ResultSheet({ tone = 'ok', title, text, onClose, action }) {
  const Icon = tone === 'ok' ? Check : X
  useEffect(() => { if (tone === 'ok') celebrate() }, []) // eslint-disable-line
  return (
    <Sheet open onClose={onClose} title="" footer={<>{action}<Button onClick={onClose} data-autofocus>Listo</Button></>}>
      <div className="text-center py-4">
        <span className={cn('mx-auto grid place-items-center size-20 rounded-full', tone === 'ok' ? 'bg-brand text-[var(--brand-ink)]' : 'bg-danger-soft text-danger')}><Icon size={40} strokeWidth={2.5} /></span>
        <p className="text-2xl font-semibold tracking-tight mt-5">{title}</p>
        {text && <p className="text-muted text-lg mt-2 max-w-sm mx-auto">{text}</p>}
      </div>
    </Sheet>
  )
}

/* ---------- Detalle de una reserva (jugador) ---------- */
export function BookingDetail({ bookingId, onClose, onReview }) {
  const { state, update, user } = useStore()
  const pay = usePayment()
  const confirm = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [invite, setInvite] = useState(false)
  const [result, setResult] = useState(null)
  const [fixed, setFixed] = useState(false)
  const b = state.bookings.find(x => x.id === bookingId)
  if (result) return <ResultSheet {...result} onClose={onClose} />
  if (!b) return null
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const st = effStatus(b)
  const upcoming = ['pending', 'deposit_paid', 'confirmed'].includes(st) && bookingStart(b) > new Date()
  const reviewed = state.reviews.some(r => r.bookingId === b.id)
  const rest = balanceOf(b)
  const fixedReq = (state.fixedRequests || []).filter(r => r.bookingId === b.id).pop()

  const doPay = async kind => {
    setBusy(kind)
    try { if (await pay(b, kind)) setResult({ tone: 'ok', title: kind === 'deposit' ? 'Seña pagada' : 'Pago aprobado', text: kind === 'deposit' ? `Tu turno quedó confirmado. El resto lo pagás en la cancha.` : 'Tu turno quedó confirmado. No tenés que pagar nada más.' }) }
    catch (e) { toast(e.message, 'error') }
    finally { setBusy('') }
  }
  const doCancel = async () => {
    const refund = refundFor(b, complex, 'player')
    const msg = b.paidCents === 0 ? 'El horario va a quedar libre para otras personas.' : refund > 0 ? `Te devolvemos ${money(refund)}.` : `Ya pasó el plazo de cancelación gratis: no se devuelve lo pagado (${money(b.paidCents)}).`
    if (!await confirm({ title: '¿Cancelar esta reserva?', message: msg, confirmLabel: 'Cancelar reserva', cancelLabel: 'No cancelar', danger: true })) return
    const done = update(s => cancelBooking(s, b.id, 'player'))
    setResult({ tone: 'cancel', title: 'Reserva cancelada', text: done.refundCents > 0 ? `Te devolvemos ${money(done.refundCents)}. Puede tardar unos días en verse en tu cuenta.` : 'El horario quedó libre para otras personas.' })
  }

  return (<>
    <Sheet open onClose={onClose} title="Tu reserva"
      footer={st === 'pending' && upcoming ? <Button className="!flex-1" size="lg" loading={!!busy} onClick={() => doPay(b.depositCents > 0 && b.paymentMode !== 'full' ? 'deposit' : 'full')}>{busy ? 'Procesando pago…' : b.depositCents > 0 && b.paymentMode !== 'full' ? `Pagar seña · ${money(b.depositCents)}` : `Pagar total · ${money(b.totalCents)}`}</Button> : null}>
      <div className="relative -mx-4 -mt-2 mb-3 overflow-hidden"><Cover src={complex.coverUrl} seed={complex.id} className="aspect-[21/9]" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" /><span className="absolute left-4 bottom-3 display text-3xl font-bold text-white leading-none tnum">{b.time}</span></div>
      <div className="flex items-center justify-between gap-3 mb-2"><div><p className="font-semibold text-lg leading-tight">{complex.name}</p><p className="text-muted">{court.name} · {court.sport}</p></div><BookingStatus booking={b} /></div>
      <dl className="divide-y divide-line border-y border-line">
        <Line k="Día">{dateLong(b.date)}</Line>
        <Line k="Horario">{b.time} a {slotEnd(b.time, b.durationMin || 60)}</Line>
        <Line k="Total">{money(b.totalCents)}</Line>
        <Line k="Pago">{paymentLabel(b)}</Line>
        {upcoming && rest > 0 && st !== 'pending' && <Line k="A pagar en la cancha" strong>{money(rest)}</Line>}
        {b.refundCents > 0 && <Line k="Devolución">{money(b.refundCents)}</Line>}
      </dl>
      {st === 'pending' && upcoming && <p className="text-sm text-warn mt-3">Pagá antes de las {new Date(b.expiresAt || Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} o el horario se libera.</p>}
      {st === 'cancelled' && b.expiresAt && !b.cancelledAt && <p className="text-sm text-muted mt-3">Venció el tiempo para pagar.</p>}
      <p className="text-sm text-muted mt-3">{complex.address}</p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button as="a" variant="secondary" size="sm" href={mapsLink(complex)} target="_blank" rel="noreferrer"><MapPin size={16} />Cómo llegar</Button>
        <Button as="a" variant="secondary" size="sm" href={waLink(complex.whatsapp || complex.phone, `Hola, tengo una reserva el ${b.date} a las ${b.time}.`)} target="_blank" rel="noreferrer"><MessageCircle size={16} />WhatsApp</Button>
        <Button as="a" variant="secondary" size="sm" href={telLink(complex.phone)}><Phone size={16} />Llamar</Button>
        {upcoming && <Button variant="secondary" size="sm" onClick={() => setInvite('invitacion')}><Share2 size={16} />Compartir</Button>}
        {upcoming && <Button variant="secondary" size="sm" onClick={() => setInvite('equipos')}><Shuffle size={16} />Armar equipos</Button>}
        {upcoming && <Button variant="secondary" size="sm" onClick={() => downloadICS({ title: `Cancha en ${complex.name}`, date: b.date, time: b.time, minutes: b.durationMin, place: complex.address, description: court.name })}><CalendarPlus size={16} />Calendario</Button>}
      </div>

      <div className="mt-4 space-y-2">
        {upcoming && st === 'deposit_paid' && rest > 0 && <Button className="w-full" variant="secondary" loading={busy === 'full'} disabled={!!busy} onClick={() => doPay('full')}>{busy === 'full' ? 'Procesando pago…' : `Pagar total · ${money(rest)}`}</Button>}
        {st === 'completed' && !reviewed && <Button className="w-full" onClick={() => onReview(b)}><Star size={16} />Dejar reseña</Button>}
        {['completed', 'cancelled', 'no_show'].includes(st) && <Button className="w-full" variant="secondary" onClick={() => { onClose(); navigate(`/complejo/${complex.slug}/reservar?cancha=${court.id}`) }}>Volver a reservar</Button>}
        {upcoming && !b.seriesId && !fixedReq && <Button className="w-full" variant="secondary" onClick={() => setFixed(true)}><Repeat size={16} />Pedir este horario todas las semanas</Button>}
        {fixedReq && <p className="text-sm text-center py-2">{fixedReq.status === 'pending' ? 'Pediste este horario fijo. Esperando respuesta del complejo.' : fixedReq.status === 'approved' ? `Turno fijo aprobado: ${fixedReq.created} reservas.` : 'El complejo no aceptó el turno fijo.'}</p>}
        {b.seriesId && <p className="text-sm text-muted text-center py-1">Es parte de tu turno fijo semanal.</p>}
        {upcoming && <Button className="w-full" variant="danger" onClick={doCancel}>Cancelar reserva</Button>}
      </div>
      {upcoming && <p className="text-sm text-muted mt-3">{cancelPolicyText(complex)}</p>}
    </Sheet>
    {fixed && <FixedSheet booking={b} onClose={() => setFixed(false)} />}
    {invite && <MessageSheet bookingId={b.id} kinds={['invitacion', 'equipos']} initial={invite} toPhone="" title="Compartir reserva" onClose={() => setInvite(false)} />}
    </>
  )
}

/* ---------- Pedir turno fijo ---------- */
export function FixedSheet({ booking, onClose }) {
  const { state, update } = useStore()
  const toast = useToast()
  const [weeks, setWeeks] = useState(8)
  const [error, setError] = useState('')
  const complex = getComplex(state, booking.complexId), court = getCourt(state, booking.courtId)
  const send = () => {
    try { update(s => requestFixed(s, { bookingId: booking.id, weeks })); toast('Pedido enviado. Te avisamos cuando el complejo responda.'); onClose() }
    catch (e) { setError(e.message) }
  }
  return (
    <Sheet open onClose={onClose} title="Pedir turno fijo" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={send}>Enviar pedido</Button></>}>
      <p className="text-lg">Todos los <strong>{WEEKDAYS[weekdayOf(booking.date)]}</strong> a las <strong className="tnum">{booking.time}</strong></p>
      <p className="text-muted">{complex.name} · {court.name}</p>
      <div className="mt-5"><span className="label">¿Por cuánto tiempo?</span>
        <Segmented value={weeks} onChange={setWeeks} label="Semanas" options={[{ value: 4, label: '1 mes' }, { value: 8, label: '2 meses' }, { value: 12, label: '3 meses' }]} /></div>
      <p className="hint">Empieza la semana siguiente a esta reserva. El complejo tiene que aprobarlo; si alguna semana ya está ocupada, se saltea. Cada turno se paga en la cancha.</p>
      {error && <p className="err" role="alert">{error}</p>}
    </Sheet>
  )
}

/* ---------- Reseña ---------- */
export function ReviewSheet({ booking, onClose }) {
  const { state, update, user } = useStore()
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  if (!booking) return null
  const complex = getComplex(state, booking.complexId)
  const send = () => {
    if (!rating) { setError('Elegí una cantidad de estrellas.'); return }
    update(s => { s.reviews.push({ id: `rv-${Date.now()}`, complexId: booking.complexId, bookingId: booking.id, playerId: user.id, playerName: user.name.split(' ').map((w, i) => i ? w[0] + '.' : w).join(' '), rating, text: text.trim(), createdAt: new Date().toISOString(), hidden: false, reported: false }) })
    toast('Gracias por tu reseña.'); onClose()
  }
  return (
    <Sheet open onClose={onClose} title={`¿Cómo estuvo ${complex.name}?`}
      footer={<><Button variant="secondary" onClick={onClose}>Ahora no</Button><Button onClick={send}>Enviar reseña</Button></>}>
      <div className="flex gap-1 justify-center py-2" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} onClick={() => { setRating(n); setError('') }} className="icon-btn !size-14">
            <motion.span className="block" animate={{ scale: n <= rating ? [1, 1.35, 1] : 1 }} transition={{ duration: .3 }}><Star size={34} className={n <= rating ? 'fill-current text-warn' : 'text-strong'} /></motion.span>
          </button>
        ))}
      </div>
      {error && <p className="err text-center" role="alert">{error}</p>}
      <Field label="Comentario (opcional)" className="mt-3"><Textarea value={text} maxLength={400} onChange={e => setText(e.target.value)} placeholder="Contá cómo estuvo la cancha, la atención, el horario…" /></Field>
    </Sheet>
  )
}
