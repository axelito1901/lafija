import { useId, useState } from 'react'
import { m as motion } from 'motion/react'
import { Accessibility, BarChart3, BellRing, CalendarCheck, ChevronRight, Clock, Crown, Flame, Goal, LogOut, MessageSquareText, Moon, Shirt, SlidersHorizontal, Star as StarI, Store, Sun, Trophy, Type, UserRound, Compass, Lock, ClipboardList, FileText, LifeBuoy, ShieldCheck } from 'lucide-react'
import { cn, initials, waLink } from '../../lib/format'
import { CountUp, Item, Stagger, spring } from '../../ui/motion'
import { useStore } from '../../lib/store'
import { BADGES, playerStats } from '../../lib/domain'
import { Link } from '../../lib/router'
import { useBigText, useEasy } from '../../lib/theme'
import { enablePush, pushPermission } from '../../lib/push'
import { Button, Content, Field, Input, PageHeader, useToast } from '../../ui/kit'
import { Cover } from '../../ui/Cover'
import { SUPPORT_WA } from '../../ui/Help'
import './misc.css'

const BADGE_ICON = { goal: Goal, shirt: Shirt, trophy: Trophy, crown: Crown, flame: Flame, moon: Moon, sun: Sun, compass: Compass, star: StarI }
const ROLE_LABEL = { player: 'Jugador', owner: 'Dueño de complejo', admin: 'Administrador' }

/* Escalera de partidos: Debut → Habitual → De la casa → Leyenda (sale de los logros del dominio). */
const LADDER = BADGES.filter(b => /^(first|p\d+)$/.test(b.id)).map(b => ({ id: b.id, title: b.title, n: b.id === 'first' ? 1 : Number(b.id.slice(1)) }))
function levelOf(played) {
  const cur = [...LADDER].reverse().find(l => played >= l.n) || null
  const nxt = LADDER.find(l => played < l.n) || null
  const from = cur?.n ?? 0
  return { cur, nxt, pct: nxt ? Math.max(0.04, (played - from) / (nxt.n - from)) : 1 }
}

/* Tarjeta con encabezado: ícono, título y bajada. */
function Panel({ icon: I, title, sub, tone, aside, children, className }) {
  return (
    <section className={cn('pm-card p-5 lg:p-6', className)} aria-label={title}>
      <header className="flex items-center gap-3 mb-4">
        <span className={cn('pm-ico', tone)}><I size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="display text-xl font-bold leading-tight">{title}</h2>{sub && <p className="text-sm text-muted">{sub}</p>}</div>
        {aside}
      </header>
      {children}
    </section>
  )
}

/* Preferencia con ícono, texto y interruptor. Tocar el texto también la cambia. */
function PrefRow({ icon: I, label, hint, checked, onChange, disabled }) {
  const id = useId()
  return (
    <div className="pm-pref">
      <span className={cn('pm-ico transition-colors', checked && 'is-grad')}><I size={20} aria-hidden="true" /></span>
      <div className={cn('min-w-0 flex-1', !disabled && 'cursor-pointer')} onClick={() => !disabled && onChange(!checked)}>
        <div className="font-medium">{label}</div>
        {hint && <div id={id} className="text-sm text-muted">{hint}</div>}
      </div>
      <button type="button" role="switch" aria-checked={!!checked} aria-label={label} aria-describedby={hint ? id : undefined} disabled={disabled} className="switch" onClick={() => onChange(!checked)} />
    </div>
  )
}

