import { useState } from 'react'
import { ChevronLeft, ChevronRight, CircleCheck, CircleDashed, Clock3, Coins, HandCoins, Lock, Plus, UserX } from 'lucide-react'
import { useStore } from '../../lib/store'
import { dayStatus, effStatus, slotInfo, slotsFor } from '../../lib/domain'
import { addDays, cn, dayNum, money, monthShort, todayISO } from '../../lib/format'
const weekdayLong = iso => new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(new Date(`${iso}T12:00:00`))
import { navigate, useRoute } from '../../lib/router'
import { Button, Chip, Empty, IconButton, Input, Sheet, Status, useToast } from '../../ui/kit'
import { BlockSheet, BookingEditor, NewBookingSheet, OwnerPage, useOwner } from './common'
import { DateField } from '../../ui/DateField'

export default function Agenda() {
  const { state, update } = useStore()
  const { complex, courts: all } = useOwner()
  const { query } = useRoute()
  const toast = useToast()
  const [date, setDate] = useState(query.fecha || todayISO())
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState('')
  const [menu, setMenu] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [sheet, setSheet] = useState(null) // {kind:'new'|'block', preset}
  const now = new Date()

  const courts = all.filter(c => filter === 'all' || c.id === filter)
  const times = complex ? slotsFor(complex) : []
  const cell = (c, t) => slotInfo(state, complex, c, date, t, now)
  const tap = (c, t, info) => {
    if (info.kind === 'booked') setEditing(info.booking.id)
    else if (info.kind === 'free' || info.kind === 'blocked') setMenu({ court: c, time: t, info })
  }

  const pay = b => {
    const st = effStatus(b)
    if (st === 'pending') return <Status tone="danger" icon={Clock3}>Pendiente</Status>
    if (st === 'no_show') return <Status tone="danger" icon={UserX}>No vino</Status>
    if (b.paidCents >= b.totalCents && b.totalCents > 0) return <Status tone="ok" icon={CircleCheck}>Pagado</Status>
    if (b.paidCents > 0) return <Status tone="info" icon={Coins}>Seña {money(b.paidCents)}</Status>
    return <Status tone="warn" icon={HandCoins}>A cobrar</Status>
  }
  const body = (info) => {
    if (info.kind === 'booked') {
      const b = info.booking
      return <div className="min-w-0"><div className="font-semibold truncate">{b.playerName}</div><div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-sm"><span className="tnum">{money(b.totalCents)}</span><span className="text-faint" aria-hidden="true">·</span>{pay(b)}</div></div>
    }
    if (info.kind === 'blocked') return <div className="text-muted flex items-center gap-2 min-w-0"><Lock size={15} className="flex-none" aria-hidden="true" /><span className="truncate">Bloqueado{info.block.reason ? ` · ${info.block.reason}` : ''}</span></div>
    if (info.kind === 'free') return <span className="inline-flex items-center gap-2 text-muted"><CircleDashed size={15} aria-hidden="true" />Libre</span>
    if (info.kind === 'past') return <span className="text-faint">—</span>
    return <span className="text-faint">No disponible</span>
  }
  const day = complex ? dayStatus(state, complex, date, now, filter === 'all' ? null : filter) : null

  return (
    <OwnerPage title="Agenda" actions={<>
      <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => setSheet({ kind: 'block', preset: { date } })}><Lock size={16} />Bloquear horario</Button>
      <Button size="sm" className="hidden lg:inline-flex" onClick={() => setSheet({ kind: 'new', preset: { date, courtId: filter !== 'all' ? filter : undefined } })}><Plus size={16} />Nueva reserva</Button>
    </>}>
      {complex && <>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand">{date === todayISO() ? 'Hoy' : date === addDays(todayISO(), 1) ? 'Mañana' : date === addDays(todayISO(), -1) ? 'Ayer' : '\u00a0'}</p>
            <h2 className="display text-3xl font-bold uppercase leading-none">{weekdayLong(date)} {dayNum(date)} {monthShort(date)}</h2>
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Día anterior" onClick={() => setDate(addDays(date, -1))} className="border border-strong"><ChevronLeft size={22} /></IconButton>
            <Button variant={date === todayISO() ? 'primary' : 'secondary'} onClick={() => setDate(todayISO())} aria-pressed={date === todayISO()}>Hoy</Button>
            <IconButton label="Día siguiente" onClick={() => setDate(addDays(date, 1))} className="border border-strong"><ChevronRight size={22} /></IconButton>
            <DateField value={date} onChange={v => v && setDate(v)} aria-label="Elegir fecha" title="Ir a una fecha" className="!w-11 !px-0 justify-center [&>span:first-child]:hidden" />
          </div>
        </div>
        {day && <p className="mt-2 text-muted tnum"><strong className="text-ink">Ocupación {day.pct}%</strong> · {day.bookings.length} {day.bookings.length === 1 ? 'reserva' : 'reservas'} · {day.free} {day.free === 1 ? 'libre' : 'libres'}</p>}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-3 pb-1" role="group" aria-label="Filtrar cancha">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todas</Chip>
          {all.map(c => <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>{c.name}</Chip>)}
        </div>

        {all.length === 0 ? <Empty title="Todavía no hay canchas" text="Cargá una cancha para ver la agenda." action={<Button onClick={() => navigate('/dueno/canchas')}>Ir a Canchas</Button>} /> : <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm" aria-label="Referencias">
            <Status tone="ok" icon={CircleCheck}>Pagado</Status><Status tone="info" icon={Coins}>Seña</Status><Status tone="warn" icon={HandCoins}>A cobrar</Status><Status tone="danger" icon={Clock3}>Pendiente</Status><Status tone="muted" icon={Lock}>Bloqueado</Status>
          </div>
          {/* Mobile / tablet: lista vertical por cancha */}
          <div className="lg:hidden mt-4 space-y-6">
            {courts.map(c => {
              const all2 = times.map(t => ({ t, info: cell(c, t) }))
              const hidden = showPast ? 0 : all2.filter(r => r.info.kind === 'past').length
              const rows = showPast ? all2 : all2.filter(r => r.info.kind !== 'past')
              const booked = rows.filter(r => r.info.kind === 'booked').length, free = rows.filter(r => r.info.kind === 'free').length
              return (
                <section key={c.id} aria-label={c.name}>
                  <div className="flex items-baseline justify-between mb-2"><h3 className="font-semibold">{c.name}</h3><span className="text-sm text-muted">{booked} reservas · {free} libres</span></div>
                  {c.status !== 'active' && <p className="text-sm text-warn mb-2">Cancha {c.status === 'blocked' ? 'bloqueada' : 'desactivada'}: no recibe reservas.</p>}
                  <div className="list">
                    {hidden > 0 && <button type="button" className="row !min-h-12 text-muted text-sm" onClick={() => setShowPast(true)}><span className="flex-1">{hidden} {hidden === 1 ? 'horario anterior' : 'horarios anteriores'}</span><span className="text-brand font-semibold">Ver</span></button>}
                    {rows.map(({ t, info }) => {
                      const clickable = ['booked', 'free', 'blocked'].includes(info.kind)
                      return (
                        <button key={t} type="button" className={cn('row !min-h-14', info.kind === 'blocked' && 'hatch', !clickable && 'cursor-default hover:!bg-transparent')} onClick={() => tap(c, t, info)} disabled={!clickable}>
                          <span className={cn('w-12 flex-none font-semibold tnum', info.kind === 'past' && 'text-faint')}>{t}</span>
                          <span className="flex-1 min-w-0">{body(info)}</span>
                          {info.kind === 'free' && <span className="inline-flex items-center gap-1 text-brand text-sm font-semibold flex-none border border-brand rounded-lg px-2.5 min-h-9"><Plus size={15} />Reservar</span>}
                          {info.kind === 'booked' && <ChevronRight size={18} className="text-faint flex-none -mr-1" />}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Desktop: grilla */}
          <div className="hidden lg:block mt-4 border border-line rounded-lg overflow-x-auto bg-surface">
            <div className="agenda-grid" style={{ gridTemplateColumns: `72px repeat(${courts.length}, minmax(180px, 1fr))` }}>
              <div className="p-3" />
              {courts.map(c => <div key={c.id} className="p-3 border-l border-line font-semibold">{c.name}<div className="text-sm font-normal text-muted">{c.sport}{c.status !== 'active' ? ' · inactiva' : ''}</div></div>)}
              {times.map(t => (
                <div key={t} className="contents">
                  <div className="agenda-cell !border-l-0 font-semibold tnum text-muted">{t}</div>
                  {courts.map(c => {
                    const info = cell(c, t), clickable = ['booked', 'free', 'blocked'].includes(info.kind)
                    return <button key={c.id} type="button" disabled={!clickable} onClick={() => tap(c, t, info)} className={cn('agenda-cell', info.kind === 'blocked' && 'hatch', info.kind === 'booked' && 'bg-brand-soft/40', !clickable && 'cursor-default')}>{body(info)}</button>
                  })}
                </div>
              ))}
            </div>
          </div>
        </>}

        <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu ? `${menu.court.name} · ${menu.time}` : ''}>
          {menu?.info.kind === 'free' && (
            <div className="list">
              <button type="button" className="row" onClick={() => { setSheet({ kind: 'new', preset: { date, courtId: menu.court.id, time: menu.time } }); setMenu(null) }}><span className="flex-1 font-semibold">Nueva reserva</span><ChevronRight size={18} className="text-faint" /></button>
              <button type="button" className="row" onClick={() => { setSheet({ kind: 'block', preset: { date, courtId: menu.court.id, time: menu.time } }); setMenu(null) }}><span className="flex-1 font-semibold">Bloquear horario</span><ChevronRight size={18} className="text-faint" /></button>
            </div>
          )}
          {menu?.info.kind === 'blocked' && (
            <>
              <p className="text-muted mb-4">{menu.info.block.reason || 'Horario bloqueado, sin motivo.'}</p>
              <Button className="w-full" variant="secondary" onClick={() => { update(s => { s.blocks = s.blocks.filter(x => x.id !== menu.info.block.id) }); toast('Horario liberado.'); setMenu(null) }}>Desbloquear horario</Button>
            </>
          )}
        </Sheet>
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <button type="button" aria-label="Nueva reserva" onClick={() => setSheet({ kind: 'new', preset: { date, courtId: filter !== 'all' ? filter : undefined } })}
          className="lg:hidden fixed right-4 z-20 bottom-[calc(var(--nav-h)+var(--safe-bottom)+16px)] size-14 rounded-full bg-brand text-[var(--brand-ink)] grid place-items-center shadow-lg active:opacity-85 transition-opacity"><Plus size={28} /></button>
        {sheet?.kind === 'new' && <NewBookingSheet open onClose={() => setSheet(null)} complex={complex} preset={sheet.preset} />}
        {sheet?.kind === 'block' && <BlockSheet open onClose={() => setSheet(null)} complex={complex} preset={sheet.preset} />}
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
      </>}
    </OwnerPage>
  )
}
