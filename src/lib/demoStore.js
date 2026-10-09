import { addDays, fromISO, todayISO, uid } from './format'
import { depositFor, priceFor, slotsFor } from './domain'

export const DEMO_KEY = 'lafija-demo-v18'
export const SESSION_KEY = 'lafija-session'
const VERSION = 16

const BOOKING_CFG = { depositRequired: true, depositType: 'percent', depositPercent: 30, depositFixedCents: 0, allowFullPayment: true, cancellationHours: 6, refundPolicy: 'full', payWithinMinutes: 30 }
const now = () => new Date().toISOString()

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const users = () => [
  { id: 'u-player', role: 'player', name: 'Axel Pérez', phone: '+5491161234567', email: 'jugador@lafija.demo', active: true, createdAt: now() },
  { id: 'u-mati', role: 'player', name: 'Matías Pérez', phone: '+5491162223344', email: 'mati@correo.com', active: true, createdAt: now() },
  { id: 'u-nico', role: 'player', name: 'Nicolás Ruiz', phone: '+5491155550123', email: 'nico.ruiz@correo.com', active: true, createdAt: now() },
  { id: 'u-cami', role: 'player', name: 'Camila Torres', phone: '+5491144447788', email: 'camitorres@correo.com', active: true, createdAt: now() },
  { id: 'u-owner', role: 'owner', name: 'Martín Gómez', phone: '+5491133334455', email: 'dueno@lafija.demo', active: true, createdAt: now() },
  { id: 'u-owner2', role: 'owner', name: 'Lucía Fernández', phone: '+5491166667788', email: 'lucia@pasecorto.com', active: true, createdAt: now() },
  { id: 'u-admin', role: 'admin', name: 'Equipo La Fija', phone: '+5491100000000', email: 'admin@lafija.demo', active: true, createdAt: now() },
]

const demo = n => `${import.meta.env.BASE_URL}demo/cancha-${n}.svg`
const COVERS = { 'complex-1': [3, 5, 1], 'complex-2': [1, 6, 8], 'complex-3': [4, 2, 7], 'complex-4': [2, 7, 3], 'complex-5': [8, 6, 1], 'complex-6': [5, 4, 2], 'complex-7': [6, 8, 1] }
const VERIFIED = ['complex-1', 'complex-2', 'complex-3', 'complex-4']
const complex = (o) => ({
  verified: VERIFIED.includes(o.id), active: true, public: true, approval: 'approved', coverUrl: demo((COVERS[o.id] || [1])[0]), gallery: (COVERS[o.id] || []).slice(1).map(demo), services: [], whatsapp: o.phone, createdAt: now(),
  hours: { open: '10:00', close: '00:00', slotMinutes: 60 }, booking: { ...BOOKING_CFG }, ...o,
})
const court = (o) => ({ status: 'active', covered: false, lighting: true, priceRules: [], description: '', features: [], photo: '', ...o })

