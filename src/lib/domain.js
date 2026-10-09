import { addDays, digits, money, relativeDay, slotMoment, slotsFor, timeToMin, todayISO, uid } from './format'

/* ---------- Catálogos ---------- */
export const SPORTS = ['Fútbol 5', 'Fútbol 7', 'Fútbol 8', 'Fútbol 11']
export const SURFACES = ['Sintético', 'Césped natural', 'Cemento']
/* Jugadores por partido, para mostrar cuánto pone cada uno */
export const PLAYERS = { 'Fútbol 5': 10, 'Fútbol 7': 14, 'Fútbol 8': 16, 'Fútbol 11': 22 }
export const perPerson = (court, cents) => { const n = PLAYERS[court?.sport]; return n ? Math.ceil(cents / n / 10000) * 10000 : null }
export const SERVICES = ['Vestuarios', 'Duchas', 'Estacionamiento', 'Buffet', 'Parrilla', 'Wi-Fi', 'Alquiler de pecheras', 'Botiquín']
export const COURT_FEATURES = ['Piso nuevo', 'Arcos reglamentarios', 'Red perimetral', 'Pelota incluida', 'Pecheras incluidas']
export const SLOT_OPTIONS = [60, 90, 120]
export const CANCEL_HOURS = [2, 6, 12, 24, 48]
export const PAY_WINDOW = [15, 30, 60, 120]

export const STATUS = {
  pending: { label: 'Pendiente', tone: 'warn' },
  deposit_paid: { label: 'Seña pagada', tone: 'info' },
  confirmed: { label: 'Confirmada', tone: 'ok' },
  completed: { label: 'Finalizada', tone: 'muted' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
  no_show: { label: 'No se presentó', tone: 'danger' },
}
export const STATUS_ORDER = ['pending', 'deposit_paid', 'confirmed', 'completed', 'cancelled', 'no_show']
export const COURT_STATUS = { active: 'Activa', inactive: 'Inactiva', blocked: 'Bloqueada' }
export const REFUND_LABEL = { full: 'Devolución total', half: 'Devolución del 50%', none: 'Sin devolución' }

/* ---------- Reservas: estado efectivo ---------- */
export const bookingStart = b => new Date(`${b.date}T${b.time}:00`)
export const bookingEnd = b => new Date(bookingStart(b).getTime() + (b.durationMin || 60) * 60000)
export function effStatus(b, now = new Date()) {
  if (b.status === 'pending' && b.expiresAt && new Date(b.expiresAt) < now) return 'cancelled'
  if ((b.status === 'confirmed' || b.status === 'deposit_paid') && bookingEnd(b) < now) return 'completed'
  return b.status
}
export const isUpcoming = (b, now = new Date()) => ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(b, now)) && bookingEnd(b) >= now
export const occupies = (b, now = new Date()) => effStatus(b, now) !== 'cancelled'
export const expiredPending = (b, now = new Date()) => b.status === 'pending' && b.expiresAt && new Date(b.expiresAt) < now

export function paymentLabel(b) {
  const st = effStatus(b)
  if (st === 'cancelled' || st === 'no_show') {
    if (b.refundCents > 0 && !(b.paidCents > 0)) return 'Devuelto'
    if (b.paidCents > 0) return `Retenido ${money(b.paidCents)}`
    return 'Sin pago'
  }
  if (b.totalCents > 0 && b.paidCents >= b.totalCents) return 'Pagado'
  if (b.paidCents > 0) return `Seña ${money(b.paidCents)}`
  return 'Sin pagar'
}
export const balanceOf = b => Math.max(0, (b.totalCents || 0) - (b.paidCents || 0))

/* ---------- Complejos y canchas ---------- */
export const courtsOf = (state, complexId) => state.courts.filter(c => c.complexId === complexId)
export const activeCourts = (state, complexId) => courtsOf(state, complexId).filter(c => c.status === 'active')
export const getComplex = (state, idOrSlug) => state.complexes.find(c => c.id === idOrSlug || c.slug === idOrSlug)
export const getCourt = (state, id) => state.courts.find(c => c.id === id)
export const isApproved = c => (c.approval || 'approved') === 'approved'
export const publicComplexes = state => state.complexes.filter(c => c.active && c.public && isApproved(c))

export const priceFor = (court, time) => {
  const t = timeToMin(time)
  for (const r of court.priceRules || []) {
    const a = timeToMin(r.from); let z = timeToMin(r.to); if (z <= a) z += 1440
    if (t >= a && t < z) return r.priceCents
  }
  return court.priceCents
}
export const courtFromPrice = court => Math.min(court.priceCents, ...(court.priceRules || []).map(r => r.priceCents))
export const complexFromPrice = (state, complexId) => {
  const cs = activeCourts(state, complexId)
  return cs.length ? Math.min(...cs.map(courtFromPrice)) : null
}
export function complexTags(state, complexId) {
  const cs = activeCourts(state, complexId)
  if (!cs.length) return ''
  const uniq = a => [...new Set(a)]
  const parts = [uniq(cs.map(c => c.sport)).join(' · '), uniq(cs.map(c => c.surface)).slice(0, 1).join('')]
  if (cs.every(c => c.covered)) parts.push('Techada')
  else if (cs.some(c => c.covered)) parts.push('Con techadas')
  return parts.filter(Boolean).join(' · ')
}
export function ratingOf(state, complexId) {
  const rs = (state.reviews || []).filter(r => r.complexId === complexId && !r.hidden)
  if (!rs.length) return { avg: 0, count: 0 }
  return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length }
}
export const ratingLabel = n => n.toFixed(1).replace('.', ',')

