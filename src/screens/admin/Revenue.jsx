import { useMemo, useState } from 'react'
import { Building2, CalendarClock, Check, Gift, Landmark, Percent, Receipt, Wallet } from 'lucide-react'
import { useStore } from '../../lib/store'
import { effStatus, isApproved } from '../../lib/domain'
import { addDays, cn, dateShort, fromISO, money, monthStart, plural, toISO, todayISO } from '../../lib/format'
import { CountUp, Item, Stagger } from '../../ui/motion'
import { AreaChart, Columns, Delta, Kpi, Spark, useStickyTop } from '../../ui/dash'
import { Cover } from '../../ui/Cover'
import { Button, Content, Empty, Field, Input, MoneyInput, PageHeader, useToast } from '../../ui/kit'
import { Bar, PanelTitle, Pill } from './parts'

export const DEFAULT_BUSINESS = { model: 'commission', commissionPercent: 5, monthlyFeeCents: 2500000 }
export const businessOf = state => ({ ...DEFAULT_BUSINESS, ...(state.settings?.business || {}) })

/* Cuánto le corresponde a La Fija por un complejo entre dos fechas, según el modelo elegido (o uno de prueba). */
export function feeFor(state, complexId, from, to, bz = businessOf(state)) {
  const app = state.bookings.filter(x => !x._busy && x.complexId === complexId && x.source === 'app' && x.date >= from && x.date <= to && !['cancelled'].includes(effStatus(x)))
  const volume = app.reduce((s, x) => s + (x.totalCents || 0), 0)
  const fee = bz.model === 'commission' ? Math.round(volume * bz.commissionPercent / 100) : bz.model === 'monthly' ? bz.monthlyFeeCents : 0
  return { count: app.length, volume, fee }
}

/* Lo que corresponde cobrar a todos los complejos activos entre dos fechas. */
export function revenueOf(state, from, to, bz = businessOf(state)) {
  const rows = state.complexes.filter(c => isApproved(c) && c.active).map(c => ({ c, ...feeFor(state, c.id, from, to, bz) }))
  return { rows, total: rows.reduce((s, r) => s + r.fee, 0), volume: rows.reduce((s, r) => s + r.volume, 0), count: rows.reduce((s, r) => s + r.count, 0) }
}

const firstOf = (iso, n = 0) => { const d = fromISO(monthStart(iso)); d.setMonth(d.getMonth() + n); return toISO(d) }
const lastOf = iso => { const d = fromISO(monthStart(iso)); d.setMonth(d.getMonth() + 1, 0); return toISO(d) }
const monthName = iso => new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(fromISO(iso))
const monthShortName = iso => new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(fromISO(iso)).replace('.', '')
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null)

const MODELS = [
  { v: 'free', t: 'Gratis', icon: Gift, d: () => 'Sin costo para los complejos' },
  { v: 'commission', t: 'Comisión', icon: Percent, d: f => `${f.commissionPercent}% de cada reserva` },
  { v: 'monthly', t: 'Abono mensual', icon: CalendarClock, d: f => `${money(f.monthlyFeeCents)} por complejo` },
]
const HINT = {
  free: 'Los complejos usan La Fija sin pagar. Útil para conseguir los primeros.',
  commission: 'Un porcentaje de cada reserva hecha por la app. Las que carga el dueño a mano no pagan.',
  monthly: 'Un monto fijo por complejo por mes, sin importar cuántas reservas tenga.',
}

