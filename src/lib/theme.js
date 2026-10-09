import { useEffect, useState, useSyncExternalStore } from 'react'

const KEY = 'lafija-theme'
const COLORS = { light: '#fafaf8', dark: '#0e110f' }

const resolve = pref => pref === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref

export function applyTheme(pref) {
  const t = resolve(pref)
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[t])
}

export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY) || 'system')
  useEffect(() => {
    localStorage.setItem(KEY, pref); applyTheme(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [pref])
  const dark = resolve(pref) === 'dark'
  return { pref, setPref, dark, toggle: () => setPref(dark ? 'light' : 'dark') }
}

/* Letra grande */
const BIG = 'lafija-big'
export const applyBig = on => document.documentElement.classList.toggle('big', !!on)
export function useBigText() {
  const [on, setOn] = useState(() => localStorage.getItem(BIG) === '1')
  useEffect(() => { localStorage.setItem(BIG, on ? '1' : '0'); applyBig(on || isEasy()) }, [on])
  return [on, setOn]
}

/* Modo fácil: letra grande + pantalla de inicio con tres botones grandes. Pensado para quien no usa mucho el celular. */
const EASY = 'lafija-easy'
const subs = new Set()
export const isEasy = () => { try { return localStorage.getItem(EASY) === '1' } catch { return false } }
const syncBig = () => applyBig(isEasy() || (() => { try { return localStorage.getItem(BIG) === '1' } catch { return false } })())
export const applyEasy = () => { document.documentElement.classList.toggle('easy', isEasy()); syncBig() }
export function setEasy(on) { try { localStorage.setItem(EASY, on ? '1' : '0') } catch { /* sin almacenamiento */ } applyEasy(); subs.forEach(f => f()) }
export const useEasy = () => [useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, isEasy), setEasy]