export function Account({ theme, onSignOut }) {
  const { state, user, update } = useStore()
  const [big, setBig] = useBigText()
  const [easy, setEasy] = useEasy()
  const [pushOn, setPushOn] = useState(pushPermission() === 'granted')
  const [pushMsg, setPushMsg] = useState(pushPermission() === 'unsupported' ? 'Este navegador no permite avisos (en iPhone, agregá La Fija a la pantalla de inicio).' : pushPermission() === 'denied' ? 'Los avisos están bloqueados en la configuración del navegador.' : '')
  const toast = useToast()
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' })
  const stats = playerStats(state, user.id)
  const [badge, setBadge] = useState(null)
  const [err, setErr] = useState({})
  const dirty = f.name !== user.name || f.phone !== (user.phone || '')
  const isPlayer = user.role === 'player'
  const lvl = levelOf(stats.played)
  const earned = stats.badges.filter(x => x.earned).length
  const myComplexes = user.role === 'owner' ? state.complexes.filter(c => c.ownerId === user.id) : []
  const save = e => {
    e.preventDefault()
    if (!f.name.trim()) { setErr({ name: 'Escribí tu nombre.' }); return }
    update(s => { const u = s.users.find(x => x.id === user.id); u.name = f.name.trim(); u.phone = f.phone.trim() })
    setErr({}); toast('Datos guardados.')
  }
  const left = lvl.nxt ? lvl.nxt.n - stats.played : 0
  return (
    <div className="pm-wide contents">
      <PageHeader title="Cuenta" />
      <Content className="max-w-[1480px]">
        <Stagger className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
          {/* ---------- Izquierda: quién sos ---------- */}
          <div className="space-y-4 min-w-0">
            <Item className="hero p-5 lg:p-6">
              <div className="flex items-center gap-4">
                <span className="size-[72px] rounded-3xl grid place-items-center bg-white/20 border border-white/30 backdrop-blur display text-3xl font-bold flex-none" aria-hidden="true">{initials(user.name)}</span>
                <div className="min-w-0 flex-1">
                  <span className="pm-glass !min-h-7 !text-xs uppercase tracking-wider">{ROLE_LABEL[user.role] || 'Cuenta'}</span>
                  <p className="display text-3xl font-bold leading-tight truncate mt-1.5">{user.name}</p>
                  <p className="text-sm opacity-90 truncate">{user.email}</p>
                </div>
              </div>
              {isPlayer && <>
                <div className="pm-hero-glass mt-5 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="pm-eyebrow opacity-90">Nivel</p>
                    <p className="display text-xl font-bold">{lvl.cur ? lvl.cur.title : 'Recién llegado'}</p>
                  </div>
                  <div className="pm-bar mt-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lvl.pct * 100)} aria-label="Progreso al próximo nivel">
                    <motion.i initial={{ width: 0 }} animate={{ width: `${lvl.pct * 100}%` }} transition={{ ...spring, delay: .25 }} />
                  </div>
                  <p className="text-sm opacity-95 mt-2">{lvl.nxt ? `${left === 1 ? 'Te falta' : 'Te faltan'} ${left} ${left === 1 ? 'partido' : 'partidos'} para ser «${lvl.nxt.title}»` : '¡Sos leyenda! Conseguiste todos los niveles.'}</p>
                </div>
                <div className="pm-hero-glass mt-3 grid grid-cols-3">
                  {[[CalendarCheck, 'Partidos', stats.played], [Flame, 'Racha (sem.)', stats.thisStreak], [Clock, 'Horas', Math.round(stats.hours)]].map(([I, k, v]) => (
                    <div key={k} className="pm-hero-stat"><I size={18} aria-hidden="true" /><div className="display text-3xl font-bold tnum leading-none mt-1"><CountUp value={v} /></div><div className="text-xs opacity-90">{k}</div></div>))}
                </div>
              </>}
              {myComplexes.length > 0 && <p className="pm-hero-glass mt-4 px-4 py-3 flex items-center gap-2 text-sm font-medium"><Store size={18} aria-hidden="true" /><span className="truncate">{myComplexes.map(c => c.name).join(' · ')}</span></p>}
            </Item>

            {isPlayer && stats.favoriteComplex && (
              <Item>
                <Link to={`/complejo/${stats.favoriteComplex.slug}`} className="pm-card p-3 flex items-center gap-3.5 card-lift min-h-[76px]" aria-label={`Tu cancha de siempre: ${stats.favoriteComplex.name}`}>
                  <Cover src={stats.favoriteComplex.coverUrl} seed={stats.favoriteComplex.id} className="size-[60px] rounded-2xl flex-none" />
                  <span className="min-w-0 flex-1"><span className="block pm-eyebrow text-brand">Tu cancha de siempre</span><span className="block display text-xl font-bold leading-tight truncate">{stats.favoriteComplex.name}</span><span className="block text-sm text-muted">{stats.favoriteCount} {stats.favoriteCount === 1 ? 'partido jugado' : 'partidos jugados'}</span></span>
                  <ChevronRight size={20} className="text-faint flex-none" aria-hidden="true" />
                </Link>
              </Item>)}

            {isPlayer && (
              <Item>
                <Panel icon={Trophy} tone="is-grad" title="Logros" sub={`${earned} de ${stats.badges.length} conseguidos`}>
                  <div className="pm-bar is-soft -mt-1 mb-4" aria-hidden="true"><motion.i initial={{ width: 0 }} animate={{ width: `${(earned / stats.badges.length) * 100}%` }} transition={{ ...spring, delay: .3 }} /></div>
                  <div className="grid grid-cols-3 gap-2.5">{stats.badges.map((x, i) => { const I = BADGE_ICON[x.icon]; return (
                    <motion.div key={x.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: .1 + i * .04 }}>
                      <button type="button" onClick={() => setBadge(badge?.id === x.id ? null : x)} aria-pressed={badge?.id === x.id} className={cn('pm-badge w-full h-full', !x.earned && 'is-locked')} aria-label={`${x.title}: ${x.text}${x.earned ? '' : ' (sin conseguir)'}`}>
                        <span className="pm-badge-ico">{x.earned ? <I size={26} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}</span>
                        <span className={cn('pm-badge-t', !x.earned && 'text-muted')}>{x.title}</span>
                        <span className="hidden sm:block lg:hidden xl:block text-xs text-muted leading-snug">{x.text}</span>
                      </button>
                    </motion.div>) })}</div>
                  {badge && <p className="mt-3 rounded-xl bg-brand-soft text-brand text-sm font-medium px-3 py-2" role="status">{badge.earned ? '🏅 ' : '🔒 '}{badge.title}: {badge.text}</p>}
                </Panel>
              </Item>)}

            {user.role === 'owner' && (
              <Item>
                <Panel icon={Store} title="Atajos" sub="Lo que más usás de tu complejo.">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[[Store, 'Mi complejo', '/dueno/complejo'], [ClipboardList, 'Reservas', '/dueno/reservas'], [MessageSquareText, 'Reseñas', '/dueno/resenas'], [BarChart3, 'Estadísticas', '/dueno/estadisticas']].map(([I, label, to]) => (
                      <Link key={to} to={to} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface min-h-14 px-3.5 font-semibold card-lift"><span className="pm-ico !size-9 !rounded-xl"><I size={18} aria-hidden="true" /></span>{label}</Link>))}
                  </div>
                </Panel>
              </Item>)}
          </div>

          {/* ---------- Derecha: tus datos y ajustes ---------- */}
          <div className="space-y-4 min-w-0">
            <Item>
              <Panel icon={UserRound} title="Datos personales" sub="Así te ve el complejo cuando reservás.">
                <form onSubmit={save} className="space-y-4" noValidate>
                  <div className="grid gap-4 xl:grid-cols-2 items-start">
                    <Field label="Nombre y apellido" error={err.name}><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
                    <Field label="Celular" hint="El complejo lo usa para contactarte por tu reserva."><Input type="tel" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></Field>
                  </div>
                  <Field label="Email"><Input value={user.email} disabled /></Field>
                  <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" disabled={!dirty}>Guardar cambios</Button>
                    {dirty && <Button type="button" variant="ghost" onClick={() => { setF({ name: user.name, phone: user.phone || '' }); setErr({}) }}>Descartar</Button>}
                  </div>
                </form>
              </Panel>
            </Item>

            <Item>
              <Panel icon={SlidersHorizontal} title="Preferencias" sub="Hacé la app a tu medida.">
                <div className="-my-3">
                  <PrefRow icon={BellRing} label="Avisos en este celular" hint={pushMsg || 'Te avisamos de reservas, pagos y horarios que se liberan.'} checked={pushOn} disabled={pushPermission() === 'unsupported' || pushPermission() === 'denied'}
                    onChange={async v => { if (!v) { setPushMsg('Para apagarlos, desactivá los avisos de La Fija en la configuración del navegador.'); return } try { const r = await enablePush(user.id); setPushOn(true); setPushMsg(r === 'server' ? 'Listo: te llegan aunque la app esté cerrada.' : 'Listo: te avisamos mientras la app esté abierta.') } catch (e) { setPushMsg(e.message) } }} />
                  <PrefRow icon={Accessibility} label="Modo fácil" hint="Letra grande y una pantalla de inicio con solo tres botones." checked={easy} onChange={setEasy} />
                  <PrefRow icon={Type} label="Letra más grande" hint="Agranda los textos y los botones de toda la app." checked={big} onChange={setBig} />
                  <PrefRow icon={theme.dark ? Moon : Sun} label="Modo oscuro" hint="Descansa la vista de noche." checked={theme.dark} onChange={theme.toggle} />
                </div>
              </Panel>
            </Item>

            <Item>
              <Panel icon={LifeBuoy} title="Ayuda y legales" sub="Estamos para darte una mano.">
                <div className="-mt-1 space-y-1">
                  <a href={waLink(SUPPORT_WA, `Hola, necesito ayuda con La Fija. Soy ${user.name}.`)} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-h-12 -mx-2 px-2 rounded-xl font-medium hover:bg-sunken transition-colors"><LifeBuoy size={18} className="text-brand" aria-hidden="true" /><span className="flex-1">Escribir a soporte</span><ChevronRight size={18} className="text-faint" aria-hidden="true" /></a>
                  <Link to="/terminos" className="flex items-center gap-3 min-h-12 -mx-2 px-2 rounded-xl font-medium hover:bg-sunken transition-colors"><FileText size={18} className="text-brand" aria-hidden="true" /><span className="flex-1">Términos y condiciones</span><ChevronRight size={18} className="text-faint" aria-hidden="true" /></Link>
                  <Link to="/privacidad" className="flex items-center gap-3 min-h-12 -mx-2 px-2 rounded-xl font-medium hover:bg-sunken transition-colors"><ShieldCheck size={18} className="text-brand" aria-hidden="true" /><span className="flex-1">Política de privacidad</span><ChevronRight size={18} className="text-faint" aria-hidden="true" /></Link>
                </div>
              </Panel>
            </Item>

            <Item>
              <section className="pm-card p-5 lg:p-6 flex flex-wrap items-center gap-4" aria-label="Sesión">
                <span className="pm-ico is-danger"><LogOut size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1 basis-40"><h2 className="display text-xl font-bold leading-tight">Sesión</h2><p className="text-sm text-muted">Salí de tu cuenta en este dispositivo.</p></div>
                <Button variant="secondary" onClick={onSignOut}><LogOut size={18} aria-hidden="true" />Cerrar sesión</Button>
              </section>
            </Item>
          </div>
        </Stagger>
      </Content>
    </div>
  )
}
