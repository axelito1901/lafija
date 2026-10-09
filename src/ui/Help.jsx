import { useState } from 'react'
import { CircleHelp, MessageCircle, PlayCircle } from 'lucide-react'
import { useStore } from '../lib/store'
import { waLink } from '../lib/format'
import { Button, IconButton, Sheet } from './kit'

export const SUPPORT_WA = import.meta.env.VITE_SUPPORT_WHATSAPP || '+5491100000000'

export const GLOSSARY = {
  sena: ['¿Qué es la seña?', 'Es una parte del precio que pagás ahora para guardar el turno. El resto lo pagás en la cancha.'],
  total: ['¿Qué es pagar total?', 'Pagás todo ahora y en la cancha no tenés que pagar nada más.'],
  cancelacion: ['¿Qué pasa si cancelo?', 'Si cancelás antes del plazo que fija el complejo, te devuelven lo pagado. Después del plazo, no.'],
  turno: ['¿Qué es un turno?', 'Es el tiempo que alquilás la cancha. Casi siempre es una hora.'],
}

const FAQ = {
  player: [
    ['¿Cómo reservo una cancha?', 'Tocá "Buscar", elegí un complejo y después "Reservar". Te vamos a pedir el día, la cancha y la hora, en ese orden.'],
    ['¿Dónde veo mis reservas?', 'En "Reservas", abajo en la pantalla. Ahí podés pagar, cancelar o invitar a tus amigos.'],
    ['¿Cómo cancelo?', 'Entrá a "Reservas", tocá la reserva y después "Cancelar reserva". Antes de confirmar te decimos si te devuelven la plata.'],
    ['¿Cómo llego al complejo?', 'En la reserva tocá "Cómo llegar" y se abre el mapa del celular.'],
  ],
  owner: [
    ['¿Cómo cargo una reserva?', 'En "Agenda" tocá un horario libre, o el botón verde "+". También podés dictarla con el micrófono.'],
    ['¿Cómo bloqueo un horario?', 'En "Agenda" tocá un horario libre y elegí "Bloquear horario". Sirve para mantenimiento o eventos.'],
    ['¿Cómo registro un pago?', 'Tocá la reserva y después "Registrar cobro".'],
    ['¿Cómo aviso a un cliente?', 'Tocá la reserva y después "Enviar mensaje". Elegís el tipo de mensaje y se abre WhatsApp.'],
  ],
  admin: [['¿Cómo desactivo un complejo?', 'En "Complejos", tocá el complejo y después "Desactivar complejo".']],
}

/* Explicación corta de una palabra difícil, desplegable en el lugar. */
export function Explain({ term, className = '' }) {
  const [q, a] = GLOSSARY[term]
  return (
    <details className={`group text-sm ${className}`}>
      <summary className="inline-flex items-center gap-1.5 text-brand font-medium min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden"><CircleHelp size={16} />{q}</summary>
      <p className="text-muted -mt-1 pb-1">{a}</p>
    </details>
  )
}

export function HelpButton({ onReplayIntro }) {
  const { user } = useStore()
  const [open, setOpen] = useState(false)
  if (!user) return null
  const faq = FAQ[user.role] || []
  return (
    <>
      <IconButton label="Ayuda" data-tour="ayuda" onClick={() => setOpen(true)}><CircleHelp size={22} /></IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="¿Necesitás ayuda?" wide
        footer={<Button as="a" href={waLink(SUPPORT_WA, `Hola, necesito ayuda con La Fija. Soy ${user.name}.`)} target="_blank" rel="noreferrer"><MessageCircle size={18} />Escribir a soporte</Button>}>
        <div className="list">
          {faq.map(([q, a]) => (
            <details key={q} className="group px-4">
              <summary className="flex items-center justify-between gap-3 min-h-14 font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden">{q}<span className="text-muted text-xl leading-none transition-transform group-open:rotate-45">+</span></summary>
              <p className="text-muted pb-4 -mt-1">{a}</p>
            </details>
          ))}
        </div>
        {user.role === 'player' && <>
          <h3 className="font-semibold mt-6 mb-2">Palabras que vas a ver</h3>
          <dl className="space-y-3">{Object.values(GLOSSARY).map(([q, a]) => <div key={q}><dt className="font-medium">{q}</dt><dd className="text-muted text-sm">{a}</dd></div>)}</dl>
        </>}
        {onReplayIntro && (user.role === 'player' || user.role === 'owner') && <Button variant="ghost" className="mt-4" onClick={() => { setOpen(false); onReplayIntro() }}><PlayCircle size={18} />Ver la guía de nuevo</Button>}
      </Sheet>
    </>
  )
}
