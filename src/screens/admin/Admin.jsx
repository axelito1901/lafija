import { useMemo, useState } from 'react'
import { BadgeCheck, Building2, CalendarCheck, ChevronRight, Flag, Store, Users } from 'lucide-react'
import { AnimatePresence, m as motion } from 'motion/react'
import { Item, Stagger, spring } from '../../ui/motion'
import { Kpi } from '../../ui/dash'
import { Cover } from '../../ui/Cover'
import { useStore } from '../../lib/store'
import { notify, REPORT_KINDS, resolveReport, verifyChecks, cancelBooking, courtsOf, effStatus, getComplex, getCourt, paymentLabel, ratingOf, STATUS, STATUS_ORDER } from '../../lib/domain'
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
  const openReports = (state.reports || []).filter(r => r.status === 'open').length
  const recent = [...state.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  return (
    <>
      <PageHeader title="Inicio" sub="Operación de La Fija" />
      <Content>
        <Stagger>
        <Item className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={Building2} label="Complejos activos" value={`${state.complexes.filter(c => c.active).length}/${state.complexes.length}`} />
          <Kpi icon={Users} label="Usuarios" value={state.users.length} />
          <Kpi icon={CalendarCheck} label="Reservas hoy" value={todays} />
          <Kpi icon={Flag} label="Reseñas reportadas" value={reported} tone={reported ? 'warn' : 'brand'} />
        </Item>
        <Item className="mt-6"><h2 className="text-base font-semibold mb-3">Para revisar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[pendingCx > 0 && { to: '/admin/complejos', icon: Building2, tone: 'warn', t: `${pendingCx} ${pendingCx === 1 ? 'complejo espera' : 'complejos esperan'} aprobación`, s: 'Revisá y publicalos' },
              openReports > 0 && { to: '/admin/reportes', icon: Flag, tone: 'warn', t: `${openReports} ${openReports === 1 ? 'problema reportado' : 'problemas reportados'} por jugadores`, s: 'Esperando respuesta del complejo' },
              reported > 0 && { to: '/admin/resenas', icon: Flag, tone: 'warn', t: `${reported} ${reported === 1 ? 'reseña reportada' : 'reseñas reportadas'}`, s: 'Moderación pendiente' },
              state.complexes.some(c => !c.active) && { to: '/admin/complejos', icon: Store, tone: 'info', t: 'Hay complejos desactivados', s: 'No reciben reservas nuevas' },
              { to: '/admin/ingresos', icon: CalendarCheck, tone: 'brand', t: 'Ingresos de La Fija', s: 'Cuánto corresponde cobrar este mes' }].filter(Boolean).map(x => (
              <Link key={x.t} to={x.to} className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] card-lift">
                <span className={`size-11 rounded-xl grid place-items-center flex-none ${x.tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand'}`}><x.icon size={20} aria-hidden="true" /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold">{x.t}</span><span className="block text-sm text-muted">{x.s}</span></span><ChevronRight size={18} className="text-faint" />
              </Link>))}
          </div></Item>
        </Stagger>
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
  const [fil, setFil] = useState('all')
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
        <Segmented className="sm:max-w-md mb-4" value={fil} onChange={setFil} label="Estado" options={[{ value: 'all', label: 'Todos' }, { value: 'pending', label: `En revisión${state.complexes.filter(x => x.approval === 'pending').length ? ` (${state.complexes.filter(x => x.approval === 'pending').length})` : ''}` }, { value: 'off', label: 'Desactivados' }]} />
        <Stagger key={fil} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{state.complexes.filter(x => fil === 'all' || (fil === 'pending' ? x.approval === 'pending' : !x.active)).map(x => {
          const o = state.users.find(u => u.id === x.ownerId), ap = x.approval || 'approved'
          return (
            <Item as="button" key={x.id} type="button" onClick={() => setOpen(x.id)} whileTap={{ scale: .98 }} className="text-left rounded-2xl overflow-hidden bg-surface border border-line shadow-[var(--sh-1)] card-lift">
              <span className="relative block"><Cover src={x.coverUrl} seed={x.id} className="aspect-[16/9]" /><span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className={`absolute right-3 top-3 text-xs font-semibold rounded-full px-2.5 py-1 backdrop-blur-md border border-white/25 text-white ${ap === 'pending' ? 'bg-[#b8860b]/80' : ap === 'rejected' || !x.active ? 'bg-[#b0302a]/80' : 'bg-black/40'}`}>{ap === 'pending' ? 'En revisión' : ap === 'rejected' ? 'Rechazado' : x.active ? 'Activo' : 'Desactivado'}</span>
                <span className="absolute left-3 bottom-3 text-white display text-xl font-bold leading-tight">{x.name}</span></span>
              <span className="flex items-center gap-2 p-3.5 text-sm"><span className="flex-1 min-w-0 text-muted truncate">{x.city} · {o?.name || 'Sin dueño'}</span><span className="font-semibold flex-none">{courtsOf(state, x.id).length} canchas</span></span>
            </Item>)
        })}</Stagger>
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
            <Info k="Verificación">{c.verified ? <Status tone="ok">Verificado</Status> : <Status tone="muted">Sin verificar</Status>}</Info>
            <Info k="Estado">{(c.approval || 'approved') === 'pending' ? <Status tone="warn">En revisión</Status> : <Status tone={c.active ? 'ok' : 'danger'}>{c.active ? 'Activo' : 'Desactivado'}</Status>}</Info>
          </dl>
          <div className="mt-4 rounded-2xl border border-line p-4">
            <div className="flex items-center gap-2 font-semibold"><BadgeCheck size={18} className="text-brand" />Verificación</div>
            <ul className="mt-2 space-y-1.5 text-sm">{verifyChecks(state, c).map(([l, ok]) => <li key={l} className={ok ? '' : 'text-danger'}>{ok ? '✓' : '✕'} {l}</li>)}</ul>
            <Switch label="Complejo verificado" hint="Muestra la insignia a los jugadores. Ponela solo si lo revisaste." checked={!!c.verified} onChange={v => { update(s2 => { s2.complexes.find(y => y.id === c.id).verified = v }); toast(v ? 'Complejo verificado.' : 'Se quitó la verificación.') }} />
          </div>
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
          <Stagger className="list" key={role + text}>{list.map(x => (
            <Item as="button" key={x.id} type="button" className="row" onClick={() => setOpen(x.id)}>
              <Avatar name={x.name} /><span className="flex-1 min-w-0"><span className="block font-semibold truncate">{x.name}</span><span className="block text-sm text-muted truncate">{ROLE_LABEL[x.role]} · {x.email}</span></span>
              {!x.active && <Status tone="danger">Desactivado</Status>}<ChevronRight size={18} className="text-faint flex-none -mr-1" />
            </Item>))}</Stagger>)}</div>
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
          <Stagger className="space-y-3" key={tab}>{list.map(r => (
            <Item key={r.id} className="p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><span className="font-semibold">{r.playerName}</span><span className="text-muted"> · {getComplex(state, r.complexId)?.name}</span></div><Stars n={r.rating} /></div>
              <p className="mt-1">{r.text || <span className="text-muted">Sin comentario</span>}</p>
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                {r.hidden && <Status tone="muted">Oculta</Status>}{r.reported && <Status tone="warn">Reportada</Status>}
                <span className="flex-1" />
                {r.reported && <Button size="sm" variant="ghost" onClick={() => patch(r.id, x => { x.reported = false }, 'Reporte descartado.')}>Descartar reporte</Button>}
                <Button size="sm" variant="secondary" onClick={() => patch(r.id, x => { x.hidden = !x.hidden }, r.hidden ? 'Reseña visible.' : 'Reseña oculta.')}>{r.hidden ? 'Mostrar' : 'Ocultar'}</Button>
                <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: '¿Eliminar la reseña?', message: 'No se puede deshacer.', confirmLabel: 'Eliminar', danger: true })) { update(s => { s.reviews = s.reviews.filter(x => x.id !== r.id) }); toast('Reseña eliminada.') } }}>Eliminar</Button>
              </div>
            </Item>))}</Stagger>)}</div>
      </Content>
    </>
  )
}

