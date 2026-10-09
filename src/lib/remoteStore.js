import { supabase } from './supabase'
import { addDays, todayISO } from './format'

/*
  Capa Supabase. Traduce el estado de la app (camelCase) a las tablas (snake_case) y sincroniza
  solo lo que cambió. Los permisos los decide la base (RLS + triggers), no este archivo:
  si algo no está permitido, Supabase devuelve error y la app lo muestra.
  Los avisos entre usuarios (reserva nueva, pagos, cancelaciones, lista de espera, turnos fijos)
  los crea la base; desde acá solo se marcan como leídos.
*/
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const nz = v => (v === '' || v === undefined ? null : v)
const busyPrefix = 'busy-'

/* ---------- Filas → estado ---------- */
const M = {
  profile: r => ({ id: r.id, role: r.role, name: r.name, phone: r.phone, email: r.email, active: r.active, acceptedTermsAt: r.accepted_terms_at, createdAt: r.created_at }),
  complex: r => ({ id: r.id, ownerId: r.owner_id, name: r.name, slug: r.slug, city: r.city, address: r.address, lat: r.lat, lng: r.lng, phone: r.phone, whatsapp: r.whatsapp, description: r.description, services: r.services || [], coverUrl: r.cover_url, gallery: r.gallery || [], hours: r.hours, booking: r.booking, active: r.active, public: r.public, approval: r.approval, createdAt: r.created_at }),
  court: r => ({ id: r.id, complexId: r.complex_id, name: r.name, sport: r.sport, surface: r.surface, covered: r.covered, lighting: r.lighting, priceCents: Number(r.price_cents), priceRules: r.price_rules || [], description: r.description, features: r.features || [], photo: r.photo, status: r.status }),
  booking: r => ({ id: r.id, complexId: r.complex_id, courtId: r.court_id, playerId: r.player_id, playerName: r.player_name, phone: r.phone, date: r.booking_date, time: r.booking_time, durationMin: r.duration_min, baseCents: Number(r.base_cents), discountCents: Number(r.discount_cents), promoName: r.promo_name, totalCents: Number(r.total_cents), depositCents: Number(r.deposit_cents), paidCents: Number(r.paid_cents), refundCents: Number(r.refund_cents), paymentMode: r.payment_mode, paymentStatus: r.payment_status, payMethod: r.pay_method, status: r.status, source: r.source, note: r.note, seriesId: r.series_id, reminderAt: r.reminder_at, lineup: r.lineup, expiresAt: r.expires_at, cancelledAt: r.cancelled_at, cancelledBy: r.cancelled_by, createdAt: r.created_at }),
  block: r => ({ id: r.id, complexId: r.complex_id, courtId: r.court_id, date: r.block_date, time: r.block_time, reason: r.reason }),
  promotion: r => ({ id: r.id, complexId: r.complex_id, name: r.name, kind: r.kind, value: Number(r.value), courtId: r.court_id || '', timeFrom: r.time_from, timeTo: r.time_to, dateFrom: r.date_from || '', dateTo: r.date_to || '', onlyToday: r.only_today, frequentOnly: r.frequent_only, minBookings: r.min_bookings, active: r.active }),
  review: r => ({ id: r.id, complexId: r.complex_id, bookingId: r.booking_id, playerId: r.player_id, playerName: r.player_name, rating: r.rating, text: r.text, tags: r.tags || [], hidden: r.hidden, reported: r.reported, reply: r.reply, createdAt: r.created_at }),
  wait: r => ({ id: r.id, complexId: r.complex_id, courtId: r.court_id, date: r.slot_date, time: r.slot_time, playerId: r.player_id, playerName: r.player_name, phone: r.phone, notifiedAt: r.notified_at, createdAt: r.created_at }),
  fixed: r => ({ id: r.id, bookingId: r.booking_id, complexId: r.complex_id, courtId: r.court_id, playerId: r.player_id, playerName: r.player_name, phone: r.phone, weekday: r.weekday, time: r.slot_time, weeks: r.weeks, startDate: r.start_date, status: r.status, created: r.created, skipped: r.skipped || [], decidedAt: r.decided_at, createdAt: r.created_at }),
  notification: r => ({ id: r.id, userId: r.user_id, type: r.type, title: r.title, text: r.text, bookingId: r.booking_id, complexId: r.complex_id, date: r.date, link: r.link, read: r.read, createdAt: r.created_at }),
}

