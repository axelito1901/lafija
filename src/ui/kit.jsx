import { Children, cloneElement, createContext, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowLeft, Check, LoaderCircle, Star, X } from 'lucide-react'
import { cn, centsToPesos, initials, pesosToCents } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { CountUp } from './motion'

/* ---------- Marca ---------- */
export function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="M12 4.5v15" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
export function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-[family-name:var(--font-display)] font-bold italic uppercase text-[22px] leading-none tracking-wide', className)}>
      <span className="text-brand not-italic"><LogoMark size={26} /></span>La Fija
    </span>
  )
}

/* Marca en un cuadradito con degradado (sidebar, pantalla de carga). */
export function LogoTile({ size = 38, className }) {
  return <span className={cn('ui-logo-tile', className)} style={{ width: size, height: size }} aria-hidden="true"><LogoMark size={Math.round(size * 0.58)} /></span>
}

/* ---------- Botones ---------- */
export const Button = forwardRef(function Button({ variant = 'primary', size, loading, disabled, className, children, type = 'button', as: As, ...rest }, ref) {
  const Comp = As || 'button'
  return (
    <Comp ref={ref} type={As ? undefined : type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cn('btn', `btn-${variant}`, size && `btn-${size}`, className)} {...rest}>
      {loading && <LoaderCircle size={18} className="spin" aria-hidden="true" />}
      {children}
    </Comp>
  )
})
export const IconButton = forwardRef(function IconButton({ label, className, children, ...rest }, ref) {
  return <button ref={ref} type="button" aria-label={label} title={label} className={cn('icon-btn', className)} {...rest}>{children}</button>
})

/* ---------- Formularios ---------- */
export function Field({ label, hint, error, children, className }) {
  const id = useId()
  const child = Children.only(children)
  const el = isValidElement(child) ? cloneElement(child, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error || hint ? `${id}-d` : undefined }) : child
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {el}
      {error ? <p id={`${id}-d`} className="err" role="alert">{error}</p> : hint ? <p id={`${id}-d`} className="hint">{hint}</p> : null}
    </div>
  )
}
export const Input = forwardRef(function Input({ className, ...p }, ref) { return <input ref={ref} className={cn('input', className)} {...p} /> })
export const Select = forwardRef(function Select({ className, children, ...p }, ref) { return <select ref={ref} className={cn('input', className)} {...p}>{children}</select> })
export const Textarea = forwardRef(function Textarea({ className, ...p }, ref) { return <textarea ref={ref} className={cn('input', className)} {...p} /> })

/** Importe en pesos; el valor que entra y sale está en centavos. */
export function MoneyInput({ value, onChange, ...p }) {
  const [text, setText] = useState(value ? centsToPesos(value) : '')
  useEffect(() => { if (pesosToCents(text) !== (value || 0)) setText(value ? centsToPesos(value) : '') }, [value]) // eslint-disable-line
  return (
    <div className="affix">
      <span aria-hidden="true">$</span>
      <Input inputMode="numeric" autoComplete="off" value={text} {...p}
        onChange={e => { const t = e.target.value.replace(/[^\d]/g, ''); setText(t); onChange(pesosToCents(t)) }} />
    </div>
  )
}

export function Switch({ checked, onChange, label, hint, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-12">
      <div className="min-w-0"><div className="font-medium">{label}</div>{hint && <div className="text-sm text-muted">{hint}</div>}</div>
      <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)} />
    </div>
  )
}

export function Segmented({ value, onChange, options, label, className, scrollTop }) {
  return (
    <div className={cn('seg', className)} role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} disabled={o.disabled} onClick={() => { onChange(o.value); if (scrollTop) window.scrollTo({ top: 0, behavior: 'instant' }) }}>{o.label}</button>
      ))}
    </div>
  )
}
export const Chip = ({ active, className, children, ...p }) => <button type="button" aria-pressed={!!active} className={cn('chip', className)} {...p}>{children}</button>

/* ---------- Estados visuales ---------- */
export const Status = ({ tone = 'muted', icon: I, children }) => <span className={cn('status', tone, I && 'no-dot')}>{I && <I size={15} strokeWidth={2.25} aria-hidden="true" />}{children}</span>
export const Skeleton = ({ className }) => <div className={cn('skel', className)} aria-hidden="true" />

export function Empty({ title, text, action, className, icon: Icon }) {
  return (
    <div className={cn('text-center py-12 px-6', className)}>
      {Icon && <span className="ui-empty-ico float-y"><span><Icon size={28} strokeWidth={1.75} aria-hidden="true" /></span></span>}
      <p className="display font-bold text-xl tracking-tight">{title}</p>
      {text && <p className="text-muted text-sm mt-1.5 max-w-xs mx-auto">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
export function ErrorState({ title = 'Algo salió mal', text = 'Probá de nuevo en unos segundos.', onRetry }) {
  return (
    <div className="text-center py-12 px-6" role="alert">
      <span className="ui-empty-ico is-danger"><span><AlertCircle size={28} strokeWidth={1.75} aria-hidden="true" /></span></span>
      <p className="display font-bold text-xl tracking-tight">{title}</p>
      <p className="text-muted text-sm mt-1.5 max-w-xs mx-auto">{text}</p>
      {onRetry && <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={onRetry}>Reintentar</Button></div>}
    </div>
  )
}
export function ListSkeleton({ rows = 4 }) {
  return <div className="list" aria-busy="true" aria-label="Cargando">{Array.from({ length: rows }, (_, i) => (
    <div key={i} className="row"><Skeleton className="size-10 !rounded-full flex-none" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="h-4 w-16" /></div>
  ))}</div>
}

export function Rating({ value, count, className }) {
  if (!count) return <span className={cn('text-sm text-muted', className)}>Sin reseñas</span>
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium tnum', className)}>
      <Star size={14} className="fill-current text-warn" aria-hidden="true" />{value.toFixed(1).replace('.', ',')}
      <span className="text-muted font-normal">({count})</span>
    </span>
  )
}
export const Stars = ({ n }) => (
  <span className="inline-flex gap-0.5" role="img" aria-label={`${n} de 5`}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className={i <= n ? 'fill-current text-warn' : 'text-strong'} />)}</span>
)
export const Avatar = ({ name, size = 40, tone }) => (
  <span className={cn('inline-grid place-items-center rounded-full bg-brand-soft text-brand font-semibold flex-none text-sm shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_16%,transparent)]', tone === 'grad' && 'ui-avatar-grad')}
    style={{ width: size, height: size, fontSize: size >= 56 ? Math.round(size * 0.36) : undefined }} aria-hidden="true">{initials(name)}</span>
)

