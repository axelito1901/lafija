import { useMemo, useState } from 'react'
import { ArrowRight, Ban, CalendarCheck, CalendarRange, CircleDollarSign, Flame, Hourglass, Percent, Receipt, Sparkles, TrendingDown, TrendingUp, Trophy, UserX, Wallet } from 'lucide-react'
import { CountUp, Item, Reveal, Stagger } from '../../ui/motion'
import { AreaChart, Columns, Delta, HBar, HeatGrid, Kpi, Ring, Spark } from '../../ui/dash'
import { useStore } from '../../lib/store'
import { activeCourts, effStatus, ownerStats, weekdayOf } from '../../lib/domain'
import { addDays, cn, dateShort, dayNum, money, monthShort, slotsFor, todayISO, weekdayShort } from '../../lib/format'
import { navigate } from '../../lib/router'
import { Button, Segmented } from '../../ui/kit'
import { OwnerPage, useOwner } from './common'

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_LONG = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const PERIODS = [{ value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 90, label: '90 días' }]
const endOf = t => `${String((Number(t.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${t.slice(3)}`
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
const dm = iso => `${dayNum(iso)} ${monthShort(iso)}`
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`
const rel = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null)
const promoLink = (from, to) => `/dueno/promociones?nueva=1&desde=${from}&hasta=${to}`
const compact = cents => {
  const p = (Number(cents) || 0) / 100
  if (p >= 1e6) return `$${(p / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',')} M`
  if (p >= 1e3) return `$${Math.round(p / 1e3)} mil`
  return `$${Math.round(p)}`
}

/* Todo lo que la pantalla necesita, calculado con las funciones del dominio. */
function build(state, complex, days) {
  const today = todayISO(), from = addDays(today, -days)
  const st = ownerStats(state, complex, days)
  // Período anterior: se corren las reservas "days" días hacia adelante para reutilizar ownerStats tal cual.
  const prev = ownerStats({ ...state, bookings: state.bookings.map(b => ({ ...b, date: addDays(b.date, days) })) }, complex, days)
  const hasPrev = prev.counted > 0 && prev.bookingsN > 0

  // Mapa de calor día x horario (misma regla de conteo que ownerStats).
  const slots = slotsFor(complex), courts = activeCourts(state, complex.id)
  const taken = new Set()
  let first = today
  for (const b of state.bookings) {
    if (b.complexId !== complex.id) continue
    if (!b._busy && b.date < first) first = b.date
    if (effStatus(b) !== 'cancelled') taken.add(`${b.courtId}|${b.date}|${b.time}`)
  }
  const grid = Array.from({ length: 7 }, () => slots.map(() => ({ used: 0, total: 0 })))
  for (let i = 1; i <= days; i++) {
    const date = addDays(today, -i)
    if (date < first) continue
    const wd = weekdayOf(date)
    for (const c of courts) slots.forEach((t, k) => { const cell = grid[wd][k]; cell.total++; if (taken.has(`${c.id}|${date}|${t}`)) cell.used++ })
  }
  const cells = grid.map(row => row.map(c => ({ ...c, pct: c.total ? Math.round((c.used / c.total) * 100) : 0 })))
  const used = grid.flat().reduce((s, c) => s + c.used, 0), total = grid.flat().reduce((s, c) => s + c.total, 0)

  // Ingresos y reservas por día (o por semana en 90 días) y por cancha.
  const inc = {}, cnt = {}, byCourt = {}
  for (const b of state.bookings) {
    if (b.complexId !== complex.id || b.date < from || b.date >= today) continue
    inc[b.date] = (inc[b.date] || 0) + (b.paidCents || 0)
    if (effStatus(b) === 'cancelled') continue
    cnt[b.date] = (cnt[b.date] || 0) + 1
    const c = (byCourt[b.courtId] ||= { n: 0, income: 0 })
    c.n++; c.income += b.paidCents || 0
  }
  const dates = Array.from({ length: days }, (_, k) => addDays(from, k)), size = days > 30 ? 7 : 1, series = []
  for (let end = dates.length; end > 0; end -= size) {
    const chunk = dates.slice(Math.max(0, end - size), end), a = chunk[0], z = chunk[chunk.length - 1]
    series.unshift({
      a, z, v: chunk.reduce((s, d) => s + (inc[d] || 0), 0), n: chunk.reduce((s, d) => s + (cnt[d] || 0), 0),
      label: size > 1 ? dm(a) : days <= 7 ? `${weekdayShort(a)} ${dayNum(a)}` : dm(a),
      tip: size > 1 ? `${dm(a)} al ${dm(z)}` : dateShort(a),
    })
  }
  const courtRows = st.courts.map(c => ({ ...c, n: byCourt[c.court.id]?.n || 0, income: byCourt[c.court.id]?.income || 0 }))
  return { st, prev, hasPrev, slots, cells, used, total, series, courtRows, range: { from, to: addDays(today, -1) } }
}

const TONES = {
  weak: { box: 'bg-warn-soft', icon: 'text-warn' },
  strong: { box: 'bg-brand-soft', icon: 'text-brand' },
  alert: { box: 'bg-danger-soft', icon: 'text-danger' },
  info: { box: 'bg-sunken', icon: 'text-info' },
}

function Insight({ tone, icon: I, title, text, cta }) {
  const t = TONES[tone]
  return (
    <li className={cn('rounded-xl p-3.5 flex gap-3', t.box)}>
      <span className={cn('size-10 rounded-xl grid place-items-center flex-none bg-surface shadow-[var(--sh-1)]', t.icon)}><I size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{title}</p>
        <p className="text-sm text-muted mt-0.5">{text}</p>
        {cta && <Button variant={cta.primary ? 'secondary' : 'link'} className={cn('mt-2', !cta.primary && '-ml-2')} onClick={() => navigate(cta.to)}>{cta.label}<ArrowRight size={16} aria-hidden="true" /></Button>}
      </div>
    </li>
  )
}

function Card({ id, title, sub, right, children, className }) {
  return (
    <Reveal className={cn('h-full', className)}>
      <section aria-labelledby={id} className="h-full rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-4 sm:p-5 min-w-0">
        <header className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0"><h2 id={id} className="text-lg leading-tight">{title}</h2>{sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}</div>
          {right}
        </header>
        {children}
      </section>
    </Reveal>
  )
}

const Chips = ({ items, tone }) => (
  <ul className="flex flex-wrap gap-2 tnum">{items.map(x => <li key={x.k} className={cn('rounded-full px-3 py-1.5 text-sm font-semibold', tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand')}>{x.k} · {x.pct}%</li>)}</ul>
)

/* Estadísticas del complejo: KPIs, mapa de calor, ingresos y recomendaciones para actuar. */
export default function Stats() {
  const { state } = useStore()
  const { complex } = useOwner()
  const [days, setDays] = useState(30)
  const [pickD, setPickD] = useState(null)
  const [pickH, setPickH] = useState(null)
  const [cell, setCell] = useState(null)
  const data = useMemo(() => (complex ? build(state, complex, days) : null), [state, complex, days])
  if (!data) return <OwnerPage title="Estadísticas" wide />
  const { st, prev, hasPrev, slots, cells, used, total, series, courtRows, range } = data

  const best = series.reduce((m, s) => (s.v > m.v ? s : m), series[0])
  const incomeDelta = hasPrev ? rel(st.income, prev.income) : null
  const cancelRate = st.bookingsN + st.cancels ? st.cancels / (st.bookingsN + st.cancels) : 0
  const marks = new Map()
  st.strong.forEach(w => [w.from, w.to].forEach(t => marks.set(`${w.wd}|${t}`, 'strong')))
  st.weak.forEach(w => [w.from, w.to].forEach(t => marks.set(`${w.wd}|${t}`, 'weak')))
  const topHours = new Set(st.top.map(h => h.t)), topDay = st.strongDays[0]
  const chips = <>
    <div className="rounded-xl bg-white/15 px-3 py-2 min-w-0"><p className="text-[11px] uppercase tracking-wider opacity-80 inline-flex items-center gap-1"><Trophy size={12} aria-hidden="true" />Mejor día</p><p className="font-semibold tnum truncate">{topDay?.pct ? `${DAY[topDay.d]} · ${topDay.pct}%` : '—'}</p></div>
    <div className="rounded-xl bg-white/15 px-3 py-2 min-w-0"><p className="text-[11px] uppercase tracking-wider opacity-80 inline-flex items-center gap-1"><Flame size={12} aria-hidden="true" />Hora pico</p><p className="font-semibold tnum truncate">{st.top[0]?.pct ? `${st.top[0].t} · ${st.top[0].pct}%` : '—'}</p></div>
  </>
  const pickedCell = cell ? { wd: Number(cell.r), t: slots[cell.c], ...cells[Number(cell.r)][cell.c] } : null

  const insights = []
  if (st.enough) {
    st.weak.forEach(w => insights.push({ k: `w${w.wd}${w.from}`, tone: 'weak', icon: TrendingDown, title: `${cap(DAYS_LONG[w.wd])} de ${w.from} a ${endOf(w.to)}`, text: `Solo se ocupa el ${w.pct}% de los turnos. Una promoción puede llenarlos.`, cta: { primary: true, label: 'Crear promoción', to: promoLink(w.from, endOf(w.to)) } }))
    st.strong.forEach(w => insights.push({ k: `s${w.wd}${w.from}`, tone: 'strong', icon: TrendingUp, title: `${cap(DAYS_LONG[w.wd])} de ${w.from} a ${endOf(w.to)}`, text: `Se llena (${w.pct}%). Hay demanda para probar un precio más alto.`, cta: { label: 'Revisar precios', to: '/dueno/canchas' } }))
  }
  if (st.noShows > 0) insights.push({ k: 'ns', tone: 'alert', icon: UserX, title: pl(st.noShows, 'turno sin presentarse', 'turnos sin presentarse'), text: `${st.lost > 0 ? `Son ${money(st.lost)} sin cobrar. ` : ''}Pedir seña ayuda a bajar las faltas.`, cta: { label: 'Configurar seña', to: '/dueno/complejo' } })
  if (cancelRate >= 0.1) insights.push({ k: 'cx', tone: 'alert', icon: Ban, title: `${Math.round(cancelRate * 100)}% de cancelaciones`, text: `Se cancelaron ${pl(st.cancels, 'reserva', 'reservas')} de ${st.bookingsN + st.cancels}. Revisá la política de cancelación.`, cta: { label: 'Ver reservas', to: '/dueno/reservas' } })
  if (incomeDelta != null && Math.abs(incomeDelta) >= 10) insights.push({ k: 'inc', tone: incomeDelta > 0 ? 'strong' : 'alert', icon: incomeDelta > 0 ? TrendingUp : TrendingDown, title: `Ingresos ${incomeDelta > 0 ? '+' : '−'}${Math.round(Math.abs(incomeDelta))}%`, text: `Cobraste ${incomeDelta > 0 ? 'más' : 'menos'} que en los ${days} días anteriores (${money(prev.income)}).` })
  if (topDay?.pct > 0) insights.push({ k: 'day', tone: 'info', icon: Trophy, title: `Los ${DAYS_LONG[topDay.d]} son tu mejor día`, text: `Ocupación de ${topDay.pct}%${st.top[0] ? `, con pico a las ${st.top[0].t}` : ''}.` })

  const dlt = (now, before, good = 'up', unit = '%') => (hasPrev ? <Delta value={unit === '%' ? rel(now, before) : now - before} unit={unit} good={good} /> : null)
  const sub = `${dm(range.from)} al ${dm(range.to)}`

  return (
    <OwnerPage title="Estadísticas" sub={sub} wide>
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Segmented className="w-full sm:w-80" value={days} onChange={v => { setDays(v); setPickD(null); setPickH(null); setCell(null) }} label="Período" options={PERIODS} />
          <p className="text-sm text-muted inline-flex items-center gap-2"><CalendarRange size={16} aria-hidden="true" />{sub}{hasPrev && <span className="hidden md:inline">· Las flechas comparan con los {days} días anteriores</span>}</p>
        </div>
        {st.since && <p className="text-sm text-muted -mt-1">Hay datos desde el {st.since.split('-').reverse().join('/')}: se cuentan {st.counted} días.</p>}

        <Stagger key={days} className="grid gap-3 lg:gap-4 xl:grid-cols-12">
          <Item className="hero p-5 xl:p-6 xl:col-span-4">
            <div className="flex flex-col gap-4 h-full">
              <div className="flex flex-row xl:flex-col items-center gap-4 xl:gap-5">
                <Ring pct={st.occupancy} size={124} stroke={13}><span className="display text-[32px] font-bold tnum leading-none"><CountUp value={`${st.occupancy}%`} /></span></Ring>
                <div className="min-w-0 flex-1 xl:flex-none xl:w-full">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-90 inline-flex items-center gap-1.5"><Percent size={14} aria-hidden="true" />Ocupación</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {hasPrev && <Delta onGrad value={st.occupancy - prev.occupancy} unit="pp" />}
                    <span className="text-sm opacity-90 tnum">{total ? `${used} de ${total} turnos` : 'Sin turnos para contar'}</span>
                  </div>
                  <div className="hidden sm:grid xl:hidden grid-cols-2 gap-2 mt-3">{chips}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:hidden xl:grid xl:mt-auto">{chips}</div>
            </div>
          </Item>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 xl:col-span-8">
            <Item><Kpi className="h-full" icon={CircleDollarSign} label="Ingresos" value={money(st.income)} delta={dlt(st.income, prev.income)} spark={<Spark data={series.map(s => s.v)} />} /></Item>
            <Item><Kpi className="h-full" icon={CalendarCheck} label="Reservas" value={st.bookingsN} delta={dlt(st.bookingsN, prev.bookingsN)} spark={<Spark data={series.map(s => s.n)} />} /></Item>
            <Item><Kpi className="h-full" icon={Receipt} label="Ticket promedio" value={money(st.ticket)} delta={dlt(st.ticket, prev.ticket)} /></Item>
            <Item><Kpi className="h-full" icon={UserX} label="No vinieron" value={st.noShows} tone={st.noShows ? 'warn' : 'brand'} delta={dlt(st.noShows, prev.noShows, 'down', '')} /></Item>
            <Item><Kpi className="h-full" icon={Ban} label="Cancelaciones" value={st.cancels} tone={st.cancels ? 'warn' : 'brand'} delta={dlt(st.cancels, prev.cancels, 'down', '')} /></Item>
            <Item><Kpi className="h-full" icon={Wallet} label="Sin cobrar" value={money(st.lost)} tone={st.lost ? 'warn' : 'brand'} hint={st.lost ? 'Por turnos que no vinieron' : 'Nadie faltó sin pagar'} /></Item>
          </div>
        </Stagger>

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-12 xl:items-start">
          <aside aria-labelledby="ins" className="xl:col-span-4 xl:col-start-9 xl:row-start-1 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto overscroll-contain rounded-2xl bg-surface border border-line shadow-[var(--sh-2)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl grid place-items-center flex-none bg-[image:var(--grad-brand)] text-[var(--on-grad)] shadow-[var(--sh-1)]"><Sparkles size={20} aria-hidden="true" /></span>
              <div className="min-w-0"><h2 id="ins" className="text-lg leading-tight">Insights</h2><p className="text-sm text-muted">Qué mirar y qué hacer</p></div>
            </div>
            {!st.enough && (
              <div className="mt-4 rounded-xl bg-sunken p-4">
                <p className="font-semibold inline-flex items-center gap-2"><Hourglass size={18} className="text-muted" aria-hidden="true" />Juntando datos</p>
                <p className="text-sm text-muted mt-1">Para recomendar horarios necesitamos al menos dos semanas de reservas. Volvé en unos días.</p>
                <div className="mt-3 h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-label="Días con datos" aria-valuemin={0} aria-valuemax={14} aria-valuenow={Math.min(14, st.counted)}><div className="h-full rounded-full bg-[image:var(--grad-brand)]" style={{ width: `${Math.min(100, (st.counted / 14) * 100)}%` }} /></div>
                <p className="text-xs text-muted mt-1.5 tnum">{Math.min(14, st.counted)} de 14 días</p>
              </div>)}
            {insights.length > 0 && <ul className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-1">{insights.map(({ k, ...p }) => <Insight key={k} {...p} />)}</ul>}
            {st.enough && !st.weak.length && !st.strong.length && <p className="mt-4 text-sm text-muted rounded-xl bg-sunken p-4">La ocupación está pareja: no hay franjas muy vacías ni muy llenas.</p>}
            {!insights.length && st.enough && <p className="sr-only">Sin alertas.</p>}

          </aside>

          <div className="xl:col-span-8 xl:row-start-1 grid gap-4 lg:gap-6 min-w-0">
            <Card id="heat" title="Mapa de calor" sub="Qué tan llenos están los turnos, por día y horario"
              right={<span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted flex-none"><Flame size={14} aria-hidden="true" />Últimos {days} días</span>}>
              <HeatGrid cols={slots} showNum={slots.length <= 16} label="Ocupación por día y horario" selected={cell} onSelect={setCell}
                rows={ORDER.map(wd => ({ key: String(wd), label: DAY[wd], cells: cells[wd] }))}
                mark={(r, ci) => marks.get(`${r}|${slots[ci]}`)}
                describe={(r, c, ci) => `${cap(DAYS_LONG[Number(r.key)])} ${slots[ci]}: ${c.total ? `${c.pct}% (${c.used} de ${c.total} turnos)` : 'sin datos'}`} />
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-2">Menos<span className="hg-scale h-2 w-24 rounded-full" aria-hidden="true" />Más</span>
                {marks.size > 0 && <>
                  <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] shadow-[inset_0_0_0_2px_var(--warn)]" aria-hidden="true" />Franja con oportunidad</span>
                  {st.strong.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] shadow-[inset_0_0_0_2px_var(--gold)]" aria-hidden="true" />Franja que se llena</span>}
                </>}
              </div>
              <div className="mt-3 min-h-11 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tnum" aria-live="polite">
                {pickedCell
                  ? pickedCell.total
                    ? <><span><strong>{cap(DAYS_LONG[pickedCell.wd])} {pickedCell.t}</strong> · <strong>{pickedCell.pct}%</strong> <span className="text-muted">({pickedCell.used} de {pickedCell.total} turnos)</span></span>
                      {pickedCell.pct <= 35 && <Button variant="link" onClick={() => navigate(promoLink(pickedCell.t, endOf(pickedCell.t)))}>Crear promoción para este horario<ArrowRight size={16} aria-hidden="true" /></Button>}</>
                    : <span className="text-muted">{cap(DAYS_LONG[pickedCell.wd])} {pickedCell.t}: todavía no hay datos.</span>
                  : <span className="text-muted">Tocá un casillero para ver el detalle.</span>}
              </div>
            </Card>

            <Card id="inc" title="Ingresos" sub={days > 30 ? 'Cobrado por semana' : 'Cobrado por día'}
              right={<div className="text-right flex-none"><p className="display text-2xl sm:text-3xl font-bold tnum leading-none"><CountUp value={money(st.income)} /></p>{incomeDelta != null && <Delta className="mt-1.5" value={incomeDelta} />}</div>}>
              <AreaChart points={series} height={176} format={compact} label={`Ingresos de los últimos ${days} días`} />
              <dl className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-line">
                <div className="min-w-0"><dt className="text-xs text-muted">{days > 30 ? 'Mejor semana' : 'Mejor día'}</dt><dd className="font-semibold tnum truncate">{best?.v ? money(best.v) : '—'}</dd>{best?.v > 0 && <dd className="text-xs text-muted truncate">{days > 30 ? dm(best.a) : dateShort(best.a)}</dd>}</div>
                <div className="min-w-0"><dt className="text-xs text-muted">Promedio por día</dt><dd className="font-semibold tnum truncate">{money(Math.round(st.income / days))}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-muted">Por reserva</dt><dd className="font-semibold tnum truncate">{money(st.ticket)}</dd></div>
              </dl>
            </Card>

            <div className="grid gap-4 lg:gap-6 sm:grid-cols-2">
              <Card id="byday" title="Por día" sub="Ocupación según el día de la semana">
                <Columns height={150} selected={pickD} onSelect={setPickD} items={st.days.map(d => ({ key: String(d.d), v: d.pct, hot: d.d === topDay?.d && d.pct > 0, aria: `${DAY[d.d]}: ${d.pct}%` }))} labelFor={x => DAY[Number(x.key)]} />
                <p className="text-sm text-muted mt-3 tnum min-h-5" aria-live="polite">{pickD != null ? <><strong className="text-ink">{cap(DAYS_LONG[Number(pickD)])}</strong>: {st.days.find(d => String(d.d) === pickD)?.pct}% de ocupación</> : 'Tocá una columna para ver el porcentaje'}</p>
              </Card>
              <Card id="byhour" title="Por horario" sub="Ocupación según la hora de inicio">
                <Columns height={150} selected={pickH} onSelect={setPickH} items={st.hours.map(h => ({ key: h.t, v: h.pct, hot: topHours.has(h.t) && h.pct > 0, aria: `${h.t}: ${h.pct}%` }))} labelFor={x => x.key.slice(0, 2)} />
                <p className="text-sm text-muted mt-3 tnum min-h-5" aria-live="polite">{pickH != null ? <><strong className="text-ink">{pickH}</strong>: {st.hours.find(h => h.t === pickH)?.pct}% de ocupación</> : 'Tocá una columna para ver el porcentaje'}</p>
              </Card>
            </div>

          </div>
        </div>

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-12">
            {courtRows.length > 1 && (
              <Card id="courts" className="xl:col-span-7" title="Por cancha" sub="Cuál se usa más y cuánto deja">
                <ul className="space-y-4">
                  {courtRows.map((c, i) => {
                    const topCourt = c.pct === Math.max(...courtRows.map(x => x.pct)) && c.pct > 0
                    return (
                      <li key={c.court.id} className="flex flex-col sm:flex-row sm:items-center gap-x-5 gap-y-1.5">
                        <div className="sm:w-52 min-w-0">
                          <p className="font-semibold flex items-center gap-2 min-w-0"><span className="truncate">{c.court.name}</span>{topCourt && <span className="rounded-full bg-brand-soft text-brand text-[11px] font-semibold px-2 py-0.5 flex-none">Más usada</span>}</p>
                          <p className="text-sm text-muted truncate">{[c.court.sport, c.court.surface, c.court.covered && 'Techada'].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex-1 min-w-0"><HBar pct={c.pct} i={i} /></div>
                        <p className="sm:w-44 sm:text-right text-sm text-muted tnum">{pl(c.n, 'reserva', 'reservas')} · {money(c.income)}</p>
                      </li>)
                  })}
                </ul>
              </Card>)}
            <Card id="rank" className={courtRows.length > 1 ? 'xl:col-span-5' : 'xl:col-span-12'} title="Ranking" sub="Dónde se llena y dónde hay lugar para crecer">
              <div className={cn('grid gap-5 sm:grid-cols-2', courtRows.length > 1 && 'xl:grid-cols-1')}>
                <div><h3 className="text-sm font-semibold mb-2">Horarios más fuertes</h3><Chips items={st.top.map(h => ({ k: h.t, pct: h.pct }))} /></div>
                <div><h3 className="text-sm font-semibold mb-2">Horarios con oportunidad</h3><Chips tone="warn" items={st.bottom.map(h => ({ k: h.t, pct: h.pct }))} /></div>
                <div><h3 className="text-sm font-semibold mb-2">Días más fuertes</h3><Chips items={st.strongDays.map(d => ({ k: DAY[d.d], pct: d.pct }))} /></div>
                <div><h3 className="text-sm font-semibold mb-2">Días más flojos</h3><Chips tone="warn" items={st.weakDays.map(d => ({ k: DAY[d.d], pct: d.pct }))} /></div>
              </div>
            </Card>

        </div>

        <p className="hint">Ocupación = turnos reservados sobre turnos disponibles, en los últimos {st.counted} días (sin contar hoy){st.since ? `, desde la primera reserva (${st.since.split('-').reverse().join('/')})` : ''}.</p>
      </div>
    </OwnerPage>
  )
}
