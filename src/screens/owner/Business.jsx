import { useMemo, useState } from 'react'
import { AnimatePresence, m as motion } from 'motion/react'
import { ArrowRight, BarChart3, CalendarDays, ChevronRight, Clock3, Crown, Download, Eye, HandCoins, LifeBuoy, LogOut, Moon, Pencil, Plus, ShieldCheck, FileText, SlidersHorizontal, Sparkles, Star, Store, Sun, Tags, Ticket, TrendingDown, TrendingUp, Type, UserRound, Users, Wallet, Zap, Sunset, MessageCircle, Lightbulb, BellRing } from 'lucide-react'
import { CountUp, Item, Stagger } from '../../ui/motion'
import { Columns, Delta, Kpi, useStickyTop } from '../../ui/dash'
import { useStore } from '../../lib/store'
import { courtsOf, effStatus, ownerStats, paymentLabel, priceFor, promoLabel, promoWhen, balanceOf, WEEKDAYS } from '../../lib/domain'
import { cn, addDays, dateShort, fromISO, initials, money, monthStart, mondayOf, plural, toISO, todayISO, uid, waLink } from '../../lib/format'
import { Link, useRoute } from '../../lib/router'
import { Avatar, Button, Content, Empty, Field, Input, MoneyInput, PageHeader, Segmented, Select, Sheet, Switch, useConfirm, useToast } from '../../ui/kit'
import { useBigText } from '../../lib/theme'
import { SUPPORT_WA } from '../../ui/Help'
import { MessageSheet } from '../../ui/MessageSheet'
import { BookingEditor, NewComplexSheet, OwnerPage, useOwner } from './common'
import { businessOf, feeFor } from '../admin/Revenue'
import { DateField } from '../../ui/DateField'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const blankPromo = complexId => ({ id: '', complexId, name: '', kind: 'percent', value: 20, courtId: '', timeFrom: '', timeTo: '', dateFrom: '', dateTo: '', onlyToday: false, frequentOnly: false, minBookings: 5, active: true })
const LIVE = ['pending', 'deposit_paid', 'confirmed']
const rel = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null)

/* ---------- Promociones ---------- */
const IDEAS = [
  { icon: Sunset, title: 'Tarde tranquila', text: '20% entre las 14 y las 17', preset: { name: 'Tarde tranquila', kind: 'percent', value: 20, timeFrom: '14:00', timeTo: '17:00' } },
  { icon: Zap, title: 'Último minuto', text: '30% en turnos de hoy', preset: { name: 'Último minuto', kind: 'percent', value: 30, onlyToday: true } },
  { icon: Crown, title: 'Cliente frecuente', text: '10% desde la 5.ª reserva', preset: { name: 'Cliente frecuente', kind: 'percent', value: 10, frequentOnly: true, minBookings: 5 } },
]
const promoState = (p, today) => !p.active ? { k: 'off', label: 'Pausada' } : p.dateTo && p.dateTo < today ? { k: 'dead', label: 'Vencida' } : p.dateFrom && p.dateFrom > today ? { k: 'soon', label: 'Programada' } : { k: 'on', label: p.onlyToday ? 'Solo hoy' : 'Activa' }