/* ---------- Disponibilidad ---------- */
export function slotInfo(state, complex, court, date, time, now = new Date()) {
  const booking = state.bookings.find(b => b.courtId === court.id && b.date === date && b.time === time && occupies(b, now))
  if (booking) return { kind: 'booked', booking }
  const block = (state.blocks || []).find(x => x.courtId === court.id && x.date === date && x.time === time)
  if (block) return { kind: 'blocked', block }
  if (court.status !== 'active') return { kind: 'unavailable' }
  if (slotMoment(complex, date, time) <= now) return { kind: 'past' }
  return { kind: 'free' }
}
export function freeSlots(state, complex, court, date, now = new Date()) {
  return slotsFor(complex).filter(t => slotInfo(state, complex, court, date, t, now).kind === 'free')
}
export function freeCount(state, complex, date, now = new Date()) {
  return activeCourts(state, complex.id).reduce((n, c) => n + freeSlots(state, complex, c, date, now).length, 0)
}

/* ---------- Precios y promociones ---------- */
const completedCount = (state, complexId, playerId) =>
  state.bookings.filter(b => b.complexId === complexId && b.playerId === playerId && effStatus(b) === 'completed').length

export function promoFor(state, court, date, time, playerId) {
  const base = priceFor(court, time)
  let best = null
  for (const p of state.promotions || []) {
    if (!p.active || p.complexId !== court.complexId) continue
    if (p.courtId && p.courtId !== court.id) continue
    if (p.onlyToday && date !== todayISO()) continue
    if (p.dateFrom && date < p.dateFrom) continue
    if (p.dateTo && date > p.dateTo) continue
    if (p.timeFrom && p.timeTo) {
      const t = timeToMin(time), a = timeToMin(p.timeFrom); let z = timeToMin(p.timeTo); if (z <= a) z += 1440
      if (t < a || t >= z) continue
    }
    if (p.frequentOnly && (!playerId || completedCount(state, court.complexId, playerId) < (p.minBookings || 5))) continue
    const discount = p.kind === 'percent' ? Math.round(base * p.value / 100) : Math.min(base, p.value)
    if (!best || discount > best.discount) best = { promo: p, discount }
  }
  return best
}
export function quote(state, court, date, time, playerId) {
  const baseCents = priceFor(court, time)
  const hit = promoFor(state, court, date, time, playerId)
  const discountCents = hit?.discount || 0
  return { baseCents, discountCents, totalCents: baseCents - discountCents, promo: hit?.promo || null }
}
export const promoLabel = p => {
  const v = p.kind === 'percent' ? `${p.value}% OFF` : `${money(p.value)} OFF`
  return v
}
export const promoWhen = p => {
  const bits = []
  if (p.timeFrom && p.timeTo) bits.push(`${p.timeFrom}–${p.timeTo}`)
  if (p.onlyToday) bits.push('Solo hoy')
  if (p.dateFrom && p.dateTo) bits.push(`${p.dateFrom.split('-').reverse().slice(0, 2).join('/')} al ${p.dateTo.split('-').reverse().slice(0, 2).join('/')}`)
  else if (p.dateFrom) bits.push(`Desde ${p.dateFrom.split('-').reverse().slice(0, 2).join('/')}`)
  else if (p.dateTo) bits.push(`Hasta ${p.dateTo.split('-').reverse().slice(0, 2).join('/')}`)
  if (p.frequentOnly) bits.push(`Con ${p.minBookings || 5}+ reservas`)
  return bits.join(' · ') || 'Todos los horarios'
}

/* ---------- Seña y devoluciones ---------- */
export function depositFor(complex, totalCents) {
  const b = complex.booking || {}
  if (!b.depositRequired) return 0
  const v = b.depositType === 'fixed' ? b.depositFixedCents || 0 : Math.round(totalCents * (b.depositPercent || 30) / 100)
  return Math.min(totalCents, v)
}
export function refundFor(booking, complex, by = 'player', now = new Date()) {
  const paid = booking.paidCents || 0
  if (!paid) return 0
  if (by !== 'player') return paid
  const hours = (bookingStart(booking) - now) / 3600000
  if (hours < (complex.booking?.cancellationHours ?? 6)) return 0
  const pol = complex.booking?.refundPolicy || 'full'
  return pol === 'full' ? paid : pol === 'half' ? Math.round(paid / 2) : 0
}
export const cancelPolicyText = complex => {
  const b = complex.booking || {}
  const h = b.cancellationHours ?? 6
  const r = { full: 'se devuelve lo pagado', half: 'se devuelve el 50% de lo pagado', none: 'no se devuelve el pago' }[b.refundPolicy || 'full']
  return `Cancelación gratis hasta ${h} h antes: ${r}. Después, no hay devolución.`
}

