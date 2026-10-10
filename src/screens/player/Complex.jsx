import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Banknote, BriefcaseMedical, Clock3, Coffee, Flame, Heart, Lightbulb, MapPin, MessageCircle, Navigation, Phone, Share2, ShieldCheck, ShowerHead, Shirt, Star, Tag, Umbrella, Wifi, CircleParking, ArrowRight } from 'lucide-react'
import { useStore } from '../../lib/store'
import { REVIEW_TAGS, cancelPolicyText, courtsOf, depositFor, favsOf, freeSlots, getComplex, nextTimes, promoLabel, promoWhen, publicComplexes, ratingLabel, ratingOf, toggleFav } from '../../lib/domain'
import { isApproved } from '../../lib/domain'
import { addDays, cn, dateShort, distanceKm, kmLabel, mapsLink, money, plural, relativeDay, telLink, todayISO, waLink } from '../../lib/format'
import { Link, navigate, useRoute } from '../../lib/router'
import { Avatar, Button, Content, Empty, IconButton, PageHeader, Rating, Skeleton, Stars, useToast } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { Gallery, GalleryMosaic } from '../../ui/Gallery'
import { ReviewSummary, TrustPanel, VerifiedBadge } from '../../ui/trust'
import { CountUp, Reveal } from '../../ui/motion'
const MiniMap = lazy(() => import('../../ui/MapView').then(m => ({ default: m.MiniMap })))
import { DateStrip, complexView, futureDay } from '../../ui/shared'
import './jugador.css'

const SERVICE_ICON = { Vestuarios: Shirt, Duchas: ShowerHead, Estacionamiento: CircleParking, Buffet: Coffee, Parrilla: Flame, 'Wi-Fi': Wifi, 'Alquiler de pecheras': Shirt, Botiquín: BriefcaseMedical }
const FACT = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-sunken'

/* Otro complejo cerca de éste (PC). */
function NearbyCard({ c }) {
  return (
    <Link to={`/complejo/${c.slug}`} aria-label={`${c.name}, a ${c.away} de acá`} className="group block rounded-2xl overflow-hidden bg-surface border border-line shadow-[var(--sh-1)] pj-lift">
      <div className="relative">
        <Cover src={c.coverUrl} seed={c.id} className="aspect-[16/10] [&>img]:transition-transform [&>img]:duration-700 group-hover:[&>img]:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {c.ratingCount > 0 && <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 text-white text-sm font-semibold bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1"><Star size={13} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" />{ratingLabel(c.rating)}</span>}
      </div>
      <div className="p-4 flex items-end justify-between gap-3">
        <div className="min-w-0"><p className="display text-xl font-bold leading-tight flex items-center gap-1.5 min-w-0"><span className="truncate">{c.name}</span>{c.verified && <VerifiedBadge label={false} className="flex-none" />}</p><p className="text-sm text-muted truncate inline-flex items-center gap-1 max-w-full"><MapPin size={13} className="flex-none" aria-hidden="true" /><span className="truncate">A {c.away} de acá</span></p></div>
        {c.fromPrice != null && <div className="flex-none text-right"><p className="text-xs text-muted leading-none">desde</p><p className="display text-lg font-bold tnum leading-tight">{money(c.fromPrice)}</p></div>}
      </div>
    </Link>
  )
}