export function AdminReports() {
  const { state } = useStore()
  const toast = useToast()
  const { update } = useStore()
  const [tab, setTab] = useState('open')
  const [reply, setReply] = useState({})
  const list = (state.reports || []).filter(r => r.status === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <PageHeader back="/admin" title="Problemas reportados" sub="Avisos de jugadores sobre sus reservas" />
      <Content className="max-w-[760px] lg:mx-0">
        <Segmented className="sm:max-w-sm" value={tab} onChange={setTab} label="Estado" options={[{ value: 'open', label: `Abiertos (${(state.reports || []).filter(r => r.status === 'open').length})` }, { value: 'resolved', label: 'Resueltos' }]} />
        <div className="mt-4 space-y-3">{list.length === 0 ? <Empty icon={Flag} title={tab === 'open' ? 'No hay problemas abiertos' : 'Todavía no hay reportes resueltos'} text="Cuando un jugador avise un problema, aparece acá." /> : list.map(r => {
          const c = getComplex(state, r.complexId), b = state.bookings.find(x => x.id === r.bookingId)
          return (
            <div key={r.id} className="p-4 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)]">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{REPORT_KINDS[r.kind]}</p><p className="text-sm text-muted">{r.playerName} · {c?.name}{b ? ` · ${b.date.split('-').reverse().slice(0, 2).join('/')} ${b.time}` : ''}</p></div><Status tone={r.status === 'open' ? 'warn' : 'ok'}>{r.status === 'open' ? 'Abierto' : 'Resuelto'}</Status></div>
              {r.text && <p className="mt-2">“{r.text}”</p>}
              {r.status === 'resolved' && r.response && <p className="mt-2 pl-3 border-l-2 border-brand text-sm"><strong>Respuesta:</strong> {r.response}</p>}
              {r.status === 'open' && <div className="mt-3"><Input value={reply[r.id] || ''} onChange={e => setReply({ ...reply, [r.id]: e.target.value })} placeholder="Respuesta para el jugador (opcional)" aria-label="Respuesta" />
                <Button size="sm" className="mt-2" onClick={() => { update(s => resolveReport(s, r.id, reply[r.id])); toast('Reporte resuelto. Le avisamos al jugador.') }}>Marcar como resuelto</Button></div>}
            </div>)
        })}</div>
      </Content>
    </>
  )
}
