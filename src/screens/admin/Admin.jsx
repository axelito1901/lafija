import { useMemo, useState } from 'react'
import { m as motion } from 'motion/react'
import { ArrowRight, Ban, BadgeCheck, BadgeDollarSign, Banknote, Building2, CalendarCheck, Check, CheckCheck, ChevronRight, CircleX, Clock3, DoorClosed, Eye, EyeOff, Flag, Hourglass, Inbox, ListChecks, Mail, MessageCircle, MessageSquareWarning, Phone, Send, Star, Store, Trash2, Users, Wrench, X } from 'lucide-react'
import { Item, Stagger, CountUp } from '../../ui/motion'
import { AreaChart, Delta, Kpi, Spark, useStickyTop } from '../../ui/dash'
import { Cover } from '../../ui/Cover'
import { useStore } from '../../lib/store'
import { balanceOf, notify, REPORT_KINDS, resolveReport, verifyChecks, cancelBooking, courtsOf, effStatus, getComplex, getCourt, paymentLabel, ratingOf, STATUS, STATUS_ORDER } from '../../lib/domain'
import { addDays, cn, dateLong, dateShort, dayNum, money, monthStart, plural, relativeDay, slotEnd, telLink, todayISO, waLink } from '../../lib/format'
import { Link } from '../../lib/router'
import { ROLE_LABEL } from '../../lib/roles'
import { Avatar, Button, Chip, Content, Empty, PageHeader, Segmented, Select, Sheet, Stars, Switch, Textarea, useConfirm, useToast } from '../../ui/kit'
import { BookingRow, BookingStatus } from '../../ui/shared'
import { ACCENT, Aside, Bar, Breakdown, contactBtn, FilterTiles, PanelEmpty, PanelTitle, Pill, ROLE_META, SearchField, useWide } from './parts'
import { revenueOf } from './Revenue'
import './admin.css'

