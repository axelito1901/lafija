import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '../../lib/store'
import { ownerStats } from '../../lib/domain'
import { cn, money } from '../../lib/format'
import { navigate } from '../../lib/router'
import { Button, Segmented, Stat } from '../../ui/kit'
import { OwnerPage, useOwner } from './common'

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_LONG = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
const endOf = t => `${String((Number(t.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${t.slice(3)}`
const Bar = ({ label, pct, strong }) => (
  <div className="flex items-center gap-3 min-h-8">
    <span className={cn('w-14 flex-none text-sm tnum', strong ? 'font-semibold' : 'text-muted')}>{label}</span>
    <span className="flex-1 h-3 rounded-full bg-sunken overflow-hidden"><span className={cn('block h-full rounded-full', pct >= 70 ? 'bg-brand' : pct >= 35 ? 'bg-[color-mix(in_srgb,var(--brand)_55%,var(--sunken))]' : 'bg-strong')} style={{ width: `${Math.max(pct, 2)}%` }} /></span>
    <span className="w-10 text-right text-sm tnum flex-none">{pct}%</span>
  </div>
)

/* Estadísticas simples: qué se llena, qué queda vacío y cuánto se pierde por faltas. */
export default function Stats() {
  const { state } = useStore()
  const { complex } = useOwner()
  const [days, setDays] = useState(30)
  const st = useMemo(() => complex && ownerStats(state, complex, days), [state, complex, days])
  return (
    <OwnerPage title="Estadísticas">
      {st && <div className="max-w-[720px]">
        <Segmented value={days} onChange={setDays} label="Período" options={[{ value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 90, label: '90 días' }]} />

        {st.since && <p className="text-sm text-muted mt-3">Hay datos desde el {st.since.split('-').reverse().join('/')}: se cuentan {st.counted} días.</p>}
        <div className="border border-line rounded-lg bg-surface p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          <Stat label="Ocupación" value={`${st.occupancy}%`} />
          <Stat label="Ingresos" value={money(st.income)} />
          <Stat label="Reservas" value={st.bookingsN} />
          <Stat label="Ticket promedio" value={money(st.ticket)} />
          <Stat label="No vinieron" value={st.noShows} />
          <Stat label="Cancelaciones" value={st.cancels} />
        </div>
        {st.lost > 0 && <p className="mt-3 text-sm"><strong className="text-danger tnum">{money(st.lost)}</strong> <span className="text-muted">sin cobrar por gente que no vino. Pedir seña ayuda a bajar las faltas.</span></p>}

        <section className="mt-8" aria-labelledby="ins">
          <h2 id="ins" className="text-lg mb-3">Oportunidades</h2>
          {!st.enough ? <div className="rounded-lg border border-line bg-surface p-4 text-muted">Todavía no tenemos suficientes datos para generar recomendaciones. Volvé cuando tengas al menos dos semanas de reservas.</div> : (
            <div className="space-y-3">
              {st.weak.map(w => (
                <div key={`w${w.wd}${w.from}`} className="rounded-lg border border-line bg-surface p-4 flex gap-3">
                  <TrendingDown size={22} className="text-warn flex-none mt-0.5" aria-hidden="true" />
                  <div className="min-w-0"><p>Los <strong>{DAYS_LONG[w.wd]}</strong> entre las <strong className="tnum">{w.from}</strong> y las <strong className="tnum">{endOf(w.to)}</strong> tienen baja ocupación (<span className="tnum">{w.pct}%</span>). Podrías crear una promoción para esos horarios.</p>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate(`/dueno/promociones?nueva=1&desde=${w.from}&hasta=${endOf(w.to)}`)}>Crear promoción</Button></div>
                </div>))}
              {st.strong.map(w => (
                <div key={`s${w.wd}${w.from}`} className="rounded-lg border border-line bg-surface p-4 flex gap-3">
                  <TrendingUp size={22} className="text-brand flex-none mt-0.5" aria-hidden="true" />
                  <p className="min-w-0">Los <strong>{DAYS_LONG[w.wd]}</strong> de <strong className="tnum">{w.from}</strong> a <strong className="tnum">{endOf(w.to)}</strong> se llenan (<span className="tnum">{w.pct}%</span>). Hay demanda para subir el precio en esa franja.</p>
                </div>))}
              {!st.weak.length && !st.strong.length && <p className="text-muted">La ocupación está pareja: no hay franjas muy vacías ni muy llenas.</p>}
            </div>)}
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div><h2 className="text-lg mb-2">Horarios más fuertes</h2><ul className="space-y-1 tnum">{st.top.map(h => <li key={h.t} className="flex justify-between"><span>{h.t}</span><strong>{h.pct}%</strong></li>)}</ul></div>
          <div><h2 className="text-lg mb-2">Horarios con oportunidad</h2><ul className="space-y-1 tnum">{st.bottom.map(h => <li key={h.t} className="flex justify-between"><span>{h.t}</span><strong>{h.pct}%</strong></li>)}</ul></div>
          <div><h2 className="text-lg mb-2">Días más fuertes</h2><p className="text-muted">{st.strongDays.map(d => `${DAY[d.d]} ${d.pct}%`).join(' · ')}</p></div>
          <div><h2 className="text-lg mb-2">Días más flojos</h2><p className="text-muted">{st.weakDays.map(d => `${DAY[d.d]} ${d.pct}%`).join(' · ')}</p></div>
        </section>

        <section className="mt-8"><h2 className="text-lg mb-3">Por horario</h2>
          <div className="space-y-1">{st.hours.map(h => <Bar key={h.t} label={h.t} pct={h.pct} strong={st.top.some(x => x.t === h.t)} />)}</div></section>
        <section className="mt-8"><h2 className="text-lg mb-3">Por día</h2>
          <div className="space-y-1">{st.days.map(d => <Bar key={d.d} label={DAY[d.d]} pct={d.pct} />)}</div></section>
        {st.courts.length > 1 && <section className="mt-8"><h2 className="text-lg mb-3">Canchas más usadas</h2>
          <div className="space-y-1">{st.courts.map(c => <Bar key={c.court.id} label={c.court.name.replace('Cancha ', 'C. ')} pct={c.pct} />)}</div></section>}
        <p className="hint mt-6">Ocupación = turnos reservados sobre turnos disponibles, en los últimos {st.counted} días (sin contar hoy){st.since ? `, desde la primera reserva (${st.since.split('-').reverse().join('/')})` : ''}.</p>
      </div>}
    </OwnerPage>
  )
}
