import { useRef, useState } from 'react'
import { m as motion } from 'motion/react'
import { CalendarClock, Copy, ImagePlus, Layers, LayoutGrid, Lightbulb, Pause, Pencil, Play, Plus, Sparkles, Tag, Trash2, Warehouse, Wrench } from 'lucide-react'
import { useStore } from '../../lib/store'
import { COURT_FEATURES, COURT_STATUS, SPORTS, SURFACES, courtFromPrice, courtsOf, effStatus, bookingEnd, slotInfo, slotsFor } from '../../lib/domain'
import { cn, money, todayISO, uid } from '../../lib/format'
import { photoFromFile } from '../../lib/image'
import { Button, Chip, Field, Input, MoneyInput, Segmented, Select, Sheet, Switch, Textarea, useConfirm, useToast } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { CountUp, Item, Stagger, spring } from '../../ui/motion'
import { OwnerPage, useOwner } from './common'
import './complejo.css'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const blank = complexId => ({ id: '', complexId, name: '', sport: 'Fútbol 5', surface: 'Sintético', covered: false, lighting: true, priceCents: 0, priceRules: [], description: '', features: [], photo: '', status: 'active' })
const LIVE = ['pending', 'deposit_paid', 'confirmed']
const upcoming = (state, courtId) => state.bookings.filter(b => b.courtId === courtId && LIVE.includes(effStatus(b)) && bookingEnd(b) >= new Date())
/* En las tarjetas decimos "Pausada" (es lo que hace el botón); en la base sigue siendo "inactive". */
const STATE_LABEL = { ...COURT_STATUS, inactive: 'Pausada' }
const SM_SPAN = { 1: 'sm:col-span-1', 2: 'sm:col-span-2' }
const XL_SPAN = { 1: 'xl:col-span-1', 2: 'xl:col-span-2', 3: 'xl:col-span-3' }

/* Barra que se llena con resorte (sin animación si el sistema pide menos movimiento). */
function Fill({ pct, onGrad, label }) {
  return (
    <div className={cn('cx-bar', onGrad && 'on-grad')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }} transition={spring} />
    </div>
  )
}

export default function Courts() {
  const { state } = useStore()
  const { complex, courts } = useOwner()
  const [edit, setEdit] = useState(null)
  return (
    <OwnerPage title="Canchas" sub={complex ? `${courts.length} en ${complex.name}` : ''} actions={complex && <Button size="sm" className="!min-h-11" onClick={() => setEdit(blank(complex.id))}><Plus size={16} />Nueva cancha</Button>}>
      {complex && (courts.length === 0
        ? <NoCourts onNew={() => setEdit(blank(complex.id))} />
        : <>
          <Summary state={state} complex={complex} courts={courts} />
          <Grid state={state} complex={complex} courts={courts} onEdit={setEdit} onNew={() => setEdit(blank(complex.id))} />
        </>)}
      {edit && <CourtSheet court={edit} onClose={() => setEdit(null)} />}
    </OwnerPage>
  )
}

