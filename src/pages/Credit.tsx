import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Plus, ReceiptText, ScanLine, Wallet } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { account, accounts, activity } from '../core/ledger'
import { money, shortDate } from '../core/format'
import type { Entry } from '../core/model'
import { CreditTerms, CreateCredit, Decision, Receipt, Repay } from '../ui/CreditActions'
import { useDemo } from '../ui/demo-context'
import {
  ActivityList,
  Avatar,
  Badge,
  Empty,
  Field,
  Missing,
  Modal,
  PageHead,
  PanelHead,
  Table,
  TextLink,
} from '../ui/shared'

export function CreditTable({
  records,
  compact = false,
  customerView = false,
}: {
  records: ReturnType<typeof accounts>
  compact?: boolean
  customerView?: boolean
}) {
  const { workspace: w } = useDemo()
  if (!records.length)
    return <Empty title="No credit records found">Try a different filter or create a new request.</Empty>
  return (
    <Table
      label="Credit records"
      headers={['Credit record', 'Status', 'Amount', 'Outstanding', 'Due date', 'Open']}
      rows={records.map((a) => {
        const r = a.request
        const c = w.customers.find((c) => c.id === r.customerId)!
        const to = `/credit/${r.id}${customerView ? '?view=customer' : ''}`
        return [
          <Link to={to} className="identity">
            {!compact && <Avatar name={c.name} tone={w.customers.indexOf(c)} />}
            <span>
              <strong>{compact ? r.purpose : c.name}</strong>
              {!compact && <small>{r.purpose}</small>}
            </span>
          </Link>,
          <Badge>{a.state}</Badge>,
          <span className="amount">{money(r.amount)}</span>,
          <strong className="amount">{money(a.balance)}</strong>,
          shortDate(r.due),
          <Link to={to} className="icon-btn" aria-label={`View ${r.purpose} credit for ${c.name}`}>
            <ArrowRight size={16} />
          </Link>,
        ]
      })}
    />
  )
}
const filters = ['all', 'pending', 'open', 'overdue', 'settled', 'closed']
export default function Credit() {
  const { workspace: w, day } = useDemo()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const filter = filters.includes(params.get('filter') ?? '') ? params.get('filter')! : 'all'
  const records = accounts(w, day)
    .filter((a) => {
      const c = w.customers.find((c) => c.id === a.request.customerId)!
      const match = [c.name, a.request.purpose, a.request.id]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase())
      return (
        match &&
        (filter === 'all' ||
          filter === a.state ||
          (filter === 'open' && a.balance > 0) ||
          (filter === 'closed' && ['rejected', 'cancelled'].includes(a.state)))
      )
    })
    .sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt))
  return (
    <div className="page-stack">
      <PageHead
        label="CREDIT OPERATIONS"
        title="Credit ledger"
        actions={
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> Create credit
          </button>
        }
      >
        Review requests and follow every rupee from approval to settlement.
      </PageHead>
      <section className="panel">
        <PanelHead title="Credit records">
          {records.length} matching {records.length === 1 ? 'record' : 'records'}
        </PanelHead>
        <div className="filter-row">
          <div className="segments" aria-label="Filter credit by status">
            {filters.map((f) => (
              <button
                key={f}
                aria-pressed={f === filter}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  if (f === 'all') next.delete('filter')
                  else next.set('filter', f)
                  setParams(next, { replace: true })
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <Field label="Search credit">
            <input
              type="search"
              placeholder="Name, description or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>
        <CreditTable records={records} />
      </section>
      {creating && <CreateCredit close={() => setCreating(false)} />}
    </div>
  )
}
export function CreditDetail() {
  const { id } = useParams()
  return <CreditRecord key={id} id={id} />
}
function CreditRecord({ id }: { id?: string }) {
  const { workspace: w, day, route } = useDemo()
  const [params] = useSearchParams()
  const [action, setAction] = useState<'approved' | 'rejected' | 'cancelled' | 'repay' | 'settle' | null>(
    null,
  )
  const [receipt, setReceipt] = useState<Entry | null>(null)
  const r = w.requests.find((r) => r.id === id)
  if (!r) return <Missing />
  const c = w.customers.find((c) => c.id === r.customerId)!
  const a = account(w, r, day)
  const isCustomer = params.get('view') === 'customer'
  const back = isCustomer ? `/customer?customer=${c.id}` : route('/credit')
  const repayment = a.entries.filter((e) => e.kind === 'repayment').sort((a, b) => a.at.localeCompare(b.at))
  const finished = receipt
    ? a.issued -
      repayment
        .slice(0, repayment.findIndex((e) => e.id === receipt.id) + 1)
        .reduce((s, e) => s + e.amount, 0)
    : 0
  const overdueApproval = r.due < day
  return (
    <div className="page-stack">
      <Link to={back} className="back-link">
        <ArrowLeft size={16} /> {isCustomer ? 'Back to customer view' : 'Back to credit ledger'}
      </Link>
      <PageHead
        label="CREDIT RECORD"
        title={r.purpose}
        actions={
          <Link className="btn secondary" to={`/popcard/${r.id}${isCustomer ? '?view=customer' : ''}`}>
            <ScanLine size={17} /> Open PopCard
          </Link>
        }
      >
        {c.name} · {w.name}
      </PageHead>
      <div className="detail-grid">
        <section className="panel">
          <PanelHead title="Credit summary" action={<Badge>{a.state}</Badge>}>
            Request {r.id}
          </PanelHead>
          <div className="detail-balance">
            <small>OUTSTANDING BALANCE</small>
            <strong className="amount">{money(a.balance)}</strong>
          </div>
          <dl className="facts">
            <div>
              <dt>Requested</dt>
              <dd>{money(r.amount)}</dd>
            </div>
            <div>
              <dt>Credit issued</dt>
              <dd>{money(a.issued)}</dd>
            </div>
            <div>
              <dt>Repaid</dt>
              <dd>{money(a.repaid)}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{shortDate(r.due)}</dd>
            </div>
            <div>
              <dt>Requested by</dt>
              <dd>{r.source}</dd>
            </div>
          </dl>
          <CreditTerms request={r} />
          {r.status === 'pending' && !isCustomer && overdueApproval && (
            <p className="muted">The due date has passed. Cancel this request and create a new one.</p>
          )}
          <div className="actions">
            {r.status === 'pending' && !isCustomer && (
              <>
                <button
                  className="btn primary"
                  disabled={overdueApproval}
                  onClick={() => setAction('approved')}
                >
                  <Check size={17} /> Approve request
                </button>
                <button className="btn secondary" onClick={() => setAction('rejected')}>
                  Reject request
                </button>
              </>
            )}
            {r.status === 'pending' && (
              <button className="btn secondary" onClick={() => setAction('cancelled')}>
                Cancel request
              </button>
            )}
            {a.balance > 0 && (
              <>
                <button className="btn primary" onClick={() => setAction('repay')}>
                  <Wallet size={17} /> {isCustomer ? 'Simulate repayment' : 'Record repayment'}
                </button>
                <button className="btn secondary" onClick={() => setAction('settle')}>
                  Settle balance
                </button>
              </>
            )}
            {!isCustomer && <TextLink to={`/customers/${c.id}`}>View customer</TextLink>}
          </div>
        </section>
        <section className="panel">
          <PanelHead title="Transaction timeline">From request to repayment.</PanelHead>
          <ActivityList events={activity(w).filter((e) => e.requestId === r.id)} limit={100} />
          {repayment.length > 0 && (
            <div className="receipt-list" id="receipts">
              <h3>Receipts</h3>
              {repayment.map((e) => (
                <button className="btn secondary small" key={e.id} onClick={() => setReceipt(e)}>
                  <ReceiptText size={15} /> {money(e.amount)} · {shortDate(e.at)}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      {action &&
        (action === 'repay' || action === 'settle' ? (
          <Repay
            request={r}
            close={() => setAction(null)}
            source={isCustomer ? 'customer' : 'merchant'}
            settle={action === 'settle'}
          />
        ) : (
          <Decision request={r} decision={action} close={() => setAction(null)} />
        ))}
      {receipt && (
        <Modal title="Demo receipt" close={() => setReceipt(null)}>
          <Receipt request={r} entry={receipt} balance={finished} close={() => setReceipt(null)} />
        </Modal>
      )}
    </div>
  )
}
