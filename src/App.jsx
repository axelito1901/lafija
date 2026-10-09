import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { PageFade } from './ui/motion'
import { CalendarCheck, CalendarDays, ClipboardList, CircleUser, Ellipsis, Heart, House, LayoutGrid, Search as SearchIcon, Store, Tags, Users, Wallet, Building2, UserRound, Star, BarChart3 } from 'lucide-react'
import { useStore } from './lib/store'
import { useTheme } from './lib/theme'
import { homeFor } from './lib/roles'
import { match, navigate, useRoute } from './lib/router'
import { getComplex } from './lib/domain'
import { Button, Content, Empty, ErrorState, HeaderExtra, Logo, PageHeader, Skeleton, useToast } from './ui/kit'
import { BellButton, useUnread } from './ui/Notifications'
import { showLocal } from './lib/push'
import { Shell } from './ui/Shell'
import Login from './screens/Login'
import { Privacy, Terms } from './screens/Legal'
import PlayerHome from './screens/player/Home'
import ComplexPage from './screens/player/Complex'
import Wizard from './screens/player/Wizard'
import { HelpButton } from './ui/Help'
import { Tour, TOURS, tourKey } from './ui/Tour'
import { Account, PlayerBookings, PlayerFavorites } from './screens/player/Misc'

/* Cada rol descarga solo sus pantallas (el jugador no baja el panel del dueño ni el de admin). */
const L = (load, name) => lazy(() => load().then(m => ({ default: name ? m[name] : m.default })))
const owner = () => import('./screens/owner/index.js')
const admin = () => import('./screens/admin/index.js')
const Search = L(() => import('./screens/player/Search'))
const OwnerHome = L(owner, 'OwnerHome'), OwnerBookings = L(owner, 'OwnerBookings'), OwnerClients = L(owner, 'OwnerClients')
const Agenda = L(owner, 'Agenda'), Courts = L(owner, 'Courts'), Finance = L(owner, 'Finance'), More = L(owner, 'More'), Promotions = L(owner, 'Promotions')
const Settings = L(owner, 'Settings'), OwnerReviews = L(owner, 'OwnerReviews'), Stats = L(owner, 'Stats'), OwnerPreview = L(owner, 'OwnerPreview')
const AdminHome = L(admin, 'AdminHome'), AdminComplexes = L(admin, 'AdminComplexes'), AdminUsers = L(admin, 'AdminUsers'), AdminBookings = L(admin, 'AdminBookings'), AdminReviews = L(admin, 'AdminReviews'), Revenue = L(admin, 'Revenue')

const PageSkeleton = () => (
  <div className="px-4 md:px-6 lg:px-8 py-6 max-w-[1120px] mx-auto space-y-4" aria-busy="true" aria-label="Cargando">
    <Skeleton className="h-7 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" />
  </div>
)

