import { eventDay, money, rupees } from './format'
import { accounts, aging, customerStats, metrics } from './ledger'
import type { Workspace } from './model'
export const reportTypes = {
  summary: 'Merchant summary',
  issued: 'Credit issued',
  collections: 'Collections',
  outstanding: 'Outstanding balances',
  statement: 'Customer statement',
  history: 'Transaction history',
  aging: 'Aging analysis',
} as const
export type ReportType = keyof typeof reportTypes
export type Report = {
  title: string
  day: string
  merchant: string
  disclaimer: string
  headers: string[]
  rows: (string | number)[][]
  hint: string
}
export function report(w: Workspace, type: ReportType, day: string, customerId: string): Report {
  const common = {
    title: reportTypes[type],
    day,
    merchant: w.name,
    disclaimer: 'Fictional PopPay demo data. This report does not document real loans or payments.',
  }
  const rows = accounts(w, day)
  const m = metrics(w, day)
  const c = w.customers.find((c) => c.id === customerId) ?? w.customers[0]
  if (type === 'summary')
    return {
      ...common,
      headers: ['Metric', 'Value'],
      hint: 'All-time amounts, except collections this month.',
      rows: [
        ['Credit issued (INR)', rupees(m.issued)],
        ['Collected (INR)', rupees(m.collected)],
        ['Outstanding (INR)', rupees(m.outstanding)],
        ['Overdue (INR)', rupees(m.overdue)],
        ['Collections this month (INR)', rupees(m.month)],
        ['Pending requests', m.pending],
        ['Active customers', m.active],
        ['Collection rate', m.rate === null ? '—' : m.rate + '%'],
      ],
    }
  if (type === 'aging')
    return {
      ...common,
      headers: ['Aging bucket', 'Accounts', 'Outstanding (INR)'],
      hint: 'Open credit as of the report date.',
      rows: aging(w, day).map((b) => [b.label, b.count, rupees(b.amount)]),
    }
  if (type === 'outstanding')
    return {
      ...common,
      headers: ['ID', 'Customer', 'Description', 'Due date', 'Status', 'Outstanding (INR)'],
      hint: 'Approved accounts with an unpaid balance.',
      rows: rows
        .filter((a) => a.balance > 0)
        .map((a) => [
          a.request.id,
          w.customers.find((c) => c.id === a.request.customerId)!.name,
          a.request.purpose,
          a.request.due,
          a.state,
          rupees(a.balance),
        ]),
    }
  const s = customerStats(w, c.id, day)
  const entries = w.ledger
    .filter(
      (e) =>
        type === 'history' ||
        (type === 'collections' && e.kind === 'repayment') ||
        (type === 'issued' && e.kind === 'issue') ||
        (type === 'statement' && w.requests.some((r) => r.id === e.requestId && r.customerId === c.id)),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
  return {
    ...common,
    headers: ['Posting ID', 'Credit ID', 'Date', 'Customer', 'Description', 'Entry', 'Amount (INR)'],
    hint:
      type === 'statement'
        ? `${c.name} · ${money(s.balance)} outstanding`
        : 'All posted ledger entries for this report.',
    rows: entries.map((e) => {
      const r = w.requests.find((r) => r.id === e.requestId)!
      return [
        e.id,
        r.id,
        eventDay(e.at),
        w.customers.find((c) => c.id === r.customerId)!.name,
        r.purpose,
        e.kind,
        rupees(e.amount),
      ]
    }),
  }
}
const cell = (v: string | number) => {
  const s = String(v)
  // Prefix formula triggers, including inputs with leading whitespace.
  return '"' + (/^(?:\s*[=+@-]|[\t\r\n])/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
}
export function csv(data: Report) {
  return (
    '\uFEFF' +
    [[data.disclaimer], [data.title, data.merchant, data.day], [data.hint], data.headers, ...data.rows]
      .map((row) => row.map(cell).join(','))
      .join('\r\n') +
    '\r\n'
  )
}