/* ---------- Resumen de arriba ---------- */
function Summary({ state, complex, courts }) {
  const act = courts.filter(c => c.status === 'active')
  const base = act.length ? act : courts
  const avg = Math.round(base.reduce((s, c) => s + c.priceCents, 0) / base.length)
  const lo = Math.min(...base.map(courtFromPrice))
  const hi = Math.max(...base.flatMap(c => [c.priceCents, ...(c.priceRules || []).map(r => r.priceCents)]))
  const span = Math.max(hi - lo, 1)
  const pos = p => Math.min(100, Math.max(0, (p - lo) / span * 100))
  const slots = slotsFor(complex), today = todayISO()
  const perDay = slots.length * act.length
  const booked = act.reduce((n, c) => n + slots.filter(t => slotInfo(state, complex, c, today, t).kind === 'booked').length, 0)
  const pct = perDay ? booked / perDay * 100 : 0
  return (
    <Stagger className="grid grid-cols-2 gap-3 lg:gap-4 lg:grid-cols-[1.45fr_1fr_1fr] mb-5 lg:mb-6" step={0.07}>
      <Item className="hero col-span-2 lg:col-span-1 p-5 lg:p-6 flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85 inline-flex items-center gap-2"><span className="live-dot" aria-hidden="true" />Tus canchas</p>
        <p className="display font-bold leading-none mt-3 flex items-baseline gap-2">
          <span className="text-6xl lg:text-7xl tnum"><CountUp value={act.length} /></span>
          <span className="text-xl lg:text-2xl opacity-80">{act.length === 1 ? 'activa' : 'activas'} de {courts.length}</span>
        </p>
        <ul className="flex flex-wrap gap-1.5 mt-auto pt-5" aria-label="Estado de cada cancha">
          {courts.map(c => (
            <li key={c.id} className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1 text-[13px] font-medium bg-white/15 border border-white/20 backdrop-blur-sm">
              <span className={cn('size-2 rounded-full flex-none', c.status === 'active' ? 'bg-[var(--gold)]' : 'bg-white/45')} aria-hidden="true" />{c.name}
              <span className="sr-only">: {STATE_LABEL[c.status]}</span>
            </li>))}
        </ul>
      </Item>

      <Item className="rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-4 lg:p-5 min-w-0">
        <div className="flex items-start justify-between gap-2 text-muted text-sm leading-tight"><span className="pt-1.5">Precio promedio</span><span className="cx-ico !size-8 !rounded-lg"><Tag size={16} aria-hidden="true" /></span></div>
        <p className="display text-3xl lg:text-4xl font-bold tnum leading-none mt-3 truncate"><CountUp value={money(avg)} /></p>
        {base.length > 1 && hi > lo
          ? <><div className="cx-range" aria-hidden="true">{base.map(c => <i key={c.id} style={{ left: `${pos(c.priceCents)}%` }} title={`${c.name}: ${money(c.priceCents)}`} />)}<i className="avg" style={{ left: `${pos(avg)}%` }} /></div>
            <p className="text-sm text-muted flex justify-between tnum"><span>{money(lo)}</span><span>{money(hi)}</span></p></>
          : <p className="text-sm text-muted mt-2">{base.length > 1 ? 'Todas cuestan lo mismo' : 'Por turno de ' + (complex.hours?.slotMinutes || 60) + ' min'}</p>}
      </Item>

      <Item className="rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-4 lg:p-5 min-w-0">
        <div className="flex items-start justify-between gap-2 text-muted text-sm leading-tight"><span className="pt-1.5">Turnos por día</span><span className="cx-ico !size-8 !rounded-lg"><CalendarClock size={16} aria-hidden="true" /></span></div>
        <p className="display text-3xl lg:text-4xl font-bold tnum leading-none mt-3"><CountUp value={perDay} /></p>
        {perDay > 0
          ? <div className="mt-3"><Fill pct={pct} label="Turnos de hoy reservados" /><p className="text-sm text-muted mt-1.5 tnum"><strong className="text-ink font-semibold">{booked}</strong> reservados hoy</p></div>
          : <p className="text-sm text-muted mt-2">Activá una cancha para ofrecer turnos.</p>}
      </Item>
    </Stagger>
  )
}

/* ---------- Grilla de tarjetas ---------- */
function Grid({ state, complex, courts, onEdit, onNew }) {
  const n = courts.length
  const smLeft = n % 2 === 0 ? 2 : 1
  const xlLeft = n % 3 === 0 ? 3 : 3 - n % 3
  return (
    <Stagger className="grid gap-4 lg:gap-5 sm:grid-cols-2 xl:grid-cols-3" step={0.06} delay={0.15}>
      {courts.map(c => <CourtCard key={c.id} c={c} state={state} complex={complex} onEdit={() => onEdit(c)} onCopy={() => onEdit({ ...structuredClone(c), id: '', name: `${c.name} (copia)` })} />)}
      <Item className={cn('h-full', SM_SPAN[smLeft], XL_SPAN[xlLeft])}>
        <button type="button" onClick={onNew} className={cn('cx-add', smLeft === 1 && 'sm:max-xl:flex-col sm:max-xl:text-center sm:max-xl:min-h-40', xlLeft === 1 && 'xl:flex-col xl:text-center xl:min-h-40')}>
          <span className="cx-add-ico"><Plus size={24} aria-hidden="true" /></span>
          <span><span className="block font-semibold text-base text-ink">Sumar otra cancha</span><span className="block text-sm">Cada una con su precio, foto y horarios.</span></span>
        </button>
      </Item>
    </Stagger>
  )
}

