import type { Request, Template, Workspace } from './model'
import { dayDiff, eventDay, money, plusDays, today } from './format'

export function account(w: Workspace, r: Request, day = today()) {
  const entries = w.ledger.filter((e) => e.requestId === r.id)
  const issued = entries.filter((e) => e.kind === 'issue').reduce((s, e) => s + e.amount, 0)
  const repaid = entries.filter((e) => e.kind === 'repayment').reduce((s, e) => s + e.amount, 0)
  const balance = issued - repaid
  const late = dayDiff(day, r.due)
  const state =
    r.status !== 'approved'
      ? r.status
      : balance === 0
        ? 'settled'
        : late > 0
          ? 'overdue'
          : repaid > 0
            ? 'partially repaid'
            : 'active'
  return { request: r, entries, issued, repaid, balance, late, state }
}
export function accounts(w: Workspace, day = today()) {
  return w.requests.map((r) => account(w, r, day))
}
export function customerStats(w: Workspace, id: string, day = today()) {
  const records = w.requests.filter((r) => r.customerId === id).map((r) => account(w, r, day))
  const totals = records.reduce(
    (s, a) => ({
      issued: s.issued + a.issued,
      repaid: s.repaid + a.repaid,
      balance: s.balance + a.balance,
      overdue: s.overdue + (a.late > 0 ? a.balance : 0),
    }),
    { issued: 0, repaid: 0, balance: 0, overdue: 0 },
  )
  const relevant = records.filter((a) => a.issued > 0 && (a.late > 0 || a.balance === 0))
  const onTime = relevant.filter(
    (a) =>
      a.balance === 0 &&
      a.entries.filter((e) => e.kind === 'repayment').every((e) => eventDay(e.at) <= a.request.due),
  ).length
  const settled = relevant.filter((a) => a.balance === 0).length
  const score = relevant.length ? Math.round((onTime * 70 + settled * 30) / relevant.length) : null
  return { ...totals, score, relevant: relevant.length, onTime, settled, records }
}
export function metrics(w: Workspace, day = today()) {
  const records = accounts(w, day)
  const issued = records.reduce((n, a) => n + a.issued, 0)
  const collected = records.reduce((n, a) => n + a.repaid, 0)
  const postings = w.ledger.filter((e) => e.kind === 'repayment' && eventDay(e.at) <= day)
  const since = (start: string) =>
    postings.reduce((n, e) => n + (eventDay(e.at) >= start ? e.amount : 0), 0)
  return {
    issued,
    collected,
    outstanding: issued - collected,
    overdue: records.reduce((n, a) => n + (a.late > 0 ? a.balance : 0), 0),
    month: since(day.slice(0, 7) + '-01'),
    week: since(plusDays(day, -((new Date(day).getUTCDay() + 6) % 7))),
    pending: records.filter((a) => a.state === 'pending').length,
    active: new Set(records.filter((a) => a.balance > 0).map((a) => a.request.customerId)).size,
    rate: issued ? Math.round((100 * collected) / issued) : null,
  }
}
export const agingLabels = ['Current', '1–7 days', '8–30 days', '31–60 days', 'Over 60 days']
export function aging(w: Workspace, day = today()) {
  const bins = agingLabels.map((label) => ({ label, amount: 0, count: 0 }))
  for (const a of accounts(w, day).filter((a) => a.balance > 0)) {
    const bin = bins[a.late <= 0 ? 0 : a.late <= 7 ? 1 : a.late <= 30 ? 2 : a.late <= 60 ? 3 : 4]
    bin.amount += a.balance
    bin.count++
  }
  return bins
}
export function trends(w: Workspace, day = today()) {
  return Array.from({ length: 6 }, (_, i) => {
    const end = plusDays(day, -7 * (5 - i))
    const from = plusDays(end, -6)
    let issued = 0,
      collected = 0
    for (const e of w.ledger) {
      const date = eventDay(e.at)
      if (date >= from && date <= end) {
        if (e.kind === 'issue') issued += e.amount
        else collected += e.amount
      }
    }
    return { from, end, issued, collected }
  })
}
export const templates: Record<Template, { label: string; text: string }> = {
  friendly: {
    label: 'Friendly reminder',
    text: 'Hi {name}, a quick reminder from {merchant}: your demo udhaar balance is {balance}. Thanks!',
  },
  due: {
    label: 'Payment due today',
    text: 'Hi {name}, your fictional credit due today at {merchant} is {today}. Thank you.',
  },
  overdue: {
    label: 'Overdue follow-up',
    text: 'Hi {name}, the demo ledger at {merchant} shows {overdue} past due. Let us know if you have a question.',
  },
  thanks: {
    label: 'Thank-you after settlement',
    text: 'Hi {name}, thanks for settling your demo credit with {merchant}. We appreciate you!',
  },
}
export function reminderText(w: Workspace, customerId: string, template: Template, day = today()) {
  const c = w.customers.find((c) => c.id === customerId)
  if (!c) throw new Error('Choose a customer in this workspace.')
  const s = customerStats(w, c.id, day)
  const fields: Record<string, string> = {
    name: c.name,
    merchant: w.name,
    balance: money(s.balance),
    overdue: money(s.overdue),
    today: money(s.records.filter((a) => a.late === 0).reduce((n, a) => n + a.balance, 0)),
  }
  return (w.templates[template] ?? templates[template].text)
    .replace(/\{(name|merchant|balance|overdue|today)\}/g, (_, field: string) => fields[field])
    .slice(0, 600)
}
export function activity(w: Workspace) {
  const events = w.requests.flatMap((r) => {
    const c = w.customers.find((c) => c.id === r.customerId)!
    const a = account(w, r)
    let remaining = a.issued
    return [
      {
        id: r.id,
        at: r.createdAt,
        label: 'Credit requested',
        name: c.name,
        requestId: r.id,
        customerId: c.id,
        amount: r.amount,
      },
      ...(r.decisionAt
        ? [
            {
              id: r.id + '-decision',
              at: r.decisionAt,
              label: 'Request ' + r.status,
              name: c.name,
              requestId: r.id,
              customerId: c.id,
              amount: r.amount,
            },
          ]
        : []),
      ...a.entries
        .filter((e) => e.kind === 'repayment')
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((e) => {
          remaining -= e.amount
          return {
            id: e.id,
            at: e.at,
            label: remaining === 0 ? 'Credit settled' : 'Repayment recorded',
            name: c.name,
            requestId: r.id,
            customerId: c.id,
            amount: e.amount,
          }
        }),
    ]
  })
  return events.sort((a, b) => b.at.localeCompare(a.at))
}
