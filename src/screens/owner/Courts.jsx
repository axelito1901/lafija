import { useRef, useState } from 'react'
import { ChevronRight, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { COURT_FEATURES, COURT_STATUS, SPORTS, SURFACES, courtsOf, effStatus, bookingEnd } from '../../lib/domain'
import { cn, money, uid } from '../../lib/format'
import { fileToDataURL } from '../../lib/image'
import { Button, Chip, Empty, Field, Input, MoneyInput, Segmented, Select, Sheet, Status, Switch, Textarea, useConfirm, useToast } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { Item, Stagger } from '../../ui/motion'
import { OwnerPage, useOwner } from './common'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const blank = complexId => ({ id: '', complexId, name: '', sport: 'Fútbol 5', surface: 'Sintético', covered: false, lighting: true, priceCents: 0, priceRules: [], description: '', features: [], photo: '', status: 'active' })
const TONE = { active: 'ok', inactive: 'muted', blocked: 'warn' }

export default function Courts() {
  const { state } = useStore()
  const { complex, courts } = useOwner()
  const [edit, setEdit] = useState(null)
  return (
    <OwnerPage title="Canchas" sub={complex ? `${courts.length} en ${complex.name}` : ''} actions={complex && <Button size="sm" onClick={() => setEdit(blank(complex.id))}><Plus size={16} />Nueva cancha</Button>}>
      {complex && (courts.length === 0
        ? <Empty title="Todavía no cargaste canchas" text="Cada cancha tiene su precio y sus horarios." action={<Button onClick={() => setEdit(blank(complex.id))}><Plus size={18} />Nueva cancha</Button>} />
        : <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courts.map((c, i) => (
          <Item as="button" key={c.id} type="button" whileTap={{ scale: .98 }} onClick={() => setEdit(c)} className="text-left rounded-2xl overflow-hidden bg-surface border border-line shadow-[var(--sh-1)] card-lift">
            <span className="relative block"><Cover src={c.photo || complex.coverUrl} seed={c.id} className={cn('aspect-[16/9]', c.status !== 'active' && 'grayscale opacity-70')} /><span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              <span className="absolute left-4 bottom-3 text-white"><span className="block display text-2xl font-bold leading-none">{c.name}</span><span className="block text-sm opacity-90">{c.sport}</span></span>
              <span className="absolute right-3 bottom-3 text-white text-right"><span className="block font-semibold tnum text-lg leading-none">{money(c.priceCents)}</span><span className="block text-xs opacity-85">por turno</span></span>
              {c.status !== 'active' && <span className="absolute left-3 top-3 text-xs font-semibold rounded-full px-2.5 py-1 bg-black/55 text-white backdrop-blur">{COURT_STATUS[c.status]}</span>}</span>
            <span className="flex items-center gap-3 px-4 py-3 text-sm text-muted"><span className="flex-1 truncate">{[c.surface, c.covered && 'Techada', c.lighting && 'Luz'].filter(Boolean).join(' · ')}</span><span className="text-brand font-semibold flex-none">Editar</span></span>
          </Item>))}</Stagger>)}
      {edit && <CourtSheet court={edit} onClose={() => setEdit(null)} />}
    </OwnerPage>
  )
}

function CourtSheet({ court, onClose }) {
  const { state, update } = useStore()
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
    const future = state.bookings.filter(b => b.courtId === f.id && ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(b)) && bookingEnd(b) >= new Date())
    if (future.length) { toast(`${f.name} tiene ${future.length} reservas por venir. Cancelalas o desactivá la cancha.`, 'error'); return }
    if (!await confirm({ title: `¿Eliminar ${f.name}?`, message: 'Se borra la cancha y su historial de bloqueos. Las reservas pasadas se conservan.', confirmLabel: 'Eliminar', danger: true })) return
    update(s => { s.courts = s.courts.filter(c => c.id !== f.id); s.blocks = s.blocks.filter(b => b.courtId !== f.id) })
    toast('Cancha eliminada.'); onClose()
  }
  const pickPhoto = async e => {
    const file0 = e.target.files?.[0]; e.target.value = ''
    if (!file0) return
    setBusy(true)
    try { set('photo')(await fileToDataURL(file0, 900)) } catch (x) { toast(x.message, 'error') } finally { setBusy(false) }
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
          <div key={i} className="grid grid-cols-[1fr_1fr] gap-2 p-3 border border-line rounded-lg">
            <Field label="Desde"><Select value={r.from} onChange={e => rule(i, { from: e.target.value })}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
            <Field label="Hasta"><Select value={r.to} onChange={e => rule(i, { to: e.target.value })}>{[...HOURS.slice(1), '24:00'].map(h => <option key={h}>{h}</option>)}</Select></Field>
            <Field label="Precio" className="col-span-2"><MoneyInput value={r.priceCents} onChange={v => rule(i, { priceCents: v })} /></Field>
            <Button variant="ghost" size="sm" className="col-span-2 !text-danger" onClick={() => setF(x => ({ ...x, priceRules: x.priceRules.filter((_, j) => j !== i) }))}><Trash2 size={16} />Quitar</Button>
          </div>
        ))}
        {err.rules && <p className="err">{err.rules}</p>}
        <Button variant="secondary" size="sm" onClick={() => setF(x => ({ ...x, priceRules: [...x.priceRules, { from: '19:00', to: '24:00', priceCents: x.priceCents }] }))}><Plus size={16} />Agregar precio por horario</Button>
      </div>

      <h3 className="font-semibold mt-6 mb-1">Características</h3>
      <Switch label="Techada" checked={f.covered} onChange={set('covered')} />
      <Switch label="Iluminación" checked={f.lighting} onChange={set('lighting')} />
      <div className="flex flex-wrap gap-2 mt-2">{COURT_FEATURES.map(x => <Chip key={x} active={f.features.includes(x)} onClick={() => set('features')(f.features.includes(x) ? f.features.filter(y => y !== x) : [...f.features, x])}>{x}</Chip>)}</div>
      <Field label="Descripción" className="mt-4"><Textarea value={f.description} onChange={set('description')} placeholder="Algo que quieras que sepan los jugadores" maxLength={240} /></Field>

      <h3 className="font-semibold mt-6 mb-2">Foto</h3>
      <div className="flex items-center gap-3">
        <Cover src={f.photo} seed={f.id || 'new'} className="size-20 rounded-lg flex-none" />
        <div className="flex flex-col gap-2 items-start">
          <input ref={file} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <Button variant="secondary" size="sm" loading={busy} onClick={() => file.current.click()}><ImagePlus size={16} />{f.photo ? 'Cambiar foto' : 'Subir foto'}</Button>
          {f.photo && <Button variant="ghost" size="sm" onClick={() => set('photo')('')}>Quitar</Button>}
        </div>
      </div>

      <h3 className="font-semibold mt-6 mb-2">Estado</h3>
      <Segmented value={f.status} onChange={set('status')} label="Estado" options={Object.entries(COURT_STATUS).map(([value, label]) => ({ value, label }))} />
      <p className="hint">{f.status === 'active' ? 'Los jugadores pueden reservarla.' : f.status === 'inactive' ? 'No aparece para los jugadores. Se conservan las reservas.' : 'Se ve pero no se puede reservar (mantenimiento, torneo).'}</p>

      {!isNew && <div className="mt-8 pt-4 border-t border-line"><Button variant="danger" onClick={remove}><Trash2 size={16} />Eliminar cancha</Button></div>}
    </Sheet>
  )
}