const Info = ({ k, children }) => <div className="flex items-baseline justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right min-w-0">{children}</dd></div>
const isReal = b => !b._busy && b.source !== 'busy'
const sum = (list, f) => list.reduce((s, x) => s + f(x), 0)
const avgText = n => n.toFixed(1).replace('.', ',')
const ago = iso => relativeDay(iso.slice(0, 10))
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/* ---------- Inicio ---------- */
export function AdminHome({ theme, onSignOut }) {
  const { state } = useStore()
  const [open, setOpen] = useState('')
  const sideRef = useStickyTop(24)
  const today = todayISO()
  const live = useMemo(() => state.bookings.filter(b => isReal(b) && effStatus(b) !== 'cancelled'), [state.bookings])
  const perDay = useMemo(() => { const m = {}; for (const b of live) m[b.date] = (m[b.date] || 0) + 1; return m }, [live])
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const series = days.map(d => perDay[d] || 0), before = days.map(d => perDay[addDays(d, -14)] || 0)
  const t14 = sum(series, x => x), p14 = sum(before, x => x)
  const points = days.map((d, i) => ({ v: series[i], g: before[i], label: String(dayNum(d)), tip: dateShort(d) }))
  const todays = perDay[today] || 0, weekAgo = perDay[addDays(today, -7)] || 0
  const reported = state.reviews.filter(r => r.reported && !r.hidden).length
  const pendingCx = state.complexes.filter(c => c.approval === 'pending').length
  const offCx = state.complexes.filter(c => !c.active && c.approval !== 'pending').length
  const openReports = (state.reports || []).filter(r => r.status === 'open').length
  const players = state.users.filter(u => u.role === 'player').length, owners = state.users.filter(u => u.role === 'owner').length
  const recent = [...state.bookings].filter(isReal).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const since = addDays(today, -30)
  const rank = useMemo(() => state.complexes.map(c => ({ c, n: live.filter(b => b.complexId === c.id && b.date >= since && b.date <= today).length })).sort((a, b) => b.n - a.n), [state.complexes, live]) // eslint-disable-line
  const rankMax = Math.max(1, ...rank.map(r => r.n))
  const rev = useMemo(() => revenueOf(state, monthStart(today), today).total, [state]) // eslint-disable-line
  const todos = [
    pendingCx > 0 && { to: '/admin/complejos', n: pendingCx, tone: 'warn', t: `${pendingCx === 1 ? 'Complejo espera' : 'Complejos esperan'} aprobación`, s: 'Revisá y publicalos' },
    openReports > 0 && { to: '/admin/reportes', n: openReports, tone: 'warn', t: `${openReports === 1 ? 'Problema reportado' : 'Problemas reportados'} por jugadores`, s: 'Esperando respuesta del complejo' },
    reported > 0 && { to: '/admin/resenas', n: reported, tone: 'warn', t: reported === 1 ? 'Reseña reportada' : 'Reseñas reportadas', s: 'Moderación pendiente' },
    offCx > 0 && { to: '/admin/complejos', n: offCx, tone: 'info', t: offCx === 1 ? 'Complejo desactivado' : 'Complejos desactivados', s: 'No reciben reservas nuevas' },
  ].filter(Boolean)
  const cxItems = [
    { label: 'Publicados', n: state.complexes.length - pendingCx - offCx, color: 'var(--brand)' },
    { label: 'En revisión', n: pendingCx, color: 'var(--gold)' },
    { label: 'Desactivados', n: offCx, color: 'var(--danger)' },
  ]
  const userItems = [
    { label: 'Jugadores', n: players, color: 'var(--info)' },
    { label: 'Dueños', n: owners, color: 'var(--brand)' },
    { label: 'Administradores', n: state.users.length - players - owners, color: 'var(--gold)' },
  ]
  return (
    <>
      <PageHeader title="Inicio" sub="Operación de La Fija" />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Building2} label="Complejos activos" value={`${state.complexes.filter(c => c.active).length}/${state.complexes.length}`} hint={pendingCx ? `${pendingCx} en revisión` : 'Todos al día'} tone={pendingCx ? 'warn' : 'brand'} />
            <Kpi icon={Users} label="Usuarios" value={state.users.length} hint={`${players} jugadores · ${owners} dueños`} tone="info" />
            <Kpi icon={CalendarCheck} label="Reservas hoy" value={todays} hint="vs. hace 7 días" delta={<Delta value={todays - weekAgo} unit="" />} spark={<Spark data={series} />} />
            <Kpi icon={Flag} label="Reseñas reportadas" value={reported} tone={reported ? 'warn' : 'brand'} hint={reported ? 'Por moderar' : 'Sin pendientes'} />
          </Item>

          <div className="mt-5 grid gap-5 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6 items-start">
            <div ref={sideRef} className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-2 xl:grid-cols-1 items-start xl:col-start-2 xl:row-start-1 xl:sticky">
              <Item className="ad-card p-4 sm:p-5">
                <PanelTitle icon={todos.length ? ListChecks : CheckCheck} tone={todos.length ? 'warn' : 'ok'} title="Para revisar" sub={todos.length ? plural(todos.length, 'tema pendiente', 'temas pendientes') : 'Todo al día'} />
                {todos.length ? (
                  <div className="mt-3 grid gap-2.5 grid-cols-[minmax(0,1fr)]">{todos.map(x => (
                    <Link key={x.t} to={x.to} className="ad-todo card-lift group">
                      <span className="ad-todo-n" data-tone={x.tone}>{x.n}</span>
                      <span className="flex-1 min-w-0"><span className="block font-semibold leading-snug">{x.t}</span><span className="block text-sm text-muted">{x.s}</span></span>
                      <ChevronRight size={18} className="text-faint flex-none transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>))}</div>
                ) : <Empty icon={CheckCheck} title="Todo en orden" text="No hay complejos, reseñas ni problemas esperando una revisión." className="!py-8" />}
              </Item>

              <div className="grid gap-4 grid-cols-[minmax(0,1fr)] items-start">
                <Item>
                  <Link to="/admin/ingresos" className="hero block p-5 card-lift group" aria-label="Ver los ingresos de La Fija">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-90 inline-flex items-center gap-2"><span className="live-dot" />A cobrar este mes</p>
                    <div className="display text-4xl font-bold tnum mt-2 leading-none"><CountUp value={money(rev)} /></div>
                    <p className="mt-3 text-sm opacity-90 inline-flex items-center gap-1.5">Ver ingresos<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></p>
                  </Link>
                </Item>
                <Item className="ad-card p-4 sm:p-5 max-sm:hidden">
                  <PanelTitle icon={Store} title="La plataforma" sub="Cómo está compuesta hoy" tone="info" />
                  <div className="mt-4 grid gap-5 grid-cols-[minmax(0,1fr)] sm:grid-cols-2 xl:grid-cols-1"><Breakdown title="Complejos" items={cxItems} /><Breakdown title="Usuarios" items={userItems} /></div>
                </Item>
              </div>
            </div>

            <div className="min-w-0 xl:col-start-1 xl:row-start-1 grid gap-5 grid-cols-[minmax(0,1fr)] items-start">
              <div className="grid gap-5 grid-cols-[minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
                <Item className="ad-card p-4 sm:p-5 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="text-lg leading-tight">Reservas por día</h2><p className="text-sm text-muted">Últimos 14 días, contra los 14 anteriores</p></div>
                    <div className="text-right flex-none"><div className="display text-3xl font-bold tnum leading-none"><CountUp value={String(t14)} /></div><div className="mt-1.5 flex justify-end">{p14 > 0 && <Delta value={(t14 - p14) / p14 * 100} />}</div></div>
                  </div>
                  <AreaChart className="mt-1" points={points} height={190} label="Reservas por día" ghostLabel="14 días antes" />
                </Item>
                <Item className="ad-card p-4 sm:p-5 min-w-0">
                  <PanelTitle icon={Building2} title="Más reservas" sub="Por complejo, últimos 30 días" />
                  <ol className="mt-4 grid gap-3.5 grid-cols-[minmax(0,1fr)]">{rank.slice(0, 6).map((r, i) => (
                    <li key={r.c.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold truncate"><span className="text-faint tnum mr-1.5">{i + 1}</span>{r.c.name}</span><span className="tnum text-muted flex-none">{plural(r.n, 'reserva', 'reservas')}</span></div>
                      <Bar pct={r.n / rankMax * 100} i={i} className="mt-1.5" />
                    </li>))}</ol>
                </Item>
              </div>

              <Item>
                <div className="flex items-center justify-between gap-3 mb-3 min-h-8"><h2 className="text-lg">Últimas reservas</h2><Link to="/admin/reservas" className="btn btn-link btn-sm">Ver todas</Link></div>
                <div className="list">{recent.map(b => <BookingRow key={b.id} b={b} state={state} who onClick={() => setOpen(b.id)} />)}</div>
              </Item>
            </div>
          </div>
        </Stagger>
        <div className="mt-8 pt-6 border-t border-line flex flex-wrap gap-2 lg:hidden">
          <Button variant="secondary" onClick={theme.toggle}>{theme.dark ? 'Modo claro' : 'Modo oscuro'}</Button>
          <Button variant="secondary" onClick={onSignOut}>Cerrar sesión</Button>
        </div>
      </Content>
      {open && <AdminBookingSheet id={open} onClose={() => setOpen('')} />}
    </>
  )
}

/* ---------- Complejos ---------- */
const AP = { pending: ['warn', 'En revisión'], rejected: ['danger', 'Rechazado'], off: ['danger', 'Desactivado'], on: ['ok', 'Activo'] }
const apKey = (c, ap) => (ap === 'pending' ? 'pending' : ap === 'rejected' ? 'rejected' : !c.active ? 'off' : 'on')

export function AdminComplexes() {
  const { state, update } = useStore()
  const toast = useToast()
  const wide = useWide()
  const [open, setOpen] = useState('')
  const [fil, setFil] = useState('all')
  const [text, setText] = useState('')
  const [sort, setSort] = useState('recent')
  const today = todayISO(), since = addDays(today, -30)
  const rows = useMemo(() => state.complexes.map(c => {
    const bs = state.bookings.filter(b => b.complexId === c.id && isReal(b))
    return { c, id: c.id, ap: c.approval || 'approved', owner: state.users.find(u => u.id === c.ownerId), courts: courtsOf(state, c.id).length, total: bs.length, recent: bs.filter(b => b.date >= since && b.date <= today && effStatus(b) !== 'cancelled').length, rating: ratingOf(state, c.id), checks: verifyChecks(state, c) }
  }), [state]) // eslint-disable-line
  const count = { all: rows.length, pending: rows.filter(r => r.ap === 'pending').length, on: rows.filter(r => r.c.active && r.ap !== 'pending').length, off: rows.filter(r => !r.c.active).length }
  const t = norm(text.trim())
  const list = rows.filter(r => (fil === 'all' || (fil === 'pending' ? r.ap === 'pending' : fil === 'on' ? r.c.active && r.ap !== 'pending' : !r.c.active)) && (!t || norm(`${r.c.name} ${r.c.city} ${r.owner?.name || ''}`).includes(t)))
    .sort((a, b) => sort === 'name' ? a.c.name.localeCompare(b.c.name) : sort === 'rating' ? (b.rating.avg || 0) - (a.rating.avg || 0) : b.recent - a.recent)
  const sel = wide ? list.find(r => r.id === open) || list[0] : rows.find(r => r.id === open)
  const decide = (c, approval) => {
    update(s => { const x = s.complexes.find(y => y.id === c.id); x.approval = approval; if (approval === 'approved') x.active = true
      notify(s, { userId: x.ownerId, type: approval === 'approved' ? 'complex_ok' : 'complex_no', title: approval === 'approved' ? 'Tu complejo está publicado' : 'Tu complejo no fue aprobado', text: approval === 'approved' ? `${x.name} ya aparece en las búsquedas.` : 'Escribinos desde Ayuda para ver qué falta.', complexId: x.id, link: '/dueno' }) })
    toast(approval === 'approved' ? 'Complejo aprobado y publicado.' : 'Complejo rechazado.'); setOpen('')
  }
  const toggle = c => { update(s => { const x = s.complexes.find(y => y.id === c.id); x.active = !x.active }); toast(c.active ? 'Complejo desactivado.' : 'Complejo activado.') }
  const actions = r => (r.ap === 'pending'
    ? <><Button variant="danger" onClick={() => decide(r.c, 'rejected')}>Rechazar</Button><Button onClick={() => decide(r.c, 'approved')}>Aprobar y publicar</Button></>
    : <Button variant={r.c.active ? 'danger' : 'primary'} onClick={() => toggle(r.c)}>{r.c.active ? 'Desactivar complejo' : 'Activar complejo'}</Button>)
  const detail = r => {
    const { c, owner, checks } = r, ok = checks.filter(x => x[1]).length
    return (
      <>
        <dl className="grid grid-cols-3 gap-2">
          {[['Canchas', r.courts], ['Reservas', r.total], ['Puntaje', r.rating.count ? avgText(r.rating.avg) : '—']].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-sunken px-3 py-2.5 min-w-0"><dt className="text-[11px] uppercase tracking-wider text-muted truncate">{k}</dt><dd className="display text-2xl font-bold tnum leading-tight">{k === 'Puntaje' && r.rating.count ? <span className="inline-flex items-center gap-1">{v}<Star size={14} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" /></span> : v}</dd></div>))}
        </dl>
        <section className="mt-4 rounded-2xl border border-line p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">Dueño</p>
          <div className="flex items-center gap-3"><Avatar name={owner?.name || '?'} size={44} /><div className="min-w-0"><p className="font-semibold truncate">{owner?.name || 'Sin dueño'}</p><p className="text-sm text-muted truncate">{owner?.email}</p></div></div>
          {owner?.phone && <div className="mt-3 flex flex-wrap gap-2">
            <a className={contactBtn} href={waLink(owner.phone)} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" />WhatsApp</a>
            <a className={contactBtn} href={telLink(owner.phone)}><Phone size={18} aria-hidden="true" />Llamar</a>
            {owner.email && <a className={contactBtn} href={`mailto:${owner.email}`} aria-label={`Escribir un mail a ${owner.name}`}><Mail size={18} aria-hidden="true" />Mail</a>}
          </div>}
        </section>
        <dl className="mt-4 divide-y divide-line border-y border-line">
          <Info k="Dirección"><a className="hover:text-brand hover:underline underline-offset-2" href={c.lat != null ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address || '')}`} target="_blank" rel="noreferrer" aria-label={`Ver ${c.address} en el mapa`}>{c.address}</a></Info>
          <Info k="Reseñas">{r.rating.count ? `${avgText(r.rating.avg)} (${r.rating.count})` : 'Sin reseñas'}</Info>
          <Info k="Estado"><Pill tone={AP[apKey(c, r.ap)][0]}>{AP[apKey(c, r.ap)][1]}</Pill></Info>
        </dl>
        <div className="mt-4 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-semibold"><BadgeCheck size={18} className="text-brand" aria-hidden="true" />Verificación</div><span className="text-sm tnum text-muted">{ok} de {checks.length}</span></div>
          <Bar pct={ok / checks.length * 100} className="mt-2.5" tone={ok === checks.length ? 'brand' : 'warn'} />
          <ul className="mt-3 space-y-1.5 text-sm">{checks.map(([l, good]) => <li key={l} className={cn('flex items-center gap-2', !good && 'text-danger')}>{good ? <Check size={16} className="text-brand flex-none" aria-hidden="true" /> : <X size={16} className="flex-none" aria-hidden="true" />}{l}</li>)}</ul>
          <div className="mt-2"><Switch label="Complejo verificado" hint="Muestra la insignia a los jugadores. Ponela solo si lo revisaste." checked={!!c.verified} onChange={v => { update(s2 => { s2.complexes.find(y => y.id === c.id).verified = v }); toast(v ? 'Complejo verificado.' : 'Se quitó la verificación.') }} /></div>
        </div>
        <p className="hint">Un complejo desactivado deja de aparecer en búsquedas y no recibe reservas nuevas. Las reservas existentes se conservan.</p>
      </>
    )
  }
  return (
    <>
      <PageHeader title="Complejos" sub={`${state.complexes.length} en la plataforma`} />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item><FilterTiles value={fil} onChange={setFil} label="Estado" options={[{ value: 'all', label: 'Todos', count: count.all }, { value: 'pending', label: 'En revisión', short: 'Revisión', count: count.pending, tone: 'warn' }, { value: 'on', label: 'Activos', count: count.on }, { value: 'off', label: 'Desactivados', short: 'Inactivos', count: count.off }]} /></Item>
          <Item className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <SearchField value={text} onChange={setText} placeholder="Buscar por nombre, ciudad o dueño" label="Buscar complejo" />
            <Select value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar"><option value="recent">Más reservas</option><option value="rating">Mejor puntuados</option><option value="name">Por nombre</option></Select>
          </Item>
        </Stagger>
        <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6 xl:items-start">
          <div className="min-w-0">
            {list.length === 0 ? <div className="ad-card"><Empty icon={Building2} title="No hay complejos" text={t ? 'Probá con otra búsqueda.' : 'No hay complejos en este estado.'} /></div> : (
              <Stagger key={fil + sort + t} className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))]">{list.map(r => {
                const { c } = r, k = apKey(c, r.ap), on = wide && sel?.id === r.id
                return (
                  <Item as="button" key={c.id} type="button" onClick={() => setOpen(c.id)} whileTap={{ scale: .98 }} aria-current={on ? 'true' : undefined} aria-label={`${c.name}, ${AP[k][1]}`}
                    className="ad-pick text-left rounded-2xl overflow-hidden bg-surface border border-line shadow-[var(--sh-1)] flex flex-col">
                    <span className="relative block"><Cover src={c.coverUrl} seed={c.id} className="aspect-[16/9]" /><span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                      <span className={cn('absolute right-3 top-3 text-xs font-semibold rounded-full px-2.5 py-1 backdrop-blur-md border border-white/25 text-white', k === 'pending' ? 'bg-[#b8860b]/80' : k === 'on' ? 'bg-black/40' : 'bg-[#b0302a]/80')}>{AP[k][1]}</span>
                      {c.verified && <span className="absolute left-3 top-3 inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 backdrop-blur-md bg-white/20 border border-white/25 text-white"><BadgeCheck size={14} aria-hidden="true" />Verificado</span>}
                      <span className="absolute left-3 right-3 bottom-3 text-white display text-xl font-bold leading-tight truncate">{c.name}</span></span>
                    <span className="block p-3.5 pb-3">
                      <span className="block text-sm text-muted truncate">{c.city} · {r.owner?.name || 'Sin dueño'}</span>
                      <span className="mt-2.5 flex items-center gap-3 text-sm tnum"><span><b className="font-semibold">{r.courts}</b> <span className="text-muted">{r.courts === 1 ? 'cancha' : 'canchas'}</span></span><span><b className="font-semibold">{r.recent}</b> <span className="text-muted">en 30 días</span></span>
                        <span className="ml-auto inline-flex items-center gap-1 font-semibold">{r.rating.count ? <><Star size={14} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" />{avgText(r.rating.avg)}</> : <span className="text-muted font-normal">Sin reseñas</span>}</span></span>
                    </span>
                  </Item>)
              })}</Stagger>)}
          </div>
          {wide && <Aside>{sel ? (
            <div className="ad-card overflow-hidden" key={sel.id}>
              <div className="relative"><Cover src={sel.c.coverUrl} seed={sel.c.id} className="aspect-[16/8]" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute left-4 right-4 bottom-3 flex items-end justify-between gap-3"><h2 className="display text-2xl font-bold text-white leading-tight min-w-0 truncate">{sel.c.name}</h2><Pill tone={AP[apKey(sel.c, sel.ap)][0]}>{AP[apKey(sel.c, sel.ap)][1]}</Pill></div></div>
              <div className="p-4 sm:p-5">{detail(sel)}<div className="mt-4 flex gap-2 [&>*]:flex-1">{actions(sel)}</div></div>
            </div>) : <PanelEmpty icon={Building2} title="Sin complejos para mostrar" text="Cambiá el filtro para ver el detalle." />}</Aside>}
        </div>
      </Content>
      {!wide && <Sheet open={!!sel} onClose={() => setOpen('')} title={sel?.c.name || ''} footer={sel && actions(sel)}>{sel && detail(sel)}</Sheet>}
    </>
  )
}

/* ---------- Usuarios ---------- */
export function AdminUsers() {
  const { state, update, user: me } = useStore()
  const toast = useToast()
  const wide = useWide()
  const [role, setRole] = useState('all')
  const [text, setText] = useState('')
  const [open, setOpen] = useState('')
  const [bk, setBk] = useState('')
  const today = todayISO()
  const rows = useMemo(() => state.users.map(u => {
    const mine = state.bookings.filter(b => isReal(b) && b.playerId === u.id)
    const cxs = state.complexes.filter(c => c.ownerId === u.id), ids = new Set(cxs.map(c => c.id))
    const got = u.role === 'owner' ? state.bookings.filter(b => isReal(b) && ids.has(b.complexId) && effStatus(b) !== 'cancelled') : []
    const past = mine.filter(b => b.date <= today).sort((a, b) => b.date.localeCompare(a.date))
    return { u, id: u.id, mine, cxs, got, last: past[0]?.date || '' }
  }), [state]) // eslint-disable-line
  const count = { all: rows.length, player: rows.filter(r => r.u.role === 'player').length, owner: rows.filter(r => r.u.role === 'owner').length, off: rows.filter(r => !r.u.active).length }
  const t = norm(text.trim())
  const list = rows.filter(r => (role === 'all' || (role === 'off' ? !r.u.active : r.u.role === role)) && (!t || norm(r.u.name).includes(t) || norm(r.u.email).includes(t)))
  const sel = wide ? list.find(r => r.id === open) || list[0] : rows.find(r => r.id === open)
  const activity = r => r.u.role === 'player' ? [plural(r.mine.length, 'reserva', 'reservas'), r.last ? `Última: ${relativeDay(r.last)}` : 'Sin partidos jugados'] : r.u.role === 'owner' ? [plural(r.cxs.length, 'complejo', 'complejos'), `${plural(r.got.length, 'reserva recibida', 'reservas recibidas')}`] : ['Equipo La Fija', 'Acceso total']
  const detail = r => {
    const { u } = r, played = r.mine.filter(b => effStatus(b) === 'completed'), spent = sum(r.mine.filter(b => effStatus(b) !== 'cancelled'), b => b.paidCents || 0)
    const stats = u.role === 'player' ? [['Reservas', r.mine.length], ['Jugadas', played.length], ['Gastó', money(spent)]] : u.role === 'owner' ? [['Complejos', r.cxs.length], ['Reservas', r.got.length], ['Canchas', sum(r.cxs, c => courtsOf(state, c.id).length)]] : null
    const last = [...r.mine].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 4)
    return (
      <>
        {stats && <dl className="grid grid-cols-3 gap-2">{stats.map(([k, v]) => <div key={k} className="rounded-xl bg-sunken px-3 py-2.5 min-w-0"><dt className="text-[11px] uppercase tracking-wider text-muted truncate">{k}</dt><dd className="display text-xl font-bold tnum leading-tight truncate">{v}</dd></div>)}</dl>}
        <dl className="mt-4 divide-y divide-line border-y border-line"><Info k="Rol">{ROLE_LABEL[u.role]}</Info><Info k="Email"><span className="break-all">{u.email}</span></Info><Info k="Celular">{u.phone || '—'}</Info></dl>
        {(u.phone || u.email) && <div className="mt-3 flex flex-wrap gap-2">
          {u.phone && <a className={contactBtn} href={waLink(u.phone)} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" />WhatsApp</a>}
          {u.phone && <a className={contactBtn} href={telLink(u.phone)}><Phone size={18} aria-hidden="true" />Llamar</a>}
          {u.email && <a className={contactBtn} href={`mailto:${u.email}`} aria-label={`Escribir un mail a ${u.name}`}><Mail size={18} aria-hidden="true" />Mail</a>}
        </div>}
        {u.role === 'owner' && r.cxs.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Complejos</p>
          <ul className="grid gap-2 grid-cols-[minmax(0,1fr)]">{r.cxs.map(c => <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5"><Cover src={c.coverUrl} seed={c.id} className="size-10 rounded-lg flex-none" /><span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.name}</span><span className="block text-sm text-muted truncate">{c.city} · {plural(courtsOf(state, c.id).length, 'cancha', 'canchas')}</span></span><Pill tone={AP[apKey(c, c.approval || 'approved')][0]}>{AP[apKey(c, c.approval || 'approved')][1]}</Pill></li>)}</ul></div>}
        {u.role === 'player' && last.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Últimas reservas</p>
          <div className="list">{last.map(b => <BookingRow key={b.id} b={b} state={state} onClick={() => setBk(b.id)} />)}</div></div>}
        <div className="mt-3"><Switch label="Cuenta activa" hint={u.id === me.id ? 'No podés desactivar tu propia cuenta.' : 'Si la desactivás, no puede ingresar.'} checked={u.active} disabled={u.id === me.id}
          onChange={v => { update(s => { s.users.find(x => x.id === u.id).active = v }); toast(v ? 'Cuenta activada.' : 'Cuenta desactivada.') }} /></div>
      </>
    )
  }
  return (
    <>
      <PageHeader title="Usuarios" sub={`${state.users.length} cuentas`} />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item><FilterTiles value={role} onChange={setRole} label="Filtrar usuarios" options={[{ value: 'all', label: 'Todos', count: count.all }, { value: 'player', label: 'Jugadores', count: count.player }, { value: 'owner', label: 'Dueños', count: count.owner }, { value: 'off', label: 'Desactivados', short: 'Inactivos', count: count.off, tone: 'warn' }]} /></Item>
          <Item className="mt-3"><SearchField className="sm:max-w-md" value={text} onChange={setText} placeholder="Buscar por nombre o email" label="Buscar usuario" /></Item>
        </Stagger>
        <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6 xl:items-start">
          <div className="min-w-0">{list.length === 0 ? <div className="ad-card"><Empty icon={Users} title="No hay usuarios" text="Probá con otra búsqueda o filtro." /></div> : (
            <div className="list ad-list" style={{ '--cols': 'minmax(0,1fr) 128px 120px 18px', '--cols2': 'minmax(0,1.5fr) 128px minmax(0,1.1fr) 124px 18px' }}>
              <div className="ad-th" aria-hidden="true"><span>Usuario</span><span>Rol</span><span className="ad-w2">Actividad</span><span>Estado</span><span /></div>
              {list.map((r, i) => {
                const { u } = r, a = activity(r), M = ROLE_META[u.role]
                return (
                  <motion.button key={u.id} type="button" className="ad-tr" data-sel={wide && sel?.id === u.id ? '1' : undefined} aria-current={wide && sel?.id === u.id ? 'true' : undefined} onClick={() => setOpen(u.id)}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: Math.min(i * .03, .3) }}>
                    <span className="flex items-center gap-3 min-w-0 flex-1 @min-[680px]:flex-none"><Avatar name={u.name} size={40} />
                      <span className="min-w-0"><span className="block font-semibold truncate">{u.name}</span><span className="block text-sm text-muted truncate"><span className="ad-n">{ROLE_LABEL[u.role]} · </span>{u.email}</span></span></span>
                    <span className="ad-w"><Pill tone={M.tone} icon={M.icon}>{ROLE_LABEL[u.role]}</Pill></span>
                    <span className="ad-w2 text-sm"><span className="block font-medium truncate">{a[0]}</span><span className="block text-muted truncate">{a[1]}</span></span>
                    <span className="ad-w">{u.active ? <Pill tone="ok">Activa</Pill> : <Pill tone="danger" icon={Ban}>Desactivada</Pill>}</span>
                    {!u.active && <span className="ad-n"><Pill tone="danger" icon={Ban}>Desactivada</Pill></span>}
                    <ChevronRight size={18} className="text-faint flex-none -mr-1" aria-hidden="true" />
                  </motion.button>)
              })}
            </div>)}</div>
          {wide && <Aside>{sel ? (
            <div className="ad-card p-4 sm:p-5" key={sel.id}>
              <div className="flex items-center gap-4"><Avatar name={sel.u.name} size={64} /><div className="min-w-0"><h2 className="display text-2xl font-bold leading-tight truncate">{sel.u.name}</h2><div className="mt-1.5 flex flex-wrap gap-1.5"><Pill tone={ROLE_META[sel.u.role].tone} icon={ROLE_META[sel.u.role].icon}>{ROLE_LABEL[sel.u.role]}</Pill>{sel.u.active ? <Pill tone="ok">Activa</Pill> : <Pill tone="danger" icon={Ban}>Desactivada</Pill>}</div></div></div>
              <div className="mt-5">{detail(sel)}</div>
            </div>) : <PanelEmpty icon={Users} title="Sin usuarios para mostrar" text="Cambiá el filtro para ver el detalle." />}</Aside>}
        </div>
      </Content>
      {!wide && <Sheet open={!!sel} onClose={() => setOpen('')} title={sel?.u.name || ''}>{sel && detail(sel)}</Sheet>}
      {bk && <AdminBookingSheet id={bk} onClose={() => setBk('')} />}
    </>
  )
}

/* ---------- Reservas ---------- */
const canCancel = b => ['pending', 'deposit_paid', 'confirmed'].includes(effStatus(b))

function BookingActions({ b, onDone }) {
  const { update } = useStore()
  const toast = useToast(), confirm = useConfirm()
  if (!canCancel(b)) return null
  const cancel = async () => {
    if (!await confirm({ title: '¿Cancelar la reserva?', message: b.paidCents ? `Se devuelven ${money(b.paidCents)} al cliente.` : 'El horario queda libre.', confirmLabel: 'Cancelar reserva', cancelLabel: 'Volver', danger: true })) return
    update(s => cancelBooking(s, b.id, 'owner')); toast('Reserva cancelada.'); onDone?.()
  }
  return <Button variant="danger" onClick={cancel}>Cancelar reserva</Button>
}

function BookingBody({ b }) {
  const { state } = useStore()
  const c = getComplex(state, b.complexId), court = getCourt(state, b.courtId), bal = balanceOf(b), st = effStatus(b)
  return (
    <>
      <div className="flex items-start gap-3">
        <Avatar name={b.playerName} size={48} />
        <div className="flex-1 min-w-0"><p className="font-semibold text-lg leading-tight truncate">{b.playerName}</p><p className="text-muted truncate">{b.phone}</p></div>
        <BookingStatus booking={b} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-sunken px-3.5 py-3"><p className="text-[11px] uppercase tracking-wider text-muted">Día</p><p className="display text-xl font-bold leading-tight">{dateLong(b.date)}</p></div>
        <div className="rounded-xl bg-sunken px-3.5 py-3"><p className="text-[11px] uppercase tracking-wider text-muted">Horario</p><p className="display text-xl font-bold leading-tight tnum">{b.time} a {slotEnd(b.time, b.durationMin || 60)}</p></div>
      </div>
      <dl className="divide-y divide-line border-y border-line mt-4 tnum">
        <Info k="Complejo">{c?.name}</Info><Info k="Cancha">{court ? `${court.name}${court.sport ? ` · ${court.sport}` : ''}` : '—'}</Info>
        <Info k="Origen">{b.source === 'app' ? 'Reservó por la app' : 'Cargada por el complejo'}</Info>
        <Info k="Importe">{money(b.totalCents)}</Info><Info k="Pago">{paymentLabel(b)}</Info>
        {st !== 'cancelled' && st !== 'no_show' && <Info k="Saldo"><span className={bal ? 'font-semibold' : 'text-brand font-semibold'}>{bal ? money(bal) : 'Sin saldo'}</span></Info>}
      </dl>
      {b.note && <p className="mt-3 rounded-xl bg-sunken p-3 text-sm"><span className="font-semibold">Nota: </span>{b.note}</p>}
      {b.phone && <div className="mt-3 flex flex-wrap gap-2"><a className={contactBtn} href={waLink(b.phone)} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" />WhatsApp</a><a className={contactBtn} href={telLink(b.phone)}><Phone size={18} aria-hidden="true" />Llamar</a></div>}
    </>
  )
}

function AdminBookingSheet({ id, onClose }) {
  const { state } = useStore()
  const b = state.bookings.find(x => x.id === id)
  if (!b) return null
  return <Sheet open onClose={onClose} title="Reserva" footer={canCancel(b) ? <BookingActions b={b} onDone={onClose} /> : null}><BookingBody b={b} /></Sheet>
}

const WHEN = [{ value: 'all', label: 'Todas' }, { value: 'today', label: 'Hoy' }, { value: 'next', label: 'Próximas' }, { value: 'past', label: 'Pasadas' }]

export function AdminBookings() {
  const { state } = useStore()
  const wide = useWide()
  const [estado, setEstado] = useState('')
  const [cx, setCx] = useState('')
  const [when, setWhen] = useState('all')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(30)
  const [open, setOpen] = useState('')
  const t = norm(text.trim()), today = todayISO()
  const list = useMemo(() => state.bookings.filter(b => isReal(b) && (!estado || effStatus(b) === estado) && (!cx || b.complexId === cx)
    && (when === 'all' || (when === 'today' ? b.date === today : when === 'next' ? b.date > today : b.date < today))
    && (!t || norm(b.playerName).includes(t) || norm(getComplex(state, b.complexId)?.name).includes(t))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [state.bookings, estado, cx, when, t]) // eslint-disable-line
  const live = list.filter(b => !['cancelled', 'no_show'].includes(effStatus(b)))
  const billed = sum(live, b => b.totalCents || 0), paid = sum(live, b => b.paidCents || 0)
  const lost = list.filter(b => ['cancelled', 'no_show'].includes(effStatus(b))).length
  const shown = list.slice(0, limit)
  const sel = wide ? list.find(b => b.id === open) || list[0] : list.find(b => b.id === open)
  const reset = fn => v => { fn(v); setLimit(30) }
  return (
    <>
      <PageHeader title="Reservas" sub={`${plural(list.length, 'resultado', 'resultados')}`} />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-sm:hidden">
            <Kpi icon={CalendarCheck} label="Reservas" value={list.length} hint={`${live.length} vigentes`} />
            <Kpi icon={Banknote} label="Facturado" value={money(billed)} hint="Sin canceladas" tone="info" />
            <Kpi icon={Check} label="Cobrado" value={money(paid)} hint={billed ? `${Math.round(paid / billed * 100)}% del total` : 'Sin cobros'} />
            <Kpi icon={CircleX} label="Canceladas" value={lost} tone={lost ? 'warn' : 'brand'} hint={list.length ? `${Math.round(lost / list.length * 100)}% de las reservas` : '—'} />
          </Item>
          <Item className="sm:mt-4 grid gap-3 grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
            <SearchField className="col-span-2 lg:col-span-1" value={text} onChange={reset(setText)} placeholder="Buscar cliente o complejo" label="Buscar" />
            <Select value={estado} onChange={e => reset(setEstado)(e.target.value)} aria-label="Estado"><option value="">Estado: todos</option>{STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}</Select>
            <Select value={cx} onChange={e => reset(setCx)(e.target.value)} aria-label="Complejo"><option value="">Complejo: todos</option>{state.complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Item>
          <Item className="mt-3"><Segmented className="sm:max-w-md" value={when} onChange={reset(setWhen)} label="Cuándo" options={WHEN} /></Item>
        </Stagger>
        <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6 xl:items-start">
          <div className="min-w-0">{list.length === 0 ? <div className="ad-card"><Empty icon={CalendarCheck} title="No hay reservas" text="Probá con otra búsqueda o filtro." /></div> : <>
            <div className="list ad-list" style={{ '--cols': 'minmax(0,1fr) 92px 96px 128px 16px', '--cols2': 'minmax(0,1.15fr) minmax(0,1fr) 96px 100px 128px 16px' }}>
              <div className="ad-th" aria-hidden="true"><span>Cliente</span><span className="ad-w2">Complejo</span><span>Día y hora</span><span>Importe</span><span>Estado</span><span /></div>
              {shown.map(b => {
                const c = getComplex(state, b.complexId), court = getCourt(state, b.courtId), st = effStatus(b), on = wide && sel?.id === b.id
                return (
                  <button key={b.id} type="button" className="ad-tr" data-sel={on ? '1' : undefined} aria-current={on ? 'true' : undefined} onClick={() => setOpen(b.id)} style={{ boxShadow: `inset 4px 0 0 ${ACCENT[st]}` }}>
                    <span className="flex items-center gap-3 min-w-0 flex-1 @min-[680px]:flex-none"><Avatar name={b.playerName} size={40} />
                      <span className="min-w-0"><span className="block font-semibold truncate">{b.playerName}</span><span className="block text-sm text-muted truncate tnum"><span className="ad-n">{relativeDay(b.date)} · {b.time} · {court?.name || 'Cancha'}</span><span className="ad-mid">{c?.name} · {court?.name || 'Cancha'}</span><span className="ad-w2">{b.phone}</span></span></span></span>
                    <span className="ad-w2 text-sm"><span className="block font-medium truncate">{c?.name}</span><span className="block text-muted truncate">{court?.name || 'Cancha'}{court?.sport ? ` · ${court.sport}` : ''}</span></span>
                    <span className="ad-w text-sm tnum"><span className="block font-medium">{relativeDay(b.date)}</span><span className="block text-muted">{b.time}</span></span>
                    <span className="text-right @min-[680px]:text-left flex-none text-sm tnum"><span className="block font-semibold">{money(b.totalCents)}</span><span className="ad-w text-muted truncate">{paymentLabel(b)}</span><span className="ad-n block"><BookingStatus booking={b} /></span></span>
                    <span className="ad-w"><BookingStatus booking={b} /></span>
                    <ChevronRight size={18} className="text-faint flex-none -mr-1" aria-hidden="true" />
                  </button>)
              })}
            </div>
            {list.length > limit && <Button variant="secondary" className="w-full mt-4" onClick={() => setLimit(limit + 30)}>Ver más ({list.length - limit} restantes)</Button>}</>}</div>
          {wide && <Aside>{sel ? (
            <div className="ad-card p-4 sm:p-5" key={sel.id}><BookingBody b={sel} />{canCancel(sel) && <div className="mt-4 flex [&>*]:flex-1"><BookingActions b={sel} /></div>}</div>
          ) : <PanelEmpty icon={CalendarCheck} title="Sin reservas para mostrar" text="Cambiá los filtros para ver el detalle." />}</Aside>}
        </div>
      </Content>
      {!wide && open && <AdminBookingSheet id={open} onClose={() => setOpen('')} />}
    </>
  )
}

/* ---------- Reseñas ---------- */
const TABS = [{ value: 'reported', label: 'Reportadas', tone: 'warn' }, { value: 'all', label: 'Todas' }, { value: 'hidden', label: 'Ocultas' }]

export function AdminReviews() {
  const { state, update } = useStore()
  const toast = useToast(), confirm = useConfirm()
  const sideRef = useStickyTop(24)
  const [tab, setTab] = useState('reported')
  const [text, setText] = useState('')
  const [cx, setCx] = useState('')
  const [star, setStar] = useState(null)
  const all = state.reviews
  const count = { reported: all.filter(r => r.reported && !r.hidden).length, all: all.length, hidden: all.filter(r => r.hidden).length }
  const t = norm(text.trim())
  const list = all.filter(r => (tab === 'all' || (tab === 'hidden' ? r.hidden : r.reported && !r.hidden)) && (!cx || r.complexId === cx) && (!star || r.rating === star)
    && (!t || norm(`${r.playerName} ${r.text} ${getComplex(state, r.complexId)?.name}`).includes(t)))
    .sort((a, b) => (Number(b.reported && !b.hidden) - Number(a.reported && !a.hidden)) || b.createdAt.localeCompare(a.createdAt))
  const avg = all.length ? sum(all, r => r.rating) / all.length : 0
  const byStar = [5, 4, 3, 2, 1].map(n => ({ n, k: all.filter(r => r.rating === n).length }))
  const byCx = state.complexes.map(c => { const rs = all.filter(r => r.complexId === c.id && !r.hidden); return { c, n: rs.length, avg: rs.length ? sum(rs, r => r.rating) / rs.length : 0 } }).filter(x => x.n).sort((a, b) => b.avg - a.avg)
  const patch = (id, fn, msg) => { update(s => fn(s.reviews.find(r => r.id === id))); toast(msg) }
  const tone = r => (r.reported && !r.hidden ? 'warn' : r.hidden ? undefined : r.rating >= 4 ? 'ok' : r.rating === 3 ? undefined : 'danger')
  const recent = all.filter(r => !r.reported && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const card = r => (
    <Item key={r.id} className="ad-card ad-stripe p-4 sm:p-5 pl-5 sm:pl-6 flex flex-col" data-tone={tone(r)}>
                  <div className="flex items-start gap-3">
                    <Avatar name={r.playerName} size={40} />
                    <div className="min-w-0 flex-1"><p className="font-semibold truncate">{r.playerName}</p><p className="text-sm text-muted truncate">{getComplex(state, r.complexId)?.name} · {ago(r.createdAt)}</p></div>
                    <Stars n={r.rating} />
                  </div>
                  <p className={cn('mt-3 leading-relaxed flex-1', !r.text && 'text-muted italic')}>{r.text ? `“${r.text}”` : 'Sin comentario, solo calificó.'}</p>
                  {(r.hidden || r.reported) && <div className="mt-3 flex flex-wrap gap-1.5">{r.reported && <Pill tone="warn" icon={Flag}>Reportada</Pill>}{r.hidden && <Pill icon={EyeOff}>Oculta</Pill>}</div>}
                  <div className="mt-4 pt-3.5 border-t border-line flex flex-wrap gap-2">
                    {r.reported && <Button size="sm" variant="secondary" className="ad-act" onClick={() => patch(r.id, x => { x.reported = false }, 'Reporte descartado.')}><Check size={16} aria-hidden="true" />Descartar reporte</Button>}
                    <Button size="sm" variant="secondary" className="ad-act" onClick={() => patch(r.id, x => { x.hidden = !x.hidden }, r.hidden ? 'Reseña visible.' : 'Reseña oculta.')}>{r.hidden ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}{r.hidden ? 'Mostrar' : 'Ocultar'}</Button>
                    <Button size="sm" variant="danger" className="ad-act ml-auto" aria-label={`Eliminar la reseña de ${r.playerName}`} onClick={async () => { if (await confirm({ title: '¿Eliminar la reseña?', message: 'No se puede deshacer.', confirmLabel: 'Eliminar', danger: true })) { update(s => { s.reviews = s.reviews.filter(x => x.id !== r.id) }); toast('Reseña eliminada.') } }}><Trash2 size={16} aria-hidden="true" />Eliminar</Button>
                  </div>
                </Item>
  )
  return (
    <>
      <PageHeader title="Reseñas" sub="Moderación de contenido" />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item><FilterTiles value={tab} onChange={setTab} label="Filtro" options={TABS.map(x => ({ ...x, count: count[x.value] }))} className="sm:max-w-xl" /></Item>
          <Item className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] lg:max-w-3xl">
            <SearchField value={text} onChange={setText} placeholder="Buscar por jugador, complejo o texto" label="Buscar reseña" />
            <Select value={cx} onChange={e => setCx(e.target.value)} aria-label="Complejo"><option value="">Todos los complejos</option>{state.complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Item>
        </Stagger>
        <div className="mt-5 grid gap-5 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 items-start">
          <div ref={sideRef} className="xl:col-start-2 xl:row-start-1 xl:sticky">
            <section className="ad-card p-4 sm:p-5" aria-label="Resumen de reseñas">
              <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 xl:grid-cols-1 xl:gap-4">
                <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1.5 xl:flex-row xl:items-center xl:gap-4">
                  <div className="display text-5xl font-bold tnum leading-none"><CountUp value={all.length ? avgText(avg) : '—'} /></div>
                  <div><div className="flex gap-0.5" role="img" aria-label={`${avgText(avg)} de 5 estrellas`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={18} aria-hidden="true" className={n <= Math.round(avg) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-strong'} />)}</div><p className="text-sm text-muted mt-1 tnum">{plural(all.length, 'reseña', 'reseñas')} en total</p></div>
                </div>
                <div className="max-sm:hidden grid gap-0.5 self-center" role="group" aria-label="Filtrar por estrellas">
                  {byStar.map(({ n, k }, i) => (
                    <button key={n} type="button" aria-pressed={star === n} aria-label={`${plural(n, 'estrella', 'estrellas')}: ${plural(k, 'reseña', 'reseñas')}`} onClick={() => setStar(star === n ? null : n)}
                      className={cn('w-full flex items-center gap-2.5 min-h-9 rounded-lg px-2 -mx-2 text-sm tnum transition-colors hover:bg-sunken', star === n && 'bg-brand-soft')}>
                      <span className="w-3 text-right font-semibold">{n}</span><Star size={13} aria-hidden="true" className="fill-[var(--gold)] text-[var(--gold)] flex-none" />
                      <Bar pct={all.length ? k / all.length * 100 : 0} i={i} tone={n <= 2 ? 'warn' : 'brand'} className="flex-1" /><span className="w-6 text-right text-muted">{k}</span>
                    </button>))}
                </div>
              </div>
              {star && <button type="button" onClick={() => setStar(null)} className="mt-3 inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-brand"><X size={16} aria-hidden="true" />Quitar filtro de {plural(star, 'estrella', 'estrellas')}</button>}
              {byCx.length > 0 && <div className="max-xl:hidden mt-5 pt-4 border-t border-line"><p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Por complejo</p>
                <ul className="grid gap-1.5">{byCx.map(x => <li key={x.c.id} className="flex items-center gap-2 text-sm"><span className="flex-1 min-w-0 truncate">{x.c.name}</span><span className="inline-flex items-center gap-1 font-semibold tnum"><Star size={13} className="fill-[var(--gold)] text-[var(--gold)]" aria-hidden="true" />{avgText(x.avg)}</span><span className="w-8 text-right text-muted tnum">{x.n}</span></li>)}</ul></div>}
            </section>
          </div>

          <div className="min-w-0 xl:col-start-1 xl:row-start-1">
            {list.length === 0 ? <div className="ad-card"><Empty icon={tab === 'reported' ? CheckCheck : Star} title={tab === 'reported' && !t && !cx && !star ? 'Nada para revisar' : 'No hay reseñas'} text={tab === 'reported' && !t && !cx && !star ? 'No hay reseñas reportadas.' : 'Probá con otro filtro o búsqueda.'} /></div> : (
              <Stagger className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start" key={tab + t + cx + star}>{list.map(card)}</Stagger>)}
            {tab === 'reported' && !t && !cx && !star && list.length < 4 && recent.length > 0 && (
              <section className="mt-8" aria-label="Últimas reseñas">
                <h2 className="text-lg">Últimas reseñas</h2><p className="text-sm text-muted mb-3">Para tener el pulso de la plataforma</p>
                <Stagger className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] items-start">{recent.map(card)}</Stagger>
              </section>)}
          </div>
        </div>
      </Content>
    </>
  )
}

/* ---------- Problemas reportados ---------- */
const R_ICON = { closed: DoorClosed, price: BadgeDollarSign, state: Wrench, late: Clock3, other: MessageSquareWarning }
const R_TONE = { closed: 'danger', price: 'warn', state: 'warn', late: 'info', other: 'muted' }
const R_SHORT = { closed: 'Cerrado', price: 'Cobro', state: 'Estado', late: 'Demora', other: 'Otro' }
const R_TILE = { danger: 'bg-danger-soft text-danger', warn: 'bg-warn-soft text-warn', info: 'bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-info', muted: 'bg-sunken text-muted' }
const QUICK = [['Pedir disculpas', 'Pedimos disculpas por lo que pasó. Ya hablamos con el complejo para que no se repita.'], ['Devolver la diferencia', 'Hablamos con el complejo y te van a devolver la diferencia.'], ['Agradecer el aviso', 'Gracias por avisarnos. Lo registramos y lo vamos a seguir de cerca.']]
const daysSince = iso => Math.max(0, Math.round((new Date(`${todayISO()}T12:00:00`) - new Date(`${iso.slice(0, 10)}T12:00:00`)) / 86400000))
const spanText = ms => { const h = ms / 3600000; return h < 1 ? 'Menos de 1 h' : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} días` }

function ReportDetail({ r, onDone }) {
  const { state, update } = useStore()
  const toast = useToast()
  const [reply, setReply] = useState('')
  const c = getComplex(state, r.complexId), b = state.bookings.find(x => x.id === r.bookingId), open = r.status === 'open', age = daysSince(r.createdAt)
  const Icon = R_ICON[r.kind] || MessageSquareWarning
  const owner = c && state.users.find(u => u.id === c.ownerId)
  const send = () => { update(s => resolveReport(s, r.id, reply)); toast('Reporte resuelto. Le avisamos al jugador.'); onDone?.() }
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className={cn('size-12 rounded-2xl grid place-items-center flex-none', R_TILE[R_TONE[r.kind]])}><Icon size={24} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h3 className="display text-xl font-bold leading-tight">{REPORT_KINDS[r.kind]}</h3><p className="text-sm text-muted">{r.playerName} · {ago(r.createdAt)}</p></div>
        <Pill tone={open ? 'warn' : 'ok'} icon={open ? Hourglass : CheckCheck}>{open ? 'Abierto' : 'Resuelto'}</Pill>
      </div>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        <Info k="Complejo">{c?.name}</Info>
        {b && <Info k="Reserva"><span className="tnum">{dateShort(b.date)} · {b.time} · {getCourt(state, b.courtId)?.name}</span></Info>}
        {b && <Info k="Importe"><span className="tnum">{money(b.totalCents)}</span></Info>}
      </dl>
      <blockquote className={cn('mt-4 rounded-xl bg-sunken p-3.5 leading-relaxed', !r.text && 'text-muted italic')}>{r.text ? `“${r.text}”` : 'El jugador no dejó un comentario.'}</blockquote>
      <ol className="mt-5 text-sm">
        <li className="ad-step"><span className="font-semibold">Reportado</span><span className="text-muted"> · {ago(r.createdAt)}</span></li>
        {open ? <li className="ad-step" data-tone="warn"><span className="font-semibold">{age === 0 ? 'Esperando respuesta' : `Sin respuesta hace ${plural(age, 'día', 'días')}`}</span></li>
          : <li className="ad-step" data-tone="ok"><span className="font-semibold">Resuelto</span>{r.resolvedAt && <span className="text-muted"> · {ago(r.resolvedAt)}</span>}{r.response && <p className="mt-1 pl-3 border-l-2 border-brand">{r.response}</p>}</li>}
      </ol>
      {open && <div className="mt-5">
        <label htmlFor={`rp-${r.id}`} className="label">Respuesta para el jugador <span className="text-muted font-normal">(opcional)</span></label>
        <Textarea id={`rp-${r.id}`} value={reply} onChange={e => setReply(e.target.value)} placeholder="Contale cómo lo resolviste" rows={3} />
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Respuestas rápidas">{QUICK.map(([l, tx]) => <Chip key={l} className="!min-h-10 pointer-coarse:!min-h-11 !text-[13px]" active={reply === tx} onClick={() => setReply(tx)}>{l}</Chip>)}</div>
        <Button className="w-full mt-3" onClick={send}><CheckCheck size={18} aria-hidden="true" />Marcar como resuelto</Button>
      </div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {(c?.whatsapp || c?.phone || owner?.phone) && <a className={contactBtn} href={waLink(c?.whatsapp || c?.phone || owner?.phone, `Hola, te escribo de La Fija. ${r.playerName} avisó: ${REPORT_KINDS[r.kind].toLowerCase()} (${b ? `${dateShort(b.date)} ${b.time}` : c?.name}).`)} target="_blank" rel="noreferrer"><Store size={18} aria-hidden="true" />Escribir al complejo</a>}
        {b?.phone && <a className={contactBtn} href={waLink(b.phone)} target="_blank" rel="noreferrer"><Send size={18} aria-hidden="true" />Escribir al jugador</a>}
      </div>
    </div>
  )
}

export function AdminReports() {
  const { state } = useStore()
  const wide = useWide()
  const [tab, setTab] = useState('open')
  const [kind, setKind] = useState('')
  const [open, setOpen] = useState('')
  const reports = state.reports || []
  const opened = reports.filter(r => r.status === 'open').length, resolved = reports.filter(r => r.status === 'resolved')
  const times = resolved.filter(r => r.resolvedAt).map(r => new Date(r.resolvedAt) - new Date(r.createdAt)).filter(x => x >= 0)
  const kinds = Object.keys(REPORT_KINDS).map(k => ({ k, n: reports.filter(r => r.kind === k).length })).sort((a, b) => b.n - a.n)
  const list = reports.filter(r => r.status === tab && (!kind || r.kind === kind)).sort((a, b) => (tab === 'open' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)))
  const sel = wide ? list.find(r => r.id === open) || list[0] : null
  const item = r => {
    const c = getComplex(state, r.complexId), b = state.bookings.find(x => x.id === r.bookingId), Icon = R_ICON[r.kind] || MessageSquareWarning, on = wide ? sel?.id === r.id : open === r.id, late = r.status === 'open' && daysSince(r.createdAt) >= 2
    return (
      <Item key={r.id} className="min-w-0">
        <button type="button" onClick={() => setOpen(on && !wide ? '' : r.id)} aria-expanded={wide ? undefined : on} aria-current={wide && on ? 'true' : undefined}
          className="ad-card ad-pick ad-stripe w-full text-left p-4 pl-5 flex items-start gap-3" data-tone={r.status === 'resolved' ? 'ok' : late ? 'danger' : 'warn'} data-sel={on ? '1' : undefined}>
          <span className={cn('size-11 rounded-xl grid place-items-center flex-none', R_TILE[R_TONE[r.kind]])}><Icon size={22} aria-hidden="true" /></span>
          <span className="flex-1 min-w-0">
            <span className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{REPORT_KINDS[r.kind]}</span><Pill tone={r.status === 'open' ? 'warn' : 'ok'}>{r.status === 'open' ? 'Abierto' : 'Resuelto'}</Pill></span>
            <span className="block text-sm text-muted truncate mt-0.5">{r.playerName} · {c?.name}{b ? ` · ${b.date.split('-').reverse().slice(0, 2).join('/')} ${b.time}` : ''}</span>
            {r.text && <span className="block text-sm mt-1.5 line-clamp-2">“{r.text}”</span>}
            <span className={cn('block text-xs mt-2 tnum', late ? 'text-danger font-semibold' : 'text-muted')}>{r.status === 'open' ? (late ? `Sin respuesta hace ${plural(daysSince(r.createdAt), 'día', 'días')}` : `Reportado ${ago(r.createdAt).toLowerCase()}`) : `Resuelto${r.resolvedAt ? ` ${ago(r.resolvedAt).toLowerCase()}` : ''}`}</span>
          </span>
          <ChevronRight size={18} className={cn('flex-none mt-3 text-faint transition-transform', on && !wide && 'rotate-90')} aria-hidden="true" />
        </button>
        {!wide && on && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="ad-card p-4 mt-2"><ReportDetail r={r} /></motion.div>}
      </Item>)
  }
  return (
    <>
      <PageHeader back="/admin" title="Problemas reportados" sub="Avisos de jugadores sobre sus reservas" />
      <Content className="max-w-[1480px]">
        <Stagger>
          <Item className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <FilterTiles className="col-span-2" value={tab} onChange={v => { setTab(v); setOpen('') }} label="Estado" options={[{ value: 'open', label: 'Abiertos', count: opened, tone: 'warn' }, { value: 'resolved', label: 'Resueltos', count: resolved.length }]} />
            <Kpi icon={Hourglass} label="Respuesta promedio" value={times.length ? spanText(times.reduce((s, x) => s + x, 0) / times.length) : '—'} hint={times.length ? `${plural(times.length, 'reporte medido', 'reportes medidos')}` : 'Aún sin datos'} tone="info" />
            <Kpi icon={Flag} label="Más reportado" value={kinds[0]?.n ? R_SHORT[kinds[0].k] : '—'} hint={kinds[0]?.n ? `${kinds[0].n} de ${reports.length}` : 'Sin reportes'} tone={kinds[0]?.n ? 'warn' : 'brand'} />
          </Item>
          {reports.length > 0 && <Item className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="group" aria-label="Tipo de problema">
            <Chip active={!kind} onClick={() => setKind('')} className="flex-none">Todos</Chip>
            {kinds.filter(x => x.n).map(x => <Chip key={x.k} active={kind === x.k} onClick={() => setKind(kind === x.k ? '' : x.k)} className="flex-none">{R_SHORT[x.k]}<span className="tnum opacity-70">{x.n}</span></Chip>)}
          </Item>}
        </Stagger>
        <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:gap-6 xl:items-start">
          <div className="min-w-0">{list.length === 0 ? <div className="ad-card"><Empty icon={tab === 'open' ? Inbox : Flag} title={tab === 'open' ? 'No hay problemas abiertos' : 'Todavía no hay reportes resueltos'} text="Cuando un jugador avise un problema, aparece acá." /></div>
            : <Stagger key={tab + kind} className="grid gap-3 grid-cols-[minmax(0,1fr)]">{list.map(item)}</Stagger>}</div>
          {wide && <Aside className="xl:min-h-[200px]">{sel ? <div className="ad-card p-5" key={sel.id}><ReportDetail r={sel} /></div> : <PanelEmpty icon={Inbox} title={tab === 'open' ? 'Bandeja vacía' : 'Sin reportes resueltos'} text="Cuando haya reportes vas a ver el detalle y podés responderlos desde acá." />}</Aside>}
        </div>
      </Content>
    </>
  )
}
