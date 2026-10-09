import { useState } from 'react'
import { ArrowLeft, ChevronRight, Clock3, Coins, ShieldCheck, Shuffle, Store, User } from 'lucide-react'
import { motion } from 'motion/react'
import { Item, Stagger } from '../ui/motion'
import { DEMO_ACCOUNTS, DEMO_CODE, DEMO_PASSWORD, remote, useStore } from '../lib/store'
import { homeFor } from '../lib/roles'
import { navigate, useRoute } from '../lib/router'
import { Button, Field, Input, Logo, useToast } from '../ui/kit'
import { TermsCheck } from './Legal'

const ROLE_ICON = { player: User, owner: Store, admin: ShieldCheck }

/* Ingreso: por defecto con el celular y un código (sin contraseña). El email queda como alternativa. */
export default function Login() {
  const { auth } = useStore()
  const { query } = useRoute()
  const toast = useToast()
  const [mode, setMode] = useState('phone') // phone | code | name | email | signup
  const [f, setF] = useState({ phone: '', code: '', name: '', email: '', password: '' })
  const [terms, setTerms] = useState(false)
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState('')
  const set = k => e => { setF(v => ({ ...v, [k]: e.target.value })); setErr({}) }
  const done = r => { const u = r?.user || r; if (u?.role) navigate(query.volver || homeFor(u.role), { replace: true }) }
  const run = async (key, fn) => { setBusy(key); try { await fn() } catch (e) { setErr({ form: e.message }) } finally { setBusy('') } }

  const sendCode = e => { e?.preventDefault(); run('form', async () => { await auth.sendCode(f.phone); setMode('code'); setF(v => ({ ...v, code: '' })) }) }
  const verify = e => { e.preventDefault(); run('form', async () => { const r = await auth.verifyCode(f.phone, f.code, mode === 'name' ? f.name : '', terms); if (r?.needsName) setMode('name'); else done(r) }) }
  const emailIn = e => { e.preventDefault(); run('form', async () => done(await auth.signIn(f.email, f.password))) }
  const signUp = e => { e.preventDefault(); run('form', async () => done(await auth.signUp({ name: f.name, phone: f.phone, email: f.email, password: f.password, role: mode === 'owner' ? 'owner' : 'player', acceptedTerms: terms }))) }
  const quick = acc => run(acc.role, async () => done(await auth.signIn(acc.email, DEMO_PASSWORD))).catch(e => toast(e.message, 'error'))

  const titles = { phone: ['Ingresar', 'Con tu número de celular. Te mandamos un código, sin contraseñas.'], code: ['Escribí el código', `Lo mandamos por SMS al ${f.phone}.`], name: ['¿Cómo te llamás?', 'Es tu primera vez. Con tu nombre ya podés reservar.'], email: ['Ingresar con email', 'Con tu email y contraseña.'], signup: ['Crear cuenta', 'Con email y contraseña.'], owner: ['Registrá tu complejo', 'Creá tu cuenta de dueño. Después cargás el complejo y lo revisamos antes de publicarlo.'] }
  const [title, sub] = titles[mode]

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(460px,.9fr)]">
      {/* Portada: foto del estadio con la propuesta de La Fija */}
      <aside className="relative overflow-hidden text-white lg:min-h-dvh rounded-b-[32px] lg:rounded-none">
        <img src={`${import.meta.env.BASE_URL}demo/cancha-3.svg`} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-[#062a14]/90" />
        <div className="relative px-6 pt-[max(28px,var(--safe-top))] pb-8 lg:p-14 h-full flex flex-col">
          <Logo className="!text-white [&>span]:!text-white" />
          <div className="mt-10 lg:mt-auto">
            <Stagger delay={.1}>
              <Item><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/15 backdrop-blur rounded-full px-3 py-1.5"><span className="live-dot" />Reservá en 3 toques</p></Item>
              <Item><h2 className="display text-4xl lg:text-6xl font-bold leading-[1.02] mt-4 max-w-[14ch]">Tu cancha, a tu hora.</h2></Item>
              <Item><p className="mt-3 text-white/85 max-w-md hidden sm:block">Mirá qué horarios están libres cerca tuyo, reservá, pagá la seña y armá los equipos. Sin llamadas ni mensajes.</p></Item>
              <Item className="hidden lg:flex gap-3 mt-8">
                {[[Clock3, 'Horarios en vivo'], [Coins, 'Seña online'], [Shuffle, 'Equipos por WhatsApp']].map(([I, l]) => <div key={l} className="rounded-2xl bg-white/12 backdrop-blur-md border border-white/20 px-4 py-3 flex items-center gap-2.5"><I size={18} aria-hidden="true" /><span className="text-sm font-semibold">{l}</span></div>)}
              </Item>
            </Stagger>
          </div>
        </div>
      </aside>

      <div className="flex flex-col items-center px-4 pt-8 pb-10 lg:justify-center lg:px-12">
        <div className="w-full max-w-[420px]">
        {mode !== 'phone' && <button type="button" className="btn btn-ghost btn-sm -ml-3 mt-6" onClick={() => { setMode(mode === 'name' ? 'code' : 'phone'); setErr({}) }}><ArrowLeft size={18} />Volver</button>}
        <h1 className="display text-3xl font-bold tracking-tight mt-2">{title}</h1>
        <p className="text-muted mt-1">{sub}</p>
        <motion.div key={mode} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .25, ease: [.2, .8, .2, 1] }}>

        {mode === 'phone' && (
          <form onSubmit={sendCode} noValidate className="mt-6 space-y-4">
            <Field label="Tu celular" hint="Con código de área, sin el 0 ni el 15. Ej: 11 6123 4567"><Input type="tel" inputMode="tel" autoComplete="tel-national" value={f.phone} onChange={set('phone')} placeholder="11 6123 4567" /></Field>
            {err.form && <p className="err" role="alert">{err.form}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>Enviarme el código</Button>
          </form>
        )}
        {(mode === 'code' || mode === 'name') && (
          <form onSubmit={verify} noValidate className="mt-6 space-y-4">
            {mode === 'code' && <Field label="Código de 6 números"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={f.code} onChange={e => { setF(v => ({ ...v, code: e.target.value.replace(/\D/g, '') })); setErr({}) }} className="!min-h-16 text-center !text-3xl font-bold tracking-[.55em] tnum !rounded-2xl" placeholder="••••••" data-autofocus /></Field>}
            {mode === 'name' && <Field label="Nombre y apellido"><Input autoComplete="name" value={f.name} onChange={set('name')} /></Field>}
            {mode === 'name' && <TermsCheck checked={terms} onChange={setTerms} />}
            {!remote && mode === 'code' && <p className="text-sm bg-brand-soft text-brand rounded-lg px-3 py-2">Modo de prueba: no se manda SMS. El código es <strong className="tnum">{DEMO_CODE}</strong>.</p>}
            {err.form && <p className="err" role="alert">{err.form}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>{mode === 'name' ? 'Empezar' : 'Ingresar'}</Button>
            {mode === 'code' && <Button variant="ghost" className="w-full" onClick={sendCode} disabled={!!busy}>No me llegó, mandarlo de nuevo</Button>}
          </form>
        )}
        {mode === 'email' && (
          <form onSubmit={emailIn} noValidate className="mt-6 space-y-4">
            <Field label="Email"><Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={set('email')} /></Field>
            <Field label="Contraseña"><Input type="password" autoComplete="current-password" value={f.password} onChange={set('password')} /></Field>
            {err.form && <p className="err" role="alert">{err.form}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>Ingresar</Button>
            <Button variant="ghost" className="w-full" onClick={() => { setMode('signup'); setErr({}) }}>Crear cuenta con email</Button>
          </form>
        )}
        {(mode === 'signup' || mode === 'owner') && (
          <form onSubmit={signUp} noValidate className="mt-6 space-y-4">
            <Field label="Nombre y apellido"><Input autoComplete="name" value={f.name} onChange={set('name')} /></Field>
            <Field label="Celular"><Input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Email"><Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={set('email')} /></Field>
            <Field label="Contraseña" hint="Mínimo 6 caracteres."><Input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>
            <TermsCheck checked={terms} onChange={setTerms} />
            {err.form && <p className="err" role="alert">{err.form}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>{mode === 'owner' ? 'Crear cuenta de dueño' : 'Crear cuenta'}</Button>
          </form>
        )}

        </motion.div>
        {mode === 'phone' && <p className="text-center mt-5"><button type="button" className="font-semibold text-brand underline underline-offset-4 min-h-11 px-1" onClick={() => { setMode('email'); setErr({}) }}>Ingresar con email y contraseña</button></p>}
        {mode === 'phone' && <p className="text-center text-muted mt-1">¿Tenés un complejo? <button type="button" className="font-semibold text-brand underline underline-offset-4 min-h-11 px-1" onClick={() => { setMode('owner'); setErr({}) }}>Registralo</button></p>}

        {!remote && mode === 'phone' && (
          <section className="mt-8" aria-labelledby="demo-title">
            <h2 id="demo-title" className="text-sm font-medium text-muted mb-2">Probá la app sin registrarte</h2>
            <Stagger className="grid gap-2.5" delay={.2}>
              {DEMO_ACCOUNTS.map(a => { const I = ROLE_ICON[a.role] || User; return (
                <Item key={a.role} as="button" type="button" whileTap={{ scale: .97 }} whileHover={{ y: -2 }} onClick={() => quick(a)} disabled={!!busy}
                  className="flex items-center gap-3 text-left p-3.5 rounded-2xl bg-surface border border-line shadow-[var(--sh-1)] hover:shadow-[var(--sh-2)] hover:border-brand transition-[box-shadow,border-color]">
                  <span className="size-11 rounded-xl grid place-items-center flex-none bg-brand-soft text-brand"><I size={22} aria-hidden="true" /></span>
                  <span className="flex-1 min-w-0"><span className="block font-semibold">Entrar como {a.title.toLowerCase()}</span><span className="block text-sm text-muted">{a.note}</span></span>
                  {busy === a.role ? <span className="text-sm text-muted">Entrando…</span> : <ChevronRight size={20} className="text-faint" />}
                </Item>) })}
            </Stagger>
            <p className="hint">Los datos de prueba se guardan solo en este dispositivo.</p>
          </section>
        )}
        </div>
      </div>
    </div>
  )
}
