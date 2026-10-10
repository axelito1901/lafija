import { LogOut, Moon, Search, Sparkles, Store, Sun, Check, ChevronRight } from 'lucide-react'
import { LayoutGroup, m as motion } from 'motion/react'
import { Link } from '../lib/router'
import { useStore } from '../lib/store'
import { bookingStart, effStatus, getComplex, isApproved, isUpcoming } from '../lib/domain'
import { relativeDay } from '../lib/format'
import { Avatar, LogoTile } from './kit'

const ROLE = { player: 'Jugador', owner: 'Dueño', admin: 'Administrador' }
const ACCOUNT = { player: '/cuenta', owner: '/dueno/cuenta', admin: '/admin' }

const tourId = i => `nav-${i.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-')}`

export const isActive = (item, path) =>
  item.exact ? path === item.to : path === item.to || path.startsWith(item.to + '/') || (item.also || []).some(p => path === p || path.startsWith(p + '/'))

/* Ítems del menú de PC agrupados: los consecutivos con el mismo `group` van bajo un mismo rótulo. */
const groupsOf = items => items.reduce((acc, i) => {
  const last = acc[acc.length - 1]
  if (last && last.label === (i.group || '')) last.items.push(i); else acc.push({ label: i.group || '', items: [i] })
  return acc
}, [])

/* Contadores del menú: cosas que piden atención (se calculan de las reservas, no se cargan a mano). */
function useBadges(user) {
  const { state } = useStore()
  if (!state || !user) return {}
  const now = new Date()
  if (user.role === 'player') {
    const n = state.bookings.filter(b => b.playerId === user.id && isUpcoming(b, now)).length
    return n ? { '/reservas': { n } } : {}
  }
  if (user.role === 'owner') {
    const mine = state.complexes.filter(c => c.ownerId === user.id).map(c => c.id)
    const n = state.bookings.filter(b => mine.includes(b.complexId) && effStatus(b, now) === 'pending').length
    return n ? { '/dueno/reservas': { n, hot: true } } : {}
  }
  const pend = state.complexes.filter(c => c.approval === 'pending').length
  const open = (state.reports || []).filter(r => r.status === 'open').length
  return { ...(pend ? { '/admin/complejos': { n: pend, hot: true } } : {}), ...(open ? { '/admin/reportes': { n: open, hot: true } } : {}) }
}

/* Tarjetita de contexto arriba del menú: lo más importante del rol, a un toque. */
function SideContext({ user }) {
  const { state } = useStore()
  if (!state) return null
  const now = new Date()
  if (user.role === 'player') {
    const next = state.bookings.filter(b => b.playerId === user.id && isUpcoming(b, now)).sort((a, b) => bookingStart(a) - bookingStart(b))[0]
    if (!next) return (
      <Link to="/buscar" className="ui-ctx" aria-label="Buscar una cancha">
        <span className="ui-ctx-k"><Sparkles size={14} aria-hidden="true" />Sin partido</span>
        <p className="ui-ctx-v">Armá el próximo</p>
        <p className="ui-ctx-s flex items-center gap-1.5"><Search size={14} aria-hidden="true" />Buscar cancha libre</p>
      </Link>
    )
    const c = getComplex(state, next.complexId)
    return (
      <Link to="/reservas" className="ui-ctx" aria-label={`Próximo partido: ${relativeDay(next.date)} ${next.time} en ${c?.name || 'tu cancha'}`}>
        <span className="ui-ctx-k"><span className="ui-live" aria-hidden="true" />Próximo partido</span>
        <p className="ui-ctx-v tnum">{relativeDay(next.date)} · {next.time}</p>
        <p className="ui-ctx-s truncate">{c?.name}</p>
      </Link>
    )
  }
  if (user.role === 'owner') {
    const mine = state.complexes.filter(c => c.ownerId === user.id)
    let picked = ''
    try { picked = localStorage.getItem('lafija-owner-complex') || '' } catch { /* sin almacenamiento */ }
    const c = mine.find(x => x.id === picked) || mine[0]
    if (!c) return (
      <Link to="/dueno/complejo" className="ui-ctx">
        <span className="ui-ctx-k"><Store size={14} aria-hidden="true" />Tu complejo</span>
        <p className="ui-ctx-v">Creá el primero</p>
      </Link>
    )
    const approved = isApproved(c)
    const live = approved && c.active && c.public
    return (
      <Link to="/dueno/complejo" className="ui-ctx" aria-label={`Mi complejo: ${c.name}${mine.length > 1 ? `. Tenés ${mine.length} complejos` : ''}`}>
        <span className="ui-ctx-k">{live ? <span className="ui-live" aria-hidden="true" /> : <Store size={14} aria-hidden="true" />}Tu complejo{mine.length > 1 ? ` · ${mine.length}` : ''}</span>
        <p className="ui-ctx-v truncate">{c.name}</p>
        <p className="ui-ctx-s truncate">{!approved ? (c.approval === 'rejected' ? 'No aprobado' : 'En revisión') : live ? 'Visible para jugadores' : 'Oculto'}</p>
      </Link>
    )
  }
  const pend = state.complexes.filter(c => c.approval === 'pending').length
  const open = (state.reports || []).filter(r => r.status === 'open').length
  const todo = pend + open
  return (
    <Link to={pend ? '/admin/complejos' : open ? '/admin/reportes' : '/admin'} className="ui-ctx">
      <span className="ui-ctx-k">{todo ? <span className="ui-live" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}Moderación</span>
      <p className="ui-ctx-v">{todo ? `${todo} por revisar` : 'Todo al día'}</p>
      <p className="ui-ctx-s">{todo ? [pend ? `${pend} ${pend === 1 ? 'complejo' : 'complejos'}` : '', open ? `${open} ${open === 1 ? 'reporte' : 'reportes'}` : ''].filter(Boolean).join(' · ') : 'Nada pendiente'}</p>
    </Link>
  )
}