/* ---------- Notificaciones dentro de la app ---------- */
export function notify(state, { userId, type, title, text, bookingId = null, complexId = null, date = null, link = null }) {
  // Con Supabase los avisos los genera la base (triggers); acá solo en modo demo.
  if (!userId || state.app?.demoMode === false) return
  const list = (state.notifications ||= [])
  list.push({ id: uid('n'), userId, type, title, text, bookingId, complexId, date, link, createdAt: new Date().toISOString(), read: false })
  if (list.length > 300) list.splice(0, list.length - 300)
}
const when = b => `${relativeDay(b.date)} ${b.time}`

/* ---------- Operaciones (se ejecutan dentro de store.update) ---------- */
export function placeBooking(state, { complexId, courtId, date, time, player, playerName, phone, source = 'app', note = '', mode = 'deposit', manual = false }) {
  const complex = getComplex(state, complexId)
  const court = getCourt(state, courtId)
  if (!complex || !court) throw new Error('No encontramos esa cancha.')
  if (!manual && (!complex.active || !complex.public || !isApproved(complex))) throw new Error('Este complejo no está disponible.')
  for (const old of state.bookings) {
    if (old.courtId === courtId && old.date === date && old.time === time && expiredPending(old)) Object.assign(old, { status: 'cancelled', cancelledBy: 'system', cancelledAt: new Date().toISOString() })
  }
  const info = slotInfo(state, complex, court, date, time)
  if (info.kind !== 'free') throw new Error(info.kind === 'past' ? 'Ese horario ya pasó.' : 'Ese horario ya no está libre. Elegí otro.')
  const q = quote(state, court, date, time, player?.id)
  const cfg = complex.booking || {}
  const now = new Date()
  const b = {
    id: uid('r'), complexId, courtId, playerId: player?.id || null,
    playerName: playerName || player?.name || 'Cliente', phone: phone || player?.phone || '',
    date, time, durationMin: complex.hours?.slotMinutes || 60,
    baseCents: q.baseCents, discountCents: q.discountCents, promoName: q.promo?.name || '',
    totalCents: q.totalCents, depositCents: depositFor(complex, q.totalCents),
    paidCents: 0, paymentMode: mode, paymentStatus: 'pending', payMethod: '',
    status: 'pending', source, note, createdAt: now.toISOString(), expiresAt: null,
  }
  if (mode === 'onsite' || manual) b.status = 'confirmed'
  else b.expiresAt = new Date(now.getTime() + (cfg.payWithinMinutes || 30) * 60000).toISOString()
  state.bookings.push(b)
  if (!manual) notify(state, { userId: complex.ownerId, type: 'booking_new', title: 'Nueva reserva', text: `${b.playerName} · ${court.name} · ${when(b)}`, bookingId: b.id, complexId, date })
  return b
}

export function applyPayment(state, bookingId, kind, method = 'mercadopago') {
  const b = state.bookings.find(x => x.id === bookingId)
  if (!b) throw new Error('No encontramos la reserva.')
  if (effStatus(b) === 'cancelled') throw new Error('El tiempo para pagar venció. Hacé la reserva de nuevo.')
  const complex = getComplex(state, b.complexId)
  const before = b.paidCents || 0
  if (kind === 'deposit') {
    b.paidCents = Math.max(b.paidCents, b.depositCents || depositFor(complex, b.totalCents))
    b.status = 'deposit_paid'
  } else {
    b.paidCents = b.totalCents
    b.status = 'confirmed'
  }
  b.paymentStatus = b.paidCents >= b.totalCents ? 'paid' : 'partial'
  b.payMethod = method
  b.expiresAt = null
  const court = getCourt(state, b.courtId), got = b.paidCents - before
  notify(state, { userId: complex.ownerId, type: 'payment', title: 'Pago recibido', text: `${money(got)} de ${b.playerName} · ${court?.name} · ${when(b)}`, bookingId: b.id, complexId: b.complexId, date: b.date })
  notify(state, { userId: b.playerId, type: 'payment_ok', title: b.paymentStatus === 'paid' ? 'Pago aprobado' : 'Seña pagada', text: `${complex.name} · ${court?.name} · ${when(b)}`, bookingId: b.id, complexId: b.complexId, date: b.date })
  return b
}