/* ---------- Estado → filas ---------- */
const R = {
  complex: c => ({ id: c.id, owner_id: c.ownerId, name: c.name, slug: c.slug, city: c.city || '', address: c.address || '', lat: c.lat ?? null, lng: c.lng ?? null, phone: c.phone || '', whatsapp: c.whatsapp || '', description: c.description || '', services: c.services || [], cover_url: c.coverUrl || '', gallery: c.gallery || [], hours: c.hours, booking: c.booking, active: c.active !== false, public: c.public !== false, approval: c.approval || 'pending' }),
  court: c => ({ id: c.id, complex_id: c.complexId, name: c.name, sport: c.sport, surface: c.surface, covered: !!c.covered, lighting: c.lighting !== false, price_cents: c.priceCents || 0, price_rules: c.priceRules || [], description: c.description || '', features: c.features || [], photo: c.photo || '', status: c.status || 'active' }),
  booking: b => ({ id: b.id, complex_id: b.complexId, court_id: b.courtId, player_id: b.playerId || null, player_name: b.playerName || '', phone: b.phone || '', booking_date: b.date, booking_time: b.time, duration_min: b.durationMin || 60, base_cents: b.baseCents || 0, discount_cents: b.discountCents || 0, promo_name: b.promoName || '', total_cents: b.totalCents || 0, deposit_cents: b.depositCents || 0, paid_cents: b.paidCents || 0, refund_cents: b.refundCents || 0, payment_mode: b.paymentMode || 'deposit', payment_status: b.paymentStatus || 'pending', pay_method: b.payMethod || '', status: b.status, source: b.source || 'app', note: b.note || '', series_id: b.seriesId || null, reminder_at: b.reminderAt || null, lineup: b.lineup || null, expires_at: b.expiresAt || null, cancelled_at: b.cancelledAt || null, cancelled_by: b.cancelledBy || null }),
  block: b => ({ id: b.id, complex_id: b.complexId, court_id: b.courtId, block_date: b.date, block_time: b.time, reason: b.reason || '' }),
  promotion: p => ({ id: p.id, complex_id: p.complexId, name: p.name || '', kind: p.kind, value: p.value || 0, court_id: nz(p.courtId), time_from: p.timeFrom || '', time_to: p.timeTo || '', date_from: nz(p.dateFrom), date_to: nz(p.dateTo), only_today: !!p.onlyToday, frequent_only: !!p.frequentOnly, min_bookings: p.minBookings || 5, active: p.active !== false }),
  review: r => ({ id: r.id, complex_id: r.complexId, booking_id: r.bookingId || null, player_id: r.playerId || null, player_name: r.playerName || '', rating: r.rating, text: r.text || '', tags: r.tags || [], hidden: !!r.hidden, reported: !!r.reported, reply: r.reply || null }),
  wait: w => ({ id: w.id, complex_id: w.complexId, court_id: w.courtId, slot_date: w.date, slot_time: w.time, player_id: w.playerId, player_name: w.playerName || '', phone: w.phone || '' }),
  fixed: f => ({ id: f.id, booking_id: f.bookingId || null, complex_id: f.complexId, court_id: f.courtId, player_id: f.playerId, player_name: f.playerName || '', phone: f.phone || '', weekday: f.weekday, slot_time: f.time, weeks: f.weeks, start_date: f.startDate, status: f.status, created: f.created || 0, skipped: f.skipped || [], decided_at: f.decidedAt || null }),
}

const run = async q => { const { data, error } = await q; if (error) throw error; return data || [] }

