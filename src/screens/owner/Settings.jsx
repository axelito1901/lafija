import { useRef, useState } from 'react'
import { Eye, ImagePlus, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { CANCEL_HOURS, PAY_WINDOW, REFUND_LABEL, SERVICES, SLOT_OPTIONS, cancelPolicyText } from '../../lib/domain'
import { cn } from '../../lib/format'
import { fileToDataURL } from '../../lib/image'
import { navigate } from '../../lib/router'
import { Button, Chip, Field, Input, MoneyInput, Segmented, Select, Switch, Textarea, useToast } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { LocateButton, PositionPicker } from '../../ui/MapView'
import { OwnerPage, useOwner } from './common'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const Block = ({ title, children, hint }) => (
  <section className="py-6 border-t border-line first:border-t-0 first:pt-0">
    <h2 className="text-base font-semibold">{title}</h2>
    {hint && <p className="text-sm text-muted mt-0.5">{hint}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
)

export default function Settings() {
  const { complex } = useOwner()
  return <OwnerPage title="Mi complejo" sub={complex?.name}>{complex && <Form key={complex.id} complex={complex} />}</OwnerPage>
}

function Form({ complex }) {
  const { update } = useStore()
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
      if (kind === 'cover') set('coverUrl')(await fileToDataURL(files[0], 1400))
      else { const room = 6 - d.gallery.length; const imgs = await Promise.all(files.slice(0, room).map(f => fileToDataURL(f, 1000))); setD(x => ({ ...x, gallery: [...x.gallery, ...imgs] })) }
    } catch (x) { toast(x.message, 'error') } finally { setBusy('') }
  }

  const save = () => {
    const e = {}
    if (!d.name.trim()) e.name = 'Escribí el nombre del complejo.'
    if (!d.address.trim()) e.address = 'Escribí la dirección.'
    if (d.hours.open === d.hours.close) e.hours = 'La apertura y el cierre no pueden ser iguales.'
    if (cfg.depositRequired && cfg.depositType === 'fixed' && !(cfg.depositFixedCents > 0)) e.deposit = 'Poné el monto de la seña.'
    setErr(e)
    if (Object.keys(e).length) { toast('Revisá los campos marcados.', 'error'); return }
    update(s => { Object.assign(s.complexes.find(c => c.id === complex.id), { ...d, name: d.name.trim(), address: d.address.trim() }) })
    toast('Cambios guardados.')
  }

  return (
    <div className="max-w-[720px] pb-24">
      <Block title="Datos del complejo">
        <Field label="Nombre" error={err.name}><Input value={d.name} onChange={set('name')} /></Field>
        <Field label="Descripción"><Textarea value={d.description} onChange={set('description')} maxLength={400} placeholder="Qué ofrece el complejo, cómo llegar, reglas…" /></Field>
        <Field label="Dirección" error={err.address}><Input value={d.address} onChange={set('address')} autoComplete="street-address" /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ciudad o barrio"><Input value={d.city} onChange={set('city')} /></Field>
          <Field label="Teléfono"><Input type="tel" inputMode="tel" value={d.phone} onChange={set('phone')} /></Field>
          <Field label="WhatsApp"><Input type="tel" inputMode="tel" value={d.whatsapp} onChange={set('whatsapp')} /></Field>
        </div>
      </Block>

      <Block title="Ubicación en el mapa" hint="Tocá el mapa o arrastrá el marcador hasta la entrada.">
        <PositionPicker className="h-56 rounded-lg overflow-hidden border border-line" value={d.lat != null ? { lat: d.lat, lng: d.lng } : null} onChange={p => setD(x => ({ ...x, lat: p.lat, lng: p.lng }))} />
        <LocateButton onLocate={p => setD(x => ({ ...x, lat: p.lat, lng: p.lng }))} />
        {d.lat == null && <p className="hint">Sin ubicación, el complejo no aparece en el mapa.</p>}
      </Block>

      <Block title="Horarios">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Abre" error={err.hours}><Select value={d.hours.open} onChange={sub('hours', 'open')}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
          <Field label="Cierra"><Select value={d.hours.close} onChange={sub('hours', 'close')}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></Field>
        </div>
        <div><span className="label">Duración del turno</span>
          <Segmented value={d.hours.slotMinutes} onChange={v => setD(x => ({ ...x, hours: { ...x.hours, slotMinutes: v } }))} label="Duración" options={SLOT_OPTIONS.map(m => ({ value: m, label: `${m} min` }))} />
          <p className="hint">Si ya tenés reservas, cambiarlo no las mueve de horario.</p></div>
      </Block>

      <Block title="Servicios">
        <div className="flex flex-wrap gap-2">{SERVICES.map(s => <Chip key={s} active={d.services.includes(s)} onClick={() => set('services')(d.services.includes(s) ? d.services.filter(x => x !== s) : [...d.services, s])}>{s}</Chip>)}</div>
      </Block>

      <Block title="Fotos">
        <input ref={cover} type="file" accept="image/*" hidden onChange={e => upload(e, 'cover')} />
        <input ref={gal} type="file" accept="image/*" multiple hidden onChange={e => upload(e, 'gal')} />
        <div><span className="label">Portada</span>
          <Cover src={d.coverUrl} seed={d.id} className="aspect-[16/9] w-full max-w-sm rounded-lg" />
          <div className="flex gap-2 mt-2"><Button variant="secondary" size="sm" loading={busy === 'cover'} onClick={() => cover.current.click()}><ImagePlus size={16} />{d.coverUrl ? 'Cambiar portada' : 'Subir portada'}</Button>{d.coverUrl && <Button variant="ghost" size="sm" onClick={() => set('coverUrl')('')}>Quitar</Button>}</div></div>
        <div><span className="label">Galería ({d.gallery.length}/6)</span>
          <div className="grid grid-cols-3 gap-2">{d.gallery.map((g, i) => (
            <div key={i} className="relative"><Cover src={g} className="aspect-[4/3] rounded-lg" />
              <button type="button" aria-label="Quitar foto" className="absolute top-1 right-1 grid place-items-center size-9 rounded-full bg-surface/90 border border-line" onClick={() => setD(x => ({ ...x, gallery: x.gallery.filter((_, j) => j !== i) }))}><X size={16} /></button></div>))}
            {d.gallery.length < 6 && <button type="button" className="aspect-[4/3] rounded-lg border border-dashed border-strong grid place-items-center text-muted hover:bg-sunken transition-colors" onClick={() => gal.current.click()} aria-label="Agregar fotos">{busy === 'gal' ? '…' : <ImagePlus size={24} />}</button>}</div></div>
      </Block>

      <Block title="Seña y pago">
        <Switch label="Pedir seña" hint="El jugador paga una parte al reservar." checked={cfg.depositRequired} onChange={sub('booking', 'depositRequired')} />
        {cfg.depositRequired && <>
          <Segmented value={cfg.depositType} onChange={sub('booking', 'depositType')} label="Tipo de seña" options={[{ value: 'percent', label: 'Porcentaje' }, { value: 'fixed', label: 'Monto fijo' }]} />
          {cfg.depositType === 'percent'
            ? <div><span className="label">Porcentaje del turno</span><Segmented value={cfg.depositPercent} onChange={sub('booking', 'depositPercent')} label="Porcentaje" options={[20, 30, 50].map(n => ({ value: n, label: `${n}%` }))} /></div>
            : <Field label="Monto de la seña" error={err.deposit}><MoneyInput value={cfg.depositFixedCents} onChange={sub('booking', 'depositFixedCents')} /></Field>}
        </>}
        <Switch label="Permitir pago total online" checked={cfg.allowFullPayment} onChange={sub('booking', 'allowFullPayment')} />
        <Field label="Tiempo para pagar" hint="Pasado ese tiempo, el horario se libera solo."><Select value={cfg.payWithinMinutes} onChange={e => sub('booking', 'payWithinMinutes')(Number(e.target.value))}>{PAY_WINDOW.map(m => <option key={m} value={m}>{m < 60 ? `${m} minutos` : `${m / 60} ${m === 60 ? 'hora' : 'horas'}`}</option>)}</Select></Field>
        <p className="text-sm text-muted">Los pagos se acreditan con Mercado Pago cuando conectes tu cuenta. Mientras tanto, la app funciona en modo de prueba.</p>
      </Block>

      <Block title="Cancelación y devolución">
        <Field label="Cancelación gratis hasta"><Select value={cfg.cancellationHours} onChange={e => sub('booking', 'cancellationHours')(Number(e.target.value))}>{CANCEL_HOURS.map(h => <option key={h} value={h}>{h} horas antes</option>)}</Select></Field>
        <div><span className="label">Si cancela a tiempo</span><Segmented value={cfg.refundPolicy} onChange={sub('booking', 'refundPolicy')} label="Devolución" options={Object.entries(REFUND_LABEL).map(([value, label]) => ({ value, label: label.replace('Devolución ', '').replace('del ', '').replace('Sin devolución', 'Ninguna').replace(/^./, c => c.toUpperCase()) }))} /></div>
        <p className="text-sm text-muted">Lo que verá el jugador: {cancelPolicyText(d)}</p>
      </Block>

      <Block title="Visibilidad">
        <Switch label="Visible para jugadores" hint="Si lo apagás, no aparece en búsquedas ni en el mapa." checked={d.public} onChange={set('public')} />
        <Button variant="secondary" disabled={dirty} onClick={() => navigate('/dueno/complejo/vista-previa')}><Eye size={18} />Ver vista previa pública</Button>
        {dirty && <p className="hint">Guardá los cambios para verlos en la vista previa.</p>}
      </Block>

      <div className={cn('fixed inset-x-0 z-20 bg-surface border-t border-line px-4 py-3 flex gap-2 lg:left-64 lg:justify-end transition-transform duration-200', 'bottom-[calc(var(--nav-h)+var(--safe-bottom))] lg:bottom-0', dirty ? 'translate-y-0' : 'translate-y-[calc(100%+var(--nav-h)+var(--safe-bottom)+8px)]')} aria-hidden={!dirty}>
        <Button variant="secondary" onClick={() => { setD(structuredClone(complex)); setErr({}) }} tabIndex={dirty ? 0 : -1}>Descartar</Button>
        <Button onClick={save} className="flex-1 lg:flex-none" tabIndex={dirty ? 0 : -1}>Guardar cambios</Button>
      </div>
    </div>
  )
}