export default function Revenue() {
  const { state, update } = useStore()
  const toast = useToast()
  const saved = businessOf(state)
  const [f, setF] = useState(saved)
  const [sel, setSel] = useState(null)
  const sideRef = useStickyTop(24)
  const today = todayISO(), from = monthStart(today)
  const dom = Number(today.slice(8)), dim = Number(lastOf(today).slice(8))
  const prevFrom = firstOf(today, -1), prevLen = Number(lastOf(prevFrom).slice(8)), prevTo = addDays(prevFrom, Math.min(dom, prevLen) - 1)
  const dirty = JSON.stringify(f) !== JSON.stringify(saved)

  /* eslint-disable react-hooks/exhaustive-deps */
  const cur = useMemo(() => revenueOf(state, from, today, saved), [state])
  const prev = useMemo(() => revenueOf(state, prevFrom, prevTo, saved), [state])
  const sim = useMemo(() => Object.fromEntries(MODELS.map(m => [m.v, revenueOf(state, from, today, { ...f, model: m.v }).total])), [state, f])
  const months = useMemo(() => {
    const all = [-11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0].map(n => { const m = firstOf(today, n), r = revenueOf(state, m, n === 0 ? today : lastOf(m), saved); return { key: m, total: r.total, volume: r.volume, now: n === 0 } })
    return all
  }, [state])
  const daily = useMemo(() => {
    const ids = new Set(cur.rows.map(r => r.c.id)), m = {}
    for (const b of state.bookings) if (!b._busy && b.source === 'app' && ids.has(b.complexId) && effStatus(b) !== 'cancelled') m[b.date] = (m[b.date] || 0) + (b.totalCents || 0)
    return m
  }, [state, cur])
  /* eslint-enable react-hooks/exhaustive-deps */
  const points = useMemo(() => {
    let a = 0, g = 0
    return Array.from({ length: dom }, (_, i) => { const d = addDays(from, i); a += daily[d] || 0; g += i < prevLen ? daily[addDays(prevFrom, i)] || 0 : 0; return { v: a, g, label: String(i + 1), tip: dateShort(d) } })
  }, [daily, dom]) // eslint-disable-line
  const last14 = Array.from({ length: 14 }, (_, i) => daily[addDays(today, i - 13)] || 0)

  const rows = [...cur.rows].sort((a, b) => b.fee - a.fee || b.volume - a.volume)
  const prevBy = Object.fromEntries(prev.rows.map(r => [r.c.id, r]))
  const total = cur.total, volume = cur.volume
  const proj = saved.model === 'commission' ? Math.round(total / Math.max(dom, 1) * dim) : total
  const dTotal = pct(total, prev.total), dVol = pct(volume, prev.volume), dCount = pct(cur.count, prev.count)
  const shown = months.find(x => x.key === sel) || months[months.length - 1]
  const save = () => { update(s => { s.settings = { ...(s.settings || {}), business: f } }); toast('Modelo guardado.') }

  return (
    <>
      <PageHeader back="/admin" title="Ingresos de La Fija" sub={cap(monthName(today))} />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item className="hero p-5 lg:p-7">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />A cobrar este mes</p>
                <div className="display text-5xl lg:text-6xl xl:text-7xl font-bold tnum mt-2 leading-none"><CountUp value={money(total)} /></div>
                <p className="mt-3 text-sm opacity-90">{plural(rows.length, 'complejo activo', 'complejos activos')} · {money(volume)} reservado por la app</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 xl:w-[480px]">
                <div className="rounded-xl bg-white/15 px-3 py-2.5 min-w-0"><dt className="text-[11px] uppercase tracking-wider opacity-80 truncate">Proyección</dt><dd className="display text-xl lg:text-2xl font-bold tnum truncate">{money(proj)}</dd><p className="text-[11px] opacity-80 truncate">a fin de mes</p></div>
                <div className="rounded-xl bg-white/15 px-3 py-2.5 min-w-0"><dt className="text-[11px] uppercase tracking-wider opacity-80 truncate">Mes anterior</dt><dd className="mt-1.5 min-h-7 flex items-center">{dTotal == null ? <span className="text-sm opacity-90">Sin datos</span> : <Delta value={dTotal} onGrad />}</dd><p className="text-[11px] opacity-80 truncate">mismo período</p></div>
                <div className="rounded-xl bg-white/15 px-3 py-2.5 min-w-0"><dt className="text-[11px] uppercase tracking-wider opacity-80 truncate">Modelo</dt><dd className="display text-xl lg:text-2xl font-bold truncate">{MODELS.find(m => m.v === saved.model)?.t}</dd><p className="text-[11px] opacity-80 truncate">{saved.model === 'free' ? 'sin cobro' : saved.model === 'commission' ? `${saved.commissionPercent}% por reserva` : 'por complejo'}</p></div>
              </dl>
            </div>
          </Item>

          <Item className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <Kpi icon={Wallet} label="Reservado por la app" value={money(volume)} delta={dVol != null ? <Delta value={dVol} /> : null} spark={<Spark data={last14} />} />
            <Kpi icon={Receipt} label="Reservas por la app" value={cur.count} delta={dCount != null ? <Delta value={dCount} /> : null} />
            <Kpi icon={Landmark} label="Ticket promedio" value={money(cur.count ? Math.round(volume / cur.count) : 0)} tone="info" />
            <Kpi icon={Building2} label="Complejos activos" value={rows.length} />
          </Item>

          <div className="ad-rev mt-5">
            <div className="ad-rev-main grid gap-5 grid-cols-[minmax(0,1fr)] 2xl:grid-cols-2 items-start">
              <Item className="ad-card p-4 sm:p-5 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h2 className="text-lg leading-tight">Ingresos por mes</h2><p className="text-sm text-muted">{cap(monthName(shown.key))}{shown.now ? ' · en curso' : ''}</p></div>
                  <div className="display text-3xl font-bold tnum leading-none flex-none"><CountUp value={money(shown.total)} /></div>
                </div>
                <div className="mt-5">
                  <Columns items={months.map(x => ({ key: x.key, v: x.total, hot: x.now, aria: `${cap(monthName(x.key))}: ${money(x.total)}` }))} selected={sel} onSelect={setSel} labelFor={x => cap(monthShortName(x.key)).slice(0, 3)} height={168} />
                </div>
                {saved.model === 'free' && <p className="hint">Con el modelo gratis no hay nada para cobrar. Elegí otro para ver los ingresos.</p>}
              </Item>
              <Item className="ad-card p-4 sm:p-5 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h2 className="text-lg leading-tight">Cómo viene el mes</h2><p className="text-sm text-muted">Reservado por la app, acumulado</p></div>
                  {dVol != null && <Delta value={dVol} />}
                </div>
                {dom >= 2 ? <AreaChart className="mt-1" points={points} height={168} format={v => money(v)} label="Reservado por la app, acumulado del mes" ghostLabel={cap(monthName(prevFrom))} />
                  : <Empty title="El mes recién empieza" text="Cuando haya más días vas a ver la comparación con el mes anterior." />}
              </Item>
            </div>

            <div ref={sideRef} className="ad-rev-side">
              <Item className="ad-card p-4 sm:p-5">
                <PanelTitle icon={Landmark} title="Cómo cobra La Fija" sub="Elegí un modelo y mirá cuánto sería" />
                <div className="mt-4 grid gap-2.5" role="group" aria-label="Modelo de cobro">
                  {MODELS.map(m => (
                    <button key={m.v} type="button" className="ad-model" aria-pressed={f.model === m.v} onClick={() => setF({ ...f, model: m.v })}>
                      <span className={cn('size-10 rounded-xl grid place-items-center flex-none', f.model === m.v ? 'bg-[image:var(--grad-brand)] text-[var(--on-grad)]' : 'bg-sunken text-muted')}>{f.model === m.v ? <Check size={20} aria-hidden="true" /> : <m.icon size={20} aria-hidden="true" />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 font-semibold">{m.t}{saved.model === m.v && <Pill tone="ok">Actual</Pill>}</span>
                        <span className="block text-sm text-muted">{m.d(f)}</span>
                      </span>
                      <span className="text-right flex-none"><span className="block text-[11px] uppercase tracking-wider text-muted">Este mes</span><span className="block font-semibold tnum">{money(sim[m.v])}</span></span>
                    </button>))}
                </div>
                <p className="hint">{HINT[f.model]}</p>
                {f.model === 'commission' && <Field label="Porcentaje por reserva" className="mt-3"><Input type="number" inputMode="numeric" min={0} max={30} value={f.commissionPercent} onChange={e => setF({ ...f, commissionPercent: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} /></Field>}
                {f.model === 'monthly' && <Field label="Abono por complejo" className="mt-3"><MoneyInput value={f.monthlyFeeCents} onChange={v => setF({ ...f, monthlyFeeCents: v })} /></Field>}
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" disabled={!dirty} onClick={save}>Guardar modelo</Button>
                  {dirty && <Button variant="secondary" onClick={() => setF(saved)}>Descartar</Button>}
                </div>
                <p className="hint mt-4">El cobro a los complejos todavía se hace por fuera de la app (transferencia o factura). Esta pantalla te dice cuánto corresponde.</p>
              </Item>
            </div>

            <div className="ad-rev-main">
              <Item className="ad-card overflow-hidden">
                <div className="p-4 sm:p-5 pb-3"><PanelTitle icon={Building2} title="Por complejo" sub={`${cap(monthName(today))} · ordenado por lo que corresponde cobrar`} /></div>
                {rows.length === 0 ? <Empty icon={Building2} title="Todavía no hay complejos activos" text="Cuando publiques el primero, vas a ver acá cuánto corresponde cobrarle." /> : (
                  <ul className="divide-y divide-line border-t border-line">{rows.map((r, i) => {
                    const share = total ? Math.round(r.fee / total * 100) : 0, d = pct(r.fee, prevBy[r.c.id]?.fee || 0)
                    return (
                      <li key={r.c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-4 sm:px-5 py-3.5 transition-colors hover:bg-sunken">
                        <Cover src={r.c.coverUrl} seed={r.c.id} className="size-12 rounded-xl flex-none" />
                        <div className="min-w-0"><p className="font-semibold truncate"><span className="text-faint tnum mr-1.5">{i + 1}</span>{r.c.name}</p><p className="text-sm text-muted truncate tnum">{plural(r.count, 'reserva', 'reservas')} por la app · {money(r.volume)}</p></div>
                        <div className="text-right flex flex-col items-end gap-1"><span className={cn('display text-xl font-bold tnum leading-none', !r.fee && 'text-muted')}>{money(r.fee)}</span>{d != null && saved.model === 'commission' && <Delta value={d} />}</div>
                        <div className="col-span-3 flex items-center gap-3"><Bar pct={share} i={i} className="flex-1" /><span className="w-10 text-right text-sm tnum text-muted flex-none">{share}%</span></div>
                      </li>)
                  })}</ul>)}
              </Item>
            </div>
          </div>
        </Stagger>
      </Content>
    </>
  )
}
