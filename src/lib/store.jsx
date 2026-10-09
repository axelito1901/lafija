import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_KEY, SESSION_KEY, readDemo, resetDemo, writeDemo } from './demoStore'
import { isSupabaseConfigured, supabase } from './supabase'
import { loadPublicState, loadRemoteState, signIn as remoteSignIn, signOut as remoteSignOut, signUp as remoteSignUp, syncRemoteDiff } from './remoteStore'
import { uid } from './format'

/*
  Capa de datos y sesión.
  - Sin variables de Supabase: modo demo (localStorage). Cuentas de prueba, sesión persistente.
  - Con Supabase: auth real + remoteStore. La UI no cambia: solo usa { state, update, user, auth }.
*/
const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)
export const remote = isSupabaseConfigured

export const DEMO_ACCOUNTS = [
  { role: 'player', email: 'jugador@lafija.demo', title: 'Jugador', note: 'Buscar y reservar canchas' },
  { role: 'owner', email: 'dueno@lafija.demo', title: 'Dueño', note: 'Agenda, canchas y cobros' },
  { role: 'admin', email: 'admin@lafija.demo', title: 'Administrador', note: 'Complejos, usuarios y reseñas' },
]
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_CODE = '123456'
const last10 = p => String(p || '').replace(/\D/g, '').slice(-10)
const toE164 = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? `+549${d}` : d.startsWith('54') ? `+${d}` : `+${d}` }

