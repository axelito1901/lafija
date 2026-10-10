import { useState } from 'react'
import { Bell, BellRing, Flag, MessageSquareReply, RotateCcw, Star, CalendarCheck, CalendarPlus, CalendarX, Clock, Repeat, Store, Wallet, BadgeCheck, ChartColumn } from 'lucide-react'
import { useStore } from '../lib/store'
import { effStatus, getComplex, getCourt, isUpcoming, bookingStart } from '../lib/domain'
import { addDays, cn, todayISO } from '../lib/format'
import { navigate } from '../lib/router'
import { Button, Empty, IconButton, Segmented, Sheet } from './kit'

const TYPES = {
  booking_new: { icon: CalendarPlus, tone: 'bg-brand-soft text-brand' },
  payment: { icon: Wallet, tone: 'bg-brand-soft text-brand' },
  payment_ok: { icon: BadgeCheck, tone: 'bg-brand-soft text-brand' },
  booking_cancelled: { icon: CalendarX, tone: 'bg-danger-soft text-danger' },
  reminder: { icon: BellRing, tone: 'bg-sunken text-info' },
  pending: { icon: Clock, tone: 'bg-warn-soft text-warn' },
  fixed_request: { icon: Repeat, tone: 'bg-brand-soft text-brand' },
  fixed_ok: { icon: CalendarCheck, tone: 'bg-brand-soft text-brand' },
  fixed_no: { icon: CalendarX, tone: 'bg-danger-soft text-danger' },
  waitlist: { icon: BellRing, tone: 'bg-warn-soft text-warn' },
  complex_review: { icon: Store, tone: 'bg-warn-soft text-warn' },
  complex_ok: { icon: Store, tone: 'bg-brand-soft text-brand' },
  complex_no: { icon: Store, tone: 'bg-danger-soft text-danger' },
  report: { icon: Flag, tone: 'bg-warn-soft text-warn' },
  report_resolved: { icon: BadgeCheck, tone: 'bg-brand-soft text-brand' },
  rate: { icon: Star, tone: 'bg-warn-soft text-warn' },
  rebook: { icon: RotateCcw, tone: 'bg-brand-soft text-brand' },
  weekly: { icon: ChartColumn, tone: 'bg-brand-soft text-brand' },
  review_new: { icon: Star, tone: 'bg-warn-soft text-warn' },
  review_reply: { icon: MessageSquareReply, tone: 'bg-brand-soft text-brand' },
}

const ago = iso => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  if (m < 1440) return `hace ${Math.round(m / 60)} h`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '')
}

