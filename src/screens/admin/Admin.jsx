import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useStore } from '../../lib/store'
import { notify, cancelBooking, courtsOf, effStatus, getComplex, getCourt, paymentLabel, ratingOf, STATUS, STATUS_ORDER } from '../../lib/domain'
import { dateLong, money, slotEnd, todayISO } from '../../lib/format'
import { Link } from '../../lib/router'
import { ROLE_LABEL } from '../../lib/roles'
import { Avatar, Button, Content, Empty, Input, PageHeader, Section, Segmented, Select, Sheet, Stars, Stat, Status, Switch, useConfirm, useToast } from '../../ui/kit'
import { BookingRow, BookingStatus } from '../../ui/shared'

const Info = ({ k, children }) => <div className="flex items-baseline justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right">{children}</dd></div>

export function AdminHome({ theme, onSignOut }) {
  const { state } = useStore()
  const [open, setOpen] = useState('')
  const today = todayISO()
  const todays = state.bookings.filter(b => b.date === today && effStatus(b) !== 'cancelled').length
  const reported = state.reviews.filter(r => r.reported && !r.hidden).length
  const pendingCx = state.complexes.filter(c => c.approval === 'pending').length
  const recent = [...state.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  return (
    <>
      <PageHeader title="Inicio" sub="Operación de La Fija" />
      <Content>
        <div className="border border-line rounded-lg bg-surface p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Complejos activos" value={`${state.complexes.filter(c => c.active).length}/${state.complexes.length}`} />
          <Stat label="Usuarios" value={state.users.length} />
          <Stat label="Reservas hoy" value={todays} />
          <Stat label="Reseñas reportadas" value={reported} />
        </div>
        {pendingCx > 0 && <p className="mt-4"><Link to="/admin/complejos" className="font-semibold text-brand underline underline-offset-4">{pendingCx} {pendingCx === 1 ? 'complejo espera' : 'complejos esperan'} revisión</Link></p>}
        <p className="mt-4"><Link to="/admin/ingresos" className="font-semibold text-brand underline underline-offset-4">Ver ingresos de La Fija</Link></p>
        {reported > 0 && <p className="mt-4"><Link to="/admin/resenas" className="font-semibold text-brand underline underline-offset-4">Revisar {reported} {reported === 1 ? 'reseña reportada' : 'reseñas reportadas'}</Link></p>}
        {state.complexes.some(c => !c.active) && <p className="mt-2 text-muted">Hay complejos desactivados: <Link to="/admin/complejos" className="font-semibold text-brand underline underline-offset-4">verlos</Link>.</p>}
        <Section title="Últimas reservas" className="mt-8" action={<Link to="/admin/reservas" className="btn btn-link btn-sm">Ver todas</Link>}>
          <div className="list">{recent.map(b => <BookingRow key={b.id} b={b} state={state} who onClick={() => setOpen(b.id)} />)}</div>
        </Section>
        <div className="mt-8 pt-6 border-t border-line flex flex-wrap gap-2 lg:hidden">
          <Button variant="secondary" onClick={theme.toggle}>{theme.dark ? 'Modo claro' : 'Modo oscuro'}</Button>
          <Button variant="secondary" onClick={onSignOut}>Cerrar sesión</Button>
        </div>
      </Content>
      {open && <AdminBookingSheet id={open} onClose={() => setOpen('')} />}
    </>
  )
}

export function AdminComplexes() {
  const { state, update } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState('')
  const c = open && getComplex(state, open)
  const owner = c && state.users.find(u => u.id === c.ownerId)
  const decide = approval => {
    update(s => { const x = s.complexes.find(y => y.id === c.id); x.approval = approval; if (approval === 'approved') x.active = true
      notify(s, { userId: x.ownerId, type: approval === 'approved' ? 'complex_ok' : 'complex_no', title: approval === 'approved' ? 'Tu complejo está publicado' : 'Tu complejo no fue aprobado', text: approval === 'approved' ? `${x.name} ya aparece en las búsquedas.` : 'Escribinos desde Ayuda para ver qué falta.', complexId: x.id, link: '/dueno' }) })
    toast(approval === 'approved' ? 'Complejo aprobado y publicado.' : 'Complejo rechazado.'); setOpen('')
  }
  const toggle = () => { update(s => { const x = s.complexes.find(y => y.id === c.id); x.active = !x.active }); toast(c.active ? 'Complejo desactivado.' : 'Complejo activado.') }
  return (
    <>
      <PageHeader title="Complejos" sub={`${state.complexes.length} en la plataforma`} />
      <Content>
        <div className="list">{state.complexes.map(x => {
          const o = state.users.find(u => u.id === x.ownerId)
          return (
            <button key={x.id} type="button" className="row" onClick={() => setOpen(x.id)}>
              <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{x.name}</span><span className="block text-sm text-muted truncate">{x.city} · {o?.name || 'Sin dueño'} · {courtsOf(state, x.id).length} canchas</span></span>
              {(x.approval || 'approved') === 'pending' ? <Status tone="warn">En revisión</Status> : x.approval === 'rejected' ? <Status tone="danger">Rechazado</Status> : <Status tone={x.active ? 'ok' : 'danger'}>{x.active ? 'Activo' : 'Desactivado'}</Status>}
              <ChevronRight size={18} className="text-faint flex-none -mr-1" />
            </button>)
        })}</div>
      </Content>
      <Sheet open={!!c} onClose={() => setOpen('')} title={c?.name || ''}
        footer={c && ((c.approval || 'approved') === 'pending'
          ? <><Button variant="danger" onClick={() => decide('rejected')}>Rechazar</Button><Button onClick={() => decide('approved')}>Aprobar y publicar</Button></>
          : <Button variant={c.active ? 'danger' : 'primary'} onClick={toggle}>{c.active ? 'Desactivar complejo' : 'Activar complejo'}</Button>)}>
        {c && <>
          <dl className="divide-y divide-line border-y border-line">
            <Info k="Dueño">{owner?.name}</Info><Info k="Contacto">{owner?.email}</Info>
            <Info k="Dirección">{c.address}</Info><Info k="Canchas">{courtsOf(state, c.id).length}</Info>
            <Info k="Reservas">{state.bookings.filter(b => b.complexId === c.id).length}</Info>
            <Info k="Reseñas">{ratingOf(state, c.id).count ? `${ratingOf(state, c.id).avg.toFixed(1).replace('.', ',')} (${ratingOf(state, c.id).count})` : 'Sin reseñas'}</Info>
            <Info k="Estado">{(c.approval || 'approved') === 'pending' ? <Status tone="warn">En revisión</Status> : <Status tone={c.active ? 'ok' : 'danger'}>{c.active ? 'Activo' : 'Desactivado'}</Status>}</Info>
          </dl>
          <p className="hint">Un complejo desactivado deja de aparecer en búsquedas y no recibe reservas nuevas. Las reservas existentes se conservan.</p>
        </>}
      </Sheet>
    </>
  )
}

export function AdminUsers() {
  const { state, update, user: me } = useStore()
  const toast = useToast()
  const [role, setRole] = useState('all')
  const [text, setText] = useState('')
  const [open, setOpen] = useState('')
  const t = text.trim().toLowerCase()
  const list = state.users.filter(u => (role === 'all' || u.role === role) && (!t || u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)))
  const u = open && state.users.find(x => x.id === open)
  return (
    <>
      <PageHeader title="Usuarios" sub={`${state.users.length} cuentas`} />
      <Content>
        <Segmented value={role} onChange={setRole} label="Rol" options={[{ value: 'all', label: 'Todos' }, { value: 'player', label: 'Jugadores' }, { value: 'owner', label: 'Dueños' }, { value: 'admin', label: 'Admin' }]} />
        <Input type="search" className="mt-3 sm:max-w-sm" value={text} onChange={e => setText(e.target.value)} placeholder="Buscar por nombre o email" aria-label="Buscar usuario" />
        <div className="mt-4">{list.length === 0 ? <Empty title="No hay usuarios" /> : (
          <div className="list">{list.map(x => (
            <button key={x.id} type="button" className="row" onClick={() => setOpen(x.id)}>
              <Avatar name={x.name} /><span className="flex-1 min-w-0"><span className="block font-semibold truncate">{x.name}</span><span className="block text-sm text-muted truncate">{ROLE_LABEL[x.role]} · {x.email}</span></span>
              {!x.active && <Status tone="danger">Desactivado</Status>}<ChevronRight size={18} className="text-faint flex-none -mr-1" />
            </button>))}</div>)}</div>
      </Content>
      <Sheet open={!!u} onClose={() => setOpen('')} title={u?.name || ''}>
        {u && <>
          <dl className="divide-y divide-line border-y border-line"><Info k="Rol">{ROLE_LABEL[u.role]}</Info><Info k="Email">{u.email}</Info><Info k="Celular">{u.phone || '—'}</Info>
            {u.role === 'player' && <Info k="Reservas">{state.bookings.filter(b => b.playerId === u.id).length}</Info>}
            {u.role === 'owner' && <Info k="Complejos">{state.complexes.filter(c => c.ownerId === u.id).length}</Info>}</dl>
          <div className="mt-3"><Switch label="Cuenta activa" hint={u.id === me.id ? 'No podés desactivar tu propia cuenta.' : 'Si la desactivás, no puede ingresar.'} checked={u.active} disabled={u.id === me.id}
            onChange={v => { update(s => { s.users.find(x => x.id === u.id).active = v }); toast(v ? 'Cuenta activada.' : 'Cuenta desactivada.') }} /></div>
        </>}
      </Sheet>
    </>
  )
}