const complexes = () => [
  complex({ id: 'complex-1', ownerId: 'u-owner', name: 'La Gambeta', slug: 'la-gambeta', city: 'Lanús', address: 'Av. Hipólito Yrigoyen 4500, Lanús Oeste', lat: -34.7146, lng: -58.4018, phone: '+5491133334455', description: 'Tres canchas de fútbol sintético, dos techadas. Vestuarios con duchas y buffet abierto hasta el cierre.', services: ['Vestuarios', 'Duchas', 'Estacionamiento', 'Buffet'] }),
  complex({ id: 'complex-2', ownerId: 'u-owner', name: 'El Potrero', slug: 'el-potrero', city: 'Lanús', address: '25 de Mayo 1100, Lanús Este', lat: -34.7067, lng: -58.3938, phone: '+5491133334455', hours: { open: '09:00', close: '23:00', slotMinutes: 60 }, booking: { ...BOOKING_CFG, depositRequired: false, cancellationHours: 4 }, description: 'Dos canchas de fútbol 7 al aire libre con iluminación led. Se paga en la cancha o online.', services: ['Vestuarios', 'Parrilla', 'Estacionamiento'] }),
  complex({ id: 'complex-3', ownerId: 'u-owner2', name: 'Fútbol Club', slug: 'futbol-club', city: 'Banfield', address: 'Alsina 2100, Banfield', lat: -34.7407, lng: -58.3907, phone: '+5491166667788', booking: { ...BOOKING_CFG, depositPercent: 50, refundPolicy: 'half', cancellationHours: 12 }, description: 'Complejo cubierto con dos canchas de fútbol 5. Cafetería y estacionamiento propio.', services: ['Vestuarios', 'Buffet', 'Estacionamiento', 'Wi-Fi'] }),
  complex({ id: 'complex-4', ownerId: 'u-owner2', name: 'Pase Corto', slug: 'pase-corto', city: 'Remedios de Escalada', address: 'Av. 29 de Septiembre 3200, Remedios de Escalada', lat: -34.7236, lng: -58.3876, phone: '+5491166667788', hours: { open: '09:00', close: '00:00', slotMinutes: 60 }, booking: { ...BOOKING_CFG, depositType: 'fixed', depositFixedCents: 800000, cancellationHours: 24 }, description: 'Dos canchas de fútbol 5 techadas y una de fútbol 8. Seña fija de $8.000.', services: ['Vestuarios', 'Buffet', 'Alquiler de pecheras'] }),
  complex({ id: 'complex-6', ownerId: 'u-owner2', name: 'El Tablón', slug: 'el-tablon', city: 'Adrogué', address: 'Esteban Adrogué 1250, Adrogué', lat: -34.7985, lng: -58.3902, phone: '+5491166667788', description: 'Dos canchas de fútbol 5 techadas y una de fútbol 7 al aire libre. Estacionamiento sobre la calle.', services: ['Vestuarios', 'Duchas', 'Buffet'] }),
  complex({ id: 'complex-7', ownerId: 'u-owner2', name: 'Burzaco Fútbol', slug: 'burzaco-futbol', city: 'Burzaco', address: 'Av. Espora 1800, Burzaco', lat: -34.8262, lng: -58.3935, phone: '+5491166667788', hours: { open: '09:00', close: '00:00', slotMinutes: 60 }, booking: { ...BOOKING_CFG, depositRequired: false }, description: 'Canchas de fútbol 5 y fútbol 8 con césped nuevo. Se paga en la cancha.', services: ['Vestuarios', 'Parrilla', 'Estacionamiento'] }),
  complex({ id: 'complex-5', ownerId: 'u-owner2', name: 'Club Central', slug: 'club-central', city: 'Lanús', address: 'Mitre 300, Lanús', lat: -34.7019, lng: -58.3921, phone: '+5491166667788', approval: 'pending', description: 'Dos canchas de fútbol 5 a dos cuadras de la estación.', services: ['Vestuarios'] }),
]

const courts = () => [
  court({ id: 'court-g1', complexId: 'complex-1', name: 'Cancha 1', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2500000, priceRules: [{ from: '19:00', to: '24:00', priceCents: 2800000 }], description: 'Techada, con piso nuevo.', features: ['Piso nuevo'] }),
  court({ id: 'court-g2', complexId: 'complex-1', name: 'Cancha 2', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2800000 }),
  court({ id: 'court-g3', complexId: 'complex-1', name: 'Cancha 3', sport: 'Fútbol 7', surface: 'Sintético', priceCents: 3500000, features: ['Arcos reglamentarios'] }),
  court({ id: 'court-p1', complexId: 'complex-2', name: 'Cancha 1', sport: 'Fútbol 7', surface: 'Sintético', priceCents: 3000000 }),
  court({ id: 'court-p2', complexId: 'complex-2', name: 'Cancha 2', sport: 'Fútbol 7', surface: 'Sintético', priceCents: 3200000 }),
  court({ id: 'court-f1', complexId: 'complex-3', name: 'Cancha 1', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2800000 }),
  court({ id: 'court-f2', complexId: 'complex-3', name: 'Cancha 2', sport: 'Fútbol 5', surface: 'Césped natural', covered: true, priceCents: 3000000 }),
  court({ id: 'court-d1', complexId: 'complex-4', name: 'Cancha 1', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2600000 }),
  court({ id: 'court-d2', complexId: 'complex-4', name: 'Cancha 2', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2600000 }),
  court({ id: 'court-d3', complexId: 'complex-4', name: 'Cancha 3', sport: 'Fútbol 8', surface: 'Sintético', priceCents: 3800000 }),
  court({ id: 'court-t1', complexId: 'complex-6', name: 'Cancha 1', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2700000 }),
  court({ id: 'court-t2', complexId: 'complex-6', name: 'Cancha 2', sport: 'Fútbol 5', surface: 'Sintético', covered: true, priceCents: 2700000 }),
  court({ id: 'court-t3', complexId: 'complex-6', name: 'Cancha 3', sport: 'Fútbol 7', surface: 'Sintético', priceCents: 3600000 }),
  court({ id: 'court-b1', complexId: 'complex-7', name: 'Cancha 1', sport: 'Fútbol 5', surface: 'Sintético', priceCents: 2400000 }),
  court({ id: 'court-b2', complexId: 'complex-7', name: 'Cancha 2', sport: 'Fútbol 8', surface: 'Sintético', priceCents: 3400000 }),
  court({ id: 'court-c1', complexId: 'complex-5', name: 'Cancha 1', sport: 'Fútbol 5', surface: 'Sintético', priceCents: 2000000 }),
]

