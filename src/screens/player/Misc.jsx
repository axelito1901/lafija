import { useMemo, useState } from 'react'
import { AnimatePresence, m as motion } from 'motion/react'
import { CalendarCheck, CalendarX, Heart, HeartOff, LogOut } from 'lucide-react'
import { Item, Stagger, spring, CountUp } from '../../ui/motion'
import { useStore } from '../../lib/store'
import { nextTimes, effStatus, favsOf, freeCount, isUpcoming, leaveWaitlist, publicComplexes, toggleFav } from '../../lib/domain'
import { relativeDay, todayISO } from '../../lib/format'
import { useOrigin } from '../../lib/origin'
import { navigate } from '../../lib/router'
import { useBigText } from '../../lib/theme'
import { enablePush, pushPermission } from '../../lib/push'
import { Button, Content, Empty, Field, Input, PageHeader, Section, Segmented, Switch, useToast } from '../../ui/kit'
import { BookingCard, ComplexCard, complexView } from '../../ui/shared'
import { BookingDetail, ReviewSheet } from './flow'

export function PlayerBookings() {
  const { state, user, update } = useStore()
  const [tab, setTab] = useState('next')
  const [open, setOpen] = useState('')
  const [review, setReview] = useState(null)
  const now = new Date()
  const mine = state.bookings.filter(b => b.playerId === user.id)
  const next = mine.filter(b => isUpcoming(b, now)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const past = mine.filter(b => !isUpcoming(b, now)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const list = tab === 'next' ? next : past
  const waits = (state.waitlist || []).filter(w => w.playerId === user.id && w.date >= todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return (
    <>
      <PageHeader title="Mis reservas" />
      <Content className="max-w-[720px] lg:mx-0">
        <Segmented scrollTop value={tab} onChange={setTab} label="Reservas" options={[{ value: 'next', label: `Próximas (${next.length})` }, { value: 'past', label: `Anteriores (${past.length})` }]} />
        {tab === 'next' && waits.length > 0 && (
          <section className="mt-5">
            <h2 className="font-semibold mb-2">Lista de espera</h2>
            <div className="list !rounded-2xl">{waits.map(w => {
              const c = state.complexes.find(x => x.id === w.complexId), ct = state.courts.find(x => x.id === w.courtId)
              return (
                <div key={w.id} className="row">
                  <div className="flex-1 min-w-0"><div className="font-semibold truncate">{c?.name}</div><div className="text-sm text-muted truncate tnum">{relativeDay(w.date)} · {w.time} · {ct?.name}</div>
                    <div className={w.notifiedAt ? 'text-sm text-brand font-semibold' : 'text-sm text-warn'}>{w.notifiedAt ? '¡Se liberó!' : 'Esperando que se libere'}</div></div>
                  {w.notifiedAt
                    ? <Button size="sm" onClick={() => navigate(`/complejo/${c.slug}/reservar?fecha=${w.date}&cancha=${w.courtId}&hora=${w.time}`)}>Reservar</Button>
                    : <Button size="sm" variant="ghost" onClick={() => update(s => leaveWaitlist(s, w.id))}>Quitar</Button>}
                </div>)
            })}</div>
          </section>
        )}
        <h2 className="font-semibold mt-5 mb-2 sr-only">Reservas</h2>
        <div className="mt-4">
          {list.length === 0
            ? <Empty icon={tab === 'next' ? CalendarX : CalendarCheck} title={tab === 'next' ? 'No tenés reservas próximas' : 'Todavía no jugaste'} text={tab === 'next' ? 'Buscá una cancha y reservá un horario.' : ''} action={tab === 'next' && <Button onClick={() => navigate('/buscar')}>Buscar cancha</Button>} />
            : <Stagger key={tab} className="space-y-3">{list.map(b => <Item key={b.id}><BookingCard b={b} state={state} onClick={() => setOpen(b.id)} /></Item>)}</Stagger>}
        </div>
      </Content>
      {open && <BookingDetail bookingId={open} onClose={() => setOpen('')} onReview={b => { setOpen(''); setReview(b) }} />}
      {review && <ReviewSheet booking={review} onClose={() => setReview(null)} />}
    </>
  )
}

export function PlayerFavorites() {
  const { state, user, update } = useStore()
  const { origin } = useOrigin()
  const now = new Date()
  const favs = useMemo(() => { const ids = favsOf(state, user.id); return publicComplexes(state).filter(c => ids.includes(c.id)).map(c => complexView(state, c, origin)) }, [state, user.id, origin])
  return (
    <>
      <PageHeader title="Mis favoritos" sub={favs.length ? 'Tocá un horario para reservar' : ''} />
      <Content>
        {favs.length === 0
          ? <Empty icon={HeartOff} title="Todavía no guardaste canchas" text="Tocá el corazón de un complejo para tenerlo a mano." action={<Button onClick={() => navigate('/buscar')}>Buscar cancha</Button>} />
          : <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AnimatePresence>{favs.map(c => (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .9 }} transition={spring}>
                <ComplexCard c={c} slots={nextTimes(state, c, todayISO(), 4, now)} date={todayISO()} fav onFav={() => update(s => toggleFav(s, user.id, c.id))} />
              </motion.div>))}</AnimatePresence></motion.div>}
      </Content>
    </>
  )
}

export function Account({ theme, onSignOut }) {
  const { state, user, update } = useStore()
  const [big, setBig] = useBigText()
  const [pushOn, setPushOn] = useState(pushPermission() === 'granted')
  const [pushMsg, setPushMsg] = useState(pushPermission() === 'unsupported' ? 'Este navegador no permite avisos (en iPhone, agregá La Fija a la pantalla de inicio).' : pushPermission() === 'denied' ? 'Los avisos están bloqueados en la configuración del navegador.' : '')
  const toast = useToast()
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' })
  const [err, setErr] = useState({})
  const dirty = f.name !== user.name || f.phone !== (user.phone || '')
  const save = e => {
    e.preventDefault()
    if (!f.name.trim()) { setErr({ name: 'Escribí tu nombre.' }); return }
    update(s => { const u = s.users.find(x => x.id === user.id); u.name = f.name.trim(); u.phone = f.phone.trim() })
    setErr({}); toast('Datos guardados.')
  }
  return (
    <>
      <PageHeader title="Cuenta" />
      <Content className="max-w-[560px] lg:mx-0">
        <Stagger>
        <Item className="hero p-5 flex items-center gap-4">
          <span className="size-16 rounded-2xl grid place-items-center bg-white/20 backdrop-blur display text-2xl font-bold flex-none">{user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="display text-2xl font-bold leading-tight truncate">{user.name}</p><p className="text-sm opacity-90 truncate">{user.email}</p></div>
        </Item>
        <Item className="grid grid-cols-3 gap-3 mt-3 mb-8">
          {[[CalendarCheck, 'Reservas', state.bookings.filter(b => b.playerId === user.id && effStatus(b) !== 'cancelled').length], [CalendarCheck, 'Jugadas', state.bookings.filter(b => b.playerId === user.id && effStatus(b) === 'completed').length], [Heart, 'Favoritas', favsOf(state, user.id).length]].map(([I, k, v]) => (
            <div key={k} className="rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] p-3 text-center"><I size={18} className="mx-auto text-brand" aria-hidden="true" /><div className="display text-2xl font-bold tnum mt-1"><CountUp value={v} /></div><div className="text-xs text-muted">{k}</div></div>))}
        </Item>
        </Stagger>
        <form onSubmit={save} className="space-y-4" noValidate>
          <Field label="Nombre y apellido" error={err.name}><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
          <Field label="Celular" hint="El complejo lo usa para contactarte por tu reserva."><Input type="tel" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></Field>
          <Field label="Email"><Input value={user.email} disabled /></Field>
          <Button type="submit" disabled={!dirty}>Guardar cambios</Button>
        </form>
        <Section title="Preferencias" className="mt-10 [&>*:not(:first-child)]:rounded-2xl">
          <Switch label="Avisos en este celular" hint={pushMsg || 'Te avisamos de reservas, pagos y horarios que se liberan.'} checked={pushOn} disabled={pushPermission() === 'unsupported' || pushPermission() === 'denied'}
            onChange={async v => { if (!v) { setPushMsg('Para apagarlos, desactivá los avisos de La Fija en la configuración del navegador.'); return } try { const r = await enablePush(user.id); setPushOn(true); setPushMsg(r === 'server' ? 'Listo: te llegan aunque la app esté cerrada.' : 'Listo: te avisamos mientras la app esté abierta.') } catch (e) { setPushMsg(e.message) } }} />
          <Switch label="Letra más grande" hint="Agranda los textos y los botones de toda la app." checked={big} onChange={setBig} />
          <Switch label="Modo oscuro" checked={theme.dark} onChange={theme.toggle} />
        </Section>
        <div className="mt-8 pt-6 border-t border-line"><Button variant="secondary" onClick={onSignOut}><LogOut size={18} />Cerrar sesión</Button></div>
      </Content>
    </>
  )
}
