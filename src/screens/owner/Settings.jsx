import { useEffect, useRef, useState } from 'react'
import { m as motion } from 'motion/react'
import { BadgeCheck, CalendarX2, Check, ChevronDown, ChevronRight, Clock, Eye, EyeOff, HandCoins, ImagePlus, Images, MapPinCheck, Sparkles, Store, ShieldCheck, X, MapPin } from 'lucide-react'
import { useStore } from '../../lib/store'
import { CANCEL_HOURS, PAY_WINDOW, REFUND_LABEL, SERVICES, SLOT_OPTIONS, cancelPolicyText, depositFor, slotsFor, verifyChecks } from '../../lib/domain'
import { cn, money } from '../../lib/format'
import { photoFromFile } from '../../lib/image'
import { navigate } from '../../lib/router'
import { Button, Chip, Field, Input, MoneyInput, Segmented, Select, Switch, Textarea, useToast } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { LocateButton, PositionPicker } from '../../ui/MapView'
import { AddressSearch } from '../../ui/PlaceField'
import { CountUp, Item, Stagger, spring } from '../../ui/motion'
import { ComplexCard, complexView } from '../../ui/shared'
import { OwnerPage, useOwner } from './common'
import './complejo.css'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const GALLERY_MAX = 6

/* Bloque del formulario: ícono + título. Es un "container" para que las grillas de adentro
   se acomoden al ancho real del bloque (con el panel lateral cambia según la pantalla). */
const Block = ({ id, icon: I, title, hint, children }) => (
  <Item as="section" id={id} aria-labelledby={`${id}-t`} className="cx-block @container p-5 lg:p-6 mb-4 lg:mb-5 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
    <div className="flex items-start gap-3 mb-4 lg:mb-5">
      <span className="cx-ico" aria-hidden="true"><I size={20} /></span>
      <div className="min-w-0 pt-0.5"><h2 id={`${id}-t`} className="text-lg lg:text-xl font-bold leading-tight">{title}</h2>{hint && <p className="text-sm text-muted mt-0.5">{hint}</p>}</div>
    </div>
    <div className="space-y-4">{children}</div>
  </Item>
)
const Note = ({ icon: I, tone, children }) => (
  <p className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm', tone === 'ok' ? 'bg-brand-soft text-ink' : 'bg-sunken text-muted')}>
    <I size={18} className={cn('flex-none mt-px', tone === 'ok' && 'text-brand')} aria-hidden="true" /><span className="min-w-0">{children}</span>
  </p>
)

export default function Settings() {
  const { complex } = useOwner()
  return <OwnerPage title="Mi complejo" sub={complex?.name}>{complex && <Form key={complex.id} complex={complex} />}</OwnerPage>
}

