import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Copy,
  FileText,
  MessageSquareText,
  Wallet,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { accounts, aging, metrics, reminderText, templates } from '../core/ledger'
import { money, shortDate } from '../core/format'
import { templateIds, uid } from '../core/model'
import type { Command, Template } from '../core/model'
import { Distribution } from '../ui/charts'
import { useDemo } from '../ui/demo-context'
import {
  Badge,
  Empty,
  Field,
  Issue,
  Modal,
  PageHead,
  PanelHead,
  Stat,
  Table,
  copyText,
  errorText,
} from '../ui/shared'

export default function Collections() {
  const { workspace: w, day, run, toast } = useDemo()
  const [params, setParams] = useSearchParams()
  const [customer, setCustomer] = useState(
    w.customers.find((c) => c.id === params.get('customer'))?.id ?? w.customers[0].id,
  )
  const [template, setTemplate] = useState<Template>('friendly')
  const [custom, setCustom] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const queue = params.get('queue') ?? 'open'
  const m = metrics(w, day)
  const active = accounts(w, day).filter((a) => a.balance > 0)
  const due = active.filter((a) => a.late >= -7 && a.late <= 0)
  const records = (
    queue === 'overdue' ? active.filter((a) => a.late > 0) : queue === 'soon' ? due : active
  ).sort((a, b) => a.request.due.localeCompare(b.request.due))
  const draft = reminderText(w, customer, template, day)
  const notes = w.notes.filter((n) => n.customerId === customer).sort((a, b) => b.at.localeCompare(a.at))
  const history = w.ledger.filter(
    (e) =>
      e.kind === 'repayment' && w.requests.some((r) => r.id === e.requestId && r.customerId === customer),
  )
  async function perform(command: Command, success: string, then?: () => void) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await run(command, uid())
      toast(success)
      then?.()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function copy() {
    setError('')
    try {
      await copyText(draft)
      toast('Reminder draft copied.')
    } catch (e) {
      setError(errorText(e))
    }
  }
  return (
    <div className="page-stack">
      <PageHead label="COLLECTIONS INTELLIGENCE" title="Collections">
        Prioritize open balances and prepare thoughtful follow-ups.
      </PageHead>
      <div className="stat-grid three">
        <Stat
          label="Total outstanding"
          value={money(m.outstanding)}
          detail={`${active.length} open accounts`}
          icon={<Wallet size={18} />}
          tone="stat-lime"
        />
        <Stat
          label="Due in 7 days"
          value={money(due.reduce((n, a) => n + a.balance, 0))}
          detail={`${due.length} upcoming repayments`}
          icon={<CalendarClock size={18} />}
        />
        <Stat
          label="Overdue"
          value={money(m.overdue)}
          detail="Past the agreed due date"
          icon={<CircleAlert size={18} />}
          tone="stat-rose"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <PanelHead title="Collection queue">{records.length} matching accounts</PanelHead>
          <div className="segments" aria-label="Filter collection queue">
            {[
              ['open', 'All open'],
              ['soon', 'Due soon'],
              ['overdue', 'Overdue'],
            ].map(([v, text]) => (
              <button
                key={v}
                aria-pressed={queue === v}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('queue', v)
                  setParams(next, { replace: true })
                }}
              >
                {text}
              </button>
            ))}
          </div>
          {records.length ? (
            <Table
              label="Collection queue"
              headers={['Customer', 'Due date', 'Balance', 'Open']}
              rows={records.map((a) => {
                const c = w.customers.find((c) => c.id === a.request.customerId)!
                return [
                  <button className="table-btn" onClick={() => setCustomer(c.id)}>
                    {c.name}
                  </button>,
                  <span>
                    {shortDate(a.request.due)}
                    {a.late > 0 && <small className="cell-detail">{a.late} days late</small>}
                  </span>,
                  <strong>{money(a.balance)}</strong>,
                  <Link
                    className="icon-btn"
                    to={`/credit/${a.request.id}`}
                    aria-label={`Open credit for ${c.name}`}
                  >
                    <ArrowRight size={16} />
                  </Link>,
                ]
              })}
            />
          ) : (
            <Empty title="No accounts in this queue" />
          )}
        </section>
        <section className="panel">
          <PanelHead title="Aging breakdown">Outstanding balances by age.</PanelHead>
          <Distribution items={aging(w, day)} label="Outstanding by age" />
        </section>
      </div>
      <div className="equal-grid">
        <section className="panel">
          <PanelHead
            title="Reminder drafts"
            action={
              <span className="mini-icon">
                <MessageSquareText size={18} />
              </span>
            }
          >
            Drafts stay here until you copy them. PopPay doesn’t send messages.
          </PanelHead>
          <div className="form-stack">
            <Field label="Customer">
              <select
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value)
                  setNote('')
                  setError('')
                }}
              >
                {w.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reminder template">
              <select value={template} onChange={(e) => setTemplate(e.target.value as Template)}>
                {templateIds.map((t) => (
                  <option key={t} value={t}>
                    {templates[t].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Draft preview">
              <textarea readOnly value={draft} rows={3} />
            </Field>
            <div className="actions">
              <button className="btn primary" onClick={() => void copy()}>
                <Copy size={16} /> Copy draft
              </button>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() =>
                  void perform(
                    { kind: 'reminder', customerId: customer, template },
                    'Reminder draft saved locally.',
                  )
                }
              >
                Save draft
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  setError('')
                  setCustom(w.templates[template] ?? templates[template].text)
                }}
              >
                Edit template
              </button>
            </div>
          </div>
        </section>
        <section className="panel">
          <PanelHead
            title="Follow-up history"
            action={
              <span className="mini-icon">
                <FileText size={18} />
              </span>
            }
          >
            {w.customers.find((c) => c.id === customer)?.name} · {history.length} repayments recorded
          </PanelHead>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault()
              void perform(
                { kind: 'note', customerId: customer, text: note },
                'Follow-up note saved.',
                () => setNote(''),
              )
            }}
          >
            <Field label="Add a follow-up note">
              <textarea
                rows={2}
                required
                maxLength={600}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What should you remember next time?"
              />
            </Field>
            <button className="btn secondary fit" disabled={busy}>
              Save note
            </button>
          </form>
          {notes.length ? (
            <ul className="notes">
              {notes.map((n) => (
                <li key={n.id}>
                  <div>
                    <Badge tone="active">{n.kind === 'note' ? 'Note' : 'Saved draft'}</Badge>
                    <small>{shortDate(n.at)}</small>
                  </div>
                  <p>{n.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No notes or saved drafts" />
          )}
          {history.length > 0 && (
            <details className="terms">
              <summary>Repayment history</summary>
              <ul className="request-list">
                {history
                  .slice()
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .map((e) => (
                    <li key={e.id}>
                      <Link to={`/credit/${e.requestId}#receipts`}>
                        <span>{shortDate(e.at)}</span>
                        <strong>{money(e.amount)}</strong>
                      </Link>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      </div>
      {error && custom === null && <Issue>{error}</Issue>}
      {custom !== null && (
        <Modal
          title="Edit reminder template"
          close={() => {
            setCustom(null)
            setError('')
          }}
          busy={busy}
        >
          <form
            className="form-stack"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              void perform({ kind: 'template', template, text: custom }, 'Template saved.', () =>
                setCustom(null),
              )
            }}
          >
            <Field
              label={templates[template].label}
              hint="Available fields: {name}, {merchant}, {balance}, {overdue}, {today}."
            >
              <textarea
                rows={5}
                required
                maxLength={600}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </Field>
            {error && <Issue>{error}</Issue>}
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                className="btn secondary"
                onClick={() => setCustom(templates[template].text)}
              >
                Use default text
              </button>
              <button disabled={busy} className="btn primary">
                Save template
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
