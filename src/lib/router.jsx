import { useEffect, useState, useCallback } from 'react'

const read = () => {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = raw.split('?')
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) }
}

export function useRoute() {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function navigate(to, { replace = false } = {}) {
  const target = `#${to}`
  if (replace) window.history.replaceState(null, '', target)
  else window.location.hash = to
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  window.scrollTo(0, 0)
}

export function Link({ to, className, children, ...rest }) {
  return <a href={`#${to}`} className={className} {...rest}>{children}</a>
}

export const useNavigate = () => useCallback(navigate, [])

/** Coincidencia simple: match('/complejo/:id', '/complejo/abc') → { id:'abc' } */
export function match(pattern, path) {
  const a = pattern.split('/').filter(Boolean), b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}
