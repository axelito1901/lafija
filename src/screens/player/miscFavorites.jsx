import { useMemo, useState } from 'react'
import { AnimatePresence, m as motion } from 'motion/react'
import { ArrowRight, Clock3, Compass, Heart, Plus, Search, Sparkles, Star } from 'lucide-react'
import { cn, todayISO } from '../../lib/format'
import { CountUp, spring } from '../../ui/motion'
import { useStore } from '../../lib/store'
import { favsOf, nextTimes, publicComplexes, toggleFav } from '../../lib/domain'
import { useOrigin } from '../../lib/origin'
import { Link, navigate } from '../../lib/router'
import { Button, Chip, Content, Empty, PageHeader } from '../../ui/kit'
import { ComplexCard, complexView } from '../../ui/shared'
import './misc.css'

/* Casilleros que faltan para cerrar la fila: invitan a sumar otra cancha y evitan el hueco a la derecha. */
const SPAN_LG = { 1: 'lg:col-span-1', 2: 'lg:col-span-2' }
function AddTile({ count }) {
  const lg = count % 3, odd = count % 2 === 1
  return (
    <motion.div layout className={cn('hidden', odd ? 'sm:block' : 'sm:hidden', lg ? `lg:block ${SPAN_LG[3 - lg]}` : 'lg:hidden')}>
      <Link to="/buscar" className="group h-full min-h-56 rounded-2xl border-2 border-dashed border-[var(--line-strong)] flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:border-brand hover:bg-brand-soft" aria-label="Buscar otra cancha para guardar">
        <span className="pm-ico is-sunken !size-14 !rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90"><Plus size={26} aria-hidden="true" /></span>
        <span><span className="block display text-xl font-bold">Sumá otra cancha</span><span className="block text-sm text-muted mt-0.5 max-w-[16rem]">Guardá tus complejos de siempre y reservá más rápido.</span></span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand min-h-11">Explorar canchas<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
      </Link>
    </motion.div>
  )
}

const SORTS = [['recent', Heart, 'Recientes'], ['near', Compass, 'Más cerca'], ['top', Star, 'Mejor puntuadas'], ['today', Clock3, 'Con horarios hoy']]