/* Avisos guardados + avisos "vivos" calculados de las reservas (próximas, pendientes de pago). */
function useItems() {
  const { state, user } = useStore()
  const stored = (state.notifications || []).filter(n => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const now = new Date(), live = []
  if (user.role === 'player') {
    for (const b of state.bookings) {
      if (b.playerId !== user.id || !isUpcoming(b, now)) continue
      const h = (bookingStart(b) - now) / 3600000
      const c = getComplex(state, b.complexId), ct = getCourt(state, b.courtId)
      if (effStatus(b, now) === 'pending') live.push({ id: `pend-${b.id}`, type: 'pending', title: 'Falta pagar tu reserva', text: `${c.name} · ${b.time}. Pagá antes de que venza.`, bookingId: b.id, live: true })
      else if (h >= 0 && h <= 24) live.push({ id: `rem-${b.id}`, type: 'reminder', title: b.date === todayISO() ? 'Hoy jugás' : 'Mañana jugás', text: `${c.name} · ${ct.name} · ${b.time}`, bookingId: b.id, live: true })
    }
  } else if (user.role === 'owner') {
    const mine = state.complexes.filter(c => c.ownerId === user.id).map(c => c.id)
    for (const b of state.bookings) {
      if (!mine.includes(b.complexId) || effStatus(b, now) !== 'pending') continue
      const until = b.expiresAt ? new Date(b.expiresAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''
      live.push({ id: `pend-${b.id}`, type: 'pending', title: 'Esperando pago', text: `${b.playerName} · ${b.time}${until ? ` · vence ${until}` : ''}`, bookingId: b.id, date: b.date, live: true })
    }
  }
  return { stored, live }
}
export const useUnread = () => { const { stored } = useItems(); return stored.filter(n => !n.read).length }

export function BellButton() {
  const { user } = useStore()
  const [open, setOpen] = useState(false)
  const unread = useUnread()
  if (!user) return null
  return (
    <>
      <IconButton label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'} onClick={() => setOpen(true)} className="relative">
        <Bell size={22} />
        {unread > 0 && <span className="ui-badge absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[image:var(--grad-brand)] text-[var(--on-grad)] text-[11px] font-semibold grid place-items-center tnum">{unread > 9 ? '9+' : unread}</span>}
      </IconButton>
      {open && <NotificationsSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function Item({ n, onClick }) {
  const T = TYPES[n.type] || TYPES.reminder
  const unread = n.read === false
  return (
    <button type="button" className={cn('row !items-start !py-3.5', unread && 'bg-[color-mix(in_srgb,var(--brand)_5%,var(--surface))]')} onClick={onClick}>
      <span className={cn('size-10 rounded-xl grid place-items-center flex-none shadow-[inset_0_0_0_1px_color-mix(in_srgb,currentColor_14%,transparent)]', T.tone)}><T.icon size={20} aria-hidden="true" /></span>
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2"><span className={cn('block truncate', unread ? 'font-semibold' : 'font-medium')}>{n.title}</span>{!n.live && <span className="text-xs text-muted flex-none tnum">{ago(n.createdAt)}</span>}</span>
        <span className="block text-sm text-muted">{n.text}</span>
      </span>
      {unread && <span className="size-2.5 rounded-full bg-[image:var(--grad-brand)] flex-none mt-2" aria-label="Sin leer" />}
    </button>
  )
}

function NotificationsSheet({ onClose }) {
  const { user, update } = useStore()
  const { stored, live } = useItems()
  const [only, setOnly] = useState('all')
  const unread = stored.filter(n => !n.read).length
  const t = todayISO(), y = addDays(t, -1)
  const day = iso => { const loc = new Date(iso); const l = `${loc.getFullYear()}-${String(loc.getMonth() + 1).padStart(2, '0')}-${String(loc.getDate()).padStart(2, '0')}`; return l === t ? 'Hoy' : l === y ? 'Ayer' : 'Anteriores' }
  const shown = only === 'unread' ? stored.filter(n => !n.read) : stored
  const groups = ['Hoy', 'Ayer', 'Anteriores'].map(g => [g, shown.filter(n => day(n.createdAt) === g)]).filter(([, l]) => l.length)
  const open = n => {
    if (!n.live) update(s => { const x = s.notifications.find(y2 => y2.id === n.id); if (x) x.read = true })
    onClose()
    if (n.link) navigate(n.link)
    else if (n.type === 'fixed_request') navigate('/dueno')
    else if (user.role === 'owner') navigate(`/dueno/agenda${n.date ? `?fecha=${n.date}` : ''}`)
    else if (user.role === 'player') navigate('/reservas')
  }
  const head = t2 => <h3 className="ui-eyebrow mb-2.5">{t2}</h3>
  return (
    <Sheet open onClose={onClose} title="Notificaciones" wide side
      footer={unread > 0 ? <Button variant="secondary" onClick={() => update(s => { (s.notifications || []).forEach(n => { if (n.userId === user.id) n.read = true }) })}>Marcar todas como leídas</Button> : null}>
      {stored.length === 0 && live.length === 0 && <Empty icon={Bell} title="No tenés avisos" text="Acá vas a ver reservas, pagos y recordatorios." />}
      {stored.length > 0 && <Segmented className="mb-4" label="Mostrar" value={only} onChange={setOnly} options={[{ value: 'all', label: 'Todas' }, { value: 'unread', label: unread ? `Sin leer (${unread})` : 'Sin leer' }]} />}
      {live.length > 0 && <section className="mb-5">{head('Para tener en cuenta')}<div className="list">{live.map(n => <Item key={n.id} n={n} onClick={() => open(n)} />)}</div></section>}
      {only === 'unread' && stored.length > 0 && shown.length === 0 && <p className="text-muted text-center py-8">Estás al día. No tenés avisos sin leer.</p>}
      {groups.map(([g, list]) => <section key={g} className="mb-5 last:mb-0">{head(g)}<div className="list">{list.map(n => <Item key={n.id} n={n} onClick={() => open(n)} />)}</div></section>)}
    </Sheet>
  )
}
