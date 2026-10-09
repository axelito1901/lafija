import { addDays, fromISO, toISO } from './format'

/* Dictado: "Juan Pérez, jueves a las 20, cancha 2" → { name, date, time, courtId } */
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const NUM = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 }
const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const STOP = new Set(['reserva', 'reservar', 'para', 'a', 'las', 'la', 'el', 'en', 'de', 'hoy', 'manana', 'pasado', 'cancha', 'pista', 'hs', 'horas', 'hora', 'y', 'media', 'noche', 'tarde', ...DAYS])

export function parseDictation(raw, courts = [], today = toISO(new Date())) {
  let t = ' ' + norm(raw).replace(/[,.;]/g, ' ').replace(/\s+/g, ' ') + ' '
  Object.entries(NUM).forEach(([w, n]) => { t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n)) })
  const out = { name: '', date: '', time: '', courtId: '' }

  const c = t.match(/\b(?:cancha|pista)\s+(\d{1,2})\b/)
  if (c) {
    const hit = courts.find(x => (norm(x.name).match(/\d+/) || [])[0] === c[1])
    if (hit) out.courtId = hit.id
    t = t.replace(c[0], ' ')
  }

  if (/\bpasado manana\b/.test(t)) { out.date = addDays(today, 2); t = t.replace(/\bpasado manana\b/, ' ') }
  else if (/\bhoy\b/.test(t)) { out.date = today; t = t.replace(/\bhoy\b/, ' ') }
  else if (/\bmanana\b/.test(t) && !/\b(a la|de la) manana\b/.test(t)) { out.date = addDays(today, 1); t = t.replace(/\bmanana\b/, ' ') }
  else {
    const d = DAYS.findIndex(w => new RegExp(`\\b${w}\\b`).test(t))
    if (d >= 0) {
      const now = fromISO(today).getDay()
      out.date = addDays(today, (d - now + 7) % 7)
      t = t.replace(new RegExp(`\\b${DAYS[d]}\\b`), ' ')
    } else {
      const m = t.match(/\bel (\d{1,2})\b/)
      if (m) {
        const base = fromISO(today); let dt = new Date(base.getFullYear(), base.getMonth(), Number(m[1]), 12)
        if (toISO(dt) < today) dt = new Date(base.getFullYear(), base.getMonth() + 1, Number(m[1]), 12)
        out.date = toISO(dt); t = t.replace(m[0], ' ')
      }
    }
  }

  const h = t.match(/\b(?:a las |las )?(\d{1,2})(?:[:.](\d{2})|\s+y\s+(media))?\s*(?:hs|horas|h)?\s*(de la (?:noche|tarde)|de la manana)?/)
  if (h) {
    let hh = Number(h[1]); const mm = h[2] ? Number(h[2]) : h[3] ? 30 : 0
    if (h[4] && /noche|tarde/.test(h[4]) && hh < 12) hh += 12
    else if (!h[4] && hh >= 1 && hh < 8) hh += 12 // "a las 8" en una cancha casi siempre es de noche
    if (hh <= 24) out.time = `${String(hh % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    t = t.replace(h[0], ' ')
  }

  const words = norm(raw).replace(/[,.;]/g, ' ').split(/\s+/).filter(Boolean)
  const orig = String(raw).replace(/[,.;]/g, ' ').split(/\s+/).filter(Boolean)
  const name = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (!name.length && (w === 'reserva' || w === 'reservar' || w === 'para')) continue
    if (!name.length && ['la', 'el', 'los', 'las'].includes(w) && words[i + 1] && !STOP.has(words[i + 1]) && !/\d/.test(words[i + 1])) { name.push(orig[i].charAt(0).toUpperCase() + orig[i].slice(1)); continue }
    if (STOP.has(w) || /\d/.test(w)) break
    name.push(orig[i].charAt(0).toUpperCase() + orig[i].slice(1))
  }
  out.name = name.join(' ')
  return out
}

export const speechSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
export function listen({ onResult, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  const r = new SR()
  r.lang = 'es-AR'; r.interimResults = false; r.maxAlternatives = 1
  r.onresult = e => onResult(e.results[0][0].transcript)
  r.onerror = e => onError?.(e.error)
  r.onend = () => onEnd?.()
  r.start()
  return () => r.abort()
}