/* Traduce errores técnicos a mensajes para personas. El detalle queda en la consola. */
export function friendlyError(e) {
  console.error(e)
  const code = e?.code || '', msg = String(e?.message || '')
  if (code === '23505' || /bookings_one_per_slot|duplicate key/.test(msg)) return 'Ese horario lo acaba de reservar otra persona. Elegí otro.'
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'No tenés permiso para hacer esto.'
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'No hay conexión. Revisá internet e intentá de nuevo.'
  if (code === 'P0001' && msg) return msg // mensajes propios de la base (ya están escritos para usuarios)
  return 'No pudimos guardar los cambios. Intentá nuevamente.'
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => (remote ? null : readDemo()))
  const [session, setSession] = useState(() => (remote ? null : localStorage.getItem(SESSION_KEY)))
  const [loading, setLoading] = useState(remote)
  const [authUser, setAuthUser] = useState(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const ref = useRef(state)
  ref.current = state

  /* Supabase: sesión → estado remoto */
  useEffect(() => {
    if (!remote) return
    let alive = true
    const boot = async s => {
      if (!alive) return
      if (!s?.user) {
        setAuthUser(null)
        try { const st = await loadPublicState(); if (alive) setState(st) } catch (e) { console.error(e); if (alive) setState(null) }
        if (alive) setLoading(false); return
      }
      setAuthUser(s.user); setLoading(true)
      try { const st = await loadRemoteState(s.user); if (alive) { setState(st); setError('') } }
      catch (e) { if (alive) setError(friendlyError(e) === 'No pudimos guardar los cambios. Intentá nuevamente.' ? 'No pudimos cargar tus datos. Intentá nuevamente.' : friendlyError(e)) }
      finally { if (alive) setLoading(false) }
    }
    supabase.auth.getSession().then(({ data }) => boot(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => boot(s))
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  /* Demo: otras pestañas + reloj para vencimientos */
  useEffect(() => {
    if (remote) return
    const onStorage = e => {
      if (e.key === DEMO_KEY) setState(readDemo())
      if (e.key === SESSION_KEY) setSession(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t) }, [])

  // Con Supabase: cuando la base crea un aviso para este usuario, se recarga el estado (llega en vivo).
  useEffect(() => {
    if (!remote || !authUser) return
    const ch = supabase.channel(`avisos-${authUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${authUser.id}` }, () => { loadRemoteState(authUser).then(setState).catch(console.error) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authUser])

  const reload = useCallback(async () => {
    if (!remote || !authUser) return
    try { setState(await loadRemoteState(authUser)) } catch (e) { console.error(e) }
  }, [authUser])

  /* update(mutator): aplica el cambio de forma síncrona. Si el mutador lanza un Error, no se guarda nada. */
  const update = useCallback(mutator => {
    const prev = ref.current
    const next = structuredClone(prev)
    const out = mutator(next)
    ref.current = next
    setState(next)
    if (remote) syncRemoteDiff(prev, next).then(reload).catch(e => { setError(friendlyError(e)); reload() })
    else writeDemo(next)
    return out
  }, [reload])

  const user = useMemo(() => {
    if (!state) return null
    if (remote) return state.currentUser || null // sin sesión: currentUser es null
    return state.users.find(u => u.id === session && u.active) || null
  }, [state, session])

  const auth = useMemo(() => ({
    async signIn(email, password) {
      const mail = String(email || '').trim().toLowerCase()
      if (!mail || !password) throw new Error('Completá el email y la contraseña.')
      if (remote) { await remoteSignIn(mail, password); return }
      const u = ref.current.users.find(x => x.email.toLowerCase() === mail)
      if (!u || (u.pwd || DEMO_PASSWORD) !== password) throw new Error('El email o la contraseña no coinciden.')
      if (!u.active) throw new Error('Esta cuenta está desactivada.')
      await new Promise(r => setTimeout(r, 350))
      localStorage.setItem(SESSION_KEY, u.id); setSession(u.id)
      return u
    },
    async signUp({ name, phone, email, password, role = 'player', acceptedTerms }) {
      if (!name?.trim() || !email?.trim() || !password) throw new Error('Completá nombre, email y contraseña.')
      if (password.length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres.')
      if (!acceptedTerms) throw new Error('Para crear la cuenta tenés que aceptar los términos y la política de privacidad.')
      const acceptedTermsAt = new Date().toISOString()
      if (remote) {
        const r = await remoteSignUp({ name, phone, email, password, role, acceptedTermsAt })
        if (!r.session) throw new Error('Te mandamos un email para confirmar la cuenta. Abrilo y después ingresá.')
        return
      }
      if (ref.current.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Ya existe una cuenta con ese email.')
      const u = { id: uid('u'), role: role === 'owner' ? 'owner' : 'player', name: name.trim(), phone: phone?.trim() || '', email: email.trim().toLowerCase(), pwd: password, active: true, acceptedTermsAt, createdAt: acceptedTermsAt }
      update(s => { s.users.push(u) })
      localStorage.setItem(SESSION_KEY, u.id); setSession(u.id)
      return u
    },
    /* Ingreso con celular: se manda un código por SMS (Supabase) o se usa el código de prueba (demo). */
    async sendCode(phone) {
      if (last10(phone).length < 10) throw new Error('Escribí tu número con código de área, sin el 0 ni el 15. Ej: 11 6123 4567.')
      if (remote) { const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) }); if (error) throw error; return }
      await new Promise(r => setTimeout(r, 500))
    },
    async verifyCode(phone, code, name, acceptedTerms) {
      if (!/^\d{6}$/.test(code)) throw new Error('El código tiene 6 números.')
      if (remote) {
        const { data, error } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' })
        if (error) throw new Error('El código no es correcto o venció.')
        if (name?.trim() && data.user) await supabase.from('profiles').update({ name: name.trim(), accepted_terms_at: acceptedTerms ? new Date().toISOString() : null }).eq('id', data.user.id)
        return { ok: true }
      }
      if (code !== DEMO_CODE) throw new Error('El código no es correcto. Revisalo e intentá de nuevo.')
      let u = ref.current.users.find(x => last10(x.phone) === last10(phone))
      if (u && !u.active) throw new Error('Esta cuenta está desactivada.')
      if (!u) {
        if (!name?.trim()) return { needsName: true }
        if (!acceptedTerms) throw new Error('Para crear la cuenta tenés que aceptar los términos y la política de privacidad.')
        u = { id: uid('u'), role: 'player', name: name.trim(), phone: toE164(phone), email: '', active: true, acceptedTermsAt: new Date().toISOString(), createdAt: new Date().toISOString() }
        update(s => { s.users.push(u) })
      }
      localStorage.setItem(SESSION_KEY, u.id); setSession(u.id)
      return { user: u }
    },
    async signOut() {
      if (remote) { await remoteSignOut(); return }
      localStorage.removeItem(SESSION_KEY); setSession(null)
    },
    reset() { if (!remote) { setState(resetDemo()); localStorage.removeItem(SESSION_KEY); setSession(null) } },
  }), [update])

  const value = { state, update, user, auth, loading, error, clearError: () => setError(''), tick, remote }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
