import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Plus,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { Customer, Workspace } from '../core/model'
import { accounts, activity, customerStats } from '../core/ledger'
import { money, shortDate } from '../core/format'
import { useDemo } from '../ui/demo-context'
import {
  ActivityList,
  Avatar,
  Badge,
  Empty,
  Field,
  Missing,
  PageHead,
  PanelHead,
  Stat,
  Table,
  TextLink,
} from '../ui/shared'
import { CreditTable } from './Credit'
import { CreateCredit } from '../ui/CreditActions'

export default function Customers() {
  const { workspace: w, day } = useDemo()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const list = w.customers
    .map((c, i) => ({ c, i, s: customerStats(w, c.id, day) }))
    .filter(
      ({ c, s }) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'open' && s.balance > 0) ||
          (filter === 'overdue' && s.overdue > 0)),
    )
  return (
    <div className="page-stack">
      <PageHead label="RELATIONSHIP WORKSPACE" title="Customers">
        Find the people behind every balance.
      </PageHead>
      <section className="panel">
        <PanelHead title="Customer directory">
          {w.customers.length} fictional customers at {w.name}.
        </PanelHead>
        <div className="filter-row">
          <Field label="Search customers">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
            />
          </Field>
          <Field label="Filter by balance">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All customers</option>
              <option value="open">Open balance</option>
              <option value="overdue">Has overdue credit</option>
            </select>
          </Field>
        </div>
        {list.length ? (
          <Table
            label="Customer directory"
            headers={['Customer', 'Credit limit', 'Outstanding', 'Overdue', 'Open']}
            rows={list.map(({ c, i, s }) => [
              <Link className="identity" to={`/customers/${c.id}`}>
                <Avatar name={c.name} tone={i} />
                <strong>{c.name}</strong>
              </Link>,
              money(c.limit),
              <strong>{money(s.balance)}</strong>,
              money(s.overdue),
              <Link className="icon-btn" to={`/customers/${c.id}`} aria-label={`View ${c.name}`}>
                <ArrowRight size={16} />
              </Link>,
            ])}
          />
        ) : (
          <Empty title="No matching customers">Try another name or filter.</Empty>
        )}
      </section>
    </div>
  )
}
function Trust({ stats }: { stats: ReturnType<typeof customerStats> }) {
  return (
    <section className="panel trust-panel">
      <PanelHead title="Relationship indicator" action={<ShieldCheck size={22} />}>
        Illustrative · based on demo repayment history
      </PanelHead>
      <div className="trust-number">
        {stats.score ?? '—'}
        {stats.score !== null && <span> / 100</span>}
      </div>
      {stats.score !== null ? (
        <>
          <progress
            className="trust-progress"
            value={stats.score}
            max={100}
            aria-label="Illustrative relationship indicator"
          />
          <p>
            {stats.onTime} of {stats.relevant} eligible accounts settled on time; {stats.settled} settled in
            total.
          </p>
        </>
      ) : (
        <p>There isn’t enough completed or overdue history to calculate an indicator.</p>
      )}
      <details className="terms">
        <summary>How it works</summary>
        <p>
          70% on-time settlement rate, 30% overall settlement rate. The calculation uses accounts that are
          settled or past due. This is a demo relationship indicator, with no bureau data or lending
          decisions.
        </p>
      </details>
    </section>
  )
}
function DueList({
  w,
  customer,
  customerView,
}: {
  w: Workspace
  customer: Customer
  customerView?: boolean
}) {
  const { day } = useDemo()
  const due = accounts(w, day)
    .filter((a) => a.request.customerId === customer.id && a.balance > 0)
    .sort((a, b) => a.request.due.localeCompare(b.request.due))
  return due.length > 0 ? (
    <ul className="request-list">
      {due.map((a) => (
        <li key={a.request.id}>
          <Link to={`/credit/${a.request.id}${customerView ? '?view=customer' : ''}`}>
            <span className="mini-icon">
              <CalendarClock size={16} />
            </span>
            <span>
              <strong>{a.request.purpose}</strong>
              <small>
                {shortDate(a.request.due)} · {a.state}
              </small>
            </span>
            <b>{money(a.balance)}</b>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <Empty title="No upcoming repayments" />
  )
}
function CardsList({ w, c, customerView }: { w: Workspace; c: Customer; customerView?: boolean }) {
  const { day } = useDemo()
  const records = accounts(w, day)
    .filter((a) => a.request.customerId === c.id)
    .sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt))
  return records.length ? (
    <ul className="request-list">
      {records.slice(0, 5).map((a) => (
        <li key={a.request.id}>
          <Link to={`/popcard/${a.request.id}${customerView ? '?view=customer' : ''}`}>
            <span className="mini-icon">
              <ScanLine size={17} />
            </span>
            <span>
              <strong>{a.request.purpose}</strong>
              <small>
                {money(a.request.amount)} · {shortDate(a.request.due)}
              </small>
            </span>
            <Badge>{a.state}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <Empty title="No PopCards yet" />
  )
}
function Payments({ w, c, view }: { w: Workspace; c: Customer; view?: boolean }) {
  const ids = new Map(w.requests.filter((r) => r.customerId === c.id).map((r) => [r.id, r]))
  const entries = w.ledger
    .filter((e) => e.kind === 'repayment' && ids.has(e.requestId))
    .sort((a, b) => b.at.localeCompare(a.at))
  if (!entries.length) return <Empty title="No repayments recorded" />
  return (
    <ul className="request-list">
      {entries.map((e) => (
        <li key={e.id}>
          <Link to={`/credit/${e.requestId}${view ? '?view=customer' : ''}#receipts`}>
            <span className="mini-icon">
              <ReceiptText size={17} />
            </span>
            <span>
              <strong>{ids.get(e.requestId)?.purpose}</strong>
              <small>{shortDate(e.at)} · View receipt</small>
            </span>
            <b>{money(e.amount)}</b>
          </Link>
        </li>
      ))}
    </ul>
  )
}
export function CustomerDetail() {
  const { id } = useParams()
  const { workspace: w, day, route } = useDemo()
  const [creating, setCreating] = useState(false)
  const c = w.customers.find((c) => c.id === id)
  if (!c) return <Missing title="Customer not found" />
  const s = customerStats(w, c.id, day)
  return (
    <div className="page-stack">
      <Link className="back-link" to={route('/customers')}>
        <ArrowLeft size={16} /> Back to customers
      </Link>
      <PageHead
        label="CUSTOMER 360"
        title={c.name}
        actions={
          <>
            <Link className="btn secondary" to={`/reports?customer=${c.id}`}>
              Customer statement
            </Link>
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus size={18} /> Create credit
            </button>
          </>
        }
      >
        {w.name} · With you since {shortDate(c.since)} · Demo limit {money(c.limit)}
      </PageHead>
      <div className="stat-grid three">
        <Stat
          label="Outstanding"
          value={money(s.balance)}
          detail={`${money(s.overdue)} past due`}
          icon={<Wallet size={19} />}
          tone="stat-lime"
        />
        <Stat
          label="Total borrowed"
          value={money(s.issued)}
          detail="All issued demo credit"
          icon={<ArrowRight size={19} />}
        />
        <Stat
          label="Total repaid"
          value={money(s.repaid)}
          detail="All demo repayments"
          icon={<ReceiptText size={19} />}
        />
      </div>
      <div className="equal-grid">
        <Trust stats={s} />
        <section className="panel">
          <PanelHead title="Due-date timeline">All open balances, ordered by due date.</PanelHead>
          <DueList w={w} customer={c} />
        </section>
      </div>
      <section className="panel">
        <PanelHead title="Credit records">Requests and issued credit for {c.name}.</PanelHead>
        <CreditTable records={s.records} compact />
      </section>
      <div className="equal-grid">
        <section className="panel">
          <PanelHead title="Payment history">Receipts from the demo ledger.</PanelHead>
          <Payments w={w} c={c} />
        </section>
        <section className="panel">
          <PanelHead title="Related PopCards">Recent cards for this customer.</PanelHead>
          <CardsList w={w} c={c} />
        </section>
      </div>
      <section className="panel">
        <PanelHead
          title="Activity history"
          action={<TextLink to={`/collections?customer=${c.id}`}>Follow-up notes</TextLink>}
        >
          Request, decision and repayment events.
        </PanelHead>
        <ActivityList events={activity(w).filter((e) => e.customerId === c.id)} limit={100} />
      </section>
      {creating && <CreateCredit close={() => setCreating(false)} customerId={c.id} />}
    </div>
  )
}
export function CustomerHome() {
  const { workspace: w, day } = useDemo()
  const [params, setParams] = useSearchParams()
  const c = w.customers.find((c) => c.id === params.get('customer')) ?? w.customers[0]
  const [creating, setCreating] = useState(false)
  const s = customerStats(w, c.id, day)
  return (
    <div className="page-stack customer-home">
      <PageHead
        label="CUSTOMER EXPERIENCE"
        title={`Hi, ${c.name.split(' ')[0]}.`}
        actions={
          <Field label="View as customer">
            <select
              value={c.id}
              onChange={(e) => setParams({ customer: e.target.value }, { replace: true })}
            >
              {w.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        }
      >
        Your udhaar with {w.name}, all in one place.
      </PageHead>
      <section className="customer-balance">
        <div>
          <small>YOUR TOTAL OUTSTANDING</small>
          <strong className="amount">{money(s.balance)}</strong>
          <p>Fictional credit · No money moves</p>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>
          <Plus size={18} /> Request credit
        </button>
      </section>
      <div className="equal-grid">
        <section className="panel">
          <PanelHead title="Active credit">Open a record to review terms or simulate payment.</PanelHead>
          <DueList w={w} customer={c} customerView />
        </section>
        <section className="panel">
          <PanelHead title="Requests & PopCards">Check where your request stands.</PanelHead>
          <CardsList w={w} c={c} customerView />
        </section>
      </div>
      <section className="panel">
        <PanelHead title="All credit records">Includes pending, declined and settled requests.</PanelHead>
        <CreditTable records={s.records} compact customerView />
      </section>
      <div className="equal-grid">
        <section className="panel">
          <PanelHead title="Repayment history">Open your fictional receipts.</PanelHead>
          <Payments w={w} c={c} view />
        </section>
        <Trust stats={s} />
      </div>
      <section className="panel merchant-note">
        <span className="store-icon">
          <Store size={19} />
        </span>
        <div>
          <h2>{w.name}</h2>
          <p>
            {w.category} · {w.location} · Fictional merchant
          </p>
        </div>
      </section>
      {creating && (
        <CreateCredit key={c.id} customerId={c.id} source="customer" close={() => setCreating(false)} />
      )}
    </div>
  )
}
