import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Check, CreditCard, ReceiptText, ScanLine } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { money, parseMoney, plusDays, rupees, shortDate } from '../core/format'
import { account } from '../core/ledger'
import { uid } from '../core/model'
import type { Command, Entry, Request } from '../core/model'
import { useDemo } from './demo-context'
import { CardFace } from './PopCard'
import { Confirm, Field, Issue, Modal, errorText, saveFile } from './shared'

export function CreateCredit({
  close,
  customerId,
  source = 'merchant',
}: {
  close: () => void
  customerId?: string
  source?: 'merchant' | 'customer'
}) {
  const { workspace: w, day, run, toast } = useDemo()
  const navigate = useNavigate()
  const [operation] = useState(uid)
  const [selected, setSelected] = useState(customerId ?? w.customers[0].id)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [due, setDue] = useState(plusDays(day, 14))
  const [preview, setPreview] = useState<Extract<Command, { kind: 'create' }> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const c = w.customers.find((c) => c.id === selected)!
  function prepare(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const total = parseMoney(amount)
      if (total > c.limit) throw new Error(`Demo credit limit: ${money(c.limit)}.`)
      if (!purpose.trim()) throw new Error('Add a short description of the credit.')
      setPreview({
        kind: 'create',
        customerId: selected,
        amount: total,
        purpose: purpose.trim(),
        due,
        source,
      })
    } catch (e) {
      setError(errorText(e))
    }
  }
  async function create() {
    if (!preview || busy) return
    setBusy(true)
    setError('')
    try {
      await run(preview, operation)
      toast('Credit request created. PopCard is ready.')
      close()
      navigate(`/popcard/${operation}${source === 'customer' ? '?view=customer' : ''}`)
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={
        preview
          ? 'Review your PopCard'
          : source === 'customer'
            ? 'Request demo credit'
            : 'Create a credit request'
      }
      close={close}
      busy={busy}
    >
      {preview ? (
        <div className="form-stack">
          <CardFace
            card={{
              merchant: w.name,
              customer: c.name,
              amount: preview.amount,
              due,
              purpose: preview.purpose,
              state: 'pending',
              id: 'preview',
            }}
            miniature
          />
          <p className="muted">
            Generating a PopCard adds a pending request to the merchant’s queue. Credit is issued only after
            approval.
          </p>
          {error && <Issue>{error}</Issue>}
          <div className="modal-actions">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => {
                setPreview(null)
                setError('')
              }}
            >
              Edit details
            </button>
            <button className="btn primary" disabled={busy} onClick={() => void create()}>
              <ScanLine size={17} />
              {busy ? 'Generating…' : 'Generate PopCard'}
            </button>
          </div>
        </div>
      ) : (
        <form className="form-stack" onSubmit={prepare}>
          <p className="muted">
            Create a fictional request. You’ll preview the PopCard before it enters the ledger.
          </p>
          <Field label="Customer">
            <select
              required
              value={selected}
              disabled={source === 'customer'}
              onChange={(e) => setSelected(e.target.value)}
            >
              {w.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₹)" hint={`Demo credit limit: ${money(c.limit)}`}>
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500.00"
            />
          </Field>
          <Field label="Description">
            <input
              required
              maxLength={120}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Weekly groceries"
            />
          </Field>
          <Field label="Due date">
            <input type="date" min={day} required value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          {error && <Issue>{error}</Issue>}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={close}>
              Cancel
            </button>
            <button className="btn primary">
              Preview PopCard <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
export function Decision({
  request,
  decision,
  close,
}: {
  request: Request
  decision: 'approved' | 'rejected' | 'cancelled'
  close: () => void
}) {
  const { run, toast } = useDemo()
  const [op] = useState(uid)
  const verb = { approved: 'Approve', rejected: 'Reject', cancelled: 'Cancel' }[decision]
  return (
    <Confirm
      title={verb + ' this request?'}
      label={verb + ' request'}
      close={close}
      danger={decision !== 'approved'}
      run={async () => {
        await run({ kind: 'decide', requestId: request.id, decision }, op)
        toast('Request ' + decision + '.')
      }}
    >
      {decision === 'approved'
        ? `${money(request.amount)} will be issued to the fictional ledger, due ${shortDate(request.due)}.`
        : 'This closes the pending request without posting any credit to the ledger.'}
    </Confirm>
  )
}
export function Repay({
  request,
  close,
  source = 'merchant',
  settle = false,
}: {
  request: Request
  close: () => void
  source?: 'merchant' | 'customer'
  settle?: boolean
}) {
  const { workspace: w, day, run, toast } = useDemo()
  const a = account(w, request, day)
  const [amount, setAmount] = useState(settle ? rupees(a.balance) : '')
  const [review, setReview] = useState(settle ? a.balance : 0)
  const [receipt, setReceipt] = useState<{ entry: Entry; balance: number } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [op] = useState(uid)
  function prepare(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const n = parseMoney(amount)
      if (n > a.balance) throw new Error(`Repayment cannot exceed ${money(a.balance)}.`)
      setReview(n)
    } catch (err) {
      setError(errorText(err))
    }
  }
  async function post() {
    if (busy || !review) return
    setBusy(true)
    setError('')
    try {
      const state = await run({ kind: 'repay', requestId: request.id, amount: review, source }, op)
      const newW = state.merchants.find((m) => m.id === w.id)!
      const updated = account(newW, request, day)
      const entry = updated.entries.find(
        (e) => e.id === op && e.kind === 'repayment' && e.amount === review,
      )
      if (!entry) throw new Error('The repayment could not be verified.')
      setReceipt({ entry, balance: updated.balance })
      toast(updated.balance === 0 ? 'Credit settled.' : 'Repayment recorded.')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  if (receipt)
    return (
      <Modal title="Demo receipt" close={close}>
        <Receipt entry={receipt.entry} balance={receipt.balance} request={request} close={close} />
      </Modal>
    )
  return (
    <Modal title={review ? 'Confirm simulated repayment' : 'Record repayment'} close={close} busy={busy}>
      {review ? (
        <div className="form-stack">
          <div className="payment-preview">
            <CreditCard size={23} />
            <span>SIMULATED REPAYMENT</span>
            <strong>{money(review)}</strong>
          </div>
          <p>
            Apply this repayment to {request.purpose}.{' '}
            {review > a.balance ? (
              'The balance changed. Review the amount again.'
            ) : review === a.balance ? (
              'This will settle the balance.'
            ) : (
              <>
                After posting, the balance will be <strong>{money(a.balance - review)}</strong>.
              </>
            )}
          </p>
          <p className="muted">No money moves, and no payment credentials are collected.</p>
          {error && <Issue>{error}</Issue>}
          <div className="modal-actions">
            <button
              className="btn secondary"
              onClick={() => {
                if (settle) close()
                else setReview(0)
              }}
              disabled={busy}
            >
              {settle ? 'Cancel' : 'Back'}
            </button>
            <button className="btn primary" disabled={busy} onClick={() => void post()}>
              {busy ? 'Recording…' : 'Confirm repayment'}
            </button>
          </div>
        </div>
      ) : (
        <form className="form-stack" onSubmit={prepare}>
          <p className="muted">
            Current balance: <strong>{money(a.balance)}</strong>. This is a local simulation.
          </p>
          <Field label="Repayment amount (₹)">
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 200.00"
            />
          </Field>
          <button type="button" className="text-link fit" onClick={() => setAmount(rupees(a.balance))}>
            Use full balance
          </button>
          {error && <Issue>{error}</Issue>}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={close}>
              Cancel
            </button>
            <button className="btn primary">
              Review repayment <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
export function Receipt({
  entry,
  balance,
  request,
  close,
}: {
  entry: Entry
  balance: number
  request: Request
  close: () => void
}) {
  const { workspace: w } = useDemo()
  const rows = [
    ['Status', 'Recorded in demo ledger'],
    ['Merchant', w.name],
    ['Customer', w.customers.find((c) => c.id === request.customerId)!.name],
    ['Date', shortDate(entry.at)],
    ['Repayment', money(entry.amount)],
    ['Balance after this repayment', money(balance)],
    ['Receipt reference', entry.id],
  ]
  return (
    <div className="form-stack">
      <div className="receipt-badge">
        <Check size={18} /> {balance === 0 ? 'Demo credit settled' : 'Demo repayment recorded'}
      </div>
      <dl className="facts">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">Fictional demo receipt. No money was transferred.</p>
      <div className="modal-actions">
        <button
          className="btn secondary"
          onClick={() =>
            saveFile(
              `poppay-receipt-${entry.id}.txt`,
              new Blob(
                [
                  'POPPAY · FICTIONAL DEMO RECEIPT\nNo money was transferred.\n\n',
                  rows.map(([k, v]) => k + ': ' + v).join('\n'),
                ],
                { type: 'text/plain;charset=utf-8' },
              ),
            )
          }
        >
          <ReceiptText size={16} /> Download receipt
        </button>
        <button className="btn primary" onClick={close}>
          Done
        </button>
      </div>
    </div>
  )
}
export function CreditTerms({ request }: { request: Request }) {
  return (
    <details className="terms">
      <summary>Demo credit terms</summary>
      <p>
        Fictional principal: {money(request.amount)}. Due {shortDate(request.due)}. No fees, interest,
        transfers or enforceable obligations. <Link to="/story">About PopPay</Link>.
      </p>
    </details>
  )
}