function PromoCard({ p, courts, today, used, onEdit, onToggle }) {
  const sx = promoState(p, today)
  const sample = courts.find(c => c.id === p.courtId) || courts[0]
  const at = p.timeFrom || '20:00'
  const base = sample ? priceFor(sample, at) : 0
  const off = p.kind === 'percent' ? Math.round(base * p.value / 100) : Math.min(base, p.value)
  const dim = sx.k === 'off' || sx.k === 'dead'
  const name = p.name || promoLabel(p)
  return (
    <Item as="article" className={cn('ow-promo', sx.k === 'off' && 'off', sx.k === 'dead' && 'dead')} aria-label={`Promoción ${name}, ${sx.label}`}>
      <div className="ow-promo-top">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold', dim ? 'bg-surface text-muted' : 'bg-white/20')}>{sx.k === 'on' && <span className="live-dot" />}{sx.label}</span>
          {used > 0 && <span className="text-xs font-semibold opacity-90 tnum">{plural(used, 'reserva', 'reservas')}</span>}
        </div>
        <div className="mt-4 flex items-baseline gap-2"><span className="ow-promo-big text-6xl">{p.kind === 'percent' ? `${p.value}%` : money(p.value)}</span><span className="text-xs font-bold uppercase tracking-widest opacity-90">off</span></div>
        <p className="font-semibold mt-1.5 truncate">{name}</p>
      </div>
      <div className="ow-promo-cut" aria-hidden="true" />
      <div className="flex flex-col gap-3 p-4 pt-5 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className="ow-pill muted"><Clock3 size={13} aria-hidden="true" />{promoWhen(p)}</span>
          <span className="ow-pill muted">{p.courtId ? courts.find(c => c.id === p.courtId)?.name || 'Cancha' : 'Todas las canchas'}</span>
        </div>
        {base > 0 && (
          <div>
            <p className="ow-eyebrow mb-1.5">Así lo ven tus clientes</p>
            <span className="ow-slot"><span className="font-semibold">{at}</span><s className="text-muted text-sm">{money(base)}</s><strong className={dim ? 'text-muted' : 'text-brand'}>{money(base - off)}</strong></span>
          </div>)}
        <div className="flex items-center justify-between gap-3 mt-auto pt-1">
          <Button variant="secondary" className="!min-h-11" onClick={onEdit} aria-label={`Editar ${name}`}><Pencil size={16} aria-hidden="true" />Editar</Button>
          <span className="inline-flex items-center gap-2.5"><span className="text-sm font-medium text-muted">{p.active ? 'Activa' : 'Pausada'}</span>
            <button type="button" role="switch" aria-checked={p.active} aria-label={`Promoción ${name} activa`} className="switch" onClick={onToggle} /></span>
        </div>
      </div>
    </Item>
  )
}