const CLIENTS = [
  ['Los Pibes', '+5491145670001', null], ['Matías Pérez', '+5491162223344', 'u-mati'], ['Nicolás Ruiz', '+5491155550123', 'u-nico'],
  ['Camila Torres', '+5491144447788', 'u-cami'], ['Marcos Díaz', '+5491145670005', null], ['Julián Castro', '+5491145670006', null],
  ['Los Tigres', '+5491145670007', null], ['Sebastián Vega', '+5491145670008', null], ['Pablo Ferreyra', '+5491145670009', null],
  ['Los de Siempre', '+5491145670010', null], ['Rodrigo Paz', '+5491145670011', null], ['Martina Acosta', '+5491145670012', null],
]

function seedBookings(cs, cx) {
  const rand = rng(7)
  const today = todayISO()
  const out = []
  const taken = new Set()
  const put = (c, date, time, who, status, o = {}) => {
    const key = `${c.id}|${date}|${time}`
    if (taken.has(key)) return null
    taken.add(key)
    const complexObj = cx.find(x => x.id === c.complexId)
    const total = o.total ?? priceFor(c, time)
    const dep = depositFor(complexObj, total)
    const paid = o.paid ?? (status === 'confirmed' ? total : status === 'completed' ? total : status === 'deposit_paid' ? dep : 0)
    const b = {
      id: o.id || uid('r'), complexId: c.complexId, courtId: c.id, playerId: who[2], playerName: who[0], phone: who[1],
      date, time, durationMin: complexObj.hours.slotMinutes, baseCents: total, discountCents: 0, promoName: '',
      totalCents: total, depositCents: dep, paidCents: paid, paymentMode: paid >= total ? 'full' : paid > 0 ? 'deposit' : 'onsite',
      paymentStatus: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending', payMethod: paid ? 'mercadopago' : '',
      status, source: o.source || (who[2] ? 'app' : 'manual'), note: o.note || '', createdAt: addDays(date, -2) + 'T15:00:00.000Z', expiresAt: o.expiresAt || null,
      refundCents: o.refundCents || 0,
    }
    out.push(b); return b
  }
  const axel = ['Axel Pérez', '+5491161234567', 'u-player']
  const g = id => cs.find(c => c.id === id)

  // Reservas a mano para que las pantallas tengan algo concreto
  put(g('court-g1'), today, '19:00', axel, 'confirmed', { id: 'r-axel-hoy' })
  put(g('court-g1'), today, '20:00', CLIENTS[0], 'deposit_paid', { id: 'r-pibes-hoy' })
  put(g('court-g2'), today, '20:00', CLIENTS[4], 'confirmed')
  put(g('court-g2'), today, '21:00', CLIENTS[6], 'deposit_paid')
  put(g('court-g3'), today, '19:00', CLIENTS[5], 'confirmed', { paid: 0, source: 'manual' })
  put(g('court-g1'), addDays(today, 1), '21:00', axel, 'deposit_paid', { id: 'r-axel-manana' })
  put(g('court-g3'), addDays(today, 1), '18:00', CLIENTS[5], 'pending', { expiresAt: new Date(Date.now() + 6 * 3600000).toISOString() })
  put(g('court-p1'), addDays(today, 4), '20:00', axel, 'confirmed', { paid: 0 })
  put(g('court-g1'), addDays(today, -3), '20:00', axel, 'completed', { id: 'r-axel-pasada' })
  put(g('court-p2'), addDays(today, -10), '21:00', axel, 'completed', { id: 'r-axel-resenada' })
  put(g('court-f1'), addDays(today, -17), '19:00', axel, 'cancelled', { paid: 0, refundCents: 1260000, id: 'r-axel-cancelada' })

  // Historial generado
  for (let d = -40; d <= 6; d++) {
    const date = addDays(today, d)
    const wd = (new Date(`${date}T12:00:00`).getDay() + 6) % 7
    for (const c of cs) {
      if (c.status !== 'active' || c.complexId === 'complex-5') continue
      const cxo = cx.find(x => x.id === c.complexId)
      for (const t of slotsFor(cxo)) {
        const h = Number(t.slice(0, 2))
        const p = (h >= 18 ? (wd >= 5 ? 0.46 : 0.3) : h >= 14 ? 0.1 : 0.04) * (c.complexId === 'complex-4' ? 0.8 : 1)
        if (rand() > p) continue
        const who = CLIENTS[Math.floor(rand() * CLIENTS.length)]
        const r = rand()
        let status
        if (d < 0 || (d === 0 && h < new Date().getHours())) status = r < 0.05 ? 'no_show' : r < 0.14 ? 'cancelled' : 'completed'
        else status = r < 0.45 ? 'deposit_paid' : 'confirmed'
        const o = {}
        if (status === 'cancelled' || status === 'no_show') o.paid = status === 'no_show' ? depositFor(cxo, priceFor(c, t)) : 0
        if (status === 'completed' && r > 0.9) o.paid = depositFor(cxo, priceFor(c, t))
        if (status === 'confirmed' && d > 0 && r > 0.8) o.paid = 0
        put(c, date, t, who, status, o)
      }
    }
  }
  return out
}

