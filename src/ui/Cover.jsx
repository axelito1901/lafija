import { cn } from '../lib/format'

/* Portada: la foto del complejo. Sin foto, un pasto recién cortado con las líneas de la cancha
   (círculo central y línea de mitad de cancha) y luz de reflector; nunca un dibujo plano. */
export function Cover({ src, seed = '', className, alt = '' }) {
  if (src) return <div className={cn('cover', className)}><img src={src} alt={alt} loading="lazy" decoding="async" /></div>
  const h = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const tones = [['#2f7a43', '#2a6f3c'], ['#33804a', '#2c7341'], ['#2b7340', '#276838']][h % 3]
  const angle = [90, 0, 90][h % 3]
  const line = 'rgba(255,255,255,.2)'
  return (
    <div className={cn('cover', className)} role="img" aria-label={alt || 'Sin foto'}
      style={{ background: `repeating-linear-gradient(${angle}deg, ${tones[0]} 0 14%, ${tones[1]} 14% 28%)` }}>
      <div className="absolute inset-0" aria-hidden="true" style={{ background: [
        `radial-gradient(circle closest-side at 50% 50%, transparent 0 46%, ${line} 46% 49%, transparent 49%)`,
        `linear-gradient(90deg, transparent 49.4%, ${line} 49.4% 50.6%, transparent 50.6%)`,
        'radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.12), rgba(0,0,0,.24))',
      ].join(', ') }} />
    </div>
  )
}