function AdminBookingSheet({ id, onClose }) {
  const { state, update } = useStore()
  const toast = useToast(), confirm = useConfirm()
  const b = state.bookings.find(x => x.id === id)
  if (!b) return null
  const c = getComplex(state, b.complexId), court = getCourt(state, b.courtId), st = effStatus(b)
  const live = ['pending', 'deposit_paid', 'confirmed'].includes(st)
  const cancel = async () => {
    if (!await confirm({ title: '¿Cancelar la reserva?', message: b.paidCents ? `Se devuelven ${money(b.paidCents)} al cliente.` : 'El horario queda libre.', confirmLabel: 'Cancelar reserva', cancelLabel: 'Volver', danger: true })) return
    update(s => cancelBooking(s, id, 'owner')); toast('Reserva cancelada.'); onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Reserva" footer={live ? <Button variant="danger" onClick={cancel}>Cancelar reserva</Button> : null}>
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-lg">{b.playerName}</p><p className="text-muted">{b.phone}</p></div><BookingStatus booking={b} /></div>
      <dl className="divide-y divide-line border-y border-line mt-3 tnum"><Info k="Complejo">{c?.name}</Info><Info k="Cancha">{court?.name}</Info><Info k="Día">{dateLong(b.date)}</Info><Info k="Horario">{b.time} a {slotEnd(b.time, b.durationMin || 60)}</Info><Info k="Importe">{money(b.totalCents)}</Info><Info k="Pago">{paymentLabel(b)}</Info></dl>
    </Sheet>
  )
}

