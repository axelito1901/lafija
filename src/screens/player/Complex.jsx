import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Heart, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useStore } from '../../lib/store'
import { REVIEW_TAGS, cancelPolicyText, complexTags, courtsOf, favsOf, freeSlots, getComplex, promoLabel, ratingOf, slotInfo, slotsFor, toggleFav, quote } from '../../lib/domain'
import { isApproved } from '../../lib/domain'
import { addDays, cn, dateHeading, mapsLink, money, telLink, todayISO, waLink } from '../../lib/format'
import { navigate, useRoute } from '../../lib/router'
import { Button, Content, Empty, IconButton, PageHeader, Rating, Section, Skeleton, Stars } from '../../ui/kit'
import { Gallery } from '../../ui/Gallery'
import { TrustPanel, VerifiedBadge } from '../../ui/trust'
const MiniMap = lazy(() => import('../../ui/MapView').then(m => ({ default: m.MiniMap })))
import { DateStrip } from '../../ui/shared'
import { BookSheet, ConfirmedSheet } from './flow'

export default function ComplexPage({ id, preview = false, inShell = true }) {
  const { state, user, update, loading } = useStore()
  const { query } = useRoute()
  const complex = state && getComplex(state, id)
  const [date, setDate] = useState(() => (query.fecha >= todayISO() ? query.fecha : todayISO()))
  const [courtId, setCourtId] = useState(query.cancha || '')
  const [time, setTime] = useState(query.hora || '')
  const [book, setBook] = useState(false)
  const [doneId, setDoneId] = useState('')
  const [allReviews, setAllReviews] = useState(false)
  const now = new Date()

  const courts = useMemo(() => (complex ? courtsOf(state, complex.id).filter(c => c.status !== 'inactive') : []), [state, complex])
  // Cancha elegida: la pedida, o la primera con horarios libres.
  const court = courts.find(c => c.id === courtId && c.status === 'active') || courts.find(c => c.status === 'active' && freeSlots(state, complex, c, date, now).length) || courts.find(c => c.status === 'active')
  useEffect(() => { if (time && court && slotInfo(state, complex, court, date, time).kind !== 'free') setTime('') }, [date, court?.id, state]) // eslint-disable-line

  if (loading || !state) return <><PageHeader back="history" title="" /><Content><Skeleton className="aspect-[16/9] w-full" /><Skeleton className="h-6 w-2/3 mt-4" /></Content></>
  if (!complex || (!preview && (!complex.active || !complex.public || !isApproved(complex)))) {
    return <><PageHeader back="history" title="Complejo" /><Content><Empty title="No encontramos este complejo" text="Puede que ya no esté disponible." action={<Button onClick={() => navigate('/buscar')}>Buscar cancha</Button>} /></Content></>
  }

  const fav = user && favsOf(state, user.id).includes(complex.id)
  const rating = ratingOf(state, complex.id)
  const reviews = state.reviews.filter(r => r.complexId === complex.id && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const topTags = Object.entries(reviews.flatMap(r => r.tags || []).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {})).filter(([t]) => REVIEW_TAGS.good.includes(t)).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const slots = court ? slotsFor(complex).map(t => ({ t, free: slotInfo(state, complex, court, date, t, now).kind === 'free' })) : []
  const freeTotal = slots.filter(s => s.free).length
  const fromPrice = courts.filter(c => c.status === 'active').reduce((m, c) => Math.min(m, c.priceCents), Infinity)
  const freeToday = courts.filter(c => c.status === 'active').reduce((n, c) => n + freeSlots(state, complex, c, todayISO(), now).length, 0)
  const q = court && time ? quote(state, court, date, time, user?.id) : null
  const dayPromos = court ? (state.promotions || []).filter(p => p.active && !p.frequentOnly && p.complexId === complex.id && (!p.courtId || p.courtId === court.id) && (!p.onlyToday || date === todayISO()) && (!p.dateFrom || date >= p.dateFrom) && (!p.dateTo || date <= p.dateTo)) : []

  const reserve = () => {
    if (preview) return
    if (!user) { navigate(`/ingresar?volver=${encodeURIComponent(`/complejo/${complex.slug}?fecha=${date}&cancha=${court.id}&hora=${time}`)}`); return }
    if (user.role !== 'player') return
    setBook(true)
  }
  const canBook = !preview && (!user || user.role === 'player')
  const label = !user ? 'Ingresar para reservar' : 'Reservar'

  return (
    <>
      <PageHeader back={preview ? '/dueno/complejo' : 'history'} title={complex.name}
        actions={user?.role === 'player' && <IconButton label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'} aria-pressed={!!fav} onClick={() => update(s => toggleFav(s, user.id, complex.id))}><Heart size={22} className={fav ? 'fill-current text-danger' : ''} /></IconButton>} />
      {preview && <div className="bg-brand-soft text-brand text-sm font-medium text-center py-2 px-4">Así ven tu complejo los jugadores. Los cambios se guardan en Mi complejo.</div>}
      <Content className={cn(canBook && 'pb-28 lg:pb-6')}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-10">
          <div className="lg:col-start-1">
            <Gallery photos={[complex.coverUrl, ...(complex.gallery || [])].filter(Boolean)} seed={complex.id} alt={`Foto de ${complex.name}`} className="aspect-[4/3] sm:aspect-[16/9] -mx-4 sm:mx-0 sm:rounded-3xl overflow-hidden shadow-[var(--sh-2)]" />
            <div className="mt-4 flex items-start justify-between gap-3">
              <h2 className="text-3xl leading-tight min-w-0 flex items-center gap-2">{complex.name}{complex.verified && <VerifiedBadge label={false} className="[&>svg]:size-6" />}</h2>
              <Rating value={rating.avg} count={rating.count} className="mt-2 flex-none" />
            </div>
            <TrustPanel state={state} complex={complex} className="mt-4" />
            <a href={mapsLink(complex)} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-muted mt-1 hover:text-ink"><MapPin size={18} className="mt-0.5 flex-none" /><span><span className="underline underline-offset-4 decoration-line">{complex.address}</span></span></a>
            {complex.lat != null && <Suspense fallback={<Skeleton className="h-40 mt-4" />}><MiniMap lat={complex.lat} lng={complex.lng} href={mapsLink(complex)} className="h-40 mt-4" /></Suspense>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button as="a" variant="secondary" href={waLink(complex.whatsapp || complex.phone, `Hola, quería consultar por una cancha en ${complex.name}.`)} target="_blank" rel="noreferrer"><MessageCircle size={18} />WhatsApp</Button>
              <Button as="a" variant="secondary" href={telLink(complex.phone)}><Phone size={18} />Llamar</Button>
            </div>

            <h3 className="font-semibold mt-6 mb-2">Canchas</h3>
            <ul className="list">
              {courts.map(c => (
                <li key={c.id} className="row !min-h-14">
                  <span className="flex-1 min-w-0"><span className="block font-medium">{c.name} · {c.sport}</span><span className="block text-sm text-muted truncate">{[c.surface, c.covered && 'Techada', c.status !== 'active' && 'No disponible'].filter(Boolean).join(' · ')}</span></span>
                  <span className="font-semibold tnum flex-none">{money(c.priceCents)}</span>
                </li>
              ))}
            </ul>

            <details className="group mt-4 border-t border-line">
              <summary className="flex items-center justify-between min-h-14 font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden">Más información<span className="text-muted text-xl leading-none transition-transform group-open:rotate-45">+</span></summary>
              {complex.description && <p className="mb-3">{complex.description}</p>}
              <dl className="text-sm space-y-2 pb-4">
                <div className="flex gap-2"><dt className="text-muted w-20 flex-none">Horario</dt><dd>Todos los días de {complex.hours.open} a {complex.hours.close === '00:00' ? '24:00' : complex.hours.close}.</dd></div>
                {complex.services?.length > 0 && <div className="flex gap-2"><dt className="text-muted w-20 flex-none">Servicios</dt><dd>{complex.services.join(', ')}</dd></div>}
                <div className="flex gap-2"><dt className="text-muted w-20 flex-none">Cancelar</dt><dd>{cancelPolicyText(complex)}</dd></div>
              </dl>
            </details>
          </div>

          <section className="hidden lg:block lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-6 lg:border lg:border-line lg:rounded-lg lg:p-5 lg:bg-surface" aria-label="Reservar">
            <h2 className="text-xl">Reservar</h2>
            <p className="text-muted mt-1">Desde <strong className="text-ink tnum">{fromPrice === Infinity ? "—" : money(fromPrice)}</strong> por turno · {courts.filter(c => c.status === 'active').length} canchas</p>
            <p className="text-brand font-semibold mt-1">{freeToday} horarios libres hoy</p>
            {canBook && <Button size="lg" className="w-full mt-4" onClick={() => navigate(`/complejo/${complex.slug}/reservar`)}>Elegir día y horario</Button>}
            <p className="hint">Te guiamos paso a paso: el día, la cancha y la hora.</p>
          </section>

          <Section title={`Reseñas${rating.count ? ` (${rating.count})` : ''}`} className="lg:col-start-1 !mt-0">
            {topTags.length > 0 && <div className="mb-3"><p className="text-sm text-muted mb-1.5">Lo que más destacan</p><div className="flex flex-wrap gap-2">{topTags.map(([t, k]) => <span key={t} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold bg-brand-soft text-brand">{t}<span className="tnum opacity-70">{k}</span></span>)}</div></div>}
            {reviews.length === 0 ? <p className="text-muted">Todavía no hay reseñas.</p> : (
              <ul className="list">
                {reviews.slice(0, allReviews ? 50 : 3).map(r => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3"><span className="font-medium">{r.playerName}</span><Stars n={r.rating} /></div>
                    {r.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{r.tags.map(t => <span key={t} className="text-xs font-medium rounded-full px-2.5 py-1 bg-brand-soft text-brand">{t}</span>)}</div>}
                    {r.text && <p className="text-sm mt-1">{r.text}</p>}
                    {r.reply && <div className="mt-2 pl-3 border-l-2 border-brand"><p className="text-sm font-semibold">Respuesta del complejo</p><p className="text-sm">{r.reply.text}</p></div>}
                  </li>
                ))}
              </ul>
            )}
            {reviews.length > 3 && !allReviews && <Button variant="ghost" className="mt-2" onClick={() => setAllReviews(true)}>Ver las {reviews.length} reseñas</Button>}
          </Section>
        </div>
      </Content>

      {canBook && (
        <div className={cn('lg:hidden fixed inset-x-0 z-20 bg-surface border-t border-line px-4 py-3 flex items-center gap-3', inShell ? 'bottom-[calc(var(--nav-h)+var(--safe-bottom))]' : 'bottom-0 pb-[calc(12px+var(--safe-bottom))]')}>
          <div className="min-w-0 flex-1"><div className="text-sm text-muted">Desde</div><div className="font-semibold tnum">{money(Math.min(...courts.filter(c => c.status === 'active').map(c => c.priceCents), Infinity) === Infinity ? 0 : Math.min(...courts.filter(c => c.status === 'active').map(c => c.priceCents)))} <span className="text-sm font-normal text-muted">/ turno</span></div></div>
          <Button size="lg" onClick={() => navigate(`/complejo/${complex.slug}/reservar`)}>Reservar</Button>
        </div>
      )}

      <BookSheet open={book} onClose={() => setBook(false)} complex={complex} court={court} date={date} time={time} onDone={bid => { setBook(false); setDoneId(bid); setTime('') }} />
      {doneId && <ConfirmedSheet bookingId={doneId} onClose={() => setDoneId('')} />}
    </>
  )
}
