import { useMemo, useState } from 'react'
import { CountUp } from '../../ui/motion'
import { Ban, CalendarCheck, CircleDollarSign, Percent, Receipt, TrendingDown, TrendingUp, UserX } from 'lucide-react'
import { Item, Stagger } from '../../ui/motion'
import { Columns, HBar, Kpi } from '../../ui/dash'
import { useStore } from '../../lib/store'
import { ownerStats } from '../../lib/domain'
import { cn, money } from '../../lib/format'
import { navigate } from '../../lib/router'
import { Button, Segmented } from '../../ui/kit'
import { OwnerPage, useOwner } from './common'

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_LONG = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
const endOf = t => `${String((Number(t.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${t.slice(3)}`
const Bar = ({ label, pct, strong }) => <HBar label={label} pct={pct} strong={strong} />

/* Estadísticas simples: qué se llena, qué queda vacío y cuánto se pierde por faltas. */
export default function Stats() {
  const { state } = useStore()
  const { complex } = useOwner()
  const [days, setDays] = useState(30)
  const [pickD, setPickD] = useState(null)
  const st = useMemo(() => complex && ownerStats(state, complex, days), [state, complex, days])
  return (
    <OwnerPage title="Estadísticas">
      {st && <div className="max-w-[720px]">
        <Segmented value={days} onChange={setDays} label="Período" options={[{ value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 90, label: '90 días' }]} />

        {st.since && <p className="text-sm text-muted mt-3">Hay datos desde el {st.since.split('-').reverse().join('/')}: se cuentan {st.counted} días.</p>}
        <Stagger key={days} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <Item className="col-span-2 sm:col-span-1 hero p-4"><p className="text-xs font-semibold uppercase tracking-wider opacity-90 inline-flex items-center gap-1.5"><Percent size={14} />Ocupación</p><p className="display text-5xl font-bold tnum leading-none mt-2"><CountUp value={`${st.occupancy}%`} /></p></Item>
          <Item><Kpi icon={CircleDollarSign} label="Ingresos" value={money(st.income)} /></Item>
          <Item><Kpi icon={CalendarCheck} label="Reservas" value={st.bookingsN} /></Item>
          <Item><Kpi icon={Receipt} label="Ticket promedio" value={money(st.ticket)} /></Item>
          <Item><Kpi icon={UserX} label="No vinieron" value={st.noShows} tone={st.noShows ? 'warn' : 'brand'} /></Item>
          <Item><Kpi icon={Ban} label="Cancelaciones" value={st.cancels} tone={st.cancels ? 'warn' : 'brand'} /></Item>
        </Stagger>
        {st.lost > 0 && <p className="mt-3 text-sm"><strong className="text-danger tnum">{money(st.lost)}</strong> <span className="text-muted">sin cobrar por gente que no vino. Pedir seña ayuda a bajar las faltas.</span></p>}

        <section className="mt-8" aria-labelledby="ins">
          <h2 id="ins" className="text-lg mb-3">Oportunidades</h2>
          {!st.enough ? <div className="rounded-lg border border-line bg-surface p-4 text-muted">Todavía no tenemos suficientes datos para generar recomendaciones. Volvé cuando tengas al menos dos semanas de reservas.</div> : (
            <div className="space-y-3">
              {st.weak.map(w => (
                <div key={`w${w.wd}${w.from}`} className="rounded-2xl border border-line bg-surface p-4 flex gap-3 shadow-[var(--sh-1)] card-lift">
                  <span className="size-10 rounded-xl grid place-items-center flex-none bg-warn-soft text-warn"><TrendingDown size={20} aria-hidden="true" /></span>
                  <div className="min-w-0"><p>Los <strong>{DAYS_LONG[w.wd]}</strong> entre las <strong className="tnum">{w.from}</strong> y las <strong className="tnum">{endOf(w.to)}</strong> tienen baja ocupación (<span className="tnum">{w.pct}%</span>). Podrías crear una promoción para esos horarios.</p>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate(`/dueno/promociones?nueva=1&desde=${w.from}&hasta=${endOf(w.to)}`)}>Crear promoción</Button></div>
                </div>))}
              {st.strong.map(w => (
                <div key={`s${w.wd}${w.from}`} className="rounded-2xl border border-line bg-surface p-4 flex gap-3 shadow-[var(--sh-1)] card-lift">
                  <span className="size-10 rounded-xl grid place-items-center flex-none bg-brand-soft text-brand"><TrendingUp size={20} aria-hidden="true" /></span>
                  <p className="min-w-0">Los <strong>{DAYS_LONG[w.wd]}</strong> de <strong className="tnum">{w.from}</strong> a <strong className="tnum">{endOf(w.to)}</strong> se llenan (<span className="tnum">{w.pct}%</span>). Hay demanda para subir el precio en esa franja.</p>
                </div>))}
              {!st.weak.length && !st.strong.length && <p className="text-muted">La ocupación está pareja: no hay franjas muy vacías ni muy llenas.</p>}
            </div>)}
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div><h2 className="text-lg mb-2">Horarios más fuertes</h2><ul className="flex flex-wrap gap-2 tnum">{st.top.map(h => <li key={h.t} className="rounded-full px-3 py-1.5 bg-brand-soft text-brand font-semibold">{h.t} · {h.pct}%</li>)}</ul></div>
          <div><h2 className="text-lg mb-2">Horarios con oportunidad</h2><ul className="flex flex-wrap gap-2 tnum">{st.bottom.map(h => <li key={h.t} className="rounded-full px-3 py-1.5 bg-warn-soft text-warn font-semibold">{h.t} · {h.pct}%</li>)}</ul></div>
          <div><h2 className="text-lg mb-2">Días más fuertes</h2><p className="text-muted">{st.strongDays.map(d => `${DAY[d.d]} ${d.pct}%`).join(' · ')}</p></div>
          <div><h2 className="text-lg mb-2">Días más flojos</h2><p className="text-muted">{st.weakDays.map(d => `${DAY[d.d]} ${d.pct}%`).join(' · ')}</p></div>
        </section>

        <section className="mt-8"><h2 className="text-lg mb-3">Por horario</h2>
          <div className="space-y-1">{st.hours.map(h => <Bar key={h.t} label={h.t} pct={h.pct} strong={st.top.some(x => x.t === h.t)} />)}</div></section>
        <section className="mt-8"><h2 className="text-lg mb-3">Por día</h2>
          <div className="border border-line rounded-2xl bg-surface p-4 shadow-[var(--sh-1)]"><Columns height={120} selected={pickD} onSelect={setPickD} items={st.days.map(d => ({ key: String(d.d), v: d.pct, aria: `${DAY[d.d]}: ${d.pct}%` }))} labelFor={x => DAY[Number(x.key)]} />
            <p className="text-sm text-muted mt-3 tnum min-h-5">{pickD != null ? <><strong className="text-ink">{DAY[Number(pickD)]}</strong>: {st.days.find(d => String(d.d) === pickD)?.pct}% de ocupación</> : 'Tocá una columna para ver el porcentaje'}</p></div></section>
        {st.courts.length > 1 && <section className="mt-8"><h2 className="text-lg mb-3">Canchas más usadas</h2>
          <div className="space-y-1">{st.courts.map(c => <Bar key={c.court.id} label={c.court.name.replace('Cancha ', 'C. ')} pct={c.pct} />)}</div></section>}
        <p className="hint mt-6">Ocupación = turnos reservados sobre turnos disponibles, en los últimos {st.counted} días (sin contar hoy){st.since ? `, desde la primera reserva (${st.since.split('-').reverse().join('/')})` : ''}.</p>
      </div>}
    </OwnerPage>
  )
}