function seedReviews() {
  const mk = (complexId, rating, name, text, d, extra = {}) => ({ id: uid('rv'), complexId, rating, playerId: null, playerName: name, text, createdAt: addDays(todayISO(), -d) + 'T12:00:00.000Z', hidden: false, reported: false, ...extra })
  return [
    mk('complex-1', 5, 'Marcos D.', 'Canchas impecables y siempre empezamos a horario.', 4),
    mk('complex-1', 5, 'Julián C.', 'La techada es ideal para los días de lluvia.', 9),
    mk('complex-1', 4, 'Sebastián V.', 'Muy bueno. El buffet cierra temprano.', 14),
    mk('complex-1', 5, 'Pablo F.', 'Buena atención y el piso está nuevo.', 21),
    mk('complex-1', 5, 'Rodrigo P.', 'Reservamos todas las semanas.', 30),
    mk('complex-1', 1, 'Anónimo', 'Pésimo, no vayan, son unos estafadores.', 2, { reported: true }),
    mk('complex-2', 5, 'Martina A.', 'Buena iluminación y estacionamiento.', 6),
    mk('complex-2', 4, 'Los Tigres', 'Cancha grande, el piso podría estar más parejo.', 12),
    mk('complex-2', 4, 'Camila T.', 'Se puede pagar en la cancha, eso suma.', 20),
    mk('complex-2', 5, 'Matías P.', 'Muy buen precio.', 33, { playerId: 'u-mati' }),
    mk('complex-3', 5, 'Nicolás R.', 'Techada y cómoda. La mejor de Banfield.', 3),
    mk('complex-3', 5, 'Los Pibes', 'Siempre hay lugar para estacionar.', 15),
    mk('complex-3', 5, 'Fede R.', 'Impecable.', 25),
    mk('complex-3', 4, 'Seba V.', 'Muy bien, algo más cara.', 40),
    mk('complex-4', 5, 'Lucas M.', 'El piso está impecable y la techada no se llueve.', 5),
    mk('complex-4', 4, 'Ana G.', 'Muy buenas canchas. Turnos puntuales.', 18),
    mk('complex-4', 4, 'Paula S.', 'Linda atención.', 27),
    mk('complex-6', 5, 'Gonzalo R.', 'Las techadas están muy bien. Buen precio.', 3),
    mk('complex-6', 4, 'Los del Viernes', 'Buena onda. El buffet podría tener más cosas.', 11),
    mk('complex-6', 5, 'Diego M.', 'Siempre puntuales con los turnos.', 22),
    mk('complex-7', 4, 'Fede A.', 'Césped nuevo, se juega bien.', 6),
    mk('complex-7', 5, 'Martín L.', 'Pagás en la cancha y listo, muy cómodo.', 15),
    { id: 'rv-axel', complexId: 'complex-2', rating: 5, playerId: 'u-player', playerName: 'Axel P.', bookingId: 'r-axel-resenada', text: 'Muy bueno. Volvemos.', createdAt: addDays(todayISO(), -9) + 'T12:00:00.000Z', hidden: false, reported: false },
  ]
}

