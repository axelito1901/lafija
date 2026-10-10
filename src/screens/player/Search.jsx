import { useMemo, useState } from 'react'
import { CalendarClock, Clock3, Moon, SearchX, Sun, Sunrise } from 'lucide-react'
import { useStore } from '../../lib/store'
import { activeCourts, favsOf, nextTimes, publicComplexes, SPORTS, toggleFav } from '../../lib/domain'
import { addDays, cn, plural, relativeDay, todayISO } from '../../lib/format'
import { useOrigin } from '../../lib/origin'
import { navigate, useRoute } from '../../lib/router'
import { Button, Chip, Content, Empty, PageHeader, Segmented, Select } from '../../ui/kit'
import { DateField } from '../../ui/DateField'
import { PlaceField } from '../../ui/PlaceField'
import { ComplexMap } from '../../ui/MapView'
import { ComplexCard, complexView } from '../../ui/shared'
import { Item, Stagger } from '../../ui/motion'
import './jugador.css'

const PARTS = [['', 'Cualquiera', null], ['m', 'Mañana', Sunrise], ['t', 'Tarde', Sun], ['n', 'Noche', Moon], ['h', 'Una hora', Clock3]]
const PART_FN = { m: t => t < '12:00' && t >= '06:00', t: t => t >= '12:00' && t < '18:00', n: t => t >= '18:00' || t < '06:00' }
const HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)
const SORTS = [['cerca', 'Más cerca'], ['rating', 'Mejor puntuados'], ['precio', 'Más baratos']]

