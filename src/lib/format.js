export const cn = (...v) => v.filter(Boolean).join(' ')

/* Dinero: todo el sistema guarda centavos (enteros). */
export const money = cents => '$' + Math.round((Number(cents) || 0) / 100).toLocaleString('es-AR')
export const pesosToCents = v => Math.round((Number(String(v).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0) * 100)
export const centsToPesos = c => String(Math.round((Number(c) || 0) / 100))

/* Fechas: siempre ISO local (YYYY-MM-DD), nunca UTC. */
const pad = n => String(n).padStart(2, '0')
export const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = iso => new Date(`${iso}T12:00:00`)
export const todayISO = () => toISO(new Date())
export const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d) }
export const mondayOf = iso => { const d = fromISO(iso); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return toISO(d) }
export const monthStart = iso => iso.slice(0, 8) + '01'

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
export const weekdayShort = iso => cap(new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(fromISO(iso)).replace('.', ''))
export const dayNum = iso => fromISO(iso).getDate()
export const monthShort = iso => new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(fromISO(iso)).replace('.', '')
export const dateShort = iso => `${weekdayShort(iso)} ${dayNum(iso)} ${monthShort(iso)}`
export const dateLong = iso => cap(new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(fromISO(iso)))
export const dateHeading = iso => {
  const t = todayISO()
  if (iso === t) return `Hoy · ${weekdayShort(iso)} ${dayNum(iso)}`
  if (iso === addDays(t, 1)) return `Mañana · ${weekdayShort(iso)} ${dayNum(iso)}`
  return `${weekdayShort(iso)} ${dayNum(iso)} ${monthShort(iso)}`
}
export const relativeDay = iso => {
  const t = todayISO()
  if (iso === t) return 'Hoy'
  if (iso === addDays(t, 1)) return 'Mañana'
  if (iso === addDays(t, -1)) return 'Ayer'
  return dateShort(iso)
}

/* Horarios */
export const timeToMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0) }
export const minToTime = m => { const mm = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(mm / 60))}:${pad(mm % 60)}` }
export const slotEnd = (time, mins) => minToTime(timeToMin(time) + mins)
export const slotStartDate = (date, time) => {
  // Turnos después de medianoche (00:00, 01:00…) pertenecen al día anterior de la grilla.
  const d = fromISO(date); const [h, m] = time.split(':').map(Number)
  d.setHours(h, m, 0, 0); return d
}
export const slotsFor = complex => {
  const { open = '10:00', close = '00:00', slotMinutes = 60 } = complex?.hours || {}
  const start = timeToMin(open)
  let end = timeToMin(close); if (end <= start) end += 1440
  const out = []
  for (let m = start; m + slotMinutes <= end; m += slotMinutes) out.push(minToTime(m))
  return out
}
/* Un turno de madrugada (ej. 00:00) se guarda con la fecha del día de apertura, pero ocurre al día siguiente. */
export const slotMoment = (complex, date, time) => {
  const start = timeToMin(complex?.hours?.open || '10:00')
  const d = slotStartDate(date, time)
  if (timeToMin(time) < start) d.setDate(d.getDate() + 1)
  return d
}

/* Distancia (Haversine) */
export const distanceKm = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null
  const R = 6371, rad = x => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const kmLabel = n => n == null ? '' : n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1).replace('.', ',')} km`

/* Contacto */
export const digits = p => String(p || '').replace(/\D/g, '')
export const waLink = (phone, text = '') => `https://wa.me/${digits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const telLink = phone => `tel:+${digits(phone)}`
export const mapsLink = c => c?.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c?.address || '')}`
export const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
export const uid = p => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
export const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