const NAV = {
  player: {
    mobile: [{ to: '/', label: 'Inicio', icon: House, exact: true }, { to: '/buscar', label: 'Buscar', icon: SearchIcon }, { to: '/reservas', label: 'Reservas', icon: CalendarCheck }, { to: '/favoritos', label: 'Favoritos', icon: Heart }, { to: '/cuenta', label: 'Cuenta', icon: CircleUser }],
  },
  owner: {
    mobile: [{ to: '/dueno', label: 'Inicio', icon: House, exact: true }, { to: '/dueno/agenda', label: 'Agenda', icon: CalendarDays }, { to: '/dueno/reservas', label: 'Reservas', icon: ClipboardList }, { to: '/dueno/canchas', label: 'Canchas', icon: LayoutGrid }, { to: '/dueno/mas', label: 'Más', icon: Ellipsis, also: ['/dueno/clientes', '/dueno/promociones', '/dueno/finanzas', '/dueno/estadisticas', '/dueno/resenas', '/dueno/complejo', '/dueno/cuenta'] }],
    desktop: [{ to: '/dueno', label: 'Inicio', icon: House, exact: true }, { to: '/dueno/agenda', label: 'Agenda', icon: CalendarDays }, { to: '/dueno/reservas', label: 'Reservas', icon: ClipboardList }, { to: '/dueno/canchas', label: 'Canchas', icon: LayoutGrid }, { to: '/dueno/clientes', label: 'Clientes', icon: Users }, { to: '/dueno/promociones', label: 'Promociones', icon: Tags }, { to: '/dueno/finanzas', label: 'Finanzas', icon: Wallet }, { to: '/dueno/estadisticas', label: 'Estadísticas', icon: BarChart3 }, { to: '/dueno/resenas', label: 'Reseñas', icon: Star }, { to: '/dueno/complejo', label: 'Mi complejo', icon: Store }, { to: '/dueno/cuenta', label: 'Cuenta', icon: UserRound }],
  },
  admin: {
    mobile: [{ to: '/admin', label: 'Inicio', icon: House, exact: true }, { to: '/admin/complejos', label: 'Complejos', icon: Building2 }, { to: '/admin/usuarios', label: 'Usuarios', icon: Users }, { to: '/admin/reservas', label: 'Reservas', icon: ClipboardList }, { to: '/admin/resenas', label: 'Reseñas', icon: Star }],
    desktop: [{ to: '/admin', label: 'Inicio', icon: House, exact: true }, { to: '/admin/complejos', label: 'Complejos', icon: Building2 }, { to: '/admin/usuarios', label: 'Usuarios', icon: Users }, { to: '/admin/reservas', label: 'Reservas', icon: ClipboardList }, { to: '/admin/resenas', label: 'Reseñas', icon: Star }, { to: '/admin/ingresos', label: 'Ingresos', icon: Wallet }],
  },
}
for (const k of Object.keys(NAV)) NAV[k].desktop ||= NAV[k].mobile

class Boundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(e) { console.error(e) }
  render() { return this.state.err ? <ErrorState title="Algo salió mal" text="Recargá la página. Tus datos no se perdieron." onRetry={() => location.reload()} /> : this.props.children }
}

const Splash = () => <div className="min-h-dvh grid place-items-center"><div className="w-48 space-y-4 text-center"><Logo className="justify-center" /><Skeleton className="h-2 w-full" /></div></div>
const NotFound = ({ role }) => <><PageHeader title="Página no encontrada" /><Content><Empty title="No encontramos esa página" action={<Button onClick={() => navigate(homeFor(role))}>Ir al inicio</Button>} /></Content></>

function renderRoute(role, path, theme, signOut) {
  let m
  if (path === '/terminos') return <Terms />
  if (path === '/privacidad') return <Privacy />
  if ((m = match('/complejo/:id/reservar', path))) return <Wizard key={m.id} id={m.id} inShell />
  if ((m = match('/complejo/:id', path))) return <ComplexPage key={m.id} id={m.id} inShell />
  if (role === 'player') {
    switch (path) {
      case '/': return <PlayerHome />
      case '/buscar': return <Search />
      case '/reservas': return <PlayerBookings />
      case '/favoritos': return <PlayerFavorites />
      case '/cuenta': return <Account theme={theme} onSignOut={signOut} />
    }
  }
  if (role === 'owner') {
    switch (path) {
      case '/dueno': return <OwnerHome />
      case '/dueno/agenda': return <Agenda />
      case '/dueno/reservas': return <OwnerBookings />
      case '/dueno/canchas': return <Courts />
      case '/dueno/mas': return <More theme={theme} onSignOut={signOut} />
      case '/dueno/clientes': return <OwnerClients />
      case '/dueno/promociones': return <Promotions />
      case '/dueno/finanzas': return <Finance />
      case '/dueno/resenas': return <OwnerReviews />
      case '/dueno/estadisticas': return <Stats />
      case '/dueno/complejo': return <Settings />
      case '/dueno/complejo/vista-previa': return <OwnerPreview />
      case '/dueno/cuenta': return <Account theme={theme} onSignOut={signOut} />
    }
  }
  if (role === 'admin') {
    switch (path) {
      case '/admin': return <AdminHome theme={theme} onSignOut={signOut} />
      case '/admin/complejos': return <AdminComplexes />
      case '/admin/usuarios': return <AdminUsers />
      case '/admin/reservas': return <AdminBookings />
      case '/admin/resenas': return <AdminReviews />
      case '/admin/ingresos': return <Revenue />
    }
  }
  return <NotFound role={role} />
}