export default function Search() {
  const { state, user, update } = useStore()
  const { query } = useRoute()
  const { origin, real, label, setOrigin } = useOrigin()
  const [picked, setFecha] = useState(query.fecha >= todayISO() ? query.fecha : '')
  const [tipo, setTipo] = useState(query.tipo || '')
  const [part, setPart] = useState('')
  const [hour, setHour] = useState('21:00')
  const [sort, setSort] = useState('cerca')
  const [view, setView] = useState('lista')
  const [selected, setSelected] = useState('')
  const [hover, setHover] = useState('')
  const now = new Date(), today = todayISO()

  // Si hoy ya no queda nada libre, arrancamos en el primer día con horarios (se puede cambiar a mano).
  const autoDay = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)).find(d => publicComplexes(state).some(c => nextTimes(state, c, d, 1, now).length)) || today, [state, today]) // eslint-disable-line
  const fecha = picked || autoDay
  const sports = SPORTS.filter(s => publicComplexes(state).some(c => activeCourts(state, c.id).some(x => x.sport === s)))
  const results = useMemo(() => publicComplexes(state)
    .filter(c => !tipo || activeCourts(state, c.id).some(x => x.sport === tipo))
    .map(c => ({ ...complexView(state, c, origin), slots: nextTimes(state, c, fecha, 4, now, part === 'h' ? { near: hour } : part ? { part: PART_FN[part] } : null) }))
    .sort((a, b) => (b.slots.length > 0) - (a.slots.length > 0)
      || (sort === 'rating' ? b.rating - a.rating : sort === 'precio' ? (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity) : 0)
      || (a.distance ?? 99) - (b.distance ?? 99)), [state, tipo, fecha, origin, part, hour, sort]) // eslint-disable-line

  const favs = user ? favsOf(state, user.id) : []
  const withSlots = results.filter(c => c.slots.length > 0).length
  const pick = id => { setSelected(id); if (view === 'lista' || window.matchMedia?.('(min-width: 1280px)').matches) document.getElementById(`c-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  const clear = () => { setTipo(''); setPart('') }
  const filtered = !!(tipo || part)

  return (
    <div className="pj-wide contents">
      <PageHeader title="Buscar cancha" sub="Elegí zona, día y horario" />
      <Content className="max-w-[1480px]">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(380px,40%)] 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,44%)] xl:gap-8 xl:items-start">
          <div className="min-w-0">
            <section className="pj-lg-panel" aria-label="Filtros">
              <div className="grid gap-4 sm:grid-cols-2">
                <PlaceField />
                <div><span className="label">¿Cuándo?</span><DateField min={today} value={fecha} onChange={v => setFecha(v || today)} /></div>
              </div>
              <div className="mt-4 lg:mt-5 lg:grid lg:grid-cols-[4rem_minmax(0,1fr)] lg:items-center lg:gap-x-3 lg:gap-y-3">
                <span className="label lg:mb-0 lg:self-center"><span className="lg:hidden">¿A qué hora?</span><span className="hidden lg:inline">Horario</span></span>
                <div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1 lg:pb-0 lg:flex-wrap lg:overflow-visible" role="group" aria-label="Horario">
                    {PARTS.map(([k, l, I]) => <Chip key={k} active={part === k} onClick={() => setPart(k)} className="!min-h-11 pointer-fine:!min-h-10">{I && <I size={16} aria-hidden="true" />}{l}</Chip>)}
                  </div>
                  {part === 'h' && <Select className="mt-2 sm:max-w-48" aria-label="Hora" value={hour} onChange={e => setHour(e.target.value)}>{HOURS.map(h => <option key={h} value={h}>{h} hs</option>)}</Select>}
                </div>
                {sports.length > 1 && <>
                  <span className="label hidden lg:block lg:mb-0">Cancha</span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-3 lg:mt-0 pb-1 lg:pb-0 lg:flex-wrap lg:overflow-visible" role="group" aria-label="Tipo de cancha">
                    <Chip active={!tipo} onClick={() => setTipo('')} className="!min-h-11 pointer-fine:!min-h-10">Todas</Chip>
                    {sports.map(s => <Chip key={s} active={tipo === s} onClick={() => setTipo(s)} className="!min-h-11 pointer-fine:!min-h-10">{s}</Chip>)}
                  </div>
                </>}
              </div>
              {!picked && fecha !== today && (
                <p className="mt-4 text-sm rounded-xl bg-brand-soft text-brand font-medium px-3.5 py-2.5 inline-flex items-center gap-2 w-full" role="status"><CalendarClock size={16} className="flex-none" aria-hidden="true" />Hoy ya no quedan horarios: te mostramos {relativeDay(fecha).toLowerCase()}.</p>
              )}
            </section>

            <div className="flex items-center justify-between gap-3 mt-5 mb-3">
              <p className="text-muted min-w-0" aria-live="polite"><strong className="text-ink tnum">{plural(results.length, 'complejo', 'complejos')}</strong>{results.length > 0 && <span className="hidden sm:inline"> · <span className="tnum">{withSlots}</span> con horarios libres</span>}{real ? ` · ${label.replace(/^Cerca de /, 'cerca de ')}` : ''}</p>
              <Segmented className="xl:hidden w-40 flex-none [&>button]:!min-h-11" value={view} onChange={setView} label="Vista" options={[{ value: 'lista', label: 'Lista' }, { value: 'mapa', label: 'Mapa' }]} />
            </div>
            <div className={cn('flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1 mb-3 items-center lg:hidden', view === 'mapa' && 'hidden')} role="group" aria-label="Ordenar por">
              <span className="text-sm text-muted flex-none pr-1">Ordenar por</span>
              {SORTS.map(([k, l]) => <Chip key={k} active={sort === k} onClick={() => setSort(k)} className="!min-h-11">{l}</Chip>)}
            </div>
            <div className={cn('hidden items-center gap-3 mb-4', view === 'mapa' ? 'xl:flex' : 'lg:flex')}>
              <span className="text-sm text-muted flex-none">Ordenar por</span>
              <Segmented className="flex-1 max-w-[420px]" value={sort} onChange={setSort} label="Ordenar por" options={SORTS.map(([value, l]) => ({ value, label: l }))} />
              {filtered && <button type="button" onClick={clear} className="text-sm font-semibold text-brand min-h-11 px-2 ml-auto">Quitar filtros</button>}
            </div>

            {results.length === 0 ? (
              <Empty icon={SearchX} title="No encontramos canchas" text="Probá con otro tipo de cancha u otro horario." action={<Button variant="secondary" onClick={clear}>Quitar filtros</Button>} />
            ) : (
              <Stagger key={`${fecha}|${tipo}|${part}|${hour}|${sort}`} className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-1', view === 'mapa' && 'hidden xl:grid')} step={.04}>
                {results.map(c => (
                  <Item key={c.id} className="min-w-0">
                    <ComplexCard id={`c-${c.id}`} row c={c} slots={c.slots} date={fecha} selected={selected === c.id} onHover={setHover} fav={favs.includes(c.id)} onFav={user?.role === 'player' ? () => update(s => toggleFav(s, user.id, c.id)) : undefined} />
                  </Item>))}
              </Stagger>
            )}
          </div>
          <div className={cn('rounded-2xl overflow-hidden border border-line shadow-[var(--sh-2)] h-[min(62dvh,520px)] lg:h-[min(70dvh,640px)] xl:h-[calc(100dvh-3rem)] xl:sticky xl:top-6', view === 'lista' && 'hidden xl:block')}>
            <ComplexMap className="h-full" complexes={results} selectedId={hover || selected} onSelect={pick} userPos={real ? origin : null} title={plural(results.length, 'complejo', 'complejos')} onLocate={p => setOrigin({ ...p, label: 'Tu ubicación' })}
              onOpen={c => navigate(`/complejo/${c.slug}?fecha=${fecha}`)} />
          </div>
        </div>
      </Content>
    </div>
  )
}