export function AdminBookings() {
  const { state } = useStore()
  const [estado, setEstado] = useState('')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(30)
  const [open, setOpen] = useState('')
  const t = text.trim().toLowerCase()
  const list = useMemo(() => [...state.bookings].filter(b => (!estado || effStatus(b) === estado) && (!t || b.playerName.toLowerCase().includes(t) || (getComplex(state, b.complexId)?.name || '').toLowerCase().includes(t))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [state.bookings, estado, t]) // eslint-disable-line
  return (
    <>
      <PageHeader title="Reservas" sub={`${list.length} resultados`} />
      <Content>
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-2xl">
          <Input type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Buscar cliente o complejo" aria-label="Buscar" />
          <Select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}</Select>
        </div>
        <div className="mt-4">{list.length === 0 ? <Empty title="No hay reservas" /> : <div className="list">{list.slice(0, limit).map(b => <BookingRow key={b.id} b={b} state={state} who onClick={() => setOpen(b.id)} />)}</div>}
          {list.length > limit && <Button variant="secondary" className="w-full mt-4" onClick={() => setLimit(limit + 30)}>Ver más</Button>}</div>
      </Content>
      {open && <AdminBookingSheet id={open} onClose={() => setOpen('')} />}
    </>
  )
}

export function AdminReviews() {
  const { state, update } = useStore()
  const toast = useToast(), confirm = useConfirm()
  const [tab, setTab] = useState('reported')
  const list = state.reviews.filter(r => tab === 'all' || (r.reported && !r.hidden)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const patch = (id, fn, msg) => { update(s => fn(s.reviews.find(r => r.id === id))); toast(msg) }
  return (
    <>
      <PageHeader title="Reseñas" sub="Moderación de contenido" />
      <Content>
        <Segmented className="sm:max-w-sm" value={tab} onChange={setTab} label="Filtro" options={[{ value: 'reported', label: 'Reportadas' }, { value: 'all', label: 'Todas' }]} />
        <div className="mt-4">{list.length === 0 ? <Empty title="Nada para revisar" text="No hay reseñas reportadas." /> : (
          <div className="list">{list.map(r => (
            <div key={r.id} className="px-4 py-4">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><span className="font-semibold">{r.playerName}</span><span className="text-muted"> · {getComplex(state, r.complexId)?.name}</span></div><Stars n={r.rating} /></div>
              <p className="mt-1">{r.text || <span className="text-muted">Sin comentario</span>}</p>
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                {r.hidden && <Status tone="muted">Oculta</Status>}{r.reported && <Status tone="warn">Reportada</Status>}
                <span className="flex-1" />
                {r.reported && <Button size="sm" variant="ghost" onClick={() => patch(r.id, x => { x.reported = false }, 'Reporte descartado.')}>Descartar reporte</Button>}
                <Button size="sm" variant="secondary" onClick={() => patch(r.id, x => { x.hidden = !x.hidden }, r.hidden ? 'Reseña visible.' : 'Reseña oculta.')}>{r.hidden ? 'Mostrar' : 'Ocultar'}</Button>
                <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: '¿Eliminar la reseña?', message: 'No se puede deshacer.', confirmLabel: 'Eliminar', danger: true })) { update(s => { s.reviews = s.reviews.filter(x => x.id !== r.id) }); toast('Reseña eliminada.') } }}>Eliminar</Button>
              </div>
            </div>))}</div>)}</div>
      </Content>
    </>
  )
}
