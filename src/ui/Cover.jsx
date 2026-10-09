import { cn } from '../lib/format'

/* Portada: la foto del complejo. Sin foto, una textura de pasto cortado (no un dibujo). */
export function Cover({ src, seed = '', className, alt = '' }) {
  if (src) return <div className={cn('cover', className)}><img src={src} alt={alt} loading="lazy" /></div>
  const h = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const tones = [['#2f7a43', '#2a6f3c'], ['#33804a', '#2c7341'], ['#2b7340', '#276838']][h % 3]
  const angle = [90, 0, 90][h % 3]
  return (
    <div className={cn('cover', className)} role="img" aria-label={alt || 'Sin foto'}
      style={{ background: `repeating-linear-gradient(${angle}deg, ${tones[0]} 0 14%, ${tones[1]} 14% 28%)` }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.10), rgba(0,0,0,.22))' }} />
    </div>
  )
}