export default function ComplexPage({ id, preview = false, inShell = true }) {
  const { state, user, update, loading } = useStore()
  const { query } = useRoute()
  const complex = state && getComplex(state, id)
  const [dateSel, setDate] = useState(() => futureDay(query.fecha))
  const [allReviews, setAllReviews] = useState(false)
  const toast = useToast()
  const now = new Date()

  const courts = useMemo(() => (complex ? courtsOf(state, complex.id).filter(c => c.status !== 'inactive') : []), [state, complex])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [id])

  if (loading || !state) return <><PageHeader back="history" title="" /><Content><Skeleton className="aspect-[16/9] w-full" /><Skeleton className="h-6 w-2/3 mt-4" /></Content></>
  if (!complex || (!preview && (!complex.active || !complex.public || !isApproved(complex)))) {
    return <><PageHeader back="history" title="Complejo" /><Content><Empty title="No encontramos este complejo" text="Puede que ya no esté disponible." action={<Button onClick={() => navigate('/buscar')}>Buscar cancha</Button>} /></Content></>
  }

  const fav = user && favsOf(state, user.id).includes(complex.id)
  const rating = ratingOf(state, complex.id)
  const reviews = state.reviews.filter(r => r.complexId === complex.id && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const topTags = Object.entries(reviews.flatMap(r => r.tags || []).reduce((m, t) => ({ ...m, [t]: (m[t] || 0) + 1 }), {})).filter(([t]) => REVIEW_TAGS.good.includes(t)).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const active = courts.filter(c => c.status === 'active')
  const fromPrice = active.reduce((m, c) => Math.min(m, c.priceCents), Infinity)
  const freeToday = active.reduce((n, c) => n + freeSlots(state, complex, c, todayISO(), now).length, 0)
  // Sin fecha pedida: arrancamos en el primer día con horarios libres.
  const date = dateSel || Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i)).find(d => active.some(c => freeSlots(state, complex, c, d, now).length)) || todayISO()
  const times = nextTimes(state, complex, date, 8, now)
  const days = [...new Set(active.map(c => c.sport))]
  const close = complex.hours.close === '00:00' ? '24:00' : complex.hours.close
  const cfg = complex.booking || {}
  const promos = (state.promotions || []).filter(p => p.active && p.complexId === complex.id && (!p.dateTo || p.dateTo >= todayISO()))
  const canBook = !preview && (!user || user.role === 'player')
  const photos = [complex.coverUrl, ...(complex.gallery || [])].filter(Boolean)
  const shown = reviews.slice(0, allReviews ? 50 : 4)
  const wizard = (q = '') => `/complejo/${complex.slug}/reservar${q}`
  // Compartir: el menú del celular si existe; si no, copia el link al portapapeles.
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/complejo/${complex.slug}`
    try { if (navigator.share) { await navigator.share({ title: complex.name, text: `Mirá ${complex.name} en La Fija`, url }); return } } catch (e) { if (e?.name === 'AbortError') return }
    try { await navigator.clipboard.writeText(url); toast('Link copiado. Pasáselo al grupo.') } catch { toast('No pudimos copiar el link.', 'error') }
  }
  // Otros complejos cerca de éste: sale de las coordenadas reales, sin cargar nada a mano.
  const others = preview ? [] : publicComplexes(state).filter(c => c.id !== complex.id)
    .map(c => ({ ...complexView(state, c, null), km: distanceKm(complex, c) })).filter(c => c.km != null)
    .sort((a, b) => a.km - b.km).slice(0, 4).map(c => ({ ...c, away: kmLabel(c.km) }))

  return (
    <div className="pj-wide contents">
      <PageHeader back={preview ? '/dueno/complejo' : 'history'} title={complex.name}
        actions={user?.role === 'player' && <IconButton label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'} aria-pressed={!!fav} onClick={() => update(s => toggleFav(s, user.id, complex.id))}><Heart size={22} className={fav ? 'fill-current text-danger' : ''} /></IconButton>} />
      {preview && <div className="bg-brand-soft text-brand text-sm font-medium text-center py-2 px-4">Así ven tu complejo los jugadores. Los cambios se guardan en Mi complejo.</div>}
      <Content className={cn('max-w-[1480px]', canBook && 'pb-28 lg:pb-6')}>
        <Gallery photos={photos} seed={complex.id} alt={`Foto de ${complex.name}`} className="lg:hidden aspect-[4/3] sm:aspect-[16/9] -mx-4 sm:mx-0 sm:rounded-3xl overflow-hidden shadow-[var(--sh-2)]" />
        <GalleryMosaic photos={photos} seed={complex.id} alt={`Foto de ${complex.name}`} className="hidden lg:block h-[clamp(280px,40dvh,340px)] xl:h-[clamp(300px,44dvh,400px)] 2xl:h-[clamp(340px,48dvh,460px)]" />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-4 lg:gap-y-9 mt-4 lg:mt-8 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-x-12 xl:items-start">
          <div className="contents xl:flex xl:flex-col xl:gap-9 xl:min-w-0 xl:col-start-1 xl:row-start-1">
            {/* Título */}
            <div className="lg:order-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-3xl lg:text-5xl lg:font-bold leading-tight min-w-0 flex items-center gap-2">{complex.name}{complex.verified && <VerifiedBadge label={false} className="[&>svg]:size-6 lg:[&>svg]:size-8" />}</h2>
                <Rating value={rating.avg} count={rating.count} className="mt-2 flex-none lg:hidden" />
                <Button variant="secondary" size="sm" className="hidden lg:inline-flex flex-none !min-h-11 mt-1" onClick={share} aria-label={`Compartir ${complex.name}`}><Share2 size={16} aria-hidden="true" />Compartir</Button>
              </div>
              <div className="hidden lg:flex items-center gap-3 mt-2 text-muted flex-wrap">
                {rating.count > 0 && <span className="inline-flex items-center gap-1.5 text-ink font-semibold"><Star size={18} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" /><span className="tnum">{rating.avg.toFixed(1).replace('.', ',')}</span><span className="text-muted font-normal tnum">({plural(rating.count, 'reseña', 'reseñas')})</span></span>}
                <a href={mapsLink(complex)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink"><MapPin size={17} aria-hidden="true" /><span className="underline underline-offset-4 decoration-line">{complex.address}</span></a>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={FACT}><Clock3 size={15} className="text-brand" aria-hidden="true" />Abierto de {complex.hours.open} a {close}</span>
                <span className={FACT}>{plural(active.length, 'cancha', 'canchas')}{days.length > 0 && ` · ${days.join(', ')}`}</span>
                {fromPrice !== Infinity && <span className={FACT}><Banknote size={15} className="text-brand" aria-hidden="true" />Desde <strong className="tnum">{money(fromPrice)}</strong></span>}
              </div>
            </div>

            <TrustPanel state={state} complex={complex} className="lg:order-3" />

            {/* Ubicación y contacto */}
            <section aria-label="Ubicación" className="lg:order-6 pj-lg-card lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              <div className="lg:p-6 lg:flex lg:flex-col lg:justify-center">
                <h2 className="hidden lg:block text-2xl font-bold">Dónde queda</h2>
                <a href={mapsLink(complex)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-11 text-muted hover:text-ink lg:hidden"><MapPin size={18} className="flex-none" aria-hidden="true" /><span><span className="underline underline-offset-4 decoration-line">{complex.address}</span></span></a>
                <p className="hidden lg:block text-muted mt-2">{complex.address}</p>
                <Button as="a" variant="secondary" href={mapsLink(complex)} target="_blank" rel="noreferrer" className="hidden lg:inline-flex self-start mt-4"><Navigation size={16} />Cómo llegar</Button>
              </div>
              {complex.lat != null && <Suspense fallback={<Skeleton className="h-40 mt-4 lg:mt-0 lg:h-full lg:min-h-60" />}><MiniMap lat={complex.lat} lng={complex.lng} href={mapsLink(complex)} className="h-40 mt-4 lg:mt-0 lg:h-full lg:min-h-60 lg:!rounded-none lg:!border-0" /></Suspense>}
              <div className="grid grid-cols-2 gap-2 mt-4 lg:hidden">
                <Button as="a" variant="secondary" href={waLink(complex.whatsapp || complex.phone, `Hola, quería consultar por una cancha en ${complex.name}.`)} target="_blank" rel="noreferrer"><MessageCircle size={18} />WhatsApp</Button>
                <Button as="a" variant="secondary" href={telLink(complex.phone)}><Phone size={18} />Llamar</Button>
              </div>
            </section>

            {/* Canchas */}
            <section aria-labelledby="canchas" className="lg:order-5 mt-2 lg:mt-0">
              <h2 id="canchas" className="text-base font-semibold mb-2 lg:text-3xl lg:font-bold lg:mb-4">Canchas</h2>
              <ul className="list lg:!border-0 lg:!shadow-none lg:!bg-transparent lg:!overflow-visible lg:space-y-4">
                {courts.map((c, idx) => {
                  const on = c.status === 'active', n = on ? freeSlots(state, complex, c, todayISO(), now).length : 0
                  const meta = [c.surface, c.covered && 'Techada', !on && 'No disponible'].filter(Boolean).join(' · ')
                  return (
                    <li key={c.id} className="lg:flex lg:rounded-2xl lg:!border lg:bg-surface lg:overflow-hidden lg:shadow-[var(--sh-1)] pj-lg-lift">
                      <div className="hidden lg:block relative w-44 xl:w-56 flex-none">
                        <Cover src={c.photo || photos[idx % Math.max(photos.length, 1)]} seed={c.id} className="absolute inset-0" />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                        <span className="absolute left-3 bottom-3 text-white text-sm font-semibold bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">{c.sport}</span>
                      </div>
                      <div className="row !min-h-14 lg:!min-h-0 lg:!px-5 lg:!py-4 lg:flex-1 lg:!gap-4">
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium lg:font-display lg:text-2xl lg:font-bold lg:leading-tight">{c.name}<span className="lg:hidden"> · {c.sport}</span></span>
                          <span className="block text-sm text-muted truncate lg:hidden">{meta}</span>
                          <span className="hidden lg:flex flex-wrap gap-1.5 mt-2.5">
                            {c.surface && <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-sunken text-muted">{c.surface}</span>}
                            {c.covered && <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-sunken text-muted"><Umbrella size={12} aria-hidden="true" />Techada</span>}
                            {c.lighting && <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-sunken text-muted"><Lightbulb size={12} aria-hidden="true" />Luz</span>}
                            {(c.features || []).slice(0, 2).map(f => <span key={f} className="text-xs font-medium rounded-full px-2.5 py-1 bg-sunken text-muted">{f}</span>)}
                            {!on && <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-warn-soft text-warn">No disponible</span>}
                          </span>
                        </span>
                        <span className="flex-none text-right">
                          <span className="block font-semibold tnum lg:font-display lg:text-3xl lg:font-bold lg:leading-none">{money(c.priceCents)}</span>
                          <span className="hidden lg:block text-sm mt-1 text-muted">por turno</span>
                          {on && <span className={cn('hidden lg:block text-sm font-medium', n ? 'text-brand' : 'text-muted')}>{n ? `${n} libres hoy` : 'Sin turnos hoy'}</span>}
                        </span>
                        {canBook && on && <Link to={wizard(`?cancha=${c.id}&fecha=${date}`)} aria-label={`Reservar ${c.name}`} className="hidden lg:grid place-items-center size-11 rounded-xl flex-none bg-brand-soft text-brand hover:bg-[image:var(--grad-brand)] hover:text-[var(--on-grad)] transition-colors"><ArrowRight size={20} aria-hidden="true" /></Link>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Más información (celular) */}
            <details className="group border-t border-line lg:hidden">
              <summary className="flex items-center justify-between min-h-14 font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden">Más información<span className="text-muted text-xl leading-none transition-transform group-open:rotate-45">+</span></summary>
              {complex.description && <p className="mb-3">{complex.description}</p>}
              <dl className="text-sm space-y-2 pb-4">
                <div className="flex gap-2"><dt className="text-muted w-20 flex-none">Horario</dt><dd>Todos los días de {complex.hours.open} a {close}.</dd></div>
                {complex.services?.length > 0 && <div className="flex gap-2"><dt className="text-muted w-20 flex-none">Servicios</dt><dd>{complex.services.join(', ')}</dd></div>}
                <div className="flex gap-2"><dt className="text-muted w-20 flex-none">Cancelar</dt><dd>{cancelPolicyText(complex)}</dd></div>
              </dl>
            </details>

            {/* Sobre el complejo (PC) */}
            <section className="hidden lg:block lg:order-4 @container" aria-labelledby="sobre">
              <h2 id="sobre" className="text-3xl font-bold">Sobre {complex.name}</h2>
              {complex.description && <p className="mt-3 text-lg text-muted leading-relaxed max-w-3xl">{complex.description}</p>}
              {complex.services?.length > 0 && <ul className="flex flex-wrap gap-2 mt-5" aria-label="Servicios">{complex.services.map(s => { const I = SERVICE_ICON[s] || ShieldCheck; return <li key={s} className="inline-flex items-center gap-2 rounded-xl bg-surface border border-line px-3.5 py-2 text-sm font-medium shadow-[var(--sh-1)]"><I size={16} className="text-brand" aria-hidden="true" />{s}</li> })}</ul>}
              <dl className="grid gap-3 mt-5 @2xl:grid-cols-3">
                {[[Clock3, 'Horario', `Todos los días de ${complex.hours.open} a ${close}.`], [ShieldCheck, 'Cancelación', cancelPolicyText(complex)], [Banknote, 'Cómo se paga', cfg.depositRequired && fromPrice !== Infinity ? `Seña de ${money(depositFor(complex, fromPrice))} online; el resto en la cancha.${cfg.allowFullPayment ? ' También podés pagar todo.' : ''}` : 'Reservás sin pagar ahora: se abona en la cancha.']].map(([I, k, v]) => (
                  <div key={k} className="pj-soft p-4"><dt className="inline-flex items-center gap-2 text-sm font-semibold"><span className="grid place-items-center size-8 rounded-lg bg-brand-soft text-brand"><I size={16} aria-hidden="true" /></span>{k}</dt><dd className="text-sm text-muted mt-2">{v}</dd></div>))}
              </dl>
            </section>

            {/* Reseñas */}
            <section aria-labelledby="resenas" className="lg:order-7 @container">
              <h2 id="resenas" className="text-base font-semibold mb-3 lg:text-3xl lg:font-bold lg:mb-4">Reseñas{rating.count ? ` (${rating.count})` : ''}</h2>
              {reviews.length === 0 ? <Empty icon={Star} title="Todavía no hay reseñas" text="Cuando alguien juegue acá, vas a ver su opinión." className="pj-soft !py-8" /> : (
                <>
                  <ReviewSummary reviews={reviews} avg={rating.avg} tags={topTags} className="mb-4" />
                  <div className="@xl:grid @xl:grid-cols-2 @xl:gap-3">
                    <ul className="list @xl:contents">
                      {shown.map(r => (
                        <li key={r.id} className="px-4 py-3 @xl:rounded-2xl @xl:!border @xl:bg-surface @xl:p-4 @xl:shadow-[var(--sh-1)] @xl:self-start">
                          <div className="flex items-center gap-3"><Avatar name={r.playerName} size={36} /><span className="min-w-0 flex-1"><span className="block font-medium truncate leading-tight">{r.playerName}</span><span className="block text-xs text-muted tnum">{dateShort(r.createdAt.slice(0, 10))}</span></span><Stars n={r.rating} /></div>
                          {r.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2.5">{r.tags.map(t => <span key={t} className="text-xs font-medium rounded-full px-2.5 py-1 bg-brand-soft text-brand">{t}</span>)}</div>}
                          {r.text && <p className="text-sm mt-2">{r.text}</p>}
                          {r.reply && <div className="mt-2.5 pl-3 border-l-2 border-brand"><p className="text-sm font-semibold">Respuesta del complejo</p><p className="text-sm">{r.reply.text}</p></div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {reviews.length > 4 && !allReviews && <Button variant="secondary" className="mt-3 w-full lg:w-auto" onClick={() => setAllReviews(true)}>Ver las {reviews.length} reseñas</Button>}
            </section>
          </div>

          {/* Panel de reserva (PC) */}
          <aside className="hidden lg:block lg:order-2 xl:order-none xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1" aria-label="Reservar">
            <Reveal y={10}>
              <div className="pj-panel overflow-hidden">
                <div className="hero !rounded-none !shadow-none p-5 pb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />{freeToday ? `${plural(freeToday, 'horario libre', 'horarios libres')} hoy` : 'Sin horarios hoy'}</p>
                  <p className="mt-3 text-sm opacity-85">Desde</p>
                  <p className="display text-5xl font-bold tnum leading-none">{fromPrice === Infinity ? '—' : <CountUp value={money(fromPrice)} />}<span className="text-base font-medium opacity-80"> / turno</span></p>
                  <p className="text-sm opacity-85 mt-2">{plural(active.length, 'cancha', 'canchas')} · {days.join(' y ') || 'Fútbol'}</p>
                </div>
                <div className="p-5">
                  <p className="label">Elegí el día</p>
                  <DateStrip value={date} onChange={setDate} days={14} />
                  <p className="label mt-4">Horarios libres · {relativeDay(date)}</p>
                  {times.length > 0
                    ? <div className="grid grid-cols-4 sm:grid-cols-8 xl:grid-cols-4 gap-2">{times.map(s => canBook
                      ? <Link key={s.t} to={wizard(`?fecha=${date}&cancha=${s.courtId}&hora=${s.t}`)} className="chip !min-h-11 !px-0 justify-center tnum">{s.t}</Link>
                      : <span key={s.t} className="chip !min-h-11 !px-0 justify-center tnum">{s.t}</span>)}</div>
                    : <p className="text-sm text-muted pj-soft p-3">No quedan horarios libres ese día. Probá con otro.</p>}
                  {canBook && <Button size="lg" className="w-full mt-4" onClick={() => navigate(wizard(`?fecha=${date}`))}>Elegir cancha y horario</Button>}
                  <p className="hint text-center">Te guiamos paso a paso: el día, la cancha y la hora.</p>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button as="a" variant="secondary" size="sm" href={waLink(complex.whatsapp || complex.phone, `Hola, quería consultar por una cancha en ${complex.name}.`)} target="_blank" rel="noreferrer"><MessageCircle size={16} />WhatsApp</Button>
                    <Button as="a" variant="secondary" size="sm" href={telLink(complex.phone)}><Phone size={16} />Llamar</Button>
                  </div>
                </div>
                {promos.length > 0 && (
                  <div className="px-5 pb-5">
                    <p className="label inline-flex items-center gap-1.5"><Tag size={14} className="text-brand" aria-hidden="true" />Promos vigentes</p>
                    <ul className="space-y-2">{promos.slice(0, 3).map(p => (
                      <li key={p.id} className="flex items-center gap-3 rounded-xl bg-brand-soft px-3 py-2.5"><span className="font-display font-bold text-brand text-lg leading-none flex-none tnum">{promoLabel(p)}</span><span className="min-w-0 text-sm"><span className="block font-semibold truncate">{p.name}</span><span className="block text-muted truncate">{promoWhen(p)}</span></span></li>))}</ul>
                  </div>
                )}
                <div className="border-t border-line px-5 py-4 text-sm text-muted flex gap-2.5"><ShieldCheck size={18} className="flex-none text-brand mt-0.5" aria-hidden="true" /><p>{cancelPolicyText(complex)}</p></div>
              </div>
            </Reveal>
          </aside>
        </div>

        {others.length > 0 && (
          <section aria-labelledby="cerca" className="hidden lg:block mt-14">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div className="min-w-0"><h2 id="cerca" className="text-3xl font-bold">Otros complejos cerca</h2><p className="text-muted mt-0.5">A pocos minutos de {complex.name}.</p></div>
              <Link to="/buscar" className="btn btn-link flex-none">Ver todos<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{others.map(c => <NearbyCard key={c.id} c={c} />)}</div>
          </section>
        )}
      </Content>

      {canBook && (
        <div className={cn('lg:hidden fixed inset-x-0 z-20 bg-surface border-t border-line px-4 py-3 flex items-center gap-3', inShell ? 'bottom-[calc(var(--nav-h)+var(--safe-bottom))]' : 'bottom-0 pb-[calc(12px+var(--safe-bottom))]')}>
          <div className="min-w-0 flex-1"><div className="text-sm text-muted">Desde</div><div className="font-semibold tnum">{fromPrice === Infinity ? money(0) : money(fromPrice)} <span className="text-sm font-normal text-muted">/ turno</span></div></div>
          <Button size="lg" onClick={() => navigate(wizard())}>Reservar</Button>
        </div>
      )}
    </div>
  )
}
