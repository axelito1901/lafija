import { useEffect, useId, useRef, useState } from 'react'
import { LoaderCircle, LocateFixed, MapPin, X } from 'lucide-react'
import { cn } from '../lib/format'
import { localMatches, placeName, searchPlaces } from '../lib/places'
import { useOrigin } from '../lib/origin'
import { getLocation } from '../lib/geo'
import { useToast } from './kit'

/* Campo "¿Dónde?": se completa solo mientras escribís, o con tu ubicación. */
export function PlaceField({ className }) {
  const { label, real, setOrigin } = useOrigin()
  const toast = useToast()
  const id = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const q = text.trim()
    const local = localMatches(q)
    setItems(local); setActive(q && local.length ? 1 : 0)
    if (q.length < 3 || local.length >= 4) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal).then(found => {
        const seen = new Set(local.map(p => p.name.toLowerCase()))
        const merged = [...local, ...found.filter(p => !seen.has(p.name.toLowerCase()))].slice(0, 7)
        setItems(merged); setActive(merged.length ? 1 : 0)
      }).catch(() => {})
    }, 450)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [text])
  // Si el celular ya dio permiso de ubicación, la usamos sola (sin preguntar de nuevo).
  useEffect(() => {
    if (real || !window.isSecureContext || !navigator.permissions?.query) return
    navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state === 'granted') locate(true) }).catch(() => {})
  }, []) // eslint-disable-line
  useEffect(() => {
    const out = e => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', out)
    return () => document.removeEventListener('pointerdown', out)
  }, [])

  const choose = p => { setOrigin({ lat: p.lat, lng: p.lng, label: p.name }); setText(''); setOpen(false) }
  const locate = async quiet => {
    setBusy(true); setOpen(false)
    try {
      const pos = await getLocation()
      setOrigin({ ...pos, label: 'Tu ubicación' })
      setBusy(false)
      const name = await placeName(pos)
      setOrigin({ ...pos, label: name === 'Tu ubicación' ? name : `Cerca de ${name}` })
    } catch (e) { setBusy(false); if (quiet !== true) toast(e.message, 'error') }
  }
  const options = [{ locate: true }, ...items]
  const key = e => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); const o = options[active]; o?.locate ? locate() : o && choose(o) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={box} className={cn('relative', className)}>
      <label htmlFor={id} className="label">¿Dónde?</label>
      <div className="relative">
        <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input id={id} className="input !pl-10 !pr-11" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" autoComplete="off"
          value={open ? text : busy ? 'Buscando dónde estás…' : label} placeholder="Barrio o ciudad"
          onFocus={() => { setOpen(true); setText('') }} onChange={e => { setText(e.target.value); setOpen(true) }} onKeyDown={key} />
        {busy ? <LoaderCircle size={18} className="spin absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          : real && !open && <button type="button" className="absolute right-0 top-0 h-full w-11 grid place-items-center text-muted" aria-label="Quitar ubicación" onClick={() => setOrigin(null)}><X size={18} /></button>}
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-40 left-0 right-0 mt-1 bg-surface border border-line rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {options.map((o, i) => (
            <li key={o.locate ? 'me' : `${o.name}-${o.lat}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => (o.locate ? locate() : choose(o))}
                className={cn('w-full text-left flex items-center gap-3 px-4 min-h-12 py-2', i === active && 'bg-sunken', i > 0 && 'border-t border-line')}>
                {o.locate ? <><LocateFixed size={18} className="text-brand flex-none" /><span className="font-semibold text-brand">Usar mi ubicación</span></>
                  : <><MapPin size={18} className="text-muted flex-none" /><span className="min-w-0"><span className="block font-medium truncate">{o.name}</span>{o.area && <span className="block text-sm text-muted truncate">{o.area}</span>}</span></>}
              </button>
            </li>
          ))}
          {text.trim().length > 0 && items.length === 0 && <li className="px-4 py-3 text-sm text-muted border-t border-line">Buscando “{text}”…</li>}
        </ul>
      )}
    </div>
  )
}
