import { useEffect, useState } from 'react'

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
  useEffect(() => { localStorage.setItem(BIG, on ? '1' : '0'); applyBig(on) }, [on])
  return [on, setOn]
}
