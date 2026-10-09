import { useState } from 'react'
import { useStore } from '../../lib/store'
import { ratingOf } from '../../lib/domain'
import { dateShort } from '../../lib/format'
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
    update(s => { const r = s.reviews.find(x => x.id === edit.id); if (text.trim()) r.reply = { text: text.trim(), at: new Date().toISOString() }; else delete r.reply })
    toast(text.trim() ? 'Respuesta publicada.' : 'Respuesta eliminada.'); setEdit(null)
  }
  return (
    <OwnerPage title="Reseñas" sub={complex && r0.count ? `${r0.avg.toFixed(1).replace('.', ',')} de promedio · ${r0.count}` : ''}>
      {complex && (list.length === 0 ? <Empty title="Todavía no hay reseñas" text="Los jugadores pueden dejarlas después de jugar." /> : (
        <div className="list max-w-[720px]">{list.map(r => (
          <div key={r.id} className="px-4 py-4">
            <div className="flex items-center justify-between gap-3"><span className="font-semibold">{r.playerName}</span><Stars n={r.rating} /></div>
            <p className="text-sm text-muted">{dateShort(r.createdAt.slice(0, 10))}</p>
            {r.text && <p className="mt-1">{r.text}</p>}
            {r.reply && <div className="mt-3 pl-3 border-l-2 border-brand"><p className="text-sm font-semibold">Tu respuesta</p><p className="text-sm">{r.reply.text}</p></div>}
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setEdit(r); setText(r.reply?.text || '') }}>{r.reply ? 'Editar respuesta' : 'Responder'}</Button>
          </div>))}</div>))}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Responder reseña" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={save}>Publicar respuesta</Button></>}>
        {edit && <><p className="text-muted mb-3">“{edit.text || 'Sin comentario'}”</p>
          <Field label="Tu respuesta" hint="La ven todos los jugadores. Respondé con respeto y sin datos personales."><Textarea value={text} maxLength={300} onChange={e => setText(e.target.value)} data-autofocus /></Field></>}
      </Sheet>
    </OwnerPage>
  )
}
