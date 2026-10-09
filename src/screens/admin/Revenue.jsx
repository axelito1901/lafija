import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { effStatus, isApproved } from '../../lib/domain'
import { cn, money, monthStart, todayISO } from '../../lib/format'
import { Item, Stagger, CountUp } from '../../ui/motion'
import { HBar, Kpi } from '../../ui/dash'
import { Building2, Landmark, Wallet } from 'lucide-react'
import { Button, Content, Field, Input, MoneyInput, PageHeader, Segmented, Stat, useToast } from '../../ui/kit'

export const DEFAULT_BUSINESS = { model: 'commission', commissionPercent: 5, monthlyFeeCents: 2500000 }
export const businessOf = state => ({ ...DEFAULT_BUSINESS, ...(state.settings?.business || {}) })

/* Cuánto le corresponde a La Fija por un complejo en un mes, según el modelo elegido. */
export function feeFor(state, complexId, from, to) {
  const b = businessOf(state)
  const app = state.bookings.filter(x => !x._busy && x.complexId === complexId && x.source === 'app' && x.date >= from && x.date <= to && !['cancelled'].includes(effStatus(x)))
  const volume = app.reduce((s, x) => s + (x.totalCents || 0), 0)
  const fee = b.model === 'commission' ? Math.round(volume * b.commissionPercent / 100) : b.model === 'monthly' ? b.monthlyFeeCents : 0
  return { count: app.length, volume, fee }
}

export default function Revenue() {
  const { state, update } = useStore()
  const toast = useToast()
  const [f, setF] = useState(() => businessOf(state))
  const from = monthStart(todayISO()), to = todayISO()
  const rows = useMemo(() => state.complexes.filter(c => isApproved(c) && c.active).map(c => ({ c, ...feeFor(state, c.id, from, to) })), [state]) // eslint-disable-line
  const total = rows.reduce((s, r) => s + r.fee, 0), volume = rows.reduce((s, r) => s + r.volume, 0)
  const dirty = JSON.stringify(f) !== JSON.stringify(businessOf(state))
  const save = () => { update(s => { s.settings = { ...(s.settings || {}), business: f } }); toast('Modelo guardado.') }
  return (
    <>
      <PageHeader back="/admin" title="Ingresos de La Fija" sub="Este mes" />
      <Content className="max-w-[760px] lg:mx-0">
        <div className="hero p-5">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />A cobrar este mes</p>
          <div className="display text-5xl font-bold tnum mt-2 leading-none"><CountUp value={money(total)} /></div>
          <p className="mt-3 text-sm opacity-90">{rows.length} {rows.length === 1 ? 'complejo activo' : 'complejos activos'} · {money(volume)} reservado por la app</p>
        </div>
        <Stagger className="grid grid-cols-2 gap-3 mt-3">
          <Item><Kpi icon={Wallet} label="Reservas por la app" value={money(volume)} /></Item>
          <Item><Kpi icon={Building2} label="Complejos activos" value={rows.length} /></Item>
        </Stagger>

        <h2 className="text-lg mt-8 mb-2">Cómo cobra La Fija</h2>
        <Segmented value={f.model} onChange={v => setF({ ...f, model: v })} label="Modelo" options={[{ value: 'free', label: 'Gratis' }, { value: 'commission', label: 'Comisión' }, { value: 'monthly', label: 'Abono mensual' }]} />
        <p className="hint">{f.model === 'free' ? 'Los complejos usan La Fija sin pagar. Útil para conseguir los primeros.' : f.model === 'commission' ? 'Un porcentaje de cada reserva hecha por la app. Las que carga el dueño a mano no pagan.' : 'Un monto fijo por complejo por mes, sin importar cuántas reservas tenga.'}</p>
        {f.model === 'commission' && <Field label="Porcentaje por reserva" className="mt-3 max-w-xs"><Input type="number" inputMode="numeric" min={0} max={30} value={f.commissionPercent} onChange={e => setF({ ...f, commissionPercent: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} /></Field>}
        {f.model === 'monthly' && <Field label="Abono por complejo" className="mt-3 max-w-xs"><MoneyInput value={f.monthlyFeeCents} onChange={v => setF({ ...f, monthlyFeeCents: v })} /></Field>}
        <Button className="mt-4" disabled={!dirty} onClick={save}>Guardar modelo</Button>

        <h2 className="text-lg mt-10 mb-2">Por complejo</h2>
        <div className="border border-line rounded-2xl bg-surface p-4 shadow-[var(--sh-1)] space-y-3">{rows.map((r, i) => (
          <div key={r.c.id}>
            <div className="flex items-baseline justify-between gap-3"><span className="font-semibold truncate">{r.c.name}</span><span className={cn('font-semibold tnum flex-none', !r.fee && 'text-muted')}>{money(r.fee)}</span></div>
            <div className="text-sm text-muted mb-1">{r.count} reservas por la app · {money(r.volume)}</div>
            <HBar label="" pct={total ? Math.round(r.fee / total * 100) : 0} i={i} />
          </div>))}</div>
        <p className="hint mt-3">El cobro a los complejos todavía se hace por fuera de la app (transferencia o factura). Esta pantalla te dice cuánto corresponde.</p>
      </Content>
    </>
  )
}
