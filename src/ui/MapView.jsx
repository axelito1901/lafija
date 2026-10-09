import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, LoaderCircle, Star } from 'lucide-react'
import { Cover } from './Cover'
import { money } from '../lib/format'
import { getLocation } from '../lib/geo'
import { Button, useToast } from './kit'

import { DEFAULT_CENTER } from '../lib/geo'
export { DEFAULT_CENTER }
const TILES = { light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' }
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/* Mapa claro u oscuro según el tema de la app. */
function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark
}
/* Mosaicos gratis y sin clave. Si el primer proveedor no carga (red, bloqueador, caída), pasamos al siguiente solos. */
const PROVIDERS = [
  { id: 'carto', url: d => d ? TILES.dark : TILES.light, sub: 'abcd', attr: ATTR },
  { id: 'osm', url: () => 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', sub: 'abc', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
  { id: 'osm-fr', url: () => 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', sub: 'abc', attr: '&copy; OpenStreetMap France' },
]
function Tiles({ maxZoom = 19, attribution }) {
  const d = useDark()
  const [i, setI] = useState(0)
  const stat = useRef({ ok: 0, bad: 0 })
  const p = PROVIDERS[i]
  const ev = useMemo(() => ({
    tileload: () => { stat.current.ok++ },
    tileerror: () => { const s = stat.current; s.bad++; if (s.bad >= 3 && s.ok === 0 && i < PROVIDERS.length - 1) { stat.current = { ok: 0, bad: 0 }; setI(i + 1) } },
  }), [i])
  return <TileLayer key={p.id + (d ? 'd' : 'l')} url={p.url(d)} attribution={attribution === undefined ? undefined : p.attr} maxZoom={maxZoom} subdomains={p.sub} className={p.id !== 'carto' && d ? 'tiles-invert' : ''} eventHandlers={ev} />
}

const pinIcon = (label, on) => divIcon({ className: '', html: `<div class="pin pin-pop${on ? ' on' : ''}">${label}</div>`, iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -38] })
const meIcon = divIcon({ className: '', html: '<div class="pin-me"></div>', iconSize: [0, 0] })

/* Encuadra los puntos y se vuelve a encuadrar cuando el contenedor cambia de tamaño
   (Lista ↔ Mapa en mobile, rotar el celular), que es cuando Leaflet calcula mal. */
function Viewport({ points, focus }) {
  const map = useMap()
  const key = points.map(p => `${p.lat},${p.lng}`).join('|') + (focus ? `@${focus.lat},${focus.lng}` : '')
  useEffect(() => {
    const fit = () => {
      map.invalidateSize()
      if (focus) { map.setView([focus.lat, focus.lng], map.getZoom() > 12 ? map.getZoom() : 15, { animate: false }); return }
      if (!points.length) return
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15, { animate: false })
      else map.fitBounds(points.map(p => [p.lat, p.lng]), { paddingTopLeft: [40, 64], paddingBottomRight: [40, 40], maxZoom: 15, animate: false })
    }
    fit()
    const el = map.getContainer(); let last = el.clientWidth + 'x' + el.clientHeight
    const ro = new ResizeObserver(() => { const now = el.clientWidth + 'x' + el.clientHeight; if (now !== last && el.clientWidth > 0) { last = now; fit() } })
    ro.observe(el)
    return () => ro.disconnect()
  }, [map, key]) // eslint-disable-line
  return null
}

export function LocateButton({ onLocate, className = '' }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const go = async () => {
    setBusy(true)
    try { onLocate(await getLocation()) } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Button variant="secondary" size="sm" onClick={go} disabled={busy} className={className} aria-label="Usar mi ubicación">
      {busy ? <LoaderCircle size={16} className="spin" /> : <LocateFixed size={16} />}Mi ubicación
    </Button>
  )
}

