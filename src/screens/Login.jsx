import { useState } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { DEMO_ACCOUNTS, DEMO_CODE, DEMO_PASSWORD, remote, useStore } from '../lib/store'
import { homeFor } from '../lib/roles'
import { navigate, useRoute } from '../lib/router'
import { Button, Field, Input, Logo, useToast } from '../ui/kit'
import { TermsCheck } from './Legal'

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
    <div className="min-h-dvh flex flex-col items-center px-4 pt-[max(40px,var(--safe-top))] pb-10">
      <div className="w-full max-w-[400px]">
        <Logo />
        {mode !== 'phone' && <button type="button" className="btn btn-ghost btn-sm -ml-3 mt-6" onClick={() => { setMode(mode === 'name' ? 'code' : 'phone'); setErr({}) }}><ArrowLeft size={18} />Volver</button>}
        <h1 className={`text-2xl font-semibold tracking-tight ${mode === 'phone' ? 'mt-10' : 'mt-2'}`}>{title}</h1>
        <p className="text-muted mt-1">{sub}</p>

        {mode === 'phone' && (
          <form onSubmit={sendCode} noValidate className="mt-6 space-y-4">
            <Field label="Tu celular" hint="Con código de área, sin el 0 ni el 15. Ej: 11 6123 4567"><Input type="tel" inputMode="tel" autoComplete="tel-national" value={f.phone} onChange={set('phone')} placeholder="11 6123 4567" /></Field>
            {err.form && <p className="err" role="alert">{err.form}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>Enviarme el código</Button>
          </form>
        )}
        {(mode === 'code' || mode === 'name') && (
          <form onSubmit={verify} noValidate className="mt-6 space-y-4">
            {mode === 'code' && <Field label="Código de 6 números"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={f.code} onChange={e => { setF(v => ({ ...v, code: e.target.value.replace(/\D/g, '') })); setErr({}) }} className="text-center text-2xl tracking-[.5em] tnum" placeholder="••••••" data-autofocus /></Field>}
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

        {mode === 'phone' && <p className="text-center mt-5"><button type="button" className="font-semibold text-brand underline underline-offset-4 min-h-11 px-1" onClick={() => { setMode('email'); setErr({}) }}>Ingresar con email y contraseña</button></p>}
        {mode === 'phone' && <p className="text-center text-muted mt-1">¿Tenés un complejo? <button type="button" className="font-semibold text-brand underline underline-offset-4 min-h-11 px-1" onClick={() => { setMode('owner'); setErr({}) }}>Registralo</button></p>}

        {!remote && mode === 'phone' && (
          <section className="mt-8" aria-labelledby="demo-title">
            <h2 id="demo-title" className="text-sm font-medium text-muted mb-2">Cuentas de prueba</h2>
            <div className="list">
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.role} type="button" className="row" onClick={() => quick(a)} disabled={!!busy}>
                  <span className="flex-1 min-w-0"><span className="block font-semibold">Entrar como {a.title.toLowerCase()}</span><span className="block text-sm text-muted">{a.note}</span></span>
                  {busy === a.role ? <span className="text-sm text-muted">Entrando…</span> : <ChevronRight size={20} className="text-faint" />}
                </button>
              ))}
            </div>
            <p className="hint">Los datos de prueba se guardan solo en este dispositivo.</p>
          </section>
        )}
      </div>
    </div>
  )
}