export function PlayerFavorites() {
  const { state, user, update } = useStore()
  const { origin } = useOrigin()
  const [sort, setSort] = useState('recent')
  const ids = favsOf(state, user.id)
  const key = ids.join(',')
  const all = useMemo(() => publicComplexes(state).map(c => complexView(state, c, origin)), [state, origin])
  const favs = useMemo(() => ids.map(id => all.find(c => c.id === id)).filter(Boolean).reverse(), [all, key]) // eslint-disable-line
  const slotsOf = useMemo(() => { const t = new Date(); return Object.fromEntries(all.map(c => [c.id, nextTimes(state, c, todayISO(), 4, t)])) }, [state, all])
  const withSlots = favs.filter(c => slotsOf[c.id]?.length)
  const shown = useMemo(() => {
    const l = sort === 'today' ? withSlots : [...favs]
    if (sort === 'near') l.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
    if (sort === 'top') l.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.ratingCount || 0) - (a.ratingCount || 0))
    return l
  }, [sort, favs, withSlots.length]) // eslint-disable-line
  const suggested = useMemo(() => all.filter(c => !ids.includes(c.id)).sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.distance ?? 1e9) - (b.distance ?? 1e9)).slice(0, 3), [all, key]) // eslint-disable-line
  const card = (c, fav) => <ComplexCard c={c} slots={slotsOf[c.id] || []} date={todayISO()} fav={fav} onFav={() => update(s => toggleFav(s, user.id, c.id))} />

  return (
    <>
      <PageHeader title="Mis favoritos" sub={favs.length ? 'Tocá un horario para reservar' : ''} />
      <Content>
        {favs.length === 0 ? (
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="pm-card-soft relative overflow-hidden px-6 py-12 lg:py-16 text-center" aria-label="Sin favoritos">
            <span className="pm-ico is-grad !size-20 !rounded-3xl pm-heart-float relative mx-auto"><i className="pm-pulse-ring" aria-hidden="true" /><Heart size={38} className="fill-current" aria-hidden="true" /></span>
            <h2 className="display text-3xl font-bold mt-5">Todavía no guardaste canchas</h2>
            <p className="text-muted mt-1.5 max-w-sm mx-auto">Tocá el corazón de un complejo para tenerlo a mano, con sus horarios libres a un toque.</p>
            <Button className="mt-5" onClick={() => navigate('/buscar')}><Search size={18} aria-hidden="true" />Buscar cancha</Button>
          </motion.section>
        ) : (
          <>
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="hero hidden sm:flex items-center gap-6 p-6 lg:p-7" aria-label="Resumen de favoritos">
              <div className="flex-1 min-w-0">
                <p className="pm-eyebrow opacity-90">Tus canchas de confianza</p>
                <p className="display text-5xl font-bold leading-none mt-2"><span className="tnum"><CountUp value={favs.length} /></span> <span className="text-2xl font-semibold opacity-90">{favs.length === 1 ? 'guardada' : 'guardadas'}</span></p>
                <p className="mt-2 opacity-95">{withSlots.length > 0 ? `${withSlots.length} de ${favs.length} con horarios libres hoy.` : 'Ninguna tiene horarios libres hoy.'}</p>
              </div>
              <Heart size={96} strokeWidth={1.25} className="absolute right-[17.5rem] top-1/2 -translate-y-1/2 opacity-20 fill-current hidden md:block pointer-events-none" aria-hidden="true" />
              <Link to="/buscar" className="pm-tbtn pm-tbtn-solid flex-none"><Compass size={18} aria-hidden="true" />Descubrir más canchas</Link>
            </motion.section>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 py-1 sm:mt-5 pb-2" role="group" aria-label="Ordenar favoritos">
              {SORTS.map(([v, I, label]) => <Chip key={v} active={sort === v} onClick={() => setSort(v)} className="!min-h-11 flex-none"><I size={16} aria-hidden="true" />{label}{v === 'today' && <span className="tnum opacity-80">({withSlots.length})</span>}</Chip>)}
            </div>

            {shown.length === 0
              ? <Empty icon={Clock3} title="Ninguna tiene horarios libres hoy" text="Probá con otro orden o mirá los días siguientes en cada complejo." action={<Button variant="secondary" onClick={() => setSort('recent')}>Ver todas</Button>} />
              : <motion.div layout className="pm-fav-grid mt-3"><AnimatePresence>{shown.map(c => (
                  <motion.div key={c.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .9 }} transition={spring}>{card(c, true)}</motion.div>))}</AnimatePresence>{sort === 'recent' && <AddTile count={shown.length} />}</motion.div>}
          </>
        )}

        {suggested.length > 0 && (
          <section className="mt-9 lg:mt-12" aria-label={favs.length ? 'Te pueden gustar' : 'Para empezar'}>
            <div className="flex items-end justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0"><span className="pm-ico is-sunken"><Sparkles size={20} aria-hidden="true" /></span><div className="min-w-0"><h2 className="display text-2xl font-bold leading-tight">{favs.length ? 'Te pueden gustar' : 'Para empezar'}</h2><p className="text-sm text-muted">Las mejor puntuadas por otros jugadores.</p></div></div>
              <Link to="/buscar" className="text-sm font-semibold text-brand min-h-11 inline-flex items-center flex-none">Ver todas</Link>
            </div>
            <div className="pm-fav-grid">{suggested.map((c, i) => (
              <motion.div key={c.id} className={i === 2 ? 'max-lg:hidden' : undefined} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: .15 + i * .06 }}>{card(c, false)}</motion.div>))}</div>
          </section>)}
      </Content>
    </>
  )
}