/** Mapa de complejos. Tocar un marcador abre el globo; el botón del globo abre el complejo. */
export function ComplexMap({ complexes, selectedId, onSelect, onOpen, userPos, onLocate, className = '' }) {
  const pts = complexes.filter(c => c.lat != null && c.lng != null)
  const center = userPos || pts[0] || DEFAULT_CENTER
  return (
    <div className={`map-box ${className}`}>
      <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom={false} zoomControl={false} className="h-full w-full" style={{ minHeight: 240 }}>
        <Tiles attribution={ATTR} />
        <ZoomControl position="bottomright" />
        <Viewport points={pts} focus={null} />
        {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={meIcon} interactive={false} />}
        {pts.map(c => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={iconFor(c, selectedId === c.id)} eventHandlers={{ click: () => onSelect?.(c.id) }}>
            <Popup closeButton={false} autoPanPadding={[16, 16]} minWidth={220} maxWidth={240}>
              <div className="-m-3 overflow-hidden rounded-2xl">
                <div className="relative"><Cover src={c.coverUrl} seed={c.id} className="aspect-[16/9]" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {c.ratingCount > 0 && <span className="absolute right-2 top-2 inline-flex items-center gap-1 text-white text-xs font-semibold bg-black/45 rounded-full px-2 py-0.5"><Star size={11} className="fill-[var(--gold)] text-[var(--gold)]" />{c.rating.toFixed(1).replace('.', ',')}</span>}</div>
                <div className="p-3 flex flex-col gap-2">
                  <div><div className="font-semibold text-base leading-tight">{c.name}</div><div className="text-sm text-muted">{c.city}{c.distance != null ? ` · ${c.distanceLabel}` : ''}{c.fromPrice != null ? ` · desde ${money(c.fromPrice)}` : ''}</div></div>
                  <Button size="sm" onClick={() => onOpen(c)}>Ver horarios</Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {onLocate && <div className="absolute top-3 right-3 z-[400]"><LocateButton onLocate={onLocate} /></div>}
    </div>
  )
}
const cache = new Map()
function iconFor(c, on) {
  const label = c.fromPrice != null ? money(c.fromPrice) : c.name
  const k = `${label}|${on}`
  if (!cache.has(k)) cache.set(k, pinIcon(label, on))
  return cache.get(k)
}

/* Selector de posición para el dueño: tocar el mapa o arrastrar el marcador. */
function ClickToSet({ onPick }) { useMapEvents({ click: e => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) }); return null }
const dot = divIcon({ className: '', html: '<div class="pin-me" style="background:var(--brand)"></div>', iconSize: [0, 0] })
export function PositionPicker({ value, onChange, className = '' }) {
  const pos = value?.lat != null ? value : DEFAULT_CENTER
  return (
    <div className={`map-box ${className}`}>
      <MapContainer center={[pos.lat, pos.lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full" style={{ minHeight: 200 }}>
        <Tiles attribution={ATTR} />
        <Viewport points={[]} focus={value?.lat != null ? value : null} />
        <ClickToSet onPick={onChange} />
        {value?.lat != null && <Marker position={[value.lat, value.lng]} icon={dot} draggable eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); onChange({ lat: p.lat, lng: p.lng }) } }} />}
      </MapContainer>
    </div>
  )
}

/* Mapa chico del complejo, solo para ver dónde queda. Tocarlo abre el mapa del celular. */
export function MiniMap({ lat, lng, href, className = '' }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`map-box block overflow-hidden rounded-lg border border-line ${className}`} aria-label="Ver en el mapa y cómo llegar">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full pointer-events-none" style={{ minHeight: 160 }} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false} zoomControl={false} attributionControl={false}>
        <Tiles />
        <Marker position={[lat, lng]} icon={divIcon({ className: '', html: '<div class="pin-me" style="background:var(--brand);width:22px;height:22px"></div>', iconSize: [0, 0] })} />
      </MapContainer>
      <span className="absolute bottom-2 right-2 z-[400] bg-surface border border-line rounded-lg px-3 min-h-9 inline-flex items-center text-sm font-semibold">Cómo llegar</span>
      <span className="absolute bottom-1 left-2 z-[400] text-[10px] text-muted bg-surface/80 px-1 rounded">© OpenStreetMap</span>
    </a>
  )
}
