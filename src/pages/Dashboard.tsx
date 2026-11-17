import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  CreditCard,
  Plus,
  ScanLine,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router'
import { accounts, activity, aging, customerStats, metrics, trends } from '../core/ledger'
import { money, shortDate } from '../core/format'
import { useDemo } from '../ui/demo-context'
import { Distribution, TrendChart } from '../ui/charts'
import { ActivityList, Avatar, Empty, Field, PageHead, PanelHead, Stat, TextLink } from '../ui/shared'
import { CreateCredit } from '../ui/CreditActions'

export function OverviewStats({ m, month }: { m: ReturnType<typeof metrics>; month: string }) {
  return (
    <div className="stat-grid">
      <Stat
        label="Total outstanding"
        value={money(m.outstanding)}
        detail={`Across ${m.active} active customers`}
        icon={<Wallet size={18} />}
        tone="stat-lime"
      />
      <Stat
        label="Collected this month"
        value={money(m.month)}
        detail={month}
        icon={<ArrowDownLeft size={19} />}
      />
      <Stat
        label="Overdue balance"
        value={money(m.overdue)}
        detail="Past the agreed due date"
        icon={<CircleAlert size={18} />}
        tone="stat-rose"
      />
      <Stat
        label="Pending requests"
        value={m.pending}
        detail="Awaiting your review"
        icon={<ClipboardList size={17} />}
        tone="stat-lilac"
      />
    </div>
  )
}
export default function Dashboard() {
  const { workspace: w, day, route } = useDemo()
  const [creating, setCreating] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const m = metrics(w, day)
  const records = accounts(w, day)
  const pending = records
    .filter((a) => a.state === 'pending')
    .sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt))
  const upcoming = records
    .filter((a) => a.balance > 0 && a.late <= 0 && a.late >= -7)
    .sort((a, b) => a.request.due.localeCompare(b.request.due))
  const month = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(day))
  const balances = w.customers
    .map((c) => {
      const stats = customerStats(w, c.id, day)
      return { label: c.name, amount: overdueOnly ? stats.overdue : stats.balance }
    })
    .filter((item) => !overdueOnly || item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const matched = customerSearch.trim()
    ? w.customers.filter((c) => c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()))
    : []

  return (
    <div className="page-stack">
      <PageHead
        label="MERCHANT COMMAND CENTER"
        title="Business overview"
        actions={
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> Create credit
          </button>
        }
      >
        Here’s what’s happening at <strong>{w.name}</strong>.
      </PageHead>
      <OverviewStats m={m} month={month} />
      <div className="dashboard-grid">
        <section className="panel trend-panel">
          <PanelHead
            title="Credit & collections"
            action={
              <span className="period">
                <CalendarClock size={15} /> Last 6 weeks
              </span>
            }
          >
            A weekly view of money issued and repaid.
          </PanelHead>
          <TrendChart series={trends(w, day)} />
          <div className="trend-summary">
            <span>
              <i className="dot collected" /> Lifetime collection rate
            </span>
            <b>{m.rate === null ? '—' : m.rate + '%'}</b>
            <span>
              <i className="dot issued" /> Active customers
            </span>
            <b>{m.active}</b>
          </div>
        </section>
        <section className="panel queue-panel">
          <PanelHead title="Awaiting review" action={<span className="counter">{pending.length}</span>}>
            New requests from your customers.
          </PanelHead>
          {pending.length ? (
            <ul className="request-list">
              {pending.slice(0, 4).map(({ request: r }, i) => {
                const c = w.customers.find((c) => c.id === r.customerId)!
                return (
                  <li key={r.id}>
                    <Link to={`/credit/${r.id}`}>
                      <Avatar name={c.name} tone={i} />
                      <span>
                        <strong>{c.name}</strong>
                        <small>{r.purpose}</small>
                      </span>
                      <b className="amount">{money(r.amount)}</b>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty title="All caught up">New requests will appear here.</Empty>
          )}
          <TextLink to={route('/credit?filter=pending')}>View request queue</TextLink>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <PanelHead
            title="Recent activity"
            action={<TextLink to={route('/credit')}>Credit ledger</TextLink>}
          >
            The latest changes to your ledger.
          </PanelHead>
          <ActivityList events={activity(w)} limit={5} />
        </section>
        <section className="panel">
          <PanelHead title="Due in the next 7 days">Know what’s coming up.</PanelHead>
          {upcoming.length ? (
            <ul className="request-list">
              {upcoming.map(({ request: r, balance }) => (
                <li key={r.id}>
                  <Link to={`/credit/${r.id}`}>
                    <span className="mini-icon">
                      <CalendarClock size={16} />
                    </span>
                    <span>
                      <strong>{w.customers.find((c) => c.id === r.customerId)?.name}</strong>
                      <small>Due {shortDate(r.due)}</small>
                    </span>
                    <b className="amount">{money(balance)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nothing due soon" />
          )}
          <TextLink to={route('/collections')}>Open collections</TextLink>
        </section>
      </div>
      <div className="equal-grid">
        <section className="panel">
          <PanelHead title="Credit aging">Outstanding amounts grouped by days overdue.</PanelHead>
          <Distribution items={aging(w, day)} label="Credit aging" />
        </section>
        <section className="panel">
          <PanelHead
            title="Balance by customer"
            action={<TextLink to={route('/customers')}>View directory</TextLink>}
          >
            Compare open balances or see where overdue credit is concentrated.
          </PanelHead>
          <div className="segments" aria-label="Customer balance breakdown">
            <button aria-pressed={!overdueOnly} onClick={() => setOverdueOnly(false)}>
              All outstanding
            </button>
            <button aria-pressed={overdueOnly} onClick={() => setOverdueOnly(true)}>
              Overdue only
            </button>
          </div>
          {balances.length ? (
            <Distribution items={balances} label={overdueOnly ? 'Overdue balances' : 'Customer balances'} />
          ) : (
            <Empty title="No overdue balances" />
          )}
        </section>
      </div>
      <section className="panel dashboard-search">
        <PanelHead title="Find a customer">Search this business’s customer profiles.</PanelHead>
        <Field label="Search customers">
          <input
            type="search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search by name"
          />
        </Field>
        {customerSearch.trim() &&
          (matched.length ? (
            <ul className="request-list">
              {matched.map((c) => (
                <li key={c.id}>
                  <Link to={`/customers/${c.id}`}>
                    <Avatar name={c.name} />
                    <span>
                      <strong>{c.name}</strong>
                    </span>
                    <span>{money(customerStats(w, c.id, day).balance)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" role="status">
              No matching customers.
            </p>
          ))}
      </section>
      <section className="quick-actions" aria-label="Quick actions">
        <button onClick={() => setCreating(true)}>
          <ScanLine size={21} />
          <span>
            <b>Generate a PopCard</b>
            <small>Prepare a new request</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
        <Link to={route('/assistant')}>
          <Sparkles size={21} />
          <span>
            <b>Ask PopAI</b>
            <small>Find answers in your ledger</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
        <Link to={route('/reports')}>
          <CreditCard size={21} />
          <span>
            <b>Export a statement</b>
            <small>Download fictional records</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
      </section>
      {creating && <CreateCredit close={() => setCreating(false)} />}
    </div>
  )
}