export function Shell({ nav, user, path, theme, onSignOut, sidebarTop, children }) {
  const badges = useBadges(user)
  const groups = groupsOf(nav.desktop)
  return (
    <div className="min-h-dvh lg:pl-[var(--side-w)]">
      <button type="button" className="ui-skip" onClick={() => document.getElementById('main')?.focus()}>Ir al contenido</button>
      <aside className="ui-side" aria-label="Menú lateral">
        <Link to={nav.desktop[0].to} className="ui-side-brand" aria-label="La Fija, inicio"><LogoTile /><span className="ui-logo-word">La Fija</span></Link>
        <div className="ui-side-scroll">
          {sidebarTop || <SideContext user={user} />}
          <nav aria-label="Principal"><LayoutGroup id="side">
            {groups.map(g => (
              <div key={g.label || 'x'} role="group" aria-label={g.label || undefined}>
                {g.label && <p className="ui-side-label" aria-hidden="true">{g.label}</p>}
                <div className={`ui-side-nav${g.label ? '' : ' mt-5'}`}>
                  {g.items.map(i => {
                    const on = isActive(i, path), b = badges[i.to]
                    return (
                      <Link key={i.to} to={i.to} className="side-link" data-tour={tourId(i)} aria-current={on ? 'page' : undefined}>
                        {on && <motion.span layoutId="side-pill" className="ui-side-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                        <i.icon size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden="true" />{i.label}
                        {b && <span className={`ui-side-badge${b.hot ? ' is-hot' : ''}`} aria-label={`${b.n} ${b.hot ? 'pendientes' : 'próximas'}`}>{b.n}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </LayoutGroup></nav>
        </div>
        <div className="ui-side-foot">
          <Link to={ACCOUNT[user.role]} className="ui-user" aria-label={`${user.name}, ${ROLE[user.role]}. Ir a mi cuenta`}>
            <span className="relative flex-none"><Avatar name={user.name} size={40} tone="grad" /><span className="ui-online" aria-hidden="true" /></span>
            <div className="min-w-0"><div className="text-sm font-semibold truncate">{user.name}</div><div className="text-xs text-muted">{ROLE[user.role]}</div></div>
            <ChevronRight size={16} className="ui-user-go" aria-hidden="true" />
          </Link>
          <div className="ui-side-foot-btns">
            <button type="button" className="ui-side-btn" onClick={theme.toggle} aria-label={theme.dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>{theme.dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}{theme.dark ? 'Claro' : 'Oscuro'}</button>
            <button type="button" className="ui-side-btn" onClick={onSignOut} aria-label="Cerrar sesión"><LogOut size={16} aria-hidden="true" />Salir</button>
          </div>
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="pb-[calc(var(--nav-h)+var(--safe-bottom)+16px)] lg:pb-14">{children}</main>

      <nav className="bottom-nav lg:hidden" aria-label="Principal"><LayoutGroup>
        {nav.mobile.map(i => (
          <Link key={i.to} to={i.to} data-tour={tourId(i)} aria-current={isActive(i, path) ? 'page' : undefined}>
            {isActive(i, path) && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <i.icon size={22} strokeWidth={isActive(i, path) ? 2.25 : 1.75} aria-hidden="true" /><span>{i.label}</span>
          </Link>
        ))}
      </LayoutGroup></nav>
    </div>
  )
}