/* Disponibilidad pública: horarios ocupados sin datos personales. */
async function busyFor(complexes, mine = []) {
  const from = addDays(todayISO(), -1), to = addDays(todayISO(), 60)
  const own = new Set(mine.map(b => `${b.courtId}|${b.date}|${b.time}`))
  const out = []
  await Promise.all(complexes.map(async c => {
    const rows = await run(supabase.rpc('busy_slots', { cid: c.id, from_date: from, to_date: to }))
    for (const r of rows) {
      const k = `${r.court_id}|${r.booking_date}|${r.booking_time}`
      if (own.has(k)) continue
      out.push({ id: `${busyPrefix}${k}`, _busy: true, complexId: c.id, courtId: r.court_id, playerId: null, playerName: 'Reservado', phone: '', date: r.booking_date, time: r.booking_time, durationMin: r.duration_min, totalCents: 0, paidCents: 0, status: 'confirmed', createdAt: '' })
    }
  }))
  return out
}

const base = extra => ({
  app: { version: 'remote', demoMode: false },
  users: [], complexes: [], courts: [], bookings: [], blocks: [], promotions: [], reviews: [],
  favorites: [], waitlist: [], fixedRequests: [], notifications: [], settings: {}, ...extra,
})

/** Estado para visitantes sin sesión (ficha pública de un complejo). */
export async function loadPublicState() {
  const [complexes, courts, blocks, promotions, reviews] = await Promise.all([
    run(supabase.from('complexes').select('*')), run(supabase.from('courts').select('*')), run(supabase.from('court_blocks').select('*')),
    run(supabase.from('promotions').select('*')), run(supabase.from('reviews').select('*')),
  ])
  const cx = complexes.map(M.complex)
  return base({ currentUser: null, complexes: cx, courts: courts.map(M.court), blocks: blocks.map(M.block), promotions: promotions.map(M.promotion), reviews: reviews.map(M.review), bookings: await busyFor(cx) })
}

export async function loadRemoteState(authUser) {
  let [profile] = await run(supabase.from('profiles').select('*').eq('id', authUser.id))
  if (!profile) {
    // El trigger crea el perfil; si la cuenta es anterior al esquema, lo creamos acá.
    ;[profile] = await run(supabase.from('profiles').insert({ id: authUser.id, name: authUser.user_metadata?.name || '', phone: authUser.phone || authUser.user_metadata?.phone || '', email: authUser.email || '' }).select('*'))
  }
  const me = M.profile(profile)
  const [complexes, courts, bookings, blocks, promotions, reviews, favs, waits, fixed, notes, settings, users, cnotes] = await Promise.all([
    run(supabase.from('complexes').select('*').order('created_at')),
    run(supabase.from('courts').select('*').order('created_at')),
    run(supabase.from('bookings').select('*').gte('booking_date', addDays(todayISO(), me.role === 'player' ? -180 : -120))),
    run(supabase.from('court_blocks').select('*').gte('block_date', addDays(todayISO(), -1))),
    run(supabase.from('promotions').select('*')),
    run(supabase.from('reviews').select('*')),
    run(supabase.from('favorites').select('complex_id').eq('player_id', me.id)),
    run(supabase.from('waitlist').select('*')),
    run(supabase.from('fixed_requests').select('*')),
    run(supabase.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(100)),
    run(supabase.from('app_settings').select('*')),
    me.role === 'admin' ? run(supabase.from('profiles').select('*').order('created_at', { ascending: false })) : Promise.resolve([profile]),
    me.role === 'player' ? Promise.resolve([]) : run(supabase.from('client_notes').select('*')).catch(() => []),
  ])
  const cx = complexes.map(M.complex)
  const mine = bookings.map(M.booking)
  const busy = me.role === 'player' ? await busyFor(cx.filter(c => c.active && c.public && c.approval === 'approved'), mine) : []
  return base({
    currentUser: me,
    users: users.map(M.profile),
    complexes: cx, courts: courts.map(M.court), bookings: [...mine, ...busy],
    blocks: blocks.map(M.block), promotions: promotions.map(M.promotion), reviews: reviews.map(M.review),
    favorites: favs.map(f => f.complex_id), waitlist: waits.map(M.wait), fixedRequests: fixed.map(M.fixed),
    notifications: notes.map(M.notification),
    settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
    clientNotes: Object.fromEntries(cnotes.map(n => [`${n.complex_id}|${n.client_key}`, n.note])),
  })
}

