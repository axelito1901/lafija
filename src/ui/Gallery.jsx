import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '../lib/format'
import { Cover } from './Cover'

/* Carrusel de fotos con deslizar táctil, puntos y vista ampliada. */
export function Gallery({ photos, seed, alt, className, children }) {
  const list = photos.length ? photos : ['']
  const ref = useRef(null)
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(null)
  const onScroll = () => { const el = ref.current; if (el) setI(Math.round(el.scrollLeft / el.clientWidth)) }
  const go = n => ref.current?.scrollTo({ left: n * ref.current.clientWidth, behavior: 'smooth' })
  return (
    <div className={cn('relative group', className)}>
      <div ref={ref} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full rounded-[inherit]">
        {list.map((src, k) => (
          <button key={k} type="button" className="snap-center flex-none w-full h-full" onClick={() => src && setZoom(k)} aria-label={`Ampliar foto ${k + 1} de ${list.length}`}>
            <Cover src={src} seed={seed + k} alt={`${alt} (${k + 1})`} className="w-full h-full" />
          </button>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/65 to-transparent pointer-events-none rounded-b-[inherit]" />
      {children}
      {list.length > 1 && <>
        <div className="absolute bottom-3 right-4 flex gap-1.5" aria-hidden="true">
          {list.map((_, k) => <span key={k} className={cn('h-1.5 rounded-full bg-white transition-all duration-300', k === i ? 'w-5 opacity-100' : 'w-1.5 opacity-55')} />)}
        </div>
        <span className="absolute top-3 right-3 text-xs font-semibold text-white bg-black/45 backdrop-blur px-2.5 py-1 rounded-full tnum">{i + 1} / {list.length}</span>
        {i > 0 && <button type="button" onClick={() => go(i - 1)} aria-label="Foto anterior" className="hidden lg:grid absolute left-3 top-1/2 -translate-y-1/2 size-10 place-items-center rounded-full bg-white/90 text-black opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={20} /></button>}
        {i < list.length - 1 && <button type="button" onClick={() => go(i + 1)} aria-label="Foto siguiente" className="hidden lg:grid absolute right-3 top-1/2 -translate-y-1/2 size-10 place-items-center rounded-full bg-white/90 text-black opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={20} /></button>}
      </>}
      <Lightbox list={list} index={zoom} onClose={() => setZoom(null)} onIndex={setZoom} alt={alt} />
    </div>
  )
}

function Lightbox({ list, index, onClose, onIndex, alt }) {
  useEffect(() => {
    if (index == null) return
    const on = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onIndex(Math.min(list.length - 1, index + 1)); if (e.key === 'ArrowLeft') onIndex(Math.max(0, index - 1)) }
    document.addEventListener('keydown', on); document.documentElement.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', on); document.documentElement.style.overflow = '' }
  }, [index]) // eslint-disable-line
  return createPortal(
    <AnimatePresence>
      {index != null && (
        <motion.div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Fotos">
          <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 size-11 grid place-items-center rounded-full bg-white/15 text-white"><X size={22} /></button>
          <motion.img key={index} src={list[index]} alt={`${alt} (${index + 1})`} className="max-w-[94vw] max-h-[80dvh] rounded-2xl shadow-2xl object-contain"
            initial={{ scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, d) => { if (d.offset.x < -60) onIndex(Math.min(list.length - 1, index + 1)); if (d.offset.x > 60) onIndex(Math.max(0, index - 1)) }} onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-6 flex gap-2" onClick={e => e.stopPropagation()}>
            {list.map((s, k) => <button key={k} type="button" aria-label={`Foto ${k + 1}`} onClick={() => onIndex(k)} className={cn('h-14 w-20 rounded-lg overflow-hidden border-2 transition-all', k === index ? 'border-white scale-105' : 'border-transparent opacity-60')}><img src={s} alt="" className="w-full h-full object-cover" /></button>)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>, document.body)
}
