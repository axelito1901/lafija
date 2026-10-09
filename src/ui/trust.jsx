import { useState } from 'react'
import { BadgeCheck, CalendarCheck, CloudFog, CloudLightning, CloudRain, CloudSun, Cloud, MessageSquareReply, ShieldCheck, Sun, ThumbsUp, TriangleAlert } from 'lucide-react'
import { cn } from '../lib/format'
import { trustOf, verifyChecks } from '../lib/domain'
import { useWeather } from '../lib/weather'
import { Sheet } from './kit'

export const VerifiedBadge = ({ className, label = true }) => (
  <span className={cn('inline-flex items-center gap-1 text-brand font-semibold text-xs', className)} title="Complejo verificado por La Fija"><BadgeCheck size={16} className="fill-[var(--brand-soft)]" aria-hidden="true" />{label ? 'Verificado' : <span className="sr-only">Verificado</span>}</span>
)

/* Qué significa "Verificado" y qué datos reales respaldan al complejo. */
export function TrustPanel({ state, complex, className }) {
  const t = trustOf(state, complex.id)
  const [open, setOpen] = useState(false)
  const items = [
    [CalendarCheck, `${t.played} ${t.played === 1 ? 'partido jugado' : 'partidos jugados'}`, t.played > 0],
    [ThumbsUp, t.byComplex === 0 ? 'Nunca canceló una reserva' : `Canceló el ${t.cancelPct}% de las reservas`, t.byComplex === 0 && t.played > 0],
    [MessageSquareReply, t.answeredPct == null ? 'Todavía sin reseñas' : `Responde el ${t.answeredPct}% de las reseñas`, (t.answeredPct ?? 0) >= 50],
  ]
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-4 shadow-[var(--sh-1)]', className)} aria-label="Confianza">
      <div className="flex items-center gap-3">
        <span className={cn('size-11 rounded-xl grid place-items-center flex-none', t.verified ? 'bg-[image:var(--grad-brand)] text-[var(--on-grad)]' : 'bg-sunken text-muted')}><ShieldCheck size={22} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold leading-tight">{t.verified ? 'Complejo verificado' : 'Complejo sin verificar'}</p><p className="text-sm text-muted">{t.verified ? 'La Fija revisó sus datos, fotos y ubicación.' : 'Todavía no revisamos este complejo en persona.'}</p></div>
        <button type="button" className="text-sm font-semibold text-brand min-h-11 px-2" onClick={() => setOpen(true)}>¿Qué es?</button>
      </div>
      <ul className="grid gap-2 mt-3 sm:grid-cols-3">{items.map(([I, text, good]) => (
        <li key={text} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', good ? 'bg-brand-soft text-brand font-medium' : 'bg-sunken text-muted')}><I size={16} className="flex-none" aria-hidden="true" /><span>{text}</span></li>))}</ul>
      <Sheet open={open} onClose={() => setOpen(false)} title="Qué significa Verificado">
        <p className="text-muted">La insignia <strong className="text-ink">Verificado</strong> la pone el equipo de La Fija después de revisar el complejo. Chequeamos que tenga:</p>
        <ul className="mt-3 space-y-2">{verifyChecks(state, complex).map(([l, ok]) => <li key={l} className="flex items-center gap-2"><BadgeCheck size={18} className={ok ? 'text-brand' : 'text-faint'} aria-hidden="true" /><span className={ok ? '' : 'text-muted'}>{l}</span></li>)}</ul>
        <p className="text-sm text-muted mt-4">Los números de arriba no los carga nadie: salen de las reservas y reseñas reales. Si algo no coincide con lo que viviste, avisanos desde tu reserva con <strong className="text-ink">Avisar de un problema</strong>.</p>
      </Sheet>
    </section>
  )
}

const ICON = { sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, storm: CloudLightning }
/* Clima del turno. Avisa si puede llover y la cancha no es techada. */
export function WeatherChip({ complex, court, date, time, className }) {
  const w = useWeather(complex, date, time)
  if (!w) return null
  const I = ICON[w.kind] || Cloud, wet = w.rain >= 50 && !court?.covered
  return (
    <div className={cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm', wet ? 'bg-warn-soft text-warn' : 'bg-sunken text-muted', className)} role="status">
      {wet ? <TriangleAlert size={16} aria-hidden="true" /> : <I size={16} aria-hidden="true" />}
      <span><strong className="text-ink tnum">{w.temp}°</strong> · {w.label} · <span className="tnum">{w.rain}%</span> de lluvia{wet && <strong> · la cancha no es techada</strong>}{w.rain >= 50 && court?.covered && ' · tu cancha es techada'}</span>
    </div>
  )
}