export function cancelBooking(state, bookingId, by = 'player') {
  const b = state.bookings.find(x => x.id === bookingId)
  if (!b) throw new Error('No encontramos la reserva.')
  const complex = getComplex(state, b.complexId)
  const refund = refundFor(b, complex, by)
  b.refundCents = refund
  b.paidCents = Math.max(0, (b.paidCents || 0) - refund)
  b.paymentStatus = refund > 0 && b.paidCents === 0 ? 'refunded' : b.paidCents > 0 ? 'partial' : 'pending'
  b.status = 'cancelled'
  b.cancelledAt = new Date().toISOString()
  b.cancelledBy = by
  const court = getCourt(state, b.courtId)
  freeWaitlist(state, b)
  if (by === 'player') notify(state, { userId: complex.ownerId, type: 'booking_cancelled', title: 'Reserva cancelada', text: `${b.playerName} canceló ${court?.name} · ${when(b)}`, bookingId: b.id, complexId: b.complexId, date: b.date })
  else notify(state, { userId: b.playerId, type: 'booking_cancelled', title: 'El complejo canceló tu reserva', text: `${complex.name} · ${when(b)}${refund > 0 ? ` · Te devolvemos ${money(refund)}` : ''}`, bookingId: b.id, complexId: b.complexId, date: b.date })
  return b
}

/* ---------- Clientes (derivado de reservas) ---------- */
export function clientsOf(state, complexIds) {
  const map = new Map()
  for (const b of state.bookings) {
    if (b._busy || !complexIds.includes(b.complexId)) continue
    const key = digits(b.phone) || b.playerName.toLowerCase()
    const c = map.get(key) || { key, name: b.playerName, phone: b.phone, playerId: null, bookings: [], total: 0, completed: 0, cancelled: 0, noShows: 0, last: '', spent: 0, courts: {} }
    if (b.playerId) c.playerId = b.playerId
    const st = effStatus(b)
    c.bookings.push(b)
    if (st === 'cancelled') c.cancelled++
    else {
      if (st === 'no_show') c.noShows++
      if (st === 'completed') c.completed++
      c.courts[b.courtId] = (c.courts[b.courtId] || 0) + 1
      c.total++
      if (b.date > c.last && st !== 'no_show') c.last = b.date
    }
    c.spent += b.paidCents || 0
    if ((b.createdAt || '') >= (c.seen || '')) { c.seen = b.createdAt; c.name = b.playerName; if (b.phone) c.phone = b.phone }
    map.set(key, c)
  }
  const now = new Date()
  return [...map.values()].map(c => {
    const top = Object.entries(c.courts).sort((a, b) => b[1] - a[1])[0]
    return { ...c, frequent: c.total >= 5, habitualCourtId: top && top[1] >= 3 ? top[0] : null, upcoming: c.bookings.filter(b => isUpcoming(b, now)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)) }
  }).sort((a, b) => Number(b.frequent) - Number(a.frequent) || (b.last || '').localeCompare(a.last || ''))
}

/* ---------- Favoritos (por usuario en demo, lista única con Supabase) ---------- */
export const favsOf = (state, userId) => state.favoritesByUser ? state.favoritesByUser[userId] || [] : state.favorites || []
export function toggleFav(state, userId, complexId) {
  const list = [...favsOf(state, userId)]
  const i = list.indexOf(complexId)
  if (i >= 0) list.splice(i, 1); else list.push(complexId)
  if (state.favoritesByUser) state.favoritesByUser[userId] = list; else state.favorites = list
}

export const nextDays = (n, from = todayISO()) => Array.from({ length: n }, (_, i) => addDays(from, i))
export const ownerComplexes = (state, userId) => state.complexes.filter(c => c.ownerId === userId)
export { slotsFor }

/* ---------- Turno fijo pedido por el jugador ---------- */
export const WEEKDAYS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
export const weekdayOf = iso => new Date(`${iso}T12:00:00`).getDay()

export function requestFixed(state, { bookingId, weeks }) {
  const b = state.bookings.find(x => x.id === bookingId)
  if (!b) throw new Error('No encontramos la reserva.')
  const list = (state.fixedRequests ||= [])
  if (list.some(r => r.bookingId === bookingId && r.status === 'pending')) throw new Error('Ya pediste este turno fijo. Esperá la respuesta del complejo.')
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const r = { id: uid('fx'), bookingId, complexId: b.complexId, courtId: b.courtId, playerId: b.playerId, playerName: b.playerName, phone: b.phone, weekday: weekdayOf(b.date), time: b.time, weeks, startDate: addDays(b.date, 7), status: 'pending', createdAt: new Date().toISOString() }
  list.push(r)
  notify(state, { userId: complex.ownerId, type: 'fixed_request', title: 'Pedido de turno fijo', text: `${b.playerName} · ${WEEKDAYS[r.weekday]} ${r.time} · ${court.name} · ${weeks} semanas`, complexId: b.complexId })
  return r
}

export function decideFixed(state, id, approve) {
  const r = (state.fixedRequests || []).find(x => x.id === id)
  if (!r || r.status !== 'pending') throw new Error('Este pedido ya fue respondido.')
  const complex = getComplex(state, r.complexId), court = getCourt(state, r.courtId)
  r.status = approve ? 'approved' : 'rejected'; r.decidedAt = new Date().toISOString()
  r.created = 0; r.skipped = []
  if (approve) {
    const series = uid('serie')
    for (let i = 0; i < r.weeks; i++) {
      const date = addDays(r.startDate, 7 * i)
      try {
        const b = placeBooking(state, { complexId: r.complexId, courtId: r.courtId, date, time: r.time, player: { id: r.playerId, name: r.playerName, phone: r.phone }, manual: true, mode: 'onsite' })
        b.seriesId = series; b.source = 'app'; r.created++
      } catch { r.skipped.push(date) }
    }
  }
  notify(state, { userId: r.playerId, type: approve ? 'fixed_ok' : 'fixed_no', title: approve ? 'Turno fijo aprobado' : 'Turno fijo rechazado',
    text: approve ? `${complex.name} · ${WEEKDAYS[r.weekday]} ${r.time} · ${r.created} reservas${r.skipped.length ? ` (${r.skipped.length} semanas ocupadas)` : ''}` : `${complex.name} no puede darte los ${WEEKDAYS[r.weekday]} a las ${r.time}.`, complexId: r.complexId, link: '/reservas' })
  return r
}