function Form({ complex }) {
  const { state, update, user } = useStore()
  const toast = useToast()
  const [d, setD] = useState(() => structuredClone(complex))
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState('')
  const cover = useRef(null), gal = useRef(null)
  const dirty = JSON.stringify(d) !== JSON.stringify(complex)
  const set = k => v => { setD(x => ({ ...x, [k]: v?.target ? v.target.value : v })); setErr(e => ({ ...e, [k]: '' })) }
  const sub = (key, k) => v => setD(x => ({ ...x, [key]: { ...x[key], [k]: v?.target ? v.target.value : v } }))
  const cfg = d.booking

  const upload = async (e, kind) => {
    const files = [...(e.target.files || [])]; e.target.value = ''
    if (!files.length) return
    setBusy(kind)
    try {
      if (kind === 'cover') set('coverUrl')(await photoFromFile(files[0], { max: 1400, userId: user?.id }))
      else { const room = GALLERY_MAX - d.gallery.length; const imgs = await Promise.all(files.slice(0, room).map(f => photoFromFile(f, { max: 1000, userId: user?.id }))); setD(x => ({ ...x, gallery: [...x.gallery, ...imgs] })) }
    } catch (x) { toast(x.message, 'error') } finally { setBusy('') }
  }

  const save = () => {
    const e = {}
    if (!d.name.trim()) e.name = 'Escribí el nombre del complejo.'
    if (!d.address.trim()) e.address = 'Escribí la dirección.'
    if (d.hours.open === d.hours.close) e.hours = 'La apertura y el cierre no pueden ser iguales.'
    if (cfg.depositRequired && cfg.depositType === 'fixed' && !(cfg.depositFixedCents > 0)) e.deposit = 'Poné el monto de la seña.'
    setErr(e)
    if (Object.keys(e).length) {
      toast('Revisá los campos marcados.', 'error')
      jump(e.name || e.address ? 'blk-datos' : e.hours ? 'blk-horarios' : 'blk-pago')
      return
    }
    update(s => { Object.assign(s.complexes.find(c => c.id === complex.id), { ...d, name: d.name.trim(), address: d.address.trim() }) })
    toast('Cambios guardados.')
  }
  // Ctrl/Cmd + S guarda (si hay cambios). Siempre usa la última versión de `save`.
  const saveRef = useRef(save); saveRef.current = save
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  useEffect(() => {
    const k = ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); if (dirtyRef.current) saveRef.current() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])

  const slots = slotsFor(d).length
  const prices = state.courts.filter(c => c.complexId === complex.id && c.status === 'active' && c.priceCents > 0).map(c => c.priceCents)
  const sample = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const sampleDeposit = sample ? depositFor(d, sample) : 0
  const left = Math.max(0, 20 - (d.description || '').trim().length)

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_316px] xl:grid-cols-[minmax(0,1fr)_388px] lg:gap-6 xl:gap-8 lg:items-start pb-28 lg:pb-24">
      <Stagger className="min-w-0 order-2 lg:order-1" step={0.05}>
        <Block id="blk-datos" icon={Store} title="Datos del complejo" hint="Lo primero que lee el jugador.">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Nombre" error={err.name}><Input value={d.name} onChange={set('name')} /></Field>
            <Field label="Ciudad o barrio"><Input value={d.city} onChange={set('city')} /></Field>
            <Field label="Descripción" className="@lg:col-span-2" hint={left > 0 ? `Con 20 caracteres o más suma al perfil completo${(d.description || '').trim() ? ` (te faltan ${left})` : ''}.` : undefined}><Textarea value={d.description} onChange={set('description')} maxLength={400} placeholder="Qué ofrece el complejo, cómo llegar, reglas…" /></Field>
            <Field label="Dirección" error={err.address} className="@lg:col-span-2"><Input value={d.address} onChange={set('address')} autoComplete="street-address" /></Field>
            <Field label="Teléfono"><Input type="tel" inputMode="tel" value={d.phone} onChange={set('phone')} /></Field>
            <Field label="WhatsApp"><Input type="tel" inputMode="tel" value={d.whatsapp} onChange={set('whatsapp')} /></Field>
          </div>
        </Block>

        <Block id="blk-mapa" icon={MapPin} title="Ubicación en el mapa" hint="Buscá la dirección, o tocá el mapa y arrastrá el marcador hasta la entrada.">
          <AddressSearch onPick={p => setD(x => ({ ...x, lat: p.lat, lng: p.lng, address: x.address || p.address || '' }))} />
          <PositionPicker className="h-56 @xl:h-64 rounded-xl overflow-hidden border border-line" value={d.lat != null ? { lat: d.lat, lng: d.lng } : null} onChange={p => setD(x => ({ ...x, lat: p.lat, lng: p.lng }))} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <LocateButton className="!min-h-11" onLocate={p => setD(x => ({ ...x, lat: p.lat, lng: p.lng }))} />
            {d.lat == null
              ? <p className="hint !mt-0">Sin ubicación, el complejo no aparece en el mapa.</p>
              : <p className="text-sm text-brand font-medium inline-flex items-center gap-1.5"><MapPinCheck size={16} aria-hidden="true" />Ubicación marcada</p>}
          </div>
        </Block>

        <Block id="blk-horarios" icon={Clock} title="Horarios" hint="Cuándo se puede reservar en tus canchas.">
          <div className="grid gap-4 @lg:grid-cols-[1fr_1fr_1.5fr]">
            <Field label="Abre" error={err.hours}><Select value={d.hours.open} onChange={sub('hours', 'open')}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
            <Field label="Cierra"><Select value={d.hours.close} onChange={sub('hours', 'close')}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
            <div className="col-span-full @lg:col-span-1"><span className="label">Duración del turno</span>
              <Segmented value={d.hours.slotMinutes} onChange={v => setD(x => ({ ...x, hours: { ...x.hours, slotMinutes: v } }))} label="Duración" options={SLOT_OPTIONS.map(m => ({ value: m, label: `${m} min` }))} /></div>
          </div>
          <p className="hint !mt-0">Si ya tenés reservas, cambiarlo no las mueve de horario.</p>
          {d.hours.open !== d.hours.close && slots > 0 && <Note icon={Clock} tone="ok">Abrís de <strong className="tnum">{d.hours.open}</strong> a <strong className="tnum">{d.hours.close}</strong>: <strong className="tnum">{slots}</strong> {slots === 1 ? 'turno' : 'turnos'} por día en cada cancha.</Note>}
        </Block>

        <Block id="blk-servicios" icon={Sparkles} title="Servicios" hint="Lo que ofrecés además de la cancha.">
          <div className="flex flex-wrap gap-2">{SERVICES.map(s => <Chip key={s} active={d.services.includes(s)} onClick={() => set('services')(d.services.includes(s) ? d.services.filter(x => x !== s) : [...d.services, s])}>{s}</Chip>)}</div>
        </Block>

        <Block id="blk-fotos" icon={Images} title="Fotos" hint="La portada es lo primero que ve el jugador en la búsqueda.">
          <input ref={cover} type="file" accept="image/*" hidden onChange={e => upload(e, 'cover')} />
          <input ref={gal} type="file" accept="image/*" multiple hidden onChange={e => upload(e, 'gal')} />
          <div className="grid gap-6 @xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div><span className="label">Portada</span>
              <div className="relative">
                <Cover src={d.coverUrl} seed={d.id} className="aspect-[16/9] w-full rounded-xl" />
                {!d.coverUrl && <span className="absolute left-3 top-3 text-xs font-semibold rounded-full px-2.5 py-1 bg-black/50 text-white backdrop-blur">Todavía sin portada</span>}
              </div>
              <div className="flex gap-2 mt-3"><Button variant="secondary" size="sm" className="!min-h-11" loading={busy === 'cover'} onClick={() => cover.current.click()}><ImagePlus size={16} />{d.coverUrl ? 'Cambiar portada' : 'Subir portada'}</Button>{d.coverUrl && <Button variant="ghost" size="sm" className="!min-h-11" onClick={() => set('coverUrl')('')}>Quitar</Button>}</div></div>
            <div><span className="label">Galería ({d.gallery.length}/{GALLERY_MAX})</span>
              <div className="grid grid-cols-3 gap-2">{Array.from({ length: GALLERY_MAX }, (_, i) => {
                const g = d.gallery[i]
                if (g) return (
                  <div key={g.slice(-24) + i} className="cx-slot"><Cover src={g} className="size-full" />
                    <button type="button" aria-label={`Quitar foto ${i + 1}`} className="absolute top-1 right-1 grid place-items-center size-9 pointer-coarse:size-11 rounded-full bg-surface/90 border border-line shadow-[var(--sh-1)] hover:bg-surface" onClick={() => setD(x => ({ ...x, gallery: x.gallery.filter((_, j) => j !== i) }))}><X size={16} /></button></div>)
                const first = i === d.gallery.length
                return first
                  ? <button key={`add${i}`} type="button" className="cx-slot empty can" onClick={() => gal.current.click()} aria-label="Agregar fotos">{busy === 'gal' ? '…' : <ImagePlus size={24} />}</button>
                  : <div key={`e${i}`} className="cx-slot empty" aria-hidden="true"><ImagePlus size={20} className="opacity-40" /></div>
              })}</div></div>
          </div>
        </Block>

        <Block id="blk-pago" icon={HandCoins} title="Seña y pago">
          <div className="grid gap-x-8 gap-y-4 @xl:grid-cols-2">
            <div className="space-y-4 min-w-0">
              <Switch label="Pedir seña" hint="El jugador paga una parte al reservar." checked={cfg.depositRequired} onChange={sub('booking', 'depositRequired')} />
              {cfg.depositRequired && <>
                <Segmented value={cfg.depositType} onChange={sub('booking', 'depositType')} label="Tipo de seña" options={[{ value: 'percent', label: 'Porcentaje' }, { value: 'fixed', label: 'Monto fijo' }]} />
                {cfg.depositType === 'percent'
                  ? <div><span className="label">Porcentaje del turno</span><Segmented value={cfg.depositPercent} onChange={sub('booking', 'depositPercent')} label="Porcentaje" options={[20, 30, 50].map(n => ({ value: n, label: `${n}%` }))} /></div>
                  : <Field label="Monto de la seña" error={err.deposit}><MoneyInput value={cfg.depositFixedCents} onChange={sub('booking', 'depositFixedCents')} /></Field>}
              </>}
            </div>
            <div className="space-y-4 min-w-0">
              <Switch label="Permitir pago total online" checked={cfg.allowFullPayment} onChange={sub('booking', 'allowFullPayment')} />
              <Field label="Tiempo para pagar" hint="Pasado ese tiempo, el horario se libera solo."><Select value={cfg.payWithinMinutes} onChange={e => sub('booking', 'payWithinMinutes')(Number(e.target.value))}>{PAY_WINDOW.map(m => <option key={m} value={m}>{m < 60 ? `${m} minutos` : `${m / 60} ${m === 60 ? 'hora' : 'horas'}`}</option>)}</Select></Field>
            </div>
          </div>
          {sample > 0 && <Note icon={HandCoins} tone="ok">{cfg.depositRequired && sampleDeposit > 0
            ? <>En un turno de <strong className="tnum">{money(sample)}</strong>, el jugador deja una seña de <strong className="tnum">{money(sampleDeposit)}</strong> y paga <strong className="tnum">{money(sample - sampleDeposit)}</strong> en el complejo.</>
            : <>Sin seña: en un turno de <strong className="tnum">{money(sample)}</strong>, el jugador paga todo en el complejo.</>}</Note>}
          <p className="text-sm text-muted">Los pagos se acreditan con Mercado Pago cuando conectes tu cuenta. Mientras tanto, la app funciona en modo de prueba.</p>
        </Block>

        <Block id="blk-cancel" icon={CalendarX2} title="Cancelación y devolución">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Cancelación gratis hasta"><Select value={cfg.cancellationHours} onChange={e => sub('booking', 'cancellationHours')(Number(e.target.value))}>{CANCEL_HOURS.map(h => <option key={h} value={h}>{h} horas antes</option>)}</Select></Field>
            <div><span className="label">Si cancela a tiempo</span><Segmented value={cfg.refundPolicy} onChange={sub('booking', 'refundPolicy')} label="Devolución" options={Object.entries(REFUND_LABEL).map(([value, label]) => ({ value, label: label.replace('Devolución ', '').replace('del ', '').replace('Sin devolución', 'Ninguna').replace(/^./, c => c.toUpperCase()) }))} /></div>
          </div>
          <Note icon={ShieldCheck}>Lo que verá el jugador: {cancelPolicyText(d)}</Note>
        </Block>

        <Block id="blk-visible" icon={d.public ? Eye : EyeOff} title="Visibilidad">
          <Switch label="Visible para jugadores" hint="Si lo apagás, no aparece en búsquedas ni en el mapa." checked={d.public} onChange={set('public')} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="secondary" disabled={dirty} onClick={() => navigate('/dueno/complejo/vista-previa')}><Eye size={18} />Ver vista previa pública</Button>
            {dirty && <p className="hint !mt-0">Guardá los cambios para verlos en la vista previa.</p>}
          </div>
        </Block>
      </Stagger>

      <aside className="cx-side order-1 lg:order-2 mb-4 lg:mb-0" aria-label="Perfil y vista previa">
        <Preview state={state} d={d} />
        <Progress state={state} d={d} />
      </aside>

      <div className={cn('cx-savebar fixed inset-x-0 z-20 lg:left-64 transition-transform duration-200', 'bottom-[calc(var(--nav-h)+var(--safe-bottom))] lg:bottom-0', dirty ? 'translate-y-0' : 'translate-y-[calc(100%+var(--nav-h)+var(--safe-bottom)+8px)]')} aria-hidden={!dirty} inert={!dirty}>
        <div className="max-w-[1120px] mx-auto px-4 py-3 lg:px-8 flex items-center gap-2">
          <p className="hidden lg:flex items-center gap-2.5 mr-auto text-sm font-medium"><span className="live-dot" aria-hidden="true" />Tenés cambios sin guardar<span className="text-muted font-normal hidden xl:inline">· Ctrl + S para guardar</span></p>
          <Button variant="secondary" onClick={() => { setD(structuredClone(complex)); setErr({}) }}>Descartar</Button>
          <Button onClick={save} className="flex-1 lg:flex-none lg:min-w-44">Guardar cambios</Button>
        </div>
      </div>
    </div>
  )
}

