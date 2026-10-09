import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp, ChevronRight, Eye, LogOut, Moon, Plus, Store, Tags, Users, Wallet, UserRound, Sun, Star, BarChart3 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { courtsOf, effStatus, paymentLabel, promoLabel, promoWhen } from '../../lib/domain'
import { cn, addDays, dateShort, fromISO, money, monthStart, mondayOf, toISO, todayISO, uid } from '../../lib/format'
import { Link, useRoute } from '../../lib/router'
import { Button, Empty, Field, Input, MoneyInput, Segmented, Select, Sheet, Status, Switch, useConfirm, useToast, PageHeader, Content } from '../../ui/kit'
import { BookingRow } from '../../ui/shared'
import { BookingEditor, NewComplexSheet, OwnerPage, useOwner } from './common'
import { businessOf, feeFor } from '../admin/Revenue'
import { DateField } from '../../ui/DateField'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const blankPromo = complexId => ({ id: '', complexId, name: '', kind: 'percent', value: 20, courtId: '', timeFrom: '', timeTo: '', dateFrom: '', dateTo: '', onlyToday: false, frequentOnly: false, minBookings: 5, active: true })

/* ---------- Promociones ---------- */
export function Promotions() {
  const { state, update } = useStore()
  const { complex, courts } = useOwner()
  const { query } = useRoute()
  const [edit, setEdit] = useState(() => (query.nueva && complex ? { ...blankPromo(complex.id), timeFrom: query.desde || '', timeTo: query.hasta || '' } : null))
  const list = complex ? state.promotions.filter(p => p.complexId === complex.id) : []
  return (
    <OwnerPage title="Promociones" actions={complex && <Button size="sm" onClick={() => setEdit(blankPromo(complex.id))}><Plus size={16} />Nueva</Button>}>
      {complex && (list.length === 0
        ? <Empty title="No hay promociones" text="Podés dar un descuento en un horario, un día o para clientes frecuentes." action={<Button onClick={() => setEdit(blankPromo(complex.id))}><Plus size={18} />Nueva promoción</Button>} />
        : <div className="list">{list.map(p => (
          <div key={p.id} className="row">
            <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setEdit(p)}>
              <span className="block font-semibold truncate">{promoLabel(p)}{p.name ? ` · ${p.name}` : ''}</span>
              <span className="block text-sm text-muted truncate">{promoWhen(p)}{p.courtId ? ` · ${courts.find(c => c.id === p.courtId)?.name || ''}` : ''}</span>
              <Status tone={p.active ? 'ok' : 'muted'}>{p.active ? 'Activa' : 'Pausada'}</Status>
            </button>
            <button type="button" role="switch" aria-checked={p.active} aria-label={`Promoción ${p.name || promoLabel(p)} activa`} className="switch" onClick={() => update(s => { const x = s.promotions.find(y => y.id === p.id); x.active = !x.active })} />
          </div>))}</div>)}
      {edit && <PromoSheet promo={edit} courts={courts} onClose={() => setEdit(null)} />}
    </OwnerPage>
  )
}