/* ---------- Lista de espera ---------- */
export function joinWaitlist(state, { complexId, courtId, date, time, player }) {
  const list = (state.waitlist ||= [])
  if (list.some(w => w.playerId === player.id && w.courtId === courtId && w.date === date && w.time === time && !w.notifiedAt)) throw new Error('Ya estás anotado para este horario.')
  const w = { id: uid('w'), complexId, courtId, date, time, playerId: player.id, playerName: player.name, phone: player.phone, createdAt: new Date().toISOString(), notifiedAt: null }
  list.push(w)
  return w
}
export const leaveWaitlist = (state, id) => { state.waitlist = (state.waitlist || []).filter(w => w.id !== id) }
export const waitingFor = (state, courtId, date, time) => (state.waitlist || []).filter(w => w.courtId === courtId && w.date === date && w.time === time && !w.notifiedAt)

/* Cuando se libera un horario, avisa a todos los que esperaban (el primero que reserva, se lo queda). */
function freeWaitlist(state, b) {
  if (state.app?.demoMode === false) return // con Supabase lo hace la base
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  for (const w of waitingFor(state, b.courtId, b.date, b.time)) {
    if (w.playerId === b.playerId) continue
    w.notifiedAt = new Date().toISOString()
    notify(state, { userId: w.playerId, type: 'waitlist', title: 'Se liberó un horario', text: `${complex.name} · ${court.name} · ${relativeDay(b.date)} ${b.time}. Reservalo antes que otro.`, complexId: b.complexId, date: b.date,
      link: `/complejo/${complex.slug}/reservar?fecha=${b.date}&cancha=${b.courtId}&hora=${b.time}` })
  }
}

/* ---------- Estadísticas del dueño (últimos N días) ---------- */
export function ownerStats(state, complex, days = 30) {
  const today = todayISO(), courts = activeCourts(state, complex.id), slots = slotsFor(complex)
  const taken = new Map()
  for (const b of state.bookings) if (b.complexId === complex.id && effStatus(b) !== 'cancelled') taken.set(`${b.courtId}|${b.date}|${b.time}`, b)
  const byHour = Object.fromEntries(slots.map(t => [t, { total: 0, used: 0 }]))
  const byDay = Array.from({ length: 7 }, () => ({ total: 0, used: 0 }))
  const byCourt = Object.fromEntries(courts.map(c => [c.id, { total: 0, used: 0 }]))
  const grid = Array.from({ length: 7 }, () => Object.fromEntries(slots.map(t => [t, { total: 0, used: 0 }])))
  let total = 0, used = 0, income = 0, noShows = 0, lost = 0, cancels = 0, bookingsN = 0, volume = 0
  // Solo se cuentan los días desde la primera reserva del complejo (un complejo nuevo no está "vacío" antes de existir).
  const first = state.bookings.filter(b => b.complexId === complex.id && !b._busy).reduce((m, b) => (b.date < m ? b.date : m), today)
  let counted = 0
  for (let i = 1; i <= days; i++) {
    const date = addDays(today, -i), wd = weekdayOf(date)
    if (date < first) continue
    counted++
    for (const c of courts) for (const t of slots) {
      const hit = taken.has(`${c.id}|${date}|${t}`)
      total++; byHour[t].total++; byDay[wd].total++; byCourt[c.id].total++; grid[wd][t].total++
      if (hit) { used++; byHour[t].used++; byDay[wd].used++; byCourt[c.id].used++; grid[wd][t].used++ }
    }
  }
  const from = addDays(today, -days)
  for (const b of state.bookings) {
    if (b.complexId !== complex.id || b.date < from || b.date >= today) continue
    const st = effStatus(b)
    income += b.paidCents || 0
    if (st !== 'cancelled') { bookingsN++; volume += b.totalCents || 0 }
    if (st === 'no_show') { noShows++; lost += Math.max(0, b.totalCents - (b.paidCents || 0)) }
    if (st === 'cancelled') cancels++
  }
  const pct = x => (x.total ? Math.round((x.used / x.total) * 100) : 0)
  const hours = slots.map(t => ({ t, pct: pct(byHour[t]) }))
  const ranked = [...hours].sort((a, b) => b.pct - a.pct)
  // Insights: ventanas de 2 horas por día de la semana (solo con datos suficientes)
  const enough = counted >= 14 && used >= 20
  const windows = []
  if (enough) for (let wd = 0; wd < 7; wd++) for (let i = 0; i + 1 < slots.length; i++) {
    const a = grid[wd][slots[i]], b = grid[wd][slots[i + 1]]
    const tot = a.total + b.total
    if (tot >= courts.length * 4) windows.push({ wd, from: slots[i], to: slots[i + 1], pct: Math.round(((a.used + b.used) / tot) * 100) })
  }
  const pickDistinct = list => { const seen = new Set(); return list.filter(w => !seen.has(w.wd) && seen.add(w.wd)).slice(0, 2) }
  const weak = pickDistinct([...windows].filter(w => w.pct <= 35).sort((a, b) => a.pct - b.pct))
  const strong = pickDistinct([...windows].filter(w => w.pct >= 75).sort((a, b) => b.pct - a.pct))
  const dayList = [1, 2, 3, 4, 5, 6, 0].map(d => ({ d, pct: pct(byDay[d]) }))
  const rankedDays = [...dayList].sort((a, b) => b.pct - a.pct)
  return {
    enough, counted, since: counted < days ? first : null, weak, strong, bookingsN, volume, ticket: bookingsN ? Math.round(volume / bookingsN) : 0,
    strongDays: rankedDays.slice(0, 2), weakDays: rankedDays.slice(-2).reverse(),
    occupancy: pct({ total, used }), income, noShows, lost, cancels,
    hours, top: ranked.slice(0, 3), bottom: ranked.slice(-3).reverse(),
    days: [1, 2, 3, 4, 5, 6, 0].map(d => ({ d, pct: pct(byDay[d]) })),
    courts: courts.map(c => ({ court: c, pct: pct(byCourt[c.id]) })),
  }
}

