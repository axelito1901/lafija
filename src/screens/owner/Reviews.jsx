import { useId, useMemo, useState } from 'react'
import { AnimatePresence, m as motion } from 'motion/react'
import { ArrowRight, CheckCheck, CornerDownRight, MessageSquareReply, Search, Star, Tags, ThumbsUp, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { notify, ratingOf, REVIEW_TAGS } from '../../lib/domain'
import { addDays, cn, dateShort, todayISO } from '../../lib/format'
import { CountUp, Item, Reveal, Stagger } from '../../ui/motion'
import { Avatar, Button, Chip, Field, Segmented, Stars, Status, Textarea, useToast } from '../../ui/kit'
import { OwnerPage, useOwner } from './common'

const avgText = n => n.toFixed(1).replace('.', ',')
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`
const TABS = [{ value: 'all', label: 'Todas' }, { value: 'open', label: 'Sin responder' }, { value: 'low', label: '1-3 ★' }]
const WORD = ['', 'Malo', 'Regular', 'Bien', 'Muy bien', 'Excelente']
const ACCENT = n => (n >= 4 ? 'var(--brand)' : n === 3 ? 'var(--gold)' : 'var(--danger)')
const SUGGEST = {
  good: [['Agradecer', '¡Gracias por tu reseña! Nos alegra que la hayan pasado bien. Te esperamos de nuevo.'], ['Invitar a volver', '¡Gracias por elegirnos! Cuando quieran, la cancha los espera.']],
  bad: [['Pedir disculpas', 'Lamentamos que no haya sido la experiencia que esperabas. Ya lo estamos revisando para mejorar.'], ['Ofrecer contacto', 'Gracias por avisarnos. Escribinos por WhatsApp y lo resolvemos.']],
}
const when = iso => {
  const day = iso.slice(0, 10), n = Math.round((new Date(`${todayISO()}T12:00:00`) - new Date(`${day}T12:00:00`)) / 86400000)
  return n <= 0 ? 'Hoy' : n === 1 ? 'Ayer' : n <= 30 ? `Hace ${n} días` : dateShort(day)
}

/* Cuántas veces aparece cada etiqueta en las reseñas visibles. */
function tagCounts(list) {
  const m = new Map()
  for (const r of list) for (const t of r.tags || []) m.set(t, (m.get(t) || 0) + 1)
  const rank = ([, a], [, b]) => b - a
  const all = [...m.entries()].sort(rank)
  return { good: all.filter(([t]) => REVIEW_TAGS.good.includes(t)), bad: all.filter(([t]) => REVIEW_TAGS.bad.includes(t)), other: all.filter(([t]) => !REVIEW_TAGS.good.includes(t) && !REVIEW_TAGS.bad.includes(t)), total: all.length }
}

function TagPill({ tag, n, tone, on, onClick }) {
  const tones = { good: 'bg-brand-soft text-brand', bad: 'bg-warn-soft text-warn', other: 'bg-sunken text-ink' }
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn('inline-flex items-center gap-2 rounded-full pl-3 pr-1.5 min-h-9 text-sm font-medium transition-[transform,box-shadow] active:scale-95 hover:shadow-[var(--sh-2)]', on ? 'bg-[image:var(--grad-brand)] text-[var(--on-grad)]' : tones[tone])}>
      {tag}<span className={cn('grid place-items-center min-w-6 h-6 px-1.5 rounded-full text-xs font-semibold tnum', on ? 'bg-white/25' : 'bg-surface/70')}>{n}</span>
    </button>
  )
}

function Summary({ list, avg, star, onStar, onOpen }) {
  const byStar = [5, 4, 3, 2, 1].map(n => ({ n, k: list.filter(r => r.rating === n).length }))
  const open = list.filter(r => !r.reply).length
  const answered = list.length ? Math.round(((list.length - open) / list.length) * 100) : 0
  const fresh = list.filter(r => r.createdAt.slice(0, 10) >= addDays(todayISO(), -30)).length
  const five = list.length ? Math.round((byStar[0].k / list.length) * 100) : 0
  return (
    <div className="hero p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 xl:grid-cols-1 xl:gap-5">
        <div className="flex sm:flex-col items-center sm:items-start xl:flex-row xl:items-end gap-x-5 gap-y-2">
          <div className="display text-6xl sm:text-7xl font-bold tnum leading-none"><CountUp value={avgText(avg)} /></div>
          <div className="min-w-0">
            <div className="flex gap-0.5" role="img" aria-label={`${avgText(avg)} de 5 estrellas`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={18} aria-hidden="true" className={n <= Math.round(avg) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-white/40'} />)}</div>
            <p className="text-sm opacity-90 mt-1 tnum">{pl(list.length, 'reseña', 'reseñas')}</p>
          </div>
        </div>
        <div className="space-y-0.5 min-w-0 self-center" role="group" aria-label="Filtrar por estrellas">
          {byStar.map(({ n, k }, i) => (
            <button key={n} type="button" aria-pressed={star === n} aria-label={`${pl(n, 'estrella', 'estrellas')}: ${pl(k, 'reseña', 'reseñas')}`} onClick={() => onStar(star === n ? null : n)}
              className={cn('w-full flex items-center gap-2.5 min-h-8 rounded-lg px-2 -mx-2 text-sm tnum transition-colors hover:bg-white/10', star === n && 'bg-white/20')}>
              <span className="w-3 text-right font-semibold">{n}</span><Star size={12} aria-hidden="true" className="fill-[var(--gold)] text-[var(--gold)] flex-none" />
              <span className="flex-1 h-2 rounded-full bg-white/25 overflow-hidden"><motion.span className="block h-full bg-white rounded-full" initial={{ width: 0 }} animate={{ width: `${list.length ? (k / list.length) * 100 : 0}%` }} transition={{ duration: .8, delay: .1 + i * .06, ease: [.2, .8, .2, 1] }} /></span>
              <span className="w-5 text-right opacity-90">{k}</span>
            </button>))}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 mt-5">
        {[['5 estrellas', `${five}%`], ['Último mes', fresh], ['Respondidas', `${answered}%`]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/15 px-3 py-2 min-w-0"><dt className="text-[11px] uppercase tracking-wider opacity-80 truncate">{k}</dt><dd className="display text-xl font-bold tnum"><CountUp value={String(v)} /></dd></div>))}
      </dl>
      {open > 0 && <button type="button" onClick={onOpen} className="mt-3 w-full min-h-11 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[.98] transition inline-flex items-center justify-center gap-2 font-semibold"><MessageSquareReply size={18} aria-hidden="true" />Responder {pl(open, 'pendiente', 'pendientes')}<ArrowRight size={16} aria-hidden="true" /></button>}
    </div>
  )
}

function Mentions({ tags, tag, onTag, className }) {
  const groups = [['good', 'Lo que destacan', tags.good], ['bad', 'Para mejorar', tags.bad], ['other', 'Otras', tags.other]].filter(g => g[2].length)
  return (
    <section aria-labelledby="menc" className={cn('rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-4 sm:p-5', className)}>
      <div className="flex items-center gap-3">
        <span className="size-10 rounded-xl grid place-items-center flex-none bg-brand-soft text-brand"><Tags size={20} aria-hidden="true" /></span>
        <div className="min-w-0"><h2 id="menc" className="text-lg leading-tight">Lo más mencionado</h2><p className="text-sm text-muted">{tags.total ? 'Tocá una etiqueta para filtrar' : 'Qué dicen los jugadores'}</p></div>
      </div>
      {tags.total ? (
        <div className="mt-4 space-y-4">{groups.map(([tone, title, items]) => (
          <div key={tone}><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{title}</h3>
            <div className="flex flex-wrap gap-2">{items.map(([t, n]) => <TagPill key={t} tag={t} n={n} tone={tone} on={tag === t} onClick={() => onTag(tag === t ? null : t)} />)}</div></div>))}</div>
      ) : <p className="mt-4 text-sm text-muted rounded-xl bg-sunken p-4">Cuando los jugadores sumen etiquetas como “Buena iluminación” o “Empezamos a horario”, vas a ver acá qué destacan y qué mejorar.</p>}
    </section>
  )
}

function ReviewCard({ r, editing, text, setText, onEdit, onCancel, onSave }) {
  const sid = useId()
  const hint = r.rating >= 4 ? SUGGEST.good : SUGGEST.bad
  const unanswered = !r.reply
  const t = text.trim()
  return (
    <article className="rounded-2xl bg-surface border border-line border-l-[3px] shadow-[var(--sh-1)] p-4 sm:p-5 card-lift" style={{ borderLeftColor: ACCENT(r.rating) }} aria-label={`Reseña de ${r.playerName}, ${r.rating} de 5`}>
      <div className="flex items-start gap-3">
        <Avatar name={r.playerName} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><p className="font-semibold truncate">{r.playerName}</p><Stars n={r.rating} /></div>
          <p className="text-sm text-muted flex flex-wrap items-center gap-x-3 gap-y-0.5"><span>{when(r.createdAt)} · {WORD[r.rating]}</span>{unanswered && <Status tone={r.rating <= 3 ? 'warn' : 'muted'}>Sin responder</Status>}</p>
        </div>
      </div>
      {r.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{r.tags.map(x => <span key={x} className={cn('text-xs font-medium rounded-full px-2.5 py-1', REVIEW_TAGS.bad.includes(x) ? 'bg-warn-soft text-warn' : REVIEW_TAGS.good.includes(x) ? 'bg-brand-soft text-brand' : 'bg-sunken text-muted')}>{x}</span>)}</div>}
      {r.text ? <p className="mt-3 text-[15px] leading-relaxed">{r.text}</p> : <p className="mt-3 text-sm text-muted italic">Sin comentario, solo calificó.</p>}

      {r.reply && !editing && (
        <div className="mt-4 rounded-xl bg-brand-soft/70 border-l-2 border-brand p-3 pl-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand inline-flex items-center gap-1.5"><CornerDownRight size={14} aria-hidden="true" />Tu respuesta · {when(r.reply.at)}</p>
          <p className="text-sm mt-1">{r.reply.text}</p>
        </div>)}

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div key="composer" className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25, ease: [.2, .8, .2, 1] }}>
            <div className="pt-4" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }}>
              <Field label="Tu respuesta" hint="La ven todos los jugadores. Respondé con respeto y sin datos personales.">
                <Textarea value={text} maxLength={300} rows={3} onChange={e => setText(e.target.value)} autoFocus aria-describedby={`${sid}-n`} />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Respuestas sugeridas">{hint.map(([k, v]) => <Chip key={k} onClick={() => setText(v)}>{k}</Chip>)}</div>
                <span id={`${sid}-n`} className="text-sm text-muted tnum">{text.length}/300</span>
              </div>
              <div className="flex flex-wrap justify-end gap-2 mt-3">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button onClick={onSave} disabled={!t && !r.reply}>{!t && r.reply ? 'Eliminar respuesta' : 'Publicar respuesta'}</Button>
              </div>
            </div>
          </motion.div>)}
      </AnimatePresence>

      {!editing && <div className="mt-4"><Button variant={r.reply ? 'ghost' : 'secondary'} className={r.reply ? '-ml-3' : ''} onClick={onEdit}><MessageSquareReply size={18} aria-hidden="true" />{r.reply ? 'Editar respuesta' : 'Responder'}</Button></div>}
    </article>
  )
}

export default function OwnerReviews() {
  const { state, update } = useStore()
  const { complex } = useOwner()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [star, setStar] = useState(null)
  const [tag, setTag] = useState(null)
  const [edit, setEdit] = useState(null)
  const [text, setText] = useState('')
  const list = useMemo(() => (complex ? state.reviews.filter(r => r.complexId === complex.id && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [state.reviews, complex])
  const r0 = complex ? ratingOf(state, complex.id) : { avg: 0, count: 0 }
  const tags = useMemo(() => tagCounts(list), [list])
  const shown = list.filter(r => (tab === 'all' || (tab === 'open' ? !r.reply : r.rating <= 3)) && (star == null || r.rating === star) && (tag == null || r.tags?.includes(tag)))
  const counts = { all: list.length, open: list.filter(r => !r.reply).length, low: list.filter(r => r.rating <= 3).length }
  const filtered = tab !== 'all' || star != null || tag != null
  const reset = () => { setTab('all'); setStar(null); setTag(null) }
  const save = r => {
    const t = text.trim()
    update(s => { const x = s.reviews.find(v => v.id === r.id); if (t) { x.reply = { text: t, at: new Date().toISOString() }; notify(s, { userId: x.playerId, type: 'review_reply', title: 'El complejo te respondió', text: `${complex?.name || 'El complejo'} respondió tu reseña.`, complexId: x.complexId, link: `/complejo/${complex?.slug}` }) } else delete x.reply })
    toast(t ? 'Respuesta publicada.' : 'Respuesta eliminada.'); setEdit(null)
  }
  const tabs = TABS.map(o => ({ ...o, label: <>{o.label}<span className="hidden sm:inline tnum opacity-60 ml-1.5">{counts[o.value]}</span></> }))

  return (
    <OwnerPage title="Reseñas" sub={complex && r0.count ? `${avgText(r0.avg)} de promedio · ${pl(r0.count, 'reseña', 'reseñas')}` : ''} wide>
      {complex && (list.length === 0 ? (
        <Reveal>
          <div className="rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-6 sm:p-10">
            <div className="max-w-xl mx-auto text-center">
              <span className="mx-auto mb-4 grid place-items-center size-16 rounded-2xl bg-brand-soft text-brand float-y"><Star size={30} strokeWidth={1.75} aria-hidden="true" /></span>
              <h2 className="text-2xl">Todavía no hay reseñas</h2>
              <p className="text-muted mt-1">Los jugadores pueden calificar después de jugar. Cuando lleguen las primeras, las ves y respondés desde acá.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3 mt-8">
              {[[ThumbsUp, 'Se juega el turno', 'Cuando termina, el jugador recibe un aviso.'], [Star, 'Califican', 'Les pedimos la calificación 30 minutos después del partido.'], [MessageSquareReply, 'Vos respondés', 'Una respuesta a tiempo suma confianza.']].map(([I, t, d], i) => (
                <li key={t} className="rounded-xl bg-sunken p-4"><span className="size-9 rounded-xl grid place-items-center bg-surface text-brand shadow-[var(--sh-1)]"><I size={18} aria-hidden="true" /></span><p className="font-semibold mt-3"><span className="text-muted tnum mr-1.5">{i + 1}.</span>{t}</p><p className="text-sm text-muted mt-0.5">{d}</p></li>))}
            </ol>
          </div>
        </Reveal>
      ) : (
        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4 xl:sticky xl:top-6" aria-label="Resumen de reseñas">
            <Reveal><Summary list={list} avg={r0.avg} star={star} onStar={s => setStar(s)} onOpen={() => { setTab('open'); document.getElementById('lista')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }} /></Reveal>
            <Reveal><Mentions tags={tags} tag={tag} onTag={setTag} className={cn(!tags.total && 'hidden xl:block')} /></Reveal>
          </aside>

          <section id="lista" aria-label="Reseñas" className="min-w-0 scroll-mt-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <Segmented className="w-full sm:w-auto sm:min-w-[26rem]" value={tab} onChange={setTab} label="Filtro" options={tabs} />
              <p className="text-sm text-muted tnum" aria-live="polite">{filtered ? `Mostrando ${shown.length} de ${list.length}` : pl(list.length, 'reseña', 'reseñas')}</p>
            </div>
            {(star != null || tag != null) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {star != null && <button type="button" className="chip" onClick={() => setStar(null)} aria-label={`Quitar filtro de ${star} estrellas`}><Star size={14} className="fill-current text-warn" aria-hidden="true" />{pl(star, 'estrella', 'estrellas')}<X size={14} aria-hidden="true" /></button>}
                {tag != null && <button type="button" className="chip" onClick={() => setTag(null)} aria-label={`Quitar filtro ${tag}`}>{tag}<X size={14} aria-hidden="true" /></button>}
              </div>)}

            {shown.length === 0 ? (
              <Reveal className="mt-4">
                <div className="rounded-2xl bg-surface border border-dashed border-strong px-6 py-12 text-center">
                  <span className="mx-auto mb-4 grid place-items-center size-14 rounded-2xl bg-brand-soft text-brand">{tab === 'open' && star == null && tag == null ? <CheckCheck size={28} aria-hidden="true" /> : <Search size={26} aria-hidden="true" />}</span>
                  <p className="font-semibold text-lg">{tab === 'open' && star == null && tag == null ? '¡Estás al día!' : 'No hay reseñas con este filtro'}</p>
                  <p className="text-sm text-muted mt-1 max-w-xs mx-auto">{tab === 'open' && star == null && tag == null ? 'Respondiste todas las reseñas. Los jugadores lo valoran.' : 'Probá con otra combinación o mirá todas.'}</p>
                  {filtered && <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={reset}>Ver todas</Button></div>}
                </div>
              </Reveal>
            ) : (
              <Stagger key={`${tab}|${star}|${tag}`} className="space-y-3 mt-4">
                {shown.map(r => (
                  <Item key={r.id}>
                    <ReviewCard r={r} editing={edit === r.id} text={text} setText={setText} onEdit={() => { setEdit(r.id); setText(r.reply?.text || '') }} onCancel={() => setEdit(null)} onSave={() => save(r)} />
                  </Item>))}
              </Stagger>)}
          </section>
        </div>))}
    </OwnerPage>
  )
}