function PromoSheet({ promo, courts, onClose }) {
  const { update } = useStore()
  const toast = useToast(), confirm = useConfirm()
  const isNew = !promo.id
  const [f, setF] = useState(() => ({ ...promo, timed: !!promo.timeFrom }))
  const [err, setErr] = useState({})
  const set = k => v => { setF(x => ({ ...x, [k]: v?.target ? v.target.value : v })); setErr(e => ({ ...e, [k]: '' })) }
  const save = () => {
    const e = {}
    if (!(f.value > 0)) e.value = 'Poné un valor mayor a cero.'
    if (f.kind === 'percent' && f.value > 90) e.value = 'El descuento máximo es 90%.'
    if (f.timed && f.timeFrom === f.timeTo) e.timeTo = 'El horario de fin tiene que ser distinto al de inicio.'
    if (f.dateFrom && f.dateTo && f.dateTo < f.dateFrom) e.dateTo = 'La fecha final es anterior a la inicial.'
    setErr(e); if (Object.keys(e).length) return
    const { timed, ...rest } = f
    const data = { ...rest, name: f.name.trim(), timeFrom: timed ? f.timeFrom || '16:00' : '', timeTo: timed ? f.timeTo || '18:00' : '' }
    update(s => { if (isNew) s.promotions.push({ ...data, id: uid('promo') }); else Object.assign(s.promotions.find(p => p.id === f.id), data) })
    toast(isNew ? 'Promoción creada.' : 'Cambios guardados.'); onClose()
  }
  const remove = async () => {
    if (!await confirm({ title: '¿Eliminar la promoción?', message: 'Las reservas ya hechas conservan su descuento.', confirmLabel: 'Eliminar', danger: true })) return
    update(s => { s.promotions = s.promotions.filter(p => p.id !== f.id) }); toast('Promoción eliminada.'); onClose()
  }
  return (
    <Sheet open onClose={onClose} wide title={isNew ? 'Nueva promoción' : 'Editar promoción'} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>{isNew ? 'Crear promoción' : 'Guardar cambios'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre (opcional)" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Tarde, último minuto, cliente frecuente…" /></Field>
        <div className="sm:col-span-2"><span className="label">Descuento</span><Segmented value={f.kind} onChange={v => setF(x => ({ ...x, kind: v, value: v === 'percent' ? 20 : 300000 }))} label="Tipo de descuento" options={[{ value: 'percent', label: 'Porcentaje' }, { value: 'fixed', label: 'Monto fijo' }]} /></div>
        {f.kind === 'percent'
          ? <Field label="Porcentaje" error={err.value}><Select value={f.value} onChange={e => set('value')(Number(e.target.value))}>{[5, 10, 15, 20, 25, 30, 40, 50].map(n => <option key={n} value={n}>{n}%</option>)}</Select></Field>
          : <Field label="Monto a descontar" error={err.value}><MoneyInput value={f.value} onChange={set('value')} /></Field>}
        <Field label="Cancha"><Select value={f.courtId} onChange={set('courtId')}><option value="">Todas</option>{courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      </div>
      <div className="mt-2">
        <Switch label="Solo en un horario" checked={f.timed} onChange={v => setF(x => ({ ...x, timed: v, timeFrom: x.timeFrom || '16:00', timeTo: x.timeTo || '18:00' }))} />
        {f.timed && <div className="grid grid-cols-2 gap-3 mb-2">
          <Field label="Desde"><Select value={f.timeFrom} onChange={set('timeFrom')}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
          <Field label="Hasta" error={err.timeTo}><Select value={f.timeTo} onChange={set('timeTo')}>{[...HOURS.slice(1), '24:00'].map(h => <option key={h}>{h}</option>)}</Select></Field>
        </div>}
        <Switch label="Solo turnos de hoy" hint="Para completar horarios vacíos a último momento." checked={f.onlyToday} onChange={set('onlyToday')} />
        {!f.onlyToday && <div className="grid grid-cols-2 gap-3 mb-2">
          <Field label="Desde el día"><DateField clearable value={f.dateFrom} onChange={set('dateFrom')} placeholder="Sin límite" title="Desde el día" /></Field>
          <Field label="Hasta el día" error={err.dateTo}><DateField clearable value={f.dateTo} min={f.dateFrom || undefined} onChange={set('dateTo')} placeholder="Sin límite" title="Hasta el día" /></Field>
        </div>}
        <Switch label="Solo clientes frecuentes" checked={f.frequentOnly} onChange={set('frequentOnly')} />
        {f.frequentOnly && <Field label="Cuentan como frecuentes con" className="mb-2"><Select value={f.minBookings} onChange={e => set('minBookings')(Number(e.target.value))}>{[3, 5, 10].map(n => <option key={n} value={n}>{n} reservas o más</option>)}</Select></Field>}
        <Switch label="Promoción activa" checked={f.active} onChange={set('active')} />
      </div>
      {!isNew && <div className="mt-6 pt-4 border-t border-line"><Button variant="danger" onClick={remove}>Eliminar promoción</Button></div>}
    </Sheet>
  )
}

/* ---------- Finanzas ---------- */
export function Finance() {
  const { state } = useStore()
  const { complex } = useOwner()
  const [period, setPeriod] = useState('week')
  const [limit, setLimit] = useState(15)
  const [editing, setEditing] = useState('')
  const today = todayISO(), wk = mondayOf(today), mo = monthStart(today)
  const mEnd = (() => { const d = fromISO(mo); d.setMonth(d.getMonth() + 1, 0); return toISO(d) })()
  const prevMo = (() => { const d = fromISO(mo); d.setMonth(d.getMonth() - 1, 1); return toISO(d) })()
  const elapsed = Math.round((fromISO(today) - fromISO(mo)) / 864e5)
  const R = {
    today: { from: today, to: today, prev: [addDays(today, -1), addDays(today, -1)], vs: 'ayer' },
    week: { from: wk, to: addDays(wk, 6), prev: [addDays(wk, -7), addDays(today, -7)], vs: 'la semana pasada a esta altura' },
    month: { from: mo, to: mEnd, prev: [prevMo, addDays(prevMo, elapsed)], vs: 'el mes pasado a esta altura' },
  }[period]
  const all = useMemo(() => complex ? state.bookings.filter(b => b.complexId === complex.id && !b._busy) : [], [state.bookings, complex])
  const within = (a, b) => all.filter(x => x.date >= a && x.date <= b)
  const sumPaid = l => l.reduce((s, b) => s + (b.paidCents || 0), 0)
  const cur = within(R.from, R.to), prev = within(...R.prev)
  const income = sumPaid(cur), prevIncome = sumPaid(prev)
  const delta = prevIncome ? Math.round(((income - prevIncome) / prevIncome) * 100) : null
  const active = cur.filter(b => !['cancelled'].includes(effStatus(b)))
  const pendingAmt = cur.filter(b => ['pending', 'deposit_paid', 'confirmed', 'completed'].includes(effStatus(b))).reduce((s, b) => s + Math.max(0, b.totalCents - (b.paidCents || 0)), 0)
  const ticket = active.length ? Math.round(active.reduce((s, b) => s + b.totalCents, 0) / active.length) : 0
  const days = period === 'today' ? [] : Array.from({ length: Math.round((fromISO(R.to) - fromISO(R.from)) / 864e5) + 1 }, (_, i) => addDays(R.from, i))
  const perDay = days.map(d => ({ d, v: sumPaid(all.filter(b => b.date === d)) }))
  const maxDay = Math.max(1, ...perDay.map(x => x.v))
  const rows = cur.filter(b => b.paidCents > 0 || ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(b))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const fee = (() => { const bz = businessOf(state); if (bz.model === 'free') return null; const f = feeFor(state, complex?.id, mo, today); return { bz, f } })()
  return (
    <OwnerPage title="Finanzas">
      {complex && <>
        <Segmented value={period} onChange={v => { setPeriod(v); setLimit(15) }} label="Período" options={[{ value: 'today', label: 'Hoy' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]} />
        <div className="border border-line rounded-lg bg-surface p-4 mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Ingresos</div>
          <div className="display text-4xl font-bold tnum mt-1">{money(income)}</div>
          <p className={cn('text-sm mt-1 inline-flex items-center gap-1', delta == null ? 'text-muted' : delta >= 0 ? 'text-brand' : 'text-danger')}>
            {delta == null ? `Sin datos de ${R.vs.split(' a esta')[0]} para comparar` : <>{delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{delta >= 0 ? '+' : ''}{delta}% contra {R.vs}</>}</p>
          {days.length > 0 && (
            <div className="mt-4" role="img" aria-label={`Ingresos por día: ${perDay.map(x => `${x.d.slice(8)} ${money(x.v)}`).join(', ')}`}>
              <div className="flex items-end gap-[3px] h-24">{perDay.map(x => (
                <div key={x.d} className="flex-1 h-full flex items-end" title={`${dateShort(x.d)}: ${money(x.v)}`}>
                  <div className={cn('w-full rounded-t-sm', x.d > today ? 'bg-sunken' : x.d === today ? 'bg-brand' : 'bg-[color-mix(in_srgb,var(--brand)_55%,var(--sunken))]')} style={{ height: `${Math.max(x.v ? 4 : 2, (x.v / maxDay) * 100)}%` }} />
                </div>))}</div>
              <div className="flex gap-[3px] mt-1 text-[11px] text-muted tnum">{perDay.map((x, i) => <span key={x.d} className="flex-1 text-center truncate">{period === 'week' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i] : (i % 5 === 0 ? Number(x.d.slice(8)) : '')}</span>)}</div>
            </div>)}
        </div>
        <div className="grid grid-cols-3 border border-line rounded-lg bg-surface mt-3">
          <div className="p-4 min-w-0"><div className="text-xs font-semibold uppercase tracking-wider text-muted">Por cobrar</div><div className="text-xl font-semibold tnum mt-1 truncate">{money(pendingAmt)}</div></div>
          <div className="p-4 min-w-0 border-l border-line"><div className="text-xs font-semibold uppercase tracking-wider text-muted">Reservas</div><div className="text-xl font-semibold tnum mt-1">{active.length}</div></div>
          <div className="p-4 min-w-0 border-l border-line"><div className="text-xs font-semibold uppercase tracking-wider text-muted">Ticket prom.</div><div className="text-xl font-semibold tnum mt-1 truncate">{money(ticket)}</div></div>
        </div>
        {fee && <p className="text-sm text-muted mt-3">{fee.bz.model === 'commission' ? <>Comisión de La Fija ({fee.bz.commissionPercent}% de las reservas hechas por la app) este mes: <strong className="text-ink tnum">{money(fee.f.fee)}</strong></> : <>Abono de La Fija: <strong className="text-ink tnum">{money(fee.bz.monthlyFeeCents)}</strong> por mes</>}</p>}
        <h2 className="font-semibold mt-6 mb-3">Movimientos</h2>
        {rows.length === 0 ? <div className="list"><Empty title="Sin movimientos en este período" text="Cuando cobres una reserva, aparece acá." /></div> : (
          <><div className="list">{rows.slice(0, limit).map(b => {
            const court = courtsOf(state, b.complexId).find(c => c.id === b.courtId)
            return (
              <button key={b.id} type="button" className="row" onClick={() => setEditing(b.id)}>
                <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{b.playerName}</span><span className="block text-sm text-muted truncate">{court?.name} · {dateShort(b.date)} · {b.time}</span></span>
                <span className="text-right flex-none"><span className="block font-semibold tnum">{money(b.paidCents)}</span><span className="block text-sm text-muted">{paymentLabel(b)}</span></span>
                <ChevronRight size={18} className="text-faint flex-none -mr-1" />
              </button>)
          })}</div>
          {rows.length > limit && <Button variant="secondary" className="w-full mt-3" onClick={() => setLimit(limit + 15)}>Ver más ({rows.length - limit})</Button>}</>)}
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
      </>}
    </OwnerPage>
  )
}

/* ---------- Más (móvil) ---------- */
export function More({ theme, onSignOut }) {
  const { user } = useStore()
  const { mine } = useOwner()
  const [creating, setCreating] = useState(false)
  const Item = ({ to, icon: I, title, note, onClick }) => {
    const inner = <><I size={22} className="text-muted flex-none" /><span className="flex-1 min-w-0"><span className="block font-semibold">{title}</span>{note && <span className="block text-sm text-muted">{note}</span>}</span><ChevronRight size={18} className="text-faint flex-none" /></>
    return to ? <Link to={to} className="row">{inner}</Link> : <button type="button" className="row" onClick={onClick}>{inner}</button>
  }
  return (
    <>
      <PageHeader title="Más" sub={user.name} />
      <Content className="max-w-[640px] lg:mx-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Gestión</h2>
        <div className="list">
          <Item to="/dueno/clientes" icon={Users} title="Clientes" note="Frecuentes, historial y notas" />
          <Item to="/dueno/finanzas" icon={Wallet} title="Finanzas" note="Ingresos, pendiente de cobro y ticket promedio" />
          <Item to="/dueno/promociones" icon={Tags} title="Promociones" note="Descuentos por horario o fecha" />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mt-8 mb-2">Análisis</h2>
        <div className="list">
          <Item to="/dueno/estadisticas" icon={BarChart3} title="Estadísticas" note="Ocupación, horarios fuertes y oportunidades" />
          <Item to="/dueno/resenas" icon={Star} title="Reseñas" note="Ver y responder" />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mt-8 mb-2">Configuración</h2>
        <div className="list">
          <Item to="/dueno/complejo" icon={Store} title="Mi complejo" note="Datos, horarios, fotos, seña y cancelación" />
          <Item to="/dueno/complejo/vista-previa" icon={Eye} title="Vista previa pública" note="Cómo lo ven los jugadores" />
          <Item onClick={() => setCreating(true)} icon={Plus} title="Nuevo complejo" note={mine.length ? `Tenés ${mine.length}` : ''} />
          <Item to="/dueno/cuenta" icon={UserRound} title="Cuenta y avisos" note="Tus datos, avisos del celular, letra grande" />
          <button type="button" className="row" onClick={theme.toggle}>{theme.dark ? <Sun size={22} className="text-muted" /> : <Moon size={22} className="text-muted" />}<span className="flex-1 font-semibold">{theme.dark ? 'Modo claro' : 'Modo oscuro'}</span></button>
          <button type="button" className="row" onClick={onSignOut}><LogOut size={22} className="text-muted" /><span className="flex-1 font-semibold">Cerrar sesión</span></button>
        </div>
      </Content>
      <NewComplexSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