export function Promotions() {
  const { state, update } = useStore()
  const { complex, courts } = useOwner()
  const { query } = useRoute()
  const stickyRef = useStickyTop(24)
  const today = todayISO()
  const [edit, setEdit] = useState(() => (query.nueva && complex ? { ...blankPromo(complex.id), timeFrom: query.desde || '', timeTo: query.hasta || '' } : null))
  const list = complex ? state.promotions.filter(p => p.complexId === complex.id) : []
  const usedBy = p => (p.name && complex ? state.bookings.filter(b => b.complexId === complex.id && b.promoName === p.name && b.discountCents > 0).length : 0)
  const given = complex ? state.bookings.filter(b => b.complexId === complex.id && !b._busy && b.discountCents > 0 && effStatus(b) !== 'cancelled') : []
  const activeN = list.filter(p => promoState(p, today).k === 'on').length
  const weak = useMemo(() => { if (!complex) return null; const w = ownerStats(state, complex, 30).weakDays[0]; return w && w.pct < 50 ? w : null }, [state, complex])
  const create = preset => setEdit({ ...blankPromo(complex.id), ...preset })
  return (
    <OwnerPage title="Promociones" sub={complex && list.length ? `${activeN} ${activeN === 1 ? 'activa' : 'activas'} de ${list.length}` : ''} actions={complex && <Button size="sm" className="!min-h-11" onClick={() => create({})}><Plus size={16} />Nueva</Button>} wide>
      {complex && (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6 xl:items-start">
          <div className="min-w-0">
            {list.length === 0
              ? (
                <div className="ow-card p-6 lg:p-10 text-center">
                  <span className="mx-auto mb-4 grid place-items-center size-16 rounded-2xl bg-brand-soft text-brand float-y"><Tags size={30} strokeWidth={1.75} aria-hidden="true" /></span>
                  <h2 className="display text-2xl font-bold">Todavía no tenés promociones</h2>
                  <p className="text-muted mt-1 max-w-md mx-auto">Un buen descuento llena los horarios vacíos. Podés dar un porcentaje en una franja, en un día o a tus clientes frecuentes.</p>
                  <div className="mt-5 flex justify-center"><Button onClick={() => create({})}><Plus size={18} />Nueva promoción</Button></div>
                </div>)
              : (<>
                <div className="ow-card grid grid-cols-3 divide-x divide-line mb-4">
                  {[['Activas', activeN, null], ['Con promo', given.length, 'reservas'], ['Descontado', money(given.reduce((a, b) => a + b.discountCents, 0)), null]].map(([k, v, u]) => (
                    <div key={k} className="px-4 py-3 lg:px-5 lg:py-3.5 min-w-0"><p className="ow-eyebrow truncate">{k}</p><p className="display text-xl lg:text-2xl font-bold tnum leading-tight truncate"><CountUp value={v} />{u && <span className="text-sm font-medium text-muted font-[family-name:var(--font-sans)] hidden sm:inline"> {u}</span>}</p></div>))}
                </div>
                <Stagger className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">{list.map(p => (
                  <PromoCard key={p.id} p={p} courts={courts} today={today} used={usedBy(p)} onEdit={() => setEdit(p)} onToggle={() => update(s => { const x = s.promotions.find(y => y.id === p.id); x.active = !x.active })} />))}
                  <Item as="button" type="button" className="ow-idea !flex-col !justify-center !text-center !gap-2 !min-h-[200px]" onClick={() => create({})}>
                    <span className="ow-ico grad"><Plus size={22} aria-hidden="true" /></span>
                    <span className="font-semibold">Nueva promoción</span><span className="text-sm text-muted">Armá un descuento a medida</span>
                  </Item>
                </Stagger>
              </>)}
          </div>

          <aside ref={stickyRef} className="min-w-0 mt-6 xl:mt-0 xl:sticky xl:self-start flex flex-col gap-4" aria-label="Ideas para llenar horarios">
            <section className="ow-card p-5" aria-labelledby="ow-ideas">
              <div className="flex items-center gap-3"><span className="ow-ico grad"><Sparkles size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><h2 id="ow-ideas" className="display text-xl font-bold leading-tight">Ideas para llenar horarios</h2><p className="text-sm text-muted">Tocá una y ajustala a tu gusto.</p></div></div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
                {IDEAS.map(i => (
                  <button key={i.title} type="button" className="ow-idea" onClick={() => create(i.preset)}>
                    <span className="ow-ico flex-none"><i.icon size={20} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{i.title}</span><span className="block text-sm text-muted">{i.text}</span></span>
                    <Plus size={18} className="text-faint flex-none" aria-hidden="true" />
                  </button>))}
              </div>
            </section>
            {weak && (
              <section className="ow-card p-5 flex items-start gap-3" aria-label="Sugerencia">
                <span className="ow-ico warn"><Lightbulb size={20} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="font-semibold">Los {WEEKDAYS[weak.d]} están flojos</p><p className="text-sm text-muted">Tuvieron {weak.pct}% de ocupación en el último mes. Una promo en esos días puede ayudar.</p>
                  <Link to="/dueno/estadisticas" className="btn btn-link mt-1 -ml-2">Ver estadísticas<ArrowRight size={16} aria-hidden="true" /></Link></div>
              </section>)}
          </aside>
        </div>)}
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
  const toast = useToast()
  const { complex } = useOwner()
  const [period, setPeriod] = useState('week')
  const [limit, setLimit] = useState(15)
  const [editing, setEditing] = useState('')
  const [pickDay, setPickDay] = useState(null)
  const [msg, setMsg] = useState('')
  const [allDue, setAllDue] = useState(false)
  const stickyRef = useStickyTop(24)
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
  const prevActive = prev.filter(b => !['cancelled'].includes(effStatus(b)))
  const dueList = cur.filter(b => ['pending', 'deposit_paid', 'confirmed', 'completed'].includes(effStatus(b)) && balanceOf(b) > 0).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const pendingAmt = dueList.reduce((s, b) => s + balanceOf(b), 0)
  const ticket = active.length ? Math.round(active.reduce((s, b) => s + b.totalCents, 0) / active.length) : 0
  const prevTicket = prevActive.length ? Math.round(prevActive.reduce((s, b) => s + b.totalCents, 0) / prevActive.length) : 0
  const days = period === 'today' ? [] : Array.from({ length: Math.round((fromISO(R.to) - fromISO(R.from)) / 864e5) + 1 }, (_, i) => addDays(R.from, i))
  const perDay = days.map(d => ({ d, v: sumPaid(all.filter(b => b.date === d)) }))
  const prevDays = days.map((_, i) => addDays(R.prev[0], i))
  const prevPerDay = prevDays.map(d => sumPaid(all.filter(b => b.date === d)))
  const rows = cur.filter(b => b.paidCents > 0 || ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(b))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const shownRows = rows.filter(b => !pickDay || b.date === pickDay)
  const fee = (() => { const bz = businessOf(state); if (bz.model === 'free') return null; const f = feeFor(state, complex?.id, mo, today); return { bz, f } })()
  const label = period === 'today' ? 'hoy' : period === 'week' ? 'esta semana' : 'este mes'
  const past = perDay.filter(x => x.d <= today)
  const best = past.reduce((m, x) => (x.v > (m?.v ?? 0) ? x : m), null)
  const avg = past.length ? Math.round(income / past.length) : 0
  const courtName = b => courtsOf(state, b.complexId).find(c => c.id === b.courtId)?.name
  const vsShort = R.vs.split(' a esta')[0]
  const exportCsv = () => {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [['Fecha', 'Hora', 'Cliente', 'Celular', 'Cancha', 'Importe', 'Cobrado', 'Saldo', 'Estado del pago'].map(q).join(';')]
    for (const b of [...rows].reverse()) lines.push([b.date, b.time, b.playerName, b.phone || '', courtName(b) || '', Math.round(b.totalCents / 100), Math.round((b.paidCents || 0) / 100), Math.round(balanceOf(b) / 100), paymentLabel(b)].map(q).join(';'))
    try {
      const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a'); a.href = url; a.download = `finanzas-${period}-${today}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast('Descargamos el detalle en una planilla.')
    } catch { toast('No pudimos armar la planilla.', 'error') }
  }
  return (
    <OwnerPage title="Finanzas" sub={complex ? `Ingresos ${label}` : ''} wide actions={complex && rows.length > 0 && <Button size="sm" variant="secondary" className="hidden sm:inline-flex !min-h-11" onClick={exportCsv}><Download size={16} aria-hidden="true" />Descargar planilla</Button>}>
      {complex && <>
        <Segmented value={period} onChange={v => { setPeriod(v); setLimit(15); setPickDay(null) }} label="Período" className="lg:max-w-[420px]" options={[{ value: 'today', label: 'Hoy' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]} />
        <div className="flex flex-col gap-6 mt-4 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[auto_1fr] xl:gap-x-6">
          <div className="flex flex-col gap-4 lg:gap-5 min-w-0 xl:col-start-1">
            <div className="hero ow-hero p-5 lg:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />Ingresos · {label}</p>
                  <div className="display text-5xl lg:text-6xl font-bold tnum mt-2 leading-none"><CountUp key={period} value={money(income)} /></div>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 py-1 bg-white/18 backdrop-blur">
                    {delta == null ? `Sin datos de ${vsShort} para comparar` : <>{delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{delta >= 0 ? '+' : ''}{delta}% contra {R.vs}</>}</p>
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-3 lg:w-[320px] flex-none">
                  {(period === 'today'
                    ? [['Cobros', active.filter(b => b.paidCents > 0).length], ['Por cobrar', money(pendingAmt)]]
                    : [['Promedio por día', money(avg)], ['Mejor día', best && best.v > 0 ? money(best.v) : '—', best && best.v > 0 ? dateShort(best.d) : '']]).map(([k, v, sub]) => (
                    <div key={k} className="ow-hero-glass p-3 min-w-0"><p className="text-xs font-semibold uppercase tracking-wider opacity-85 truncate">{k}</p><p className="display text-2xl font-bold tnum leading-tight truncate">{v}</p>{sub && <p className="text-xs opacity-85 truncate">{sub}</p>}</div>))}
                </div>
              </div>
            </div>

            <Stagger className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Item className="col-span-2 md:col-span-1"><Kpi icon={HandCoins} label="Por cobrar" value={money(pendingAmt)} tone={pendingAmt ? 'warn' : 'brand'} hint={dueList.length ? plural(dueList.length, 'turno con saldo', 'turnos con saldo') : 'Todo cobrado'} className="h-full" /></Item>
              <Item><Kpi icon={CalendarDays} label="Reservas" value={active.length} delta={<Delta value={rel(active.length, prevActive.length)} />} hint={`vs ${vsShort}`} className="h-full" /></Item>
              <Item><Kpi icon={Ticket} label="Ticket prom." value={money(ticket)} delta={<Delta value={rel(ticket, prevTicket)} />} hint="por reserva" className="h-full" /></Item>
            </Stagger>

            {days.length > 0 && (
              <div className="ow-card p-4 lg:p-5">
                <div className="flex items-baseline justify-between gap-3 mb-4 min-h-9">
                  <h2 className="display text-xl font-bold">Ingresos por día</h2>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p key={pickDay || 'none'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .12 }} className="text-sm text-right tnum">
                      {pickDay ? <><span className="text-muted">{dateShort(pickDay)} · </span><strong className="text-brand text-base">{money(perDay.find(x => x.d === pickDay)?.v || 0)}</strong></> : <span className="text-muted">Tocá una columna · <span className="inline-block w-4 border-t-2 border-dashed border-strong align-middle" /> {vsShort}</span>}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="overflow-x-clip -mx-4 px-4 lg:mx-0 lg:px-0"><Columns height={176} items={perDay.map((x, i) => ({ key: x.d, v: x.v, ghost: prevPerDay[i] || 0, future: x.d > today, today: x.d === today, hot: best && x.d === best.d && x.v > 0, aria: `${dateShort(x.d)}: ${money(x.v)}` }))}
                  selected={pickDay} onSelect={setPickDay} labelFor={(x, i) => period === 'week' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i] : (i % 5 === 0 ? Number(x.key.slice(8)) : '')} /></div>
              </div>)}
          </div>

          {/* ---------- Lateral: cobros pendientes y comisión ---------- */}
          <aside ref={stickyRef} className="flex flex-col gap-4 min-w-0 lg:grid lg:grid-cols-2 lg:items-start xl:flex xl:flex-col xl:items-stretch xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:self-start xl:sticky" aria-label="Cobros">
            <section className="ow-card p-4 lg:p-5" aria-labelledby="ow-due">
              <div className="flex items-center gap-3"><span className="ow-ico warn"><HandCoins size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><h2 id="ow-due" className="display text-xl font-bold leading-tight">Cobros pendientes</h2><p className="text-sm text-muted tnum">{dueList.length ? `${plural(dueList.length, 'turno', 'turnos')} · ${money(pendingAmt)}` : `Nada por cobrar ${label}`}</p></div></div>
              {dueList.length === 0
                ? <p className="mt-4 rounded-2xl bg-brand-soft text-brand px-4 py-3 font-medium text-sm">Todo cobrado. ¡Buen trabajo!</p>
                : <><ul className="mt-3 -mx-2">{dueList.slice(0, allDue ? 40 : 5).map(b => (
                  <li key={b.id} className="flex items-center gap-1 rounded-xl hover:bg-sunken transition-colors">
                    <button type="button" onClick={() => setEditing(b.id)} className="flex items-center gap-3 px-2 py-2 flex-1 min-w-0 text-left min-h-14" aria-label={`Abrir la reserva de ${b.playerName}`}>
                      <Avatar name={b.playerName} />
                      <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{b.playerName}</span><span className="block text-sm text-muted truncate tnum">{dateShort(b.date)} · {b.time}</span></span>
                      <span className="font-semibold tnum text-warn">{money(balanceOf(b))}</span>
                    </button>
                    <button type="button" className="icon-btn flex-none" disabled={!b.phone} aria-label={`Recordar el pago a ${b.playerName}`} title="Recordar el pago" onClick={() => setMsg(b.id)}><MessageCircle size={18} aria-hidden="true" /></button>
                  </li>))}</ul>
                  {dueList.length > 5 && <Button variant="ghost" className="w-full mt-1" onClick={() => setAllDue(v => !v)}>{allDue ? 'Ver menos' : `Ver los ${dueList.length}`}</Button>}</>}
            </section>
            {fee && (
              <section className="ow-card p-4 lg:p-5 flex items-start gap-3" aria-label="Comisión de La Fija">
                <span className="ow-ico info"><Wallet size={20} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="font-semibold">{fee.bz.model === 'commission' ? 'Comisión de La Fija' : 'Abono de La Fija'}</p>
                  <p className="display text-3xl font-bold tnum leading-tight">{money(fee.bz.model === 'commission' ? fee.f.fee : fee.bz.monthlyFeeCents)}</p>
                  <p className="text-sm text-muted">{fee.bz.model === 'commission' ? `${fee.bz.commissionPercent}% de las reservas hechas por la app este mes.` : 'por mes.'}</p></div>
              </section>)}
          </aside>

          {/* ---------- Movimientos ---------- */}
          <section className="min-w-0 xl:col-start-1" aria-labelledby="ow-mov">
            <div className="flex items-center justify-between gap-3 mb-3 min-h-8">
              <h2 id="ow-mov" className="display text-xl font-bold">Movimientos</h2>
              <div className="flex items-center gap-2">
                {pickDay && <button type="button" className="ow-pill" onClick={() => setPickDay(null)}>{dateShort(pickDay)} · quitar filtro</button>}
                {rows.length > 0 && <Button size="sm" variant="secondary" className="sm:hidden !min-h-11" onClick={exportCsv} aria-label="Descargar planilla"><Download size={16} aria-hidden="true" /></Button>}
              </div>
            </div>
            {shownRows.length === 0 ? <div className="list"><Empty icon={Wallet} title="Sin movimientos en este período" text="Cuando cobres una reserva, aparece acá." /></div> : (
              <>
                <div className="ow-card ow-table">
                  <div className="ow-th ow-fin" aria-hidden="true"><span className="c-who">Cliente</span><span className="c-when">Cuándo</span><span className="c-meth">Pago</span><span className="c-amount">Cobrado</span><span className="c-go" /></div>
                  <Stagger step={.02} className="contents" key={period + (pickDay || '')}>{shownRows.slice(0, limit).map(b => (
                    <Item as="button" key={b.id} type="button" className="ow-tr is-btn ow-fin" style={{ '--accent': balanceOf(b) > 0 && LIVE.includes(effStatus(b)) ? 'var(--warn)' : 'var(--brand)' }} onClick={() => setEditing(b.id)}>
                      <span className="c-who"><Avatar name={b.playerName} size={40} /><span className="min-w-0"><span className="block font-semibold truncate">{b.playerName}</span><span className="block text-sm text-muted truncate">{courtName(b)}<span className="ow-nonly tnum"> · {dateShort(b.date)} · {b.time}</span></span></span></span>
                      <span className="c-when tnum"><span className="block font-semibold">{dateShort(b.date)}</span><span className="block text-sm text-muted">{b.time}</span></span>
                      <span className="c-meth truncate">{paymentLabel(b)}</span>
                      <span className="c-amount tnum font-semibold">{money(b.paidCents)}</span>
                      <ChevronRight size={18} className="c-go" aria-hidden="true" />
                    </Item>))}</Stagger>
                </div>
                {shownRows.length > limit && <Button variant="secondary" className="w-full mt-3" onClick={() => setLimit(limit + 15)}>Ver más ({shownRows.length - limit})</Button>}</>)}
          </section>
        </div>
        {editing && <BookingEditor bookingId={editing} onClose={() => setEditing('')} />}
        {msg && <MessageSheet bookingId={msg} initial="pago" kinds={['pago', 'recordatorio']} onClose={() => setMsg('')} />}
      </>}
    </OwnerPage>
  )
}

