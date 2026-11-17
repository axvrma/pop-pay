import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactElement, ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, ChevronRight, CircleAlert, Inbox, Moon, Sun, X } from 'lucide-react'
import { Link } from 'react-router'
import { initials, money, shortDate } from '../core/format'
import type { activity } from '../core/queries'

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="brand">
      <img src="/mark.svg" width="33" height="33" alt="" />
      PopPay<span>.</span>
    </Link>
  )
}
export function ThemeButton({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title="Switch color theme"
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const style = tone ?? String(children).replaceAll(' ', '-')
  return <span className={`badge badge-${style}`}>{children}</span>
}
export function Avatar({ name, tone = 0 }: { name: string; tone?: number }) {
  return (
    <span aria-hidden="true" className={`avatar tone-${tone % 4}`}>
      {initials(name)}
    </span>
  )
}
export function PageHead({
  label,
  title,
  children,
  actions,
}: {
  label: string
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = title + ' | PopPay'
    const hash = window.location.hash
    if (hash && !hash.startsWith('#card=')) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView()
        return
      }
    }
    heading.current?.focus({ preventScroll: true })
  }, [title])
  return (
    <header className="page-head">
      <div>
        <div className="eyebrow">
          <span className="signal" />
          {label}
        </div>
        <h1 ref={heading} tabIndex={-1} data-page-heading>
          {title}
        </h1>
        <p>{children}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}
export function PanelHead({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="panel-head">
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  )
}
export function Stat({
  label,
  value,
  detail,
  icon,
  tone = '',
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
  tone?: string
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="amount">{value}</strong>
      <small>{detail}</small>
    </div>
  )
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={22} aria-hidden="true" />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}
export function Issue({ children }: { children: ReactNode }) {
  return (
    <div className="issue" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Opening PopPay…
    </div>
  )
}
export function Missing({
  title = 'Record not found',
  children = 'This record may have been reset or created on another browser.',
}: {
  title?: string
  children?: ReactNode
}) {
  return (
    <section className="panel missing">
      <PageHead label="LOCAL DEMO" title={title}>
        {children}
      </PageHead>
      <Link className="btn primary" to="/dashboard">
        Go to dashboard <ArrowRight size={16} />
      </Link>
    </section>
  )
}
export function Modal({
  title,
  children,
  close,
  busy,
  wide,
}: {
  title: string
  children: ReactNode
  close: () => void
  busy?: boolean
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const priorTitle = useRef(title)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const node = ref.current!
    node.showModal()
    return () => node.close()
  }, [])
  useEffect(() => {
    if (priorTitle.current !== title) heading.current?.focus({ preventScroll: true })
    priorTitle.current = title
  }, [title])
  return (
    <dialog
      ref={ref}
      className={wide ? 'modal modal-wide' : 'modal'}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) close()
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2 ref={heading} id={id} tabIndex={-1}>
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            disabled={busy}
            onClick={close}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
export function Confirm({
  title,
  children,
  label,
  close,
  run,
  danger,
}: {
  title: string
  children: ReactNode
  label: string
  close: () => void
  run: () => Promise<unknown>
  danger?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await run()
      close()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }
  return (
    <Modal title={title} close={close} busy={busy}>
      <form className="form-stack" onSubmit={submit}>
        <div className="dialog-copy">{children}</div>
        {error && <Issue>{error}</Issue>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={close} disabled={busy} autoFocus>
            Cancel
          </button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} disabled={busy}>
            {busy ? 'Working…' : label}
          </button>
        </div>
      </form>
    </Modal>
  )
}
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Try again.'
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>
}) {
  const key = useId()
  const id = children.props.id ?? key
  const hintId = hint ? key + '-hint' : undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-describedby': hintId })}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  )
}
export function Table({ headers, rows, label }: { headers: string[]; rows: ReactNode[][]; label: string }) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
export function ActivityList({
  events,
  limit = 8,
}: {
  events: ReturnType<typeof activity>
  limit?: number
}) {
  if (!events.length) return <Empty title="No activity yet" />
  return (
    <ul className="activity-list">
      {events.slice(0, limit).map((e) => (
        <li key={e.id}>
          <Link to={`/credit/${e.requestId}`}>
            <Avatar name={e.name} tone={e.label.startsWith('Credit settled') ? 0 : 1} />
            <span>
              <strong>{e.label}</strong>
              <small>
                {e.name} · {shortDate(e.at)}
              </small>
            </span>
            <span className="amount">{money(e.amount)}</span>
            <ChevronRight size={15} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
export function TextLink({
  to,
  children,
  external = false,
}: {
  to: string
  children: ReactNode
  external?: boolean
}) {
  return external ? (
    <a className="text-link" href={to} target="_blank" rel="noopener noreferrer">
      {children} <ArrowUpRight size={15} />
    </a>
  ) : (
    <Link className="text-link" to={to}>
      {children} <ArrowRight size={15} />
    </Link>
  )
}
export async function copyText(text: string) {
  if (!navigator.clipboard?.writeText)
    throw new Error('Clipboard access is unavailable. Select and copy the text manually.')
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    throw new Error('Clipboard access was denied. Select and copy the text manually.')
  }
}
export function saveFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