/* ---------- Sincronización ---------- */
/* Primero las actualizaciones y después las altas: así una cancelación libera el turno antes de reservarlo de nuevo. */
async function syncTable(table, prevList = [], nextList = [], toRow, { del = true, keep = () => true } = {}) {
  const prev = new Map(prevList.filter(keep).map(x => [x.id, x]))
  const next = nextList.filter(keep)
  for (const x of next.filter(x => prev.has(x.id) && !same(prev.get(x.id), x))) {
    await run(supabase.from(table).update(toRow(x)).eq('id', x.id))
  }
  const added = next.filter(x => !prev.has(x.id))
  if (added.length) await run(supabase.from(table).insert(added.map(toRow)))
  if (del) {
    const gone = [...prev.keys()].filter(id => !next.some(x => x.id === id))
    if (gone.length) await run(supabase.from(table).delete().in('id', gone))
  }
}

export async function syncRemoteDiff(prev, next) {
  const me = next.currentUser
  if (!me) return
  // Perfiles: solo nombre/teléfono/estado (el rol lo protege la base)
  for (const u of next.users.filter(u => !same(prev.users.find(x => x.id === u.id), u))) {
    const row = { name: u.name, phone: u.phone || '' }
    if (u.acceptedTermsAt) row.accepted_terms_at = u.acceptedTermsAt
    if (me.role === 'admin') Object.assign(row, { active: u.active !== false, role: u.role })
    await run(supabase.from('profiles').update(row).eq('id', u.id))
  }
  await syncTable('complexes', prev.complexes, next.complexes, R.complex, { del: me.role === 'admin' })
  await syncTable('courts', prev.courts, next.courts, R.court)
  await syncTable('bookings', prev.bookings, next.bookings, R.booking, { del: false, keep: b => !b._busy })
  await syncTable('court_blocks', prev.blocks, next.blocks, R.block)
  await syncTable('promotions', prev.promotions, next.promotions, R.promotion)
  await syncTable('reviews', prev.reviews, next.reviews, R.review, { del: me.role === 'admin' })
  await syncTable('waitlist', prev.waitlist, next.waitlist, R.wait, { keep: w => w.playerId === me.id })
  await syncTable('fixed_requests', prev.fixedRequests, next.fixedRequests, R.fixed, { del: false })
  // Favoritos
  const pf = new Set(prev.favorites || []), nf = new Set(next.favorites || [])
  const addF = [...nf].filter(x => !pf.has(x)), delF = [...pf].filter(x => !nf.has(x))
  if (addF.length) await run(supabase.from('favorites').insert(addF.map(complex_id => ({ player_id: me.id, complex_id }))))
  if (delF.length) await run(supabase.from('favorites').delete().eq('player_id', me.id).in('complex_id', delF))
  // Avisos: solo "leído"
  const readNow = next.notifications.filter(n => n.read && !prev.notifications.find(x => x.id === n.id)?.read && n.userId === me.id).map(n => n.id)
  if (readNow.length) await run(supabase.from('notifications').update({ read: true }).in('id', readNow))
  // Notas de clientes (dueño)
  for (const [k, note] of Object.entries(next.clientNotes || {})) {
    if ((prev.clientNotes || {})[k] === note) continue
    const [complex_id, ...rest] = k.split('|')
    await run(supabase.from('client_notes').upsert({ complex_id, client_key: rest.join('|'), note, updated_at: new Date().toISOString() }))
  }
  // Configuración (admin)
  if (me.role === 'admin' && !same(prev.settings, next.settings)) {
    for (const [key, value] of Object.entries(next.settings || {})) if (!same(prev.settings?.[key], value)) await run(supabase.from('app_settings').upsert({ key, value }))
  }
}

/* ---------- Auth ---------- */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'El email o la contraseña no coinciden.' : error.message)
  return data.session
}
export async function signUp({ email, password, name, phone, role = 'player', acceptedTermsAt }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, phone, role, accepted_terms_at: acceptedTermsAt } } })
  if (error) throw error
  return data
}
export async function signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error }