/* ---------- Más: perfil, accesos y preferencias ---------- */
const GROUPS = [
  ['Gestión', [
    ['/dueno/clientes', Users, 'Clientes', 'Frecuentes, historial y notas'],
    ['/dueno/finanzas', Wallet, 'Finanzas', 'Ingresos, cobros pendientes y ticket promedio'],
    ['/dueno/promociones', Tags, 'Promociones', 'Descuentos por horario o fecha'],
  ]],
  ['Análisis', [
    ['/dueno/estadisticas', BarChart3, 'Estadísticas', 'Ocupación, horarios fuertes y oportunidades'],
    ['/dueno/resenas', Star, 'Reseñas', 'Ver y responder'],
  ]],
  ['Configuración', [
    ['/dueno/complejo', Store, 'Mi complejo', 'Datos, horarios, fotos, seña y cancelación'],
    ['/dueno/complejo/vista-previa', Eye, 'Vista previa pública', 'Cómo lo ven los jugadores'],
    ['/dueno/cuenta', UserRound, 'Cuenta y avisos', 'Tus datos, avisos del celular, letra grande'],
  ]],
]

/* Preferencia con ícono, texto y interruptor. Tocar el texto también la cambia. */
function Pref({ icon: I, label, hint, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 min-h-16 py-2">
      <span className={cn('ow-ico transition-colors', checked && 'grad')}><I size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onChange(!checked)}><div className="font-medium">{label}</div>{hint && <div className="text-sm text-muted">{hint}</div>}</div>
      <button type="button" role="switch" aria-checked={!!checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
    </div>
  )
}