/* ---------- Estructura de pantalla ---------- */
export const HeaderExtra = createContext(null)
/* Rótulo chico sobre el título en PC (por ejemplo "Panel del dueño"). Lo da App según el rol. */
export const HeaderMeta = createContext('')
export function PageHeader({ title, sub, back, actions, logo, eyebrow }) {
  const extra = useContext(HeaderExtra)
  const meta = useContext(HeaderMeta)
  const kicker = eyebrow ?? meta
  return (
    <header className="app-bar">
      <div className={cn('ui-bar-in', logo && 'is-logo')}>
        {back === 'history'
          ? <button type="button" className="ui-bar-back" aria-label="Volver" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}><ArrowLeft size={22} /></button>
          : back && <Link to={back} className="ui-bar-back" aria-label="Volver"><ArrowLeft size={22} /></Link>}
        <div className="flex-1 min-w-0">
          {logo ? <Logo className="lg:hidden" /> : <>
            {kicker && <p className="ui-eyebrow has-bar is-brand is-lg mb-3">{kicker}</p>}
            <h1 className="ui-title truncate">{title}</h1>
          </>}
          {sub && <p className="ui-sub truncate">{sub}</p>}
        </div>
        {(actions || extra) && <div className="ui-bar-actions">{actions}{extra && <div className="ui-tools">{extra}</div>}</div>}
      </div>
    </header>
  )
}
export const Content = ({ className, children }) => <div className={cn('px-4 md:px-6 lg:px-8 py-4 lg:py-6 mx-auto', !/(^|\s)max-w-/.test(className || '') && 'max-w-[1480px]', className)}>{children}</div>
export function Section({ title, action, children, className }) {
  return (
    <section className={cn('mt-8 first:mt-0', className)}>
      {(title || action) && <div className="flex items-center justify-between gap-3 mb-3 lg:mb-4 min-h-8"><h2 className="text-base lg:text-xl font-semibold tracking-tight">{title}</h2>{action}</div>}
      {children}
    </section>
  )
}
export function Stat({ label, value, note }) {
  return <div className="min-w-0"><div className="ui-kpi-label">{label}</div><div className="display text-2xl lg:text-3xl font-bold tnum tracking-tight leading-tight mt-1 truncate"><CountUp value={value} /></div>{note && <div className="text-sm text-muted">{note}</div>}</div>
}

/* ---------- Sheet / diálogo ---------- */
let locks = 0
export function Sheet({ open, onClose, title, children, footer, wide, side, busy }) {
  const ref = useRef(null)
  const back = useRef(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    back.current = document.activeElement
    if (locks++ === 0) document.documentElement.style.overflow = 'hidden'
    const t = setTimeout(() => { const f = ref.current?.querySelector('[data-autofocus], input:not([type=hidden]), select, textarea'); (f || ref.current)?.focus({ preventScroll: true }) }, 30)
    const onKey = e => {
      if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && ref.current) {
        const els = [...ref.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(e2 => e2.offsetParent !== null)
        if (!els.length) return
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t); document.removeEventListener('keydown', onKey)
      if (--locks === 0) document.documentElement.style.overflow = ''
      back.current?.focus?.({ preventScroll: true })
    }
  }, [open]) // eslint-disable-line
  if (!open) return null
  return createPortal(
    <>
      <div className="overlay" onClick={() => !busy && onClose()} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cn('sheet', wide && 'wide', side && 'side')}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 id={titleId} className="text-lg font-semibold truncate">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose} disabled={busy}><X size={22} /></IconButton>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>, document.body)
}

/* ---------- Toasts y confirmaciones ---------- */
const FeedbackCtx = createContext(null)
export const useToast = () => useContext(FeedbackCtx).toast
export const useConfirm = () => useContext(FeedbackCtx).confirm

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [ask, setAsk] = useState(null)
  const toast = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === 'error' ? 5000 : 3000)
  }, [])
  const confirm = useCallback(opts => new Promise(resolve => setAsk({ ...opts, resolve })), [])
  const close = v => { ask.resolve(v); setAsk(null) }
  return (
    <FeedbackCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={cn('toast', t.tone === 'error' && 'error')} role={t.tone === 'error' ? 'alert' : 'status'}>
            {t.tone === 'error' ? <AlertCircle size={18} className="mt-px flex-none" /> : <Check size={18} className="mt-px flex-none" />}<span>{t.message}</span>
          </div>
        ))}
      </div>
      <Sheet open={!!ask} onClose={() => close(false)} title={ask?.title || ''}
        footer={ask && <><Button variant="secondary" onClick={() => close(false)}>{ask.cancelLabel || 'Volver'}</Button><Button variant={ask.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>{ask.confirmLabel || 'Confirmar'}</Button></>}>
        {ask?.message && <p className="text-muted">{ask.message}</p>}
      </Sheet>
    </FeedbackCtx.Provider>
  )
}
