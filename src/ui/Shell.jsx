import { LogOut, Moon, Sun } from 'lucide-react'
import { LayoutGroup, m as motion } from 'motion/react'
import { Link } from '../lib/router'
import { Avatar, Logo } from './kit'

const ROLE = { player: 'Jugador', owner: 'Dueño', admin: 'Administrador' }

const tourId = i => `nav-${i.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-')}`

export const isActive = (item, path) =>
  item.exact ? path === item.to : path === item.to || path.startsWith(item.to + '/') || (item.also || []).some(p => path === p || path.startsWith(p + '/'))

export function Shell({ nav, user, path, theme, onSignOut, sidebarTop, children }) {
  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-surface border-r border-line px-4 py-6">
        <Link to={nav.desktop[0].to} className="px-3 mb-6" aria-label="La Fija, inicio"><Logo /></Link>
        {sidebarTop}
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {nav.desktop.map(i => (
            <Link key={i.to} to={i.to} className="side-link" data-tour={tourId(i)} aria-current={isActive(i, path) ? 'page' : undefined}>
              <i.icon size={20} aria-hidden="true" />{i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-line">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0"><div className="text-sm font-semibold truncate">{user.name}</div><div className="text-sm text-muted">{ROLE[user.role]}</div></div>
          </div>
          <button type="button" className="side-link w-full" onClick={theme.toggle}>{theme.dark ? <Sun size={20} /> : <Moon size={20} />}{theme.dark ? 'Modo claro' : 'Modo oscuro'}</button>
          <button type="button" className="side-link w-full" onClick={onSignOut}><LogOut size={20} />Cerrar sesión</button>
        </div>
      </aside>

      <main id="main" className="pb-[calc(var(--nav-h)+var(--safe-bottom)+16px)] lg:pb-12">{children}</main>

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