function jump(id, focus) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  setTimeout(() => el.querySelector(focus || '[aria-invalid="true"], input:not([type=hidden]):not([type=file]), textarea, select')?.focus({ preventScroll: true }), 350)
}

/* Qué hacer con cada punto pendiente (mismo orden que verifyChecks en domain.js). */
const GO = [
  { id: 'blk-fotos', cta: 'Subir portada' },
  { id: 'blk-mapa', cta: 'Marcar', focus: 'input' },
  { id: 'blk-datos', cta: 'Escribirla', focus: 'textarea' },
  { to: '/dueno/canchas', cta: 'Cargar cancha' },
  { id: 'blk-datos', cta: 'Cargar', focus: 'input[type=tel]' },
  { id: 'blk-horarios', cta: 'Elegir' },
]

/* Perfil completo: porcentaje, barra y pasos que faltan. En el celular se pliega. */
function Progress({ state, d }) {
  const [open, setOpen] = useState(false)
  const checks = verifyChecks(state, d)
  const done = checks.filter(([, ok]) => ok).length
  const pct = Math.round(done / checks.length * 100)
  const missing = checks.length - done
  const full = missing === 0
  return (
    <section className="rounded-[20px] overflow-hidden border border-line bg-surface shadow-[var(--sh-2)]" aria-label="Perfil del complejo">
      <div className="hero !rounded-none !shadow-none p-5 lg:p-4 lg:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Perfil del complejo</p>
            <p className="display font-bold text-5xl lg:text-4xl leading-none mt-2 lg:mt-1.5 tnum"><CountUp value={`${pct}%`} /></p>
          </div>
          <span className="grid place-items-center size-12 lg:size-11 rounded-2xl bg-white/15 border border-white/25 flex-none">{d.verified ? <BadgeCheck size={26} aria-hidden="true" /> : full ? <Check size={26} aria-hidden="true" /> : <ShieldCheck size={26} aria-hidden="true" />}</span>
        </div>
        <div className="cx-bar on-grad mt-4 lg:mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Perfil completo">
          <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={spring} />
        </div>
        <p className="text-sm mt-3 lg:mt-2.5 opacity-95">
          {d.verified ? 'Complejo verificado por La Fija.' : full ? '¡Perfil completo! Los jugadores te van a encontrar mejor.' : `${done} de ${checks.length} listos. Te ${missing === 1 ? 'falta 1 paso' : `faltan ${missing} pasos`}.`}
        </p>
        {!full && <button type="button" className="lg:hidden mt-2 -mb-1 inline-flex items-center gap-1 min-h-11 text-sm font-semibold underline underline-offset-4" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Ocultar pasos' : 'Ver qué falta'}<ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" /></button>}
      </div>
      <ul className={cn('p-2', !open && 'hidden lg:block')}>
        {checks.map(([label, ok], i) => [label, ok, i]).sort((a, b) => a[1] - b[1]).map(([label, ok, i]) => {
          const g = GO[i] || {}
          const body = <>
            <span className={cn('cx-tick', ok && 'ok')} aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
            <span className={cn('flex-1 min-w-0 text-[15px] leading-snug', ok ? 'text-muted' : 'font-medium')}>{label}</span>
            {ok ? <span className="sr-only">Listo</span> : <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand flex-none">{g.cta || 'Completar'}<ChevronRight size={16} aria-hidden="true" /></span>}
          </>
          return <li key={label}>{ok
            ? <div className="cx-check">{body}</div>
            : <button type="button" className="cx-check" onClick={() => g.to ? navigate(g.to) : jump(g.id, g.focus)} aria-label={`${label}: falta. ${g.cta || 'Completar'}`}>{body}</button>}</li>
        })}
      </ul>
    </section>
  )
}

/* La tarjeta que ven los jugadores en la búsqueda, con lo que estás escribiendo ahora. */
function Preview({ state, d }) {
  const view = complexView(state, { ...d, name: d.name.trim() || 'Nombre de tu complejo', city: d.city.trim() || 'Tu ciudad o barrio' }, null)
  const pending = d.approval === 'pending'
  return (
    <section className="cx-preview hidden lg:block" aria-label="Vista previa">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <h2 className="text-base font-bold leading-tight">Así te ven los jugadores</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted flex-none"><span className="live-dot" aria-hidden="true" />En vivo</span>
      </div>
      <div className="cx-preview-card" inert aria-hidden="true"><ComplexCard c={view} /></div>
      <p className={cn('flex items-start gap-2 text-sm mt-3 px-1', d.public && !pending ? 'text-muted' : 'text-warn')}>
        {d.public && !pending ? <Eye size={16} className="flex-none mt-0.5" aria-hidden="true" /> : <EyeOff size={16} className="flex-none mt-0.5" aria-hidden="true" />}
        <span>{pending ? 'Todavía en revisión: los jugadores lo van a ver cuando lo aprobemos.' : d.public ? 'Así aparece en las búsquedas, en vivo.' : 'Hoy está oculto: no aparece en búsquedas ni en el mapa.'}</span>
      </p>
    </section>
  )
}