/* Datos del día para el inicio del dueño (todo calculado de reservas reales). */
export function dayStatus(state, complex, date = todayISO(), now = new Date(), courtFilter = null) {
  const courts = activeCourts(state, complex.id).filter(c => !courtFilter || c.id === courtFilter), times = slotsFor(complex)
  let total = 0, taken = 0, free = 0, next = null
  const byHour = {}
  for (const t of times) for (const c of courts) {
    const info = slotInfo(state, complex, c, date, t, now)
    total++
    if (info.kind === 'booked') { taken++; byHour[t] = (byHour[t] || 0) + 1 }
    if (info.kind === 'free') { free++; if (!next) next = { t, court: c } }
  }
  const bookings = state.bookings.filter(b => b.complexId === complex.id && b.date === date && (!courtFilter || b.courtId === courtFilter) && !b._busy && effStatus(b, now) !== 'cancelled')
  const peak = Object.entries(byHour).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return {
    total, taken, free, next, courts: courts.length,
    pct: total ? Math.round((taken / total) * 100) : 0,
    peak: peak ? { t: peak[0], n: peak[1] } : null,
    bookings, collected: bookings.reduce((s, b) => s + (b.paidCents || 0), 0),
    confirmed: bookings.filter(b => ['confirmed', 'deposit_paid', 'completed'].includes(effStatus(b, now))).length,
    pending: bookings.filter(b => effStatus(b, now) === 'pending').length,
  }
}


/* Próximos horarios libres de un complejo en un día (uno por hora, con la primera cancha libre). */
export function nextTimes(state, complex, date, n = 5, now = new Date(), when = null) {
  const courts = activeCourts(state, complex.id), out = []
  for (const t of slotsFor(complex)) {
    if (when?.part && !when.part(t)) continue
    const c = courts.find(x => slotInfo(state, complex, x, date, t, now).kind === 'free')
    if (c) out.push({ t, courtId: c.id })
    if (!when?.near && out.length >= n) break
  }
  // "Cerca de las 21": los horarios libres más cercanos a la hora pedida, en orden de reloj.
  if (when?.near) {
    const m = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)), at = m(when.near)
    return out.sort((a, b) => Math.abs(m(a.t) - at) - Math.abs(m(b.t) - at)).slice(0, n).sort((a, b) => a.t.localeCompare(b.t))
  }
  return out
}

/* ---------- Después del partido ---------- */
export const REVIEW_TAGS = {
  good: ['Cancha en buen estado', 'Buena iluminación', 'Atención excelente', 'Todo limpio', 'Precio justo', 'Empezamos a horario'],
  bad: ['Cancha en mal estado', 'Poca luz', 'Mala atención', 'Vestuarios sucios', 'Precio alto', 'Demoras'],
}
export const RATING_WORDS = ['', 'Malo', 'Regular', 'Bien', 'Muy bien', '¡Excelente!']

export const reviewOf = (state, bookingId) => (state.reviews || []).find(r => r.bookingId === bookingId)
export const playedBookings = (state, userId, now = new Date()) =>
  state.bookings.filter(b => b.playerId === userId && effStatus(b, now) === 'completed').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))