function CourtCard({ c, state, complex, onEdit, onCopy }) {
  const { update } = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const on = c.status === 'active'
  const rules = (c.priceRules || []).filter(r => r.priceCents > 0)
  const top = Math.max(c.priceCents, ...rules.map(r => r.priceCents))
  const slots = slotsFor(complex), today = todayISO()
  const booked = on ? slots.filter(t => slotInfo(state, complex, c, today, t).kind === 'booked').length : 0
  const extra = c.features || []
  const toggle = async () => {
    if (on) {
      const n = upcoming(state, c.id).length
      if (n && !await confirm({ title: `¿Pausar ${c.name}?`, message: `Tiene ${n} ${n === 1 ? 'reserva' : 'reservas'} por venir: se conservan, pero los jugadores no van a poder reservarla hasta que la reactives.`, confirmLabel: 'Pausar' })) return
    }
    update(s => { const x = s.courts.find(y => y.id === c.id); if (x) x.status = on ? 'inactive' : 'active' })
    toast(on ? `${c.name} quedó pausada.` : `${c.name} ya se puede reservar.`)
  }
  const StateIcon = c.status === 'blocked' ? Wrench : Pause
  return (
    <Item className="h-full">
      <article className={cn('cx-court', !on && 'off')} aria-label={c.name}>
        <div className="cx-photo relative">
          <button type="button" onClick={onEdit} aria-label={`Editar ${c.name}`} className="block w-full text-left focus-visible:outline-offset-[-4px]">
            <Cover src={c.photo || complex.coverUrl} seed={c.id} className="aspect-[2/1] sm:aspect-[16/9] lg:aspect-[16/10]" />
            <span className="cx-court-shade" />
          </button>
          <span className="cx-photo-ui absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cx-glass pointer-events-none">
            {on ? <span className="live-dot" aria-hidden="true" /> : <StateIcon size={13} aria-hidden="true" />}{STATE_LABEL[c.status]}
          </span>
          <span className="cx-photo-ui absolute left-4 right-4 bottom-3.5 text-white pointer-events-none">
            <span className="block text-xs font-semibold uppercase tracking-wider opacity-85">{c.sport}</span>
            <span className="block display text-[28px] font-bold leading-tight truncate">{c.name}</span>
          </span>
        </div>

        <div className="flex flex-col flex-1 p-4 lg:p-5">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs text-muted leading-none mb-1">Precio base</p><p className="display text-[34px] font-bold tnum leading-none"><CountUp value={money(c.priceCents)} /></p></div>
            {rules.length > 0 && <span className="cx-feat !text-brand !bg-brand-soft flex-none" title="Tiene precios distintos según el horario"><Tag size={14} aria-hidden="true" />{rules.length} {rules.length === 1 ? 'horario especial' : 'horarios especiales'}{top > c.priceCents && <span className="tnum hidden 2xl:inline"> · hasta {money(top)}</span>}</span>}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3.5">
            <span className="cx-feat"><Layers size={14} aria-hidden="true" />{c.surface}</span>
            {c.covered && <span className="cx-feat"><Warehouse size={14} aria-hidden="true" />Techada</span>}
            {c.lighting && <span className="cx-feat"><Lightbulb size={14} aria-hidden="true" />Luz</span>}
            {extra.length > 0 && <span className="cx-feat" title={extra.join(', ')} aria-label={`${extra.length} ${extra.length === 1 ? 'extra' : 'extras'}: ${extra.join(', ')}`}><Sparkles size={14} aria-hidden="true" />+{extra.length}</span>}
          </div>

          <div className="mt-auto pt-4 min-h-[56px]">
            {on && slots.length > 0
              ? <><div className="flex items-center justify-between text-sm mb-1.5"><span className="text-muted">Hoy</span><span className="tnum"><strong className="font-semibold">{booked}</strong><span className="text-muted"> de {slots.length} turnos</span></span></div><Fill pct={booked / slots.length * 100} label={`Turnos de hoy de ${c.name}`} /></>
              : <p className="text-sm text-muted">{c.status === 'blocked' ? 'Se ve, pero no se puede reservar (mantenimiento, torneo).' : 'No aparece para los jugadores. Se conservan las reservas.'}</p>}
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button variant="secondary" className="flex-1" onClick={onEdit} aria-label={`Editar ${c.name}`}><Pencil size={16} />Editar</Button>
            <Button variant="secondary" onClick={toggle} aria-label={on ? `Pausar ${c.name}` : `Reactivar ${c.name}`}>{on ? <Pause size={16} /> : <Play size={16} />}{on ? 'Pausar' : 'Reactivar'}</Button>
            <button type="button" className="icon-btn border border-line-strong bg-surface shadow-[var(--sh-1)] flex-none" onClick={onCopy} aria-label={`Duplicar ${c.name}`} title="Duplicar"><Copy size={17} /></button>
          </div>
        </div>
      </article>
    </Item>
  )
}