export function buildDefaultState() {
  const cx = complexes(), cs = courts()
  const today = todayISO()
  return {
    app: { version: VERSION, demoMode: true, seededOn: today },
    currentUser: null,
    users: users(), complexes: cx, courts: cs,
    bookings: seedBookings(cs, cx),
    blocks: [
      { id: uid('bl'), complexId: 'complex-1', courtId: 'court-g3', date: addDays(today, 2), time: '10:00', reason: 'Mantenimiento del piso' },
      { id: uid('bl'), complexId: 'complex-1', courtId: 'court-g3', date: addDays(today, 2), time: '11:00', reason: 'Mantenimiento del piso' },
    ],
    promotions: [
      { id: 'promo-1', complexId: 'complex-1', name: 'Tarde', kind: 'percent', value: 20, courtId: '', timeFrom: '16:00', timeTo: '18:00', dateFrom: '', dateTo: '', onlyToday: false, frequentOnly: false, minBookings: 5, active: true },
      { id: 'promo-2', complexId: 'complex-2', name: 'Cliente frecuente', kind: 'percent', value: 10, courtId: '', timeFrom: '', timeTo: '', dateFrom: '', dateTo: '', onlyToday: false, frequentOnly: true, minBookings: 5, active: true },
    ],
    reviews: seedReviews(),
    favoritesByUser: { 'u-player': ['complex-1'] },
    clientNotes: {},
    settings: { business: { model: 'commission', commissionPercent: 5, monthlyFeeCents: 2500000 } },
    notifications: [
      ['u-owner', 'booking_new', 'Nueva reserva', 'Los Pibes · Cancha 1 · 20:00', 'r-pibes-hoy', 12, false],
      ['u-owner', 'payment', 'Pago recibido', '$8.400 de Los Pibes · Cancha 1 · 20:00', 'r-pibes-hoy', 11, false],
      ['u-owner', 'booking_new', 'Nueva reserva', 'Axel Pérez · Cancha 1 · 21:00', 'r-axel-manana', 180, false],
      ['u-owner', 'booking_cancelled', 'Reserva cancelada', 'Marcos Díaz canceló Cancha 2 · 20:00', null, 1500, true],
      ['u-player', 'payment_ok', 'Seña pagada', 'La Gambeta · Cancha 1 · 21:00', 'r-axel-manana', 120, false],
    ].map(([userId, type, title, text, bookingId, min, read], i) => ({ id: `n-seed-${i}`, userId, type, title, text, bookingId, complexId: 'complex-1', date: null, createdAt: new Date(Date.now() - min * 60000).toISOString(), read })),
  }
}

/* Mueve todas las fechas para que "hoy" siga siendo hoy cuando se abre otro día. */
function rebase(state) {
  const t = todayISO()
  const seeded = state.app.seededOn || t
  if (seeded === t) return state
  const delta = Math.round((fromISO(t) - fromISO(seeded)) / 86400000)
  const sh = d => d ? addDays(d, delta) : d
  state.bookings.forEach(b => { b.date = sh(b.date) })
  ;(state.blocks || []).forEach(b => { b.date = sh(b.date) })
  ;(state.promotions || []).forEach(p => { p.dateFrom = sh(p.dateFrom); p.dateTo = sh(p.dateTo) })
  state.app.seededOn = t
  return state
}

export function readDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (!raw) { const s = buildDefaultState(); writeDemo(s); return s }
    const s = JSON.parse(raw)
    if (s?.app?.version !== VERSION) { const n = buildDefaultState(); writeDemo(n); return n }
    const r = rebase(s); writeDemo(r); return r
  } catch { return buildDefaultState() }
}
export function writeDemo(state) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(state)) } catch { /* cuota llena */ } }
export function resetDemo() { const s = buildDefaultState(); writeDemo(s); return s }
