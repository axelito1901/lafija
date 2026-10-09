import { useState } from 'react'
import { Check, Copy, Pencil, Send, Shuffle, UserPlus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { PLAYERS, getComplex, getCourt } from '../lib/domain'
import { cn, waLink } from '../lib/format'
import { MESSAGE_KINDS, buildMessage, parseWA } from '../lib/messages'
import { Button, Chip, Input, Sheet, Textarea, useToast } from './kit'

/* Vista previa de un mensaje de WhatsApp, editable, listo para enviar. */
/* Armar equipos: nombres de los jugadores y reparto al azar en dos equipos. Se guarda en la reserva. */
function TeamBuilder({ booking, court }) {
  const { update } = useStore()
  const [name, setName] = useState('')
  const lineup = booking.lineup || { names: [], teams: [[], []] }
  const need = PLAYERS[court?.sport] || 10
  const save = next => update(s => { s.bookings.find(x => x.id === booking.id).lineup = next })
  const add = () => {
    const parts = name.split(/[,\n]/).map(x => x.trim()).filter(Boolean)
    if (!parts.length) return
    save({ names: [...lineup.names, ...parts.filter(p => !lineup.names.includes(p))], teams: [[], []] }); setName('')
  }
  const remove = n => save({ names: lineup.names.filter(x => x !== n), teams: [[], []] })
  const shuffle = () => {
    const arr = [...lineup.names]
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
    save({ ...lineup, teams: [arr.filter((_, i) => i % 2 === 0), arr.filter((_, i) => i % 2 === 1)] })
  }
  const [t1, t2] = lineup.teams
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between"><span className="label">Jugadores</span><span className={cn('text-sm tnum', lineup.names.length >= need ? 'text-brand font-semibold' : 'text-muted')}>{lineup.names.length} de {need}</span></div>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Nombre del jugador" aria-label="Nombre del jugador" />
        <Button variant="secondary" onClick={add} disabled={!name.trim()} aria-label="Agregar jugador"><UserPlus size={18} /></Button>
      </div>
      <p className="hint">Podés pegar varios nombres separados por coma.</p>
      {lineup.names.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">{lineup.names.map(n => (
          <span key={n} className="inline-flex items-center gap-1 pl-3 rounded-lg bg-sunken min-h-10 text-sm font-medium">{n}<button type="button" className="size-10 grid place-items-center text-muted" aria-label={`Quitar a ${n}`} onClick={() => remove(n)}><X size={16} /></button></span>))}</div>
      )}
      <Button className="w-full mt-3" variant={t1.length ? 'secondary' : 'primary'} disabled={lineup.names.length < 2} onClick={shuffle}><Shuffle size={18} />{t1.length ? 'Mezclar de nuevo' : 'Armar equipos al azar'}</Button>
      {t1.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[[t1, 'Equipo 1', 'Con pechera'], [t2, 'Equipo 2', 'Sin pechera']].map(([t, title, sub]) => (
            <div key={title} className="rounded-lg border border-line p-3 min-w-0">
              <p className="font-semibold display text-lg leading-tight">{title}</p><p className="text-xs text-muted mb-2">{sub}</p>
              <ol className="text-sm space-y-1">{t.map((n, i) => <li key={n} className="truncate"><span className="text-muted tnum mr-1">{i + 1}.</span>{n}</li>)}</ol>
            </div>))}
        </div>
      )}
    </div>
  )
}

export function MessageSheet({ bookingId, kinds = ['confirmacion', 'recordatorio', 'pago', 'cancelacion'], initial, toPhone, toName, onClose, onSent, title = 'Enviar mensaje' }) {
  const { state } = useStore()
  const toast = useToast()
  const b = state.bookings.find(x => x.id === bookingId)
  const [kind, setKind] = useState(initial || kinds[0])
  const [edited, setEdited] = useState(null)
  const [editing, setEditing] = useState(false)
  if (!b) return null
  const complex = getComplex(state, b.complexId), court = getCourt(state, b.courtId)
  const text = edited ?? buildMessage(kind, { b, complex, court, toName })
  const phone = toPhone === undefined ? b.phone : toPhone
  const clock = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast('Mensaje copiado.') } catch { toast('No pudimos copiar. Seleccioná el texto a mano.', 'error') } }

  return (
    <Sheet open onClose={onClose} title={title} wide
      footer={<><Button variant="secondary" onClick={copy}><Copy size={16} />Copiar</Button>
        <Button as="a" href={waLink(phone, text)} target="_blank" rel="noreferrer" onClick={() => { onSent?.(kind); setTimeout(onClose, 200) }}><Send size={16} />Enviar por WhatsApp</Button></>}>
      {kinds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1" role="group" aria-label="Tipo de mensaje">
          {kinds.map(k => <Chip key={k} active={kind === k} onClick={() => { setKind(k); setEdited(null) }}>{MESSAGE_KINDS[k]}</Chip>)}
        </div>
      )}
      {kind === 'equipos' && <div className="mt-4"><TeamBuilder booking={b} court={court} /></div>}
      <p className="text-sm text-muted mt-3 mb-2">{phone ? `Para ${toName || b.playerName} · ${phone}` : 'Elegís a quién mandarlo en WhatsApp.'}</p>

      {/* Burbuja estilo WhatsApp */}
      <div className="rounded-lg p-3 sm:p-4" style={{ background: 'var(--sunken)' }}>
        <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-sm px-3 py-2 text-[15px] leading-snug shadow-sm" style={{ background: 'color-mix(in srgb, var(--brand) 16%, var(--surface))' }}>
          {editing
            ? <Textarea className="!bg-transparent !border-0 !p-0 !min-h-48 !shadow-none text-[15px]" value={text} onChange={e => setEdited(e.target.value)} aria-label="Mensaje" data-autofocus />
            : text.split('\n').map((ln, i) => (
              <div key={i} className={cn('break-words', !ln && 'h-2')}>
                {parseWA(ln).map((p, j) => p.t === 'b' ? <strong key={j}>{p.v}</strong> : p.t === 'i' ? <em key={j} className="text-muted">{p.v}</em> : <span key={j}>{p.v}</span>)}
              </div>))}
          <div className="text-[11px] text-muted text-right mt-1 flex justify-end items-center gap-1">{clock}<Check size={12} className="text-info" /></div>
        </div>
      </div>
      <button type="button" className="btn btn-link btn-sm mt-3" onClick={() => setEditing(e => !e)}><Pencil size={14} />{editing ? 'Ver vista previa' : 'Editar texto'}</button>
    </Sheet>
  )
}
