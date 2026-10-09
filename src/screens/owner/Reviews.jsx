import { useState } from 'react'
import { useStore } from '../../lib/store'
import { notify, ratingOf } from '../../lib/domain'
import { dateShort } from '../../lib/format'
import { Star } from 'lucide-react'
import { Item, Stagger } from '../../ui/motion'
import { Button, Empty, Field, Rating, Sheet, Stars, Textarea, useToast } from '../../ui/kit'
import { OwnerPage, useOwner } from './common'

export default function OwnerReviews() {
  const { state, update } = useStore()
  const { complex } = useOwner()
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [text, setText] = useState('')
  const list = complex ? state.reviews.filter(r => r.complexId === complex.id && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const r0 = complex ? ratingOf(state, complex.id) : { avg: 0, count: 0 }
  const save = () => {
    update(s => { const r = s.reviews.find(x => x.id === edit.id); if (text.trim()) { r.reply = { text: text.trim(), at: new Date().toISOString() }; notify(s, { userId: r.playerId, type: 'review_reply', title: 'El complejo te respondió', text: `${complex?.name || 'El complejo'} respondió tu reseña.`, complexId: r.complexId, link: `/complejo/${complex?.slug}` }) } else delete r.reply })
    toast(text.trim() ? 'Respuesta publicada.' : 'Respuesta eliminada.'); setEdit(null)
  }
  return (
    <OwnerPage title="Reseñas" sub={complex && r0.count ? `${r0.avg.toFixed(1).replace('.', ',')} de promedio · ${r0.count}` : ''}>
      {complex && (list.length === 0 ? <Empty title="Todavía no hay reseñas" text="Los jugadores pueden dejarlas después de jugar." /> : (
        <div className="max-w-[720px]">
          <div className="hero p-5 flex items-center gap-5 mb-4">
            <div><div className="display text-6xl font-bold tnum leading-none">{r0.avg.toFixed(1).replace('.', ',')}</div><div className="flex gap-0.5 mt-2" aria-hidden="true">{[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} className={n <= Math.round(r0.avg) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-white/40'} />)}</div></div>
            <div className="flex-1 space-y-1.5 min-w-0">{[5, 4, 3, 2, 1].map(n => { const k = list.filter(r => r.rating === n).length; return <div key={n} className="flex items-center gap-2 text-xs tnum"><span className="w-3">{n}</span><span className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden"><span className="block h-full bg-white rounded-full" style={{ width: `${list.length ? k / list.length * 100 : 0}%` }} /></span><span className="w-5 text-right opacity-85">{k}</span></div> })}</div>
          </div>
        <Stagger className="space-y-3">{list.map(r => (
          <Item key={r.id} className="p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between gap-3"><span className="font-semibold">{r.playerName}</span><Stars n={r.rating} /></div>
            <p className="text-sm text-muted">{dateShort(r.createdAt.slice(0, 10))}</p>
            {r.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{r.tags.map(t => <span key={t} className="text-xs font-medium rounded-full px-2.5 py-1 bg-sunken text-muted">{t}</span>)}</div>}
            {r.text && <p className="mt-1">{r.text}</p>}
            {r.reply && <div className="mt-3 pl-3 border-l-2 border-brand"><p className="text-sm font-semibold">Tu respuesta</p><p className="text-sm">{r.reply.text}</p></div>}
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setEdit(r); setText(r.reply?.text || '') }}>{r.reply ? 'Editar respuesta' : 'Responder'}</Button>
          </Item>))}</Stagger></div>))}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Responder reseña" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={save}>Publicar respuesta</Button></>}>
        {edit && <><p className="text-muted mb-3">“{edit.text || 'Sin comentario'}”</p>
          <Field label="Tu respuesta" hint="La ven todos los jugadores. Respondé con respeto y sin datos personales."><Textarea value={text} maxLength={300} onChange={e => setText(e.target.value)} data-autofocus /></Field></>}
      </Sheet>
    </OwnerPage>
  )
}