/* ---------- Sin canchas todavía ---------- */
function NoCourts({ onNew }) {
  const steps = [['Nombre y tipo', 'Fútbol 5, 7, 8 u 11'], ['Precio por turno', 'Y precios por horario'], ['Una foto', 'Para que te elijan']]
  return (
    <Stagger className="rounded-3xl border-2 border-dashed border-strong bg-surface/60 px-6 py-12 lg:py-16 text-center">
      <Item><span className="mx-auto mb-5 grid place-items-center size-20 rounded-3xl bg-[image:var(--grad-brand)] text-[var(--on-grad)] shadow-[var(--sh-2)] float-y"><LayoutGrid size={36} strokeWidth={1.75} aria-hidden="true" /></span></Item>
      <Item><h2 className="display text-3xl lg:text-4xl font-bold">Todavía no cargaste canchas</h2></Item>
      <Item><p className="text-muted mt-2 max-w-md mx-auto">Los jugadores reservan por cancha: cada una tiene su precio y sus horarios. Cargar la primera te lleva un minuto.</p></Item>
      <Item className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto mt-8 text-left">
        {steps.map(([t, s], i) => <div key={t} className="flex items-center gap-3 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-3.5"><span className="display grid place-items-center size-9 rounded-full bg-brand-soft text-brand font-bold flex-none">{i + 1}</span><span className="min-w-0"><span className="block font-semibold leading-tight">{t}</span><span className="block text-sm text-muted">{s}</span></span></div>)}
      </Item>
      <Item className="mt-8 flex justify-center"><Button size="lg" onClick={onNew}><Plus size={18} />Cargar mi primera cancha</Button></Item>
    </Stagger>
  )
}

