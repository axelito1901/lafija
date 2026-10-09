import { useMemo, useState } from 'react'
import { Clock3, Moon, SearchX, Sun, Sunrise } from 'lucide-react'
import { useStore } from '../../lib/store'
import { activeCourts, favsOf, nextTimes, publicComplexes, SPORTS, toggleFav } from '../../lib/domain'
import { cn, plural, todayISO } from '../../lib/format'
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
  const [fecha, setFecha] = useState(query.fecha >= todayISO() ? query.fecha : todayISO())
  const [tipo, setTipo] = useState(query.tipo || '')
  const [part, setPart] = useState('')
  const [hour, setHour] = useState('21:00')
  const [sort, setSort] = useState('cerca')
  const [view, setView] = useState('lista')
  const [selected, setSelected] = useState('')
  const [hover, setHover] = useState('')
  const now = new Date()

  const sports = SPORTS.filter(s => publicComplexes(state).some(c => activeCourts(state, c.id).some(x => x.sport === s)))
  const results = useMemo(() => publicComplexes(state)
    .filter(c => !tipo || activeCourts(state, c.id).some(x => x.sport === tipo))
    .map(c => ({ ...complexView(state, c, origin), slots: nextTimes(state, c, fecha, 4, now, part === 'h' ? { near: hour } : part ? { part: PART_FN[part] } : null) }))
    .sort((a, b) => (b.slots.length > 0) - (a.slots.length > 0)
      || (sort === 'rating' ? b.rating - a.rating : sort === 'precio' ? (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity) : 0)
      || (a.distance ?? 99) - (b.distance ?? 99)), [state, tipo, fecha, origin, part, hour, sort]) // eslint-disable-line

  const favs = user ? favsOf(state, user.id) : []
  const withSlots = results.filter(c => c.slots.length > 0).length
  const pick = id => { setSelected(id); if (view === 'lista') document.getElementById(`c-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  const clear = () => { setTipo(''); setPart('') }

  return (
    <div className="pj-wide contents">
      <PageHeader title="Buscar cancha" />
      <Content className="max-w-[1480px]">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,42%)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,40%)] 2xl:grid-cols-[minmax(0,1fr)_minmax(560px,46%)] lg:gap-8 lg:items-start">
          <div className="min-w-0">
            <section className="pj-lg-panel" aria-label="Filtros">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <PlaceField />
                <div><span className="label">¿Cuándo?</span><DateField min={todayISO()} value={fecha} onChange={v => setFecha(v || todayISO())} /></div>
              </div>
              <div className="mt-4">
                <span className="label">¿A qué hora?</span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1 lg:flex-wrap lg:overflow-visible" role="group" aria-label="Horario">
                  {PARTS.map(([k, l, I]) => <Chip key={k} active={part === k} onClick={() => setPart(k)} className="!min-h-11">{I && <I size={16} aria-hidden="true" />}{l}</Chip>)}
                </div>
                {part === 'h' && <Select className="mt-2 sm:max-w-48" aria-label="Hora" value={hour} onChange={e => setHour(e.target.value)}>{HOURS.map(h => <option key={h} value={h}>{h} hs</option>)}</Select>}
              </div>
              {sports.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-3 pb-1 lg:flex-wrap lg:overflow-visible" role="group" aria-label="Tipo de cancha">
                  <Chip active={!tipo} onClick={() => setTipo('')} className="!min-h-11">Todas</Chip>
                  {sports.map(s => <Chip key={s} active={tipo === s} onClick={() => setTipo(s)} className="!min-h-11">{s}</Chip>)}
                </div>
              )}
            </section>

            <div className="flex items-center justify-between gap-3 mt-5 mb-3">
              <p className="text-muted min-w-0" aria-live="polite"><strong className="text-ink tnum">{plural(results.length, 'complejo', 'complejos')}</strong>{results.length > 0 && <span className="hidden sm:inline"> · {withSlots} con horarios libres</span>}{real ? ` · ${label.replace(/^Cerca de /, 'cerca de ')}` : ''}</p>
              <Segmented className="lg:hidden w-40 flex-none" value={view} onChange={setView} label="Vista" options={[{ value: 'lista', label: 'Lista' }, { value: 'mapa', label: 'Mapa' }]} />
            </div>
            <div className={cn('flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1 mb-3 lg:flex-wrap lg:overflow-visible items-center', view === 'mapa' && 'hidden lg:flex')} role="group" aria-label="Ordenar por">
              <span className="text-sm text-muted flex-none pr-1">Ordenar por</span>
              {SORTS.map(([k, l]) => <Chip key={k} active={sort === k} onClick={() => setSort(k)} className="!min-h-11">{l}</Chip>)}
            </div>

            {results.length === 0 ? (
              <Empty icon={SearchX} title="No encontramos canchas" text="Probá con otro tipo de cancha u otro horario." action={<Button variant="secondary" onClick={clear}>Quitar filtros</Button>} />
            ) : (
              <Stagger key={`${fecha}|${tipo}|${part}|${hour}|${sort}`} className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-1', view === 'mapa' && 'hidden lg:grid')} step={.04}>
                {results.map(c => (
                  <Item key={c.id} className="min-w-0">
                    <ComplexCard id={`c-${c.id}`} row c={c} slots={c.slots} date={fecha} selected={selected === c.id} onHover={setHover} fav={favs.includes(c.id)} onFav={user?.role === 'player' ? () => update(s => toggleFav(s, user.id, c.id)) : undefined} />
                  </Item>))}
              </Stagger>
            )}
          </div>
          <div className={cn('rounded-2xl overflow-hidden border border-line shadow-[var(--sh-2)] h-[min(62dvh,520px)] lg:h-[calc(100dvh-3rem)] lg:sticky lg:top-6', view === 'lista' && 'hidden lg:block')}>
            <ComplexMap className="h-full" complexes={results} selectedId={hover || selected} onSelect={pick} userPos={real ? origin : null} title={plural(results.length, 'complejo', 'complejos')} onLocate={p => setOrigin({ ...p, label: 'Tu ubicación' })}
              onOpen={c => navigate(`/complejo/${c.slug}?fecha=${fecha}`)} />
          </div>
        </div>
      </Content>
    </div>
  )
}