/* Próxima fecha libre del mismo horario y cancha (el mismo día de la semana), para "volver a jugar" con un toque. */
export function rebookTarget(state, b, now = new Date()) {
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  if (!complex || !court || court.status !== 'active') return { complex, court, date: null, free: false }
  let d = addDays(todayISO(), 1)
  while (new Date(`${d}T12:00:00`).getDay() !== new Date(`${b.date}T12:00:00`).getDay()) d = addDays(d, 1)
  for (let i = 0; i < 4; i++, d = addDays(d, 7)) if (slotInfo(state, complex, court, d, b.time, now).kind === 'free') return { complex, court, date: d, free: true }
  return { complex, court, date: null, free: false }
}
export function rebookLink(state, b) {
  const t = rebookTarget(state, b)
  if (!t.complex) return '/buscar'
  return t.free ? `/complejo/${t.complex.slug}/reservar?fecha=${t.date}&cancha=${t.court.id}&hora=${b.time}` : `/complejo/${t.complex.slug}/reservar${t.court ? `?cancha=${t.court.id}` : ''}`
}

/* Avisos automáticos (modo demo): 30 minutos después del partido pedimos la calificación y,
   a los 3 días, invitamos a volver a jugar. Con Supabase lo hace la base (migración 0004).
   Con dry = true solo dice si hay algo para enviar. */
export function postMatchNotices(state, now = new Date(), dry = false) {
  if (state.app?.demoMode === false) return 0
  let n = 0
  for (const b of state.bookings) {
    if (!b.playerId || b._busy || effStatus(b, now) !== 'completed') continue
    const end = bookingEnd(b), since = now - end, complex = getComplex(state, b.complexId)
    if (!complex) continue
    if (!b.rateNoticeAt && since >= 30 * 60000 && since <= 72 * 3600000 && !reviewOf(state, b.id)) {
      n++; if (dry) continue
      b.rateNoticeAt = now.toISOString()
      notify(state, { userId: b.playerId, type: 'rate', title: '¿Cómo estuvo el partido?', text: `Calificá ${complex.name}: son 10 segundos y ayudás a otros jugadores.`, bookingId: b.id, complexId: b.complexId, link: `/reservas?calificar=${b.id}` })
    }
    if (!b.rebookNoticeAt && since >= 3 * 86400000 && since <= 10 * 86400000) {
      const later = state.bookings.some(x => x.playerId === b.playerId && x.complexId === b.complexId && isUpcoming(x, now))
      if (later) { if (!dry) b.rebookNoticeAt = now.toISOString(); continue }
      n++; if (dry) continue
      b.rebookNoticeAt = now.toISOString()
      const t = rebookTarget(state, b, now)
      notify(state, { userId: b.playerId, type: 'rebook', title: '¿Jugamos de nuevo?', text: t.free ? `El ${new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(new Date(`${t.date}T12:00:00`))} a las ${b.time} está libre en ${complex.name}.` : `Reservá otra vez en ${complex.name}.`, bookingId: b.id, complexId: b.complexId, link: rebookLink(state, b) })
    }
  }
  return n
}

/* Reseña nueva: se guarda y se avisa al dueño. */
export function addReview(state, { booking, user, rating, text, tags }) {
  const complex = getComplex(state, booking.complexId)
  const review = { id: uid('rv'), complexId: booking.complexId, bookingId: booking.id, playerId: user.id, playerName: user.name.split(' ').map((w, i) => i ? w[0] + '.' : w).join(' '), rating, text: (text || '').trim(), tags: tags || [], createdAt: new Date().toISOString(), hidden: false, reported: false }
  state.reviews.push(review)
  notify(state, { userId: complex?.ownerId, type: 'review_new', title: `Nueva reseña: ${'★'.repeat(rating)}`, text: `${review.playerName} calificó ${complex?.name}${review.text ? `: “${review.text.slice(0, 80)}”` : '.'}`, bookingId: booking.id, complexId: booking.complexId, link: '/dueno/resenas' })
  return review
}

/* ---------- Confianza y verificación ---------- */
/* Lo que revisa La Fija antes de poner la insignia "Verificado". */
export function verifyChecks(state, c) {
  const cs = state.courts.filter(x => x.complexId === c.id)
  return [
    ['Foto de portada', !!c.coverUrl], ['Dirección y ubicación en el mapa', !!(c.address?.trim() && c.lat != null)],
    ['Descripción del complejo', (c.description || '').trim().length >= 20], ['Al menos una cancha con precio', cs.some(x => x.priceCents > 0)],
    ['Teléfono o WhatsApp de contacto', !!(c.whatsapp || c.phone)], ['Horarios de atención cargados', !!(c.hours?.open && c.hours?.close)],
  ]
}
/* Datos reales de cómo se porta el complejo: se calculan de las reservas y reseñas, no los carga nadie. */
export function trustOf(state, complexId, now = new Date()) {
  const c = getComplex(state, complexId)
  const bs = state.bookings.filter(b => b.complexId === complexId && !b._busy && b.source !== 'busy')
  const played = bs.filter(b => effStatus(b, now) === 'completed').length
  const booked = bs.filter(b => b.cancelledBy || ['completed', 'confirmed', 'deposit_paid', 'no_show'].includes(effStatus(b, now))).length
  const byComplex = bs.filter(b => effStatus(b, now) === 'cancelled' && b.cancelledBy === 'owner').length
  const rs = (state.reviews || []).filter(r => r.complexId === complexId && !r.hidden)
  const answered = rs.filter(r => r.reply).length
  return { verified: !!c?.verified, played, byComplex, cancelPct: booked ? Math.round(byComplex / booked * 100) : 0, reviews: rs.length, answeredPct: rs.length ? Math.round(answered / rs.length * 100) : null }
}

