import { supabase } from './supabase'

/* Avisos del sistema.
   - Sin servidor (demo o Supabase sin claves): se muestran mientras la app está abierta en segundo plano.
   - Con VITE_VAPID_PUBLIC_KEY + la función send-push de Supabase: llegan aunque la app esté cerrada (ver PUSH.md). */
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
export const pushSupported = () => typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'Notification' in window
export const pushPermission = () => (pushSupported() ? Notification.permission : 'unsupported')
export const serverPush = () => !!VAPID && !!supabase

export function registerSW() {
  if (!pushSupported() || import.meta.env.DEV) return
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('No se pudo registrar el service worker', e))
}

const keyBytes = b64 => { const p = '='.repeat((4 - (b64.length % 4)) % 4); const raw = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))) }

export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('Este navegador no permite avisos. En iPhone, primero agregá La Fija a la pantalla de inicio.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('No diste permiso para los avisos. Podés activarlos desde la configuración del navegador.')
  if (!serverPush() || !userId) return 'local'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) })
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({ user_id: userId, endpoint: json.endpoint, subscription: json }, { onConflict: 'endpoint' })
  if (error) throw error
  return 'server'
}

/* Aviso local: solo si la app no está a la vista (si está a la vista ya se ve el aviso en pantalla). */
export async function showLocal(n) {
  if (pushPermission() !== 'granted' || document.visibilityState === 'visible') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) reg.showNotification(n.title, { body: n.text, icon: '/favicon.svg', tag: n.id, data: { link: n.link || '/' } })
    else new Notification(n.title, { body: n.text, icon: '/favicon.svg' })
  } catch { /* sin avisos */ }
}
