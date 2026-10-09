import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { effStatus, isApproved } from '../../lib/domain'
import { cn, money, monthStart, todayISO } from '../../lib/format'
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
        <div className="border border-line rounded-lg bg-surface p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="A cobrar este mes" value={money(total)} />
          <Stat label="Reservas por la app" value={money(volume)} />
          <Stat label="Complejos activos" value={rows.length} />
        </div>

        <h2 className="text-lg mt-8 mb-2">Cómo cobra La Fija</h2>
        <Segmented value={f.model} onChange={v => setF({ ...f, model: v })} label="Modelo" options={[{ value: 'free', label: 'Gratis' }, { value: 'commission', label: 'Comisión' }, { value: 'monthly', label: 'Abono mensual' }]} />
        <p className="hint">{f.model === 'free' ? 'Los complejos usan La Fija sin pagar. Útil para conseguir los primeros.' : f.model === 'commission' ? 'Un porcentaje de cada reserva hecha por la app. Las que carga el dueño a mano no pagan.' : 'Un monto fijo por complejo por mes, sin importar cuántas reservas tenga.'}</p>
        {f.model === 'commission' && <Field label="Porcentaje por reserva" className="mt-3 max-w-xs"><Input type="number" inputMode="numeric" min={0} max={30} value={f.commissionPercent} onChange={e => setF({ ...f, commissionPercent: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} /></Field>}
        {f.model === 'monthly' && <Field label="Abono por complejo" className="mt-3 max-w-xs"><MoneyInput value={f.monthlyFeeCents} onChange={v => setF({ ...f, monthlyFeeCents: v })} /></Field>}
        <Button className="mt-4" disabled={!dirty} onClick={save}>Guardar modelo</Button>

        <h2 className="text-lg mt-10 mb-2">Por complejo</h2>
        <div className="list">{rows.map(r => (
          <div key={r.c.id} className="row">
            <div className="flex-1 min-w-0"><div className="font-semibold truncate">{r.c.name}</div><div className="text-sm text-muted">{r.count} reservas por la app · {money(r.volume)}</div></div>
            <div className={cn('font-semibold tnum flex-none', !r.fee && 'text-muted')}>{money(r.fee)}</div>
          </div>))}</div>
        <p className="hint mt-3">El cobro a los complejos todavía se hace por fuera de la app (transferencia o factura). Esta pantalla te dice cuánto corresponde.</p>
      </Content>
    </>
  )
}
