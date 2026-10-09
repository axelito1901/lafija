import { useSyncExternalStore } from 'react'
import { DEFAULT_CENTER } from './geo'

/* Punto desde el que se miden las distancias: el lugar que eligió el usuario, su ubicación, o Lanús centro. */
const KEY = 'lafija-origin'
let current = (() => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } })()
const subs = new Set()
export const setOrigin = pos => { current = pos ? { label: 'Tu ubicación', ...pos } : null; try { current ? localStorage.setItem(KEY, JSON.stringify(current)) : localStorage.removeItem(KEY) } catch { /* ignore */ } subs.forEach(f => f()) }
export function useOrigin() {
  const pos = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => current)
  return { origin: pos || DEFAULT_CENTER, real: !!pos, label: pos?.label || 'Lanús', setOrigin }
}
