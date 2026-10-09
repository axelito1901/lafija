import { balanceOf, cancelPolicyText, perPerson } from './domain'
import { dateLong, mapsLink, money, relativeDay, slotEnd, todayISO, addDays } from './format'

/* Mensajes de WhatsApp con formato (*negrita*, _cursiva_). Un solo lugar para cuidar el tono y el diseño. */
const LINE = '━━━━━━━━━━━━━━'
const first = n => String(n || '').trim().split(/\s+/)[0] || ''

export const MESSAGE_KINDS = {
  invitacion: 'Compartir reserva',
  equipos: 'Armar equipos',
  confirmacion: 'Confirmación',
  recordatorio: 'Recordatorio',
  pago: 'Pedir pago',
  cancelacion: 'Cancelación',
}

const details = ({ b, complex, court }) => [
  `🏟 *${complex.name}* · ${court.name}`,
  `📅 ${dateLong(b.date)}`,
  `🕒 ${b.time} a ${slotEnd(b.time, b.durationMin || 60)}`,
]
const payLine = b => {
  const rest = balanceOf(b)
  if (b.totalCents > 0 && rest === 0) return `💳 Pagado · ${money(b.totalCents)}`
  if (b.paidCents > 0) return `💳 Seña ${money(b.paidCents)} · Resta *${money(rest)}* en la cancha`
  return `💳 A pagar en la cancha · *${money(b.totalCents)}*`
}
const where = ({ complex }) => [`📍 ${complex.address}`, mapsLink(complex)]
const sign = '_La Fija_'

export function buildMessage(kind, ctx) {
  const { b, complex } = ctx
  const hi = ctx.toName ? `Hola ${first(ctx.toName)},` : ''
  switch (kind) {
    case 'confirmacion':
      return [`✅ *Reserva confirmada*`, LINE, ...details(ctx), payLine(b), LINE, ...where(ctx), '', cancelPolicyText(complex), '', `Te esperamos. ${sign}`].join('\n')
    case 'recordatorio': {
      const t = todayISO()
      const head = b.date === t ? '⚽ *Hoy jugás*' : b.date === addDays(t, 1) ? '⚽ *Mañana jugás*' : '⚽ *Recordatorio de tu reserva*'
      return [head, LINE, ...details(ctx), balanceOf(b) > 0 ? `💰 Resta pagar *${money(balanceOf(b))}* en la cancha` : '💳 Ya está todo pago', LINE, ...where(ctx), '', hi ? `${hi} si no podés venir, avisanos con tiempo.` : 'Si no podés venir, avisanos con tiempo.', sign].join('\n')
    }
    case 'pago': {
      const owe = b.status === 'pending' && b.depositCents > 0 && b.paymentMode !== 'full' ? b.depositCents - (b.paidCents || 0) : balanceOf(b)
      const until = b.status === 'pending' && b.expiresAt ? new Date(b.expiresAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
      return [`Hola ${first(ctx.toName || b.playerName)}! 👋`, `Te recordamos que tenés pendiente el pago de tu reserva de *${relativeDay(b.date).toLowerCase()} a las ${b.time}* en *${ctx.court.name}* de *${complex.name}*.`, '', `💰 Pendiente: *${money(owe)}*`, until ? `Para mantener el turno, aboná antes de las *${until}*.` : '', '', '¡Gracias!'].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n')
    }
    case 'cancelacion':
      return [`❌ *Reserva cancelada*`, LINE, ...details(ctx), LINE, b.refundCents > 0 ? `Te devolvemos *${money(b.refundCents)}*.` : b.paidCents > 0 ? `Quedan retenidos ${money(b.paidCents)} según la política de cancelación.` : 'No hay nada para devolver.', '', 'Cuando quieras, volvé a reservar.', sign].join('\n')
    case 'invitacion': {
      const d = new Date(`${b.date}T12:00:00`)
      const day = `${dateLong(b.date).split(',')[0]} ${d.getDate()}/${d.getMonth() + 1}`
      const each = perPerson(ctx.court, b.totalCents)
      return ['⚽ *Partido confirmado*', '', `📍 ${complex.name}`, `🗓 ${day}`, `⏰ ${b.time}`, `🏟 ${ctx.court.name} · ${ctx.court.sport}`, `💰 ${money(b.totalCents)}${each ? ` (${money(each)} c/u)` : ''}`, '', mapsLink(complex)].join('\n')
    }
    case 'equipos': {
      const [a = [], b2 = []] = b.lineup?.teams || []
      if (!a.length && !b2.length) return [`⚽ *Equipos para el partido*`, LINE, ...details(ctx), LINE, 'Todavía no armaste los equipos.'].join('\n')
      const list = (t, label) => [`*${label}*`, ...t.map((n, i) => `${i + 1}. ${n}`)]
      return [`⚽ *Equipos para el partido*`, LINE, ...details(ctx), LINE, ...list(a, 'Equipo 1 · con pechera'), '', ...list(b2, 'Equipo 2 · sin pechera'), LINE, ...where(ctx), sign].join('\n')
    }
    default: return ''
  }
}

/** Texto de WhatsApp → fragmentos para dibujar en la vista previa. */
export function parseWA(line) {
  return line.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).filter(Boolean).map(p => p.startsWith('*') && p.endsWith('*') && p.length > 2 ? { t: 'b', v: p.slice(1, -1) } : p.startsWith('_') && p.endsWith('_') && p.length > 2 ? { t: 'i', v: p.slice(1, -1) } : { t: 's', v: p })
}
export { relativeDay }