export function More({ theme, onSignOut }) {
  const { state, user } = useStore()
  const { mine, complex, setComplexId } = useOwner()
  const [creating, setCreating] = useState(false)
  const [big, setBig] = useBigText()
  const mineIds = mine.map(c => c.id)
  const month = monthStart(todayISO())
  const stats = [
    ['Complejos', mine.length],
    ['Canchas', state.courts.filter(c => mineIds.includes(c.complexId) && c.status !== 'inactive').length],
    ['Reservas del mes', state.bookings.filter(b => mineIds.includes(b.complexId) && !b._busy && b.date >= month && effStatus(b) !== 'cancelled').length],
  ]
  const row = 'flex items-center gap-3 min-h-12 -mx-2 px-2 rounded-xl font-medium hover:bg-sunken transition-colors'
  return (
    <>
      <PageHeader title="Más" sub={user.name} />
      <Content className="max-w-[1536px] ow-wide">
        <Stagger className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-x-6">
          {/* ---------- Izquierda: quién sos y a dónde ir ---------- */}
          <div className="flex flex-col gap-6 min-w-0">
            <Item className="hero ow-hero p-5 lg:p-6">
              <div className="flex items-center gap-4">
                <span className="size-[72px] rounded-3xl grid place-items-center bg-white/20 border border-white/30 backdrop-blur display text-3xl font-bold flex-none" aria-hidden="true">{initials(user.name)}</span>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center h-7 px-3 rounded-full bg-white/18 border border-white/30 text-xs font-semibold uppercase tracking-wider">Dueño de complejo</span>
                  <p className="display text-3xl lg:text-4xl font-bold leading-tight truncate mt-1.5">{user.name}</p>
                  <p className="text-sm opacity-90 truncate">{user.email}</p>
                </div>
              </div>
              <div className="ow-hero-glass mt-5 grid grid-cols-3 text-center py-3">
                {stats.map(([k, v], i) => (
                  <div key={k} className={cn('px-2 min-w-0', i > 0 && 'border-l border-white/25')}><div className="display text-3xl font-bold tnum leading-none"><CountUp value={v} /></div><div className="text-xs opacity-90 mt-1 leading-tight">{k}</div></div>))}
              </div>
            </Item>

            {GROUPS.map(([title, items]) => (
              <Item as="section" key={title} aria-label={title}>
                <h2 className="ow-eyebrow mb-3">{title}</h2>
                <div className="ow-menu">
                  {items.map(([to, I, t, note]) => (
                    <Link key={to} to={to} className="ow-link"><span className="ow-ico"><I size={20} aria-hidden="true" /></span><span className="flex-1 min-w-0"><span className="block font-semibold">{t}</span><span className="block text-sm text-muted">{note}</span></span><ChevronRight size={18} className="text-faint flex-none" aria-hidden="true" /></Link>))}
                </div>
              </Item>))}
          </div>

          {/* ---------- Derecha: preferencias, complejos, ayuda y sesión ---------- */}
          <div className="flex flex-col gap-6 min-w-0 lg:grid lg:grid-cols-2 lg:items-start xl:flex xl:flex-col xl:items-stretch">
            <Item as="section" className="ow-card p-5 lg:p-6" aria-labelledby="ow-prefs">
              <div className="flex items-center gap-3 mb-2"><span className="ow-ico"><SlidersHorizontal size={20} aria-hidden="true" /></span>
                <div className="min-w-0"><h2 id="ow-prefs" className="display text-xl font-bold leading-tight">Preferencias</h2><p className="text-sm text-muted">Hacé la app a tu medida.</p></div></div>
              <div className="divide-y divide-line">
                <Pref icon={theme.dark ? Moon : Sun} label="Modo oscuro" hint={theme.dark ? 'Activado' : 'Cuida la vista de noche'} checked={theme.dark} onChange={() => theme.toggle()} />
                <Pref icon={Type} label="Letra grande" hint="Textos y botones más grandes" checked={big} onChange={setBig} />
                <Link to="/dueno/cuenta" className="flex items-center gap-3 min-h-16 py-2 hover:bg-sunken -mx-2 px-2 rounded-xl transition-colors"><span className="ow-ico"><BellRing size={20} aria-hidden="true" /></span><span className="flex-1 min-w-0"><span className="block font-medium">Avisos del celular</span><span className="block text-sm text-muted">Reservas, pagos y reseñas nuevas</span></span><ChevronRight size={18} className="text-faint flex-none" aria-hidden="true" /></Link>
              </div>
            </Item>

            <Item as="section" className="ow-card p-5 lg:p-6" aria-labelledby="ow-mine">
              <div className="flex items-center gap-3 mb-3"><span className="ow-ico"><Store size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><h2 id="ow-mine" className="display text-xl font-bold leading-tight">Mis complejos</h2><p className="text-sm text-muted">{mine.length ? 'Tocá uno para trabajar con él.' : 'Todavía no tenés ninguno.'}</p></div></div>
              {mine.length > 0 && <ul className="-mx-2" role="radiogroup" aria-label="Complejo activo">{mine.map(c => { const on = complex?.id === c.id; return (
                <li key={c.id}><button type="button" role="radio" aria-checked={on} onClick={() => setComplexId(c.id)} className={cn('flex items-center gap-3 px-2 py-2 w-full text-left rounded-xl min-h-14 transition-colors', on ? 'bg-brand-soft' : 'hover:bg-sunken')}>
                  <span className={cn('size-5 rounded-full border-2 grid place-items-center flex-none', on ? 'border-brand' : 'border-strong')}>{on && <span className="size-2.5 rounded-full bg-brand" />}</span>
                  <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.name}</span><span className="block text-sm text-muted truncate">{c.city || 'Sin ciudad'}</span></span>
                  {c.approval === 'pending' ? <span className="ow-pill warn">En revisión</span> : !c.active ? <span className="ow-pill danger">Desactivado</span> : on ? <span className="ow-pill">Activo</span> : null}
                </button></li>) })}</ul>}
              <Button variant="secondary" className="w-full mt-3" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" />Nuevo complejo</Button>
            </Item>

            <Item as="section" className="ow-card p-5 lg:p-6" aria-labelledby="ow-help">
              <div className="flex items-center gap-3 mb-3"><span className="ow-ico"><LifeBuoy size={20} aria-hidden="true" /></span>
                <div className="min-w-0"><h2 id="ow-help" className="display text-xl font-bold leading-tight">Ayuda y legales</h2><p className="text-sm text-muted">Estamos para darte una mano.</p></div></div>
              <div className="space-y-1">
                <a href={waLink(SUPPORT_WA, `Hola, necesito ayuda con La Fija. Soy ${user.name}.`)} target="_blank" rel="noreferrer" className={row}><LifeBuoy size={18} className="text-brand" aria-hidden="true" /><span className="flex-1">Escribir a soporte</span><ChevronRight size={18} className="text-faint" aria-hidden="true" /></a>
                <Link to="/terminos" className={row}><FileText size={18} className="text-brand" aria-hidden="true" /><span className="flex-1">Términos y condiciones</span><ChevronRight size={18} className="text-faint" aria-hidden="true" /></Link>
                <Link to="/privacidad" className={row}><ShieldCheck size={18} className="text-brand" aria-hidden="true" /><span className="flex-1">Política de privacidad</span><ChevronRight size={18} className="text-faint" aria-hidden="true" /></Link>
              </div>
            </Item>

            <Item as="section" className="ow-card p-5 lg:p-6 flex flex-wrap items-center gap-4 lg:col-span-2 xl:col-span-1" aria-label="Sesión">
              <span className="ow-ico danger"><LogOut size={20} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 basis-40"><h2 className="display text-xl font-bold leading-tight">Sesión</h2><p className="text-sm text-muted">Salí de tu cuenta en este dispositivo.</p></div>
              <Button variant="secondary" onClick={onSignOut}><LogOut size={18} aria-hidden="true" />Cerrar sesión</Button>
            </Item>
          </div>
        </Stagger>
      </Content>
      <NewComplexSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