/* ---------- Formulario (panel) ---------- */
function CourtSheet({ court, onClose }) {
  const { state, update, user } = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const file = useRef(null)
  const isNew = !court.id
  const [f, setF] = useState(() => structuredClone(court))
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const set = k => v => { setF(x => ({ ...x, [k]: v?.target ? v.target.value : v })); setErr(e => ({ ...e, [k]: '' })) }
  const rule = (i, patch) => setF(x => ({ ...x, priceRules: x.priceRules.map((r, j) => j === i ? { ...r, ...patch } : r) }))

  const save = () => {
    const e = {}
    if (!f.name.trim()) e.name = 'Escribí el nombre de la cancha.'
    else if (courtsOf(state, f.complexId).some(c => c.id !== f.id && c.name.toLowerCase() === f.name.trim().toLowerCase())) e.name = 'Ya tenés una cancha con ese nombre.'
    if (!(f.priceCents > 0)) e.priceCents = 'Poné un precio mayor a cero.'
    if (f.priceRules.some(r => !(r.priceCents > 0))) e.rules = 'Completá el precio de cada horario especial.'
    setErr(e); if (Object.keys(e).length) return
    update(s => {
      const next = { ...f, name: f.name.trim(), description: f.description.trim() }
      if (isNew) s.courts.push({ ...next, id: uid('court') })
      else Object.assign(s.courts.find(c => c.id === f.id), next)
    })
    toast(isNew ? 'Cancha creada.' : 'Cambios guardados.'); onClose()
  }
  const remove = async () => {
    const future = upcoming(state, f.id)
    if (future.length) { toast(`${f.name} tiene ${future.length} reservas por venir. Cancelalas o desactivá la cancha.`, 'error'); return }
    if (!await confirm({ title: `¿Eliminar ${f.name}?`, message: 'Se borra la cancha y su historial de bloqueos. Las reservas pasadas se conservan.', confirmLabel: 'Eliminar', danger: true })) return
    update(s => { s.courts = s.courts.filter(c => c.id !== f.id); s.blocks = s.blocks.filter(b => b.courtId !== f.id) })
    toast('Cancha eliminada.'); onClose()
  }
  const pickPhoto = async e => {
    const file0 = e.target.files?.[0]; e.target.value = ''
    if (!file0) return
    setBusy(true)
    try { set('photo')(await photoFromFile(file0, { max: 900, userId: user?.id })) } catch (x) { toast(x.message, 'error') } finally { setBusy(false) }
  }

  return (
    <Sheet open onClose={onClose} wide title={isNew ? 'Nueva cancha' : 'Editar cancha'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={save}>{isNew ? 'Crear cancha' : 'Guardar cambios'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={err.name} className="sm:col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Cancha 1" /></Field>
        <Field label="Tipo"><Select value={f.sport} onChange={set('sport')}>{SPORTS.map(s => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Superficie"><Select value={f.surface} onChange={set('surface')}>{SURFACES.map(s => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Precio por turno" error={err.priceCents} className="sm:col-span-2"><MoneyInput value={f.priceCents} onChange={set('priceCents')} /></Field>
      </div>

      <h3 className="font-semibold mt-6">Precios por horario</h3>
      <p className="text-sm text-muted">Si en algunos horarios el precio es distinto, agregalo acá.</p>
      <div className="space-y-3 mt-3">
        {f.priceRules.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.2fr_auto] items-end gap-2 p-3 border border-line rounded-xl bg-sunken/50">
            <Field label="Desde"><Select value={r.from} onChange={e => rule(i, { from: e.target.value })}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
            <Field label="Hasta"><Select value={r.to} onChange={e => rule(i, { to: e.target.value })}>{[...HOURS.slice(1), '24:00'].map(h => <option key={h}>{h}</option>)}</Select></Field>
            <Field label="Precio" className="col-span-2 sm:col-span-1"><MoneyInput value={r.priceCents} onChange={v => rule(i, { priceCents: v })} /></Field>
            <Button variant="ghost" className="col-span-2 sm:col-span-1 !text-danger" aria-label={`Quitar el horario especial ${i + 1}`} onClick={() => setF(x => ({ ...x, priceRules: x.priceRules.filter((_, j) => j !== i) }))}><Trash2 size={16} /><span className="sm:sr-only">Quitar</span></Button>
          </div>
        ))}
        {err.rules && <p className="err">{err.rules}</p>}
        <Button variant="secondary" size="sm" className="!min-h-11" onClick={() => setF(x => ({ ...x, priceRules: [...x.priceRules, { from: '19:00', to: '24:00', priceCents: x.priceCents }] }))}><Plus size={16} />Agregar precio por horario</Button>
      </div>

      <h3 className="font-semibold mt-6 mb-1">Características</h3>
      <Switch label="Techada" checked={f.covered} onChange={set('covered')} />
      <Switch label="Iluminación" checked={f.lighting} onChange={set('lighting')} />
      <div className="flex flex-wrap gap-2 mt-2">{COURT_FEATURES.map(x => <Chip key={x} active={f.features.includes(x)} onClick={() => set('features')(f.features.includes(x) ? f.features.filter(y => y !== x) : [...f.features, x])}>{x}</Chip>)}</div>
      <Field label="Descripción" className="mt-4"><Textarea value={f.description} onChange={set('description')} placeholder="Algo que quieras que sepan los jugadores" maxLength={240} /></Field>

      <h3 className="font-semibold mt-6 mb-2">Foto</h3>
      <div className="flex items-center gap-4">
        <Cover src={f.photo} seed={f.id || 'new'} className="w-32 aspect-[4/3] rounded-xl flex-none" />
        <div className="flex flex-col gap-2 items-start">
          <input ref={file} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <Button variant="secondary" size="sm" className="!min-h-11" loading={busy} onClick={() => file.current.click()}><ImagePlus size={16} />{f.photo ? 'Cambiar foto' : 'Subir foto'}</Button>
          {f.photo && <Button variant="ghost" size="sm" className="!min-h-11" onClick={() => set('photo')('')}>Quitar</Button>}
        </div>
      </div>

      <h3 className="font-semibold mt-6 mb-2">Estado</h3>
      <Segmented value={f.status} onChange={set('status')} label="Estado" options={Object.entries(STATE_LABEL).map(([value, label]) => ({ value, label }))} />
      <p className="hint">{f.status === 'active' ? 'Los jugadores pueden reservarla.' : f.status === 'inactive' ? 'No aparece para los jugadores. Se conservan las reservas.' : 'Se ve pero no se puede reservar (mantenimiento, torneo).'}</p>

      {!isNew && <div className="mt-8 pt-4 border-t border-line"><Button variant="danger" onClick={remove}><Trash2 size={16} />Eliminar cancha</Button></div>}
    </Sheet>
  )
}