/* ---------- Problemas con una reserva ---------- */
export const REPORT_KINDS = { closed: 'Estaba cerrado o no abrieron', price: 'Me cobraron distinto', state: 'La cancha estaba en mal estado', late: 'Nos hicieron esperar', other: 'Otro problema' }
export const reportOf = (state, bookingId) => (state.reports || []).filter(r => r.bookingId === bookingId).pop()
export function addReport(state, { booking, user, kind, text }) {
  const complex = getComplex(state, booking.complexId)
  const r = { id: uid('rp'), bookingId: booking.id, complexId: booking.complexId, playerId: user.id, playerName: user.name, kind, text: (text || '').trim(), status: 'open', response: '', createdAt: new Date().toISOString() }
  ;(state.reports ||= []).push(r)
  const msg = `${user.name.split(' ')[0]} avisó: ${REPORT_KINDS[kind].toLowerCase()} (${complex?.name} · ${when(booking)}).`
  notify(state, { userId: complex?.ownerId, type: 'report', title: 'Un jugador avisó un problema', text: msg, bookingId: booking.id, complexId: booking.complexId, link: '/dueno/reservas' })
  for (const a of state.users.filter(u => u.role === 'admin')) notify(state, { userId: a.id, type: 'report', title: 'Nuevo reporte de un jugador', text: msg, bookingId: booking.id, complexId: booking.complexId, link: '/admin/reportes' })
  return r
}
export function resolveReport(state, id, response) {
  const r = (state.reports || []).find(x => x.id === id)
  if (!r) return
  r.status = 'resolved'; r.response = (response || '').trim(); r.resolvedAt = new Date().toISOString()
  notify(state, { userId: r.playerId, type: 'report_resolved', title: 'Respondieron tu reporte', text: r.response || 'El problema que avisaste quedó resuelto.', bookingId: r.bookingId, complexId: r.complexId, link: '/reservas' })
}

/* ---------- Perfil del jugador ---------- */
const mondayKey = iso => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10) }
export const BADGES = [
  { id: 'first', icon: 'goal', title: 'Debut', text: 'Jugaste tu primer partido', ok: s => s.played >= 1 },
  { id: 'p5', icon: 'shirt', title: 'Habitual', text: '5 partidos jugados', ok: s => s.played >= 5 },
  { id: 'p10', icon: 'trophy', title: 'De la casa', text: '10 partidos jugados', ok: s => s.played >= 10 },
  { id: 'p25', icon: 'crown', title: 'Leyenda', text: '25 partidos jugados', ok: s => s.played >= 25 },
  { id: 'streak', icon: 'flame', title: 'En racha', text: '3 semanas seguidas jugando', ok: s => s.bestStreak >= 3 },
  { id: 'night', icon: 'moon', title: 'Nocturno', text: '3 partidos después de las 21', ok: s => s.nights >= 3 },
  { id: 'early', icon: 'sun', title: 'Madrugador', text: '3 partidos antes de las 12', ok: s => s.mornings >= 3 },
  { id: 'explorer', icon: 'compass', title: 'Explorador', text: 'Jugaste en 3 complejos distintos', ok: s => s.complexes >= 3 },
  { id: 'critic', icon: 'star', title: 'Crítico', text: 'Dejaste 3 reseñas', ok: s => s.reviews >= 3 },
]
export function playerStats(state, userId, now = new Date()) {
  const played = playedBookings(state, userId, now)
  const weeks = [...new Set(played.map(b => mondayKey(b.date)))].sort()
  let best = 0, run = 0, prev = null
  for (const w of weeks) { run = prev && Math.round((new Date(w) - new Date(prev)) / 604800000) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = w }
  const count = {}; for (const b of played) count[b.complexId] = (count[b.complexId] || 0) + 1
  const fav = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  const s = {
    played: played.length, spent: played.reduce((t, b) => t + (b.paidCents || 0), 0), bestStreak: best,
    thisStreak: weeks.length && Math.round((new Date(mondayKey(todayISO())) - new Date(weeks[weeks.length - 1])) / 604800000) <= 1 ? run : 0,
    nights: played.filter(b => b.time >= '21:00').length, mornings: played.filter(b => b.time < '12:00').length,
    complexes: Object.keys(count).length, favoriteComplex: fav ? getComplex(state, fav[0]) : null, favoriteCount: fav?.[1] || 0,
    reviews: (state.reviews || []).filter(r => r.playerId === userId).length, hours: played.reduce((t, b) => t + (b.durationMin || 60) / 60, 0),
  }
  return { ...s, badges: BADGES.map(b => ({ ...b, earned: b.ok(s) })) }
}
