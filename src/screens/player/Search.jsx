import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { activeCourts, favsOf, nextTimes, publicComplexes, SPORTS, toggleFav } from '../../lib/domain'
import { cn, plural, todayISO } from '../../lib/format'
import { useOrigin } from '../../lib/origin'
import { navigate, useRoute } from '../../lib/router'
import { Button, Chip, Content, Empty, PageHeader, Segmented } from '../../ui/kit'
import { DateField } from '../../ui/DateField'
import { PlaceField } from '../../ui/PlaceField'
import { ComplexMap } from '../../ui/MapView'
import { ComplexCard, complexView } from '../../ui/shared'

export default function Search() {
  const { state, user, update } = useStore()
  const { query } = useRoute()
  const { origin, real, label, setOrigin } = useOrigin()
  const [fecha, setFecha] = useState(query.fecha >= todayISO() ? query.fecha : todayISO())
  const [tipo, setTipo] = useState(query.tipo || '')
  const [view, setView] = useState('lista')
  const [selected, setSelected] = useState('')
  const now = new Date()

  const sports = SPORTS.filter(s => publicComplexes(state).some(c => activeCourts(state, c.id).some(x => x.sport === s)))
  const results = useMemo(() => publicComplexes(state)
    .filter(c => !tipo || activeCourts(state, c.id).some(x => x.sport === tipo))
    .map(c => ({ ...complexView(state, c, origin), slots: nextTimes(state, c, fecha, 4, now) }))
    .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99)), [state, tipo, fecha, origin]) // eslint-disable-line

  const favs = user ? favsOf(state, user.id) : []
  const pick = id => { setSelected(id); if (view === 'lista') document.getElementById(`c-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }

  return (
    <>
      <PageHeader title="Buscar cancha" />
      <Content>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <PlaceField />
          <div><span className="label">¿Cuándo?</span><DateField min={todayISO()} value={fecha} onChange={v => setFecha(v || todayISO())} /></div>
        </div>
        {sports.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mt-4 pb-1" role="group" aria-label="Tipo de cancha">
            <Chip active={!tipo} onClick={() => setTipo('')}>Todas</Chip>
            {sports.map(s => <Chip key={s} active={tipo === s} onClick={() => setTipo(s)}>{s}</Chip>)}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-5 mb-4">
          <p className="text-muted" aria-live="polite">{plural(results.length, 'complejo', 'complejos')} {real ? `· ${label.replace(/^Cerca de /, 'cerca de ')}` : ''}</p>
          <Segmented className="lg:hidden w-40 flex-none" value={view} onChange={setView} label="Vista" options={[{ value: 'lista', label: 'Lista' }, { value: 'mapa', label: 'Mapa' }]} />
        </div>

        {results.length === 0 ? (
          <Empty title="No encontramos canchas" text="Probá con otro tipo de cancha." action={<Button variant="secondary" onClick={() => setTipo('')}>Ver todas</Button>} />
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)] lg:gap-6 lg:items-start">
            <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2', view === 'mapa' && 'hidden lg:grid')}>
              {results.map(c => <ComplexCard key={c.id} id={`c-${c.id}`} c={c} slots={c.slots} date={fecha} selected={selected === c.id} fav={favs.includes(c.id)} onFav={user?.role === 'player' ? () => update(s => toggleFav(s, user.id, c.id)) : undefined} />)}
            </div>
            <div className={cn('rounded-lg overflow-hidden border border-line h-[min(62dvh,520px)] lg:h-[calc(100dvh-220px)] lg:sticky lg:top-6', view === 'lista' && 'hidden lg:block')}>
              <ComplexMap className="h-full" complexes={results} selectedId={selected} onSelect={pick} userPos={real ? origin : null} onLocate={p => setOrigin({ ...p, label: 'Tu ubicación' })}
                onOpen={c => navigate(`/complejo/${c.slug}?fecha=${fecha}`)} />
            </div>
          </div>
        )}
      </Content>
    </>
  )
}