/* Avisa con un toast cuando llega una notificación nueva (por ejemplo desde otra pestaña). */
function NotificationToaster() {
  const { state, user } = useStore()
  const toast = useToast()
  const seen = useRef(null)
  const mine = (state?.notifications || []).filter(n => n.userId === user?.id)
  useEffect(() => {
    const ids = new Set(mine.map(n => n.id))
    if (seen.current) mine.filter(n => !seen.current.has(n.id) && !n.read && n.type !== 'payment_ok').slice(-2).forEach(n => { toast(`${n.title}. ${n.text}`); showLocal(n) })
    seen.current = ids
  }, [mine.length, user?.id]) // eslint-disable-line
  return null
}

export default function App() {
  const { path, query } = useRoute()
  const { state, user, loading, error, clearError, auth } = useStore()
  const theme = useTheme()
  const toast = useToast()
  const [intro, setIntro] = useState(false)
  const [, setTick] = useState(0)
  useEffect(() => { if (error) { toast(error, 'error'); clearError() } }, [error]) // eslint-disable-line

  const isLegal = path === '/terminos' || path === '/privacidad'
  const isPublic = isLegal || !!match('/complejo/:id', path) || !!match('/complejo/:id/reservar', path)
  const area = path.startsWith('/dueno') ? 'owner' : path.startsWith('/admin') ? 'admin' : 'player'

  // Protección de rutas: sin sesión → ingresar; con rol equivocado → su inicio.
  useEffect(() => {
    if (loading) return
    if (path === '/ingresar') { if (user) navigate(query.volver || homeFor(user.role), { replace: true }); return }
    if (!user) { if (!isPublic) navigate(`/ingresar${path !== '/' ? `?volver=${encodeURIComponent(path)}` : ''}`, { replace: true }); return }
    if (!isPublic && area !== user.role) navigate(homeFor(user.role), { replace: true })
  }, [path, user, loading]) // eslint-disable-line

  // Cada vez que se cambia de pantalla, arrancar desde arriba.
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [path])

  const signOut = async () => { await auth.signOut(); navigate('/ingresar', { replace: true }) }

  if (loading) return <Splash />
  if (!state) return <div className="min-h-dvh grid place-items-center px-4"><div className="max-w-sm w-full"><div className="text-center mb-2"><Logo className="justify-center" /></div><ErrorState title="No pudimos conectarnos" text="Revisá tu conexión a internet e intentá de nuevo." onRetry={() => window.location.reload()} /></div></div>
  if (path === '/ingresar') return user ? <Splash /> : <Login />
  if (!user) return isPublic ? <div className="min-h-dvh">{isLegal ? (path === '/terminos' ? <Terms /> : <Privacy />) : match('/complejo/:id/reservar', path) ? <Wizard id={match('/complejo/:id/reservar', path).id} inShell={false} /> : <ComplexPage id={match('/complejo/:id', path).id} inShell={false} />}</div> : <Splash />
  if (!isPublic && area !== user.role) return <Splash />

  return (
    <HeaderExtra.Provider value={<><HelpButton onReplayIntro={() => { navigate(homeFor(user.role)); setIntro(true) }} /><BellButton /></>}>
      <Shell nav={NAV[user.role]} user={user} path={path} theme={theme} onSignOut={signOut}>
        <PageFade k={path}><Boundary key={path}><Suspense fallback={<PageSkeleton />}>{renderRoute(user.role, path, theme, signOut)}</Suspense></Boundary></PageFade>
      </Shell>
      <NotificationToaster />
      {TOURS[user.role] && path === homeFor(user.role) && (intro || !localStorage.getItem(tourKey(user.role))) && <Tour key={String(intro)} role={user.role} onDone={() => { setIntro(false); setTick(t => t + 1) }} />}
    </HeaderExtra.Provider>
  )
}
