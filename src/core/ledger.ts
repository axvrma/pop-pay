import { commandSchema, key, snapshotSchema } from './model'
import type { Command, Entry, Result, Snapshot, Workspace } from './model'
import { eventDay, money } from './format'
import { account, customerStats, reminderText } from './queries'

export * from './queries'

export function apply(w: Workspace, unsafe: Command, opId: string, at = new Date().toISOString()): Result {
  const parsed = commandSchema.safeParse(unsafe)
  if (!parsed.success || !key.safeParse(opId).success)
    throw new Error('Check the information and try again.')
  const cmd = parsed.data
  const fingerprint = JSON.stringify(cmd)
  const existing = w.operations.find((o) => o.id === opId)
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new Error('This operation ID has already been used for another action.')
    return existing.result
  }
  const day = eventDay(at)
  let result: Result
  if (cmd.kind === 'create') {
    const c = w.customers.find((c) => c.id === cmd.customerId)
    if (!c) throw new Error('Choose a customer in this workspace.')
    if (cmd.due < day) throw new Error('The due date must be today or later.')
    if (cmd.amount > c.limit) throw new Error(`This customer's demo credit limit is ${money(c.limit)}.`)
    w.requests.push({ ...cmdToRequest(cmd), id: opId, createdAt: at, status: 'pending' })
    result = { kind: 'request', id: opId }
  } else if (cmd.kind === 'decide') {
    const r = w.requests.find((r) => r.id === cmd.requestId)
    if (!r || r.status !== 'pending') throw new Error('Only pending requests can be changed.')
    if (cmd.decision === 'approved') {
      const c = w.customers.find((c) => c.id === r.customerId)!
      if (r.due < day)
        throw new Error('This due date has passed. Cancel this request and create a new one.')
      if (customerStats(w, c.id, day).balance + r.amount > c.limit)
        throw new Error('Approving would exceed this customer’s demo credit limit.')
      w.ledger.push({ id: opId, requestId: r.id, kind: 'issue', amount: r.amount, at, source: 'merchant' })
    }
    r.status = cmd.decision
    r.decisionAt = at
    result = { kind: 'request', id: r.id }
  } else if (cmd.kind === 'repay') {
    const r = w.requests.find((r) => r.id === cmd.requestId)
    if (!r || r.status !== 'approved') throw new Error('Only approved credit can receive a repayment.')
    const a = account(w, r, day)
    if (!a.balance) throw new Error('This credit is already settled.')
    if (cmd.amount > a.balance) throw new Error(`Repayment cannot exceed ${money(a.balance)}.`)
    w.ledger.push({
      id: opId,
      requestId: r.id,
      kind: 'repayment',
      amount: cmd.amount,
      at,
      source: cmd.source,
    })
    result = { kind: 'entry', id: opId }
  } else if (cmd.kind === 'template') {
    w.templates[cmd.template] = cmd.text
    result = { kind: 'template', id: cmd.template }
  } else {
    if (!w.customers.some((c) => c.id === cmd.customerId))
      throw new Error('Choose a customer in this workspace.')
    const text = cmd.kind === 'note' ? cmd.text : reminderText(w, cmd.customerId, cmd.template, day)
    w.notes.push({ id: opId, customerId: cmd.customerId, kind: cmd.kind, text, at })
    result = { kind: 'note', id: opId }
  }
  w.operations.push({ id: opId, fingerprint, result })
  return result
}
function cmdToRequest(cmd: Extract<Command, { kind: 'create' }>) {
  const { customerId, amount, purpose, due, source } = cmd
  return { customerId, amount, purpose, due, source }
}
const unique = (rows: { id: string }[]) => new Set(rows.map((r) => r.id)).size === rows.length
export function reconcile(w: Workspace) {
  if (![w.customers, w.requests, w.ledger, w.notes, w.operations].every(unique)) return false
  const customers = new Set(w.customers.map((c) => c.id))
  if (w.notes.some((n) => !customers.has(n.customerId))) return false
  const requests = new Map(w.requests.map((r) => [r.id, r]))
  const entries = new Map<string, Entry[]>()
  for (const e of w.ledger) {
    if (!requests.has(e.requestId)) return false
    const list = entries.get(e.requestId) ?? []
    list.push(e)
    entries.set(e.requestId, list)
  }
  return w.requests.every((r) => {
    if (!customers.has(r.customerId) || r.due < eventDay(r.createdAt)) return false
    if (r.status === 'pending' ? r.decisionAt !== undefined : !r.decisionAt || r.decisionAt < r.createdAt)
      return false
    const lines = entries.get(r.id) ?? []
    if (r.status !== 'approved') return lines.length === 0
    const issues = lines.filter((e) => e.kind === 'issue')
    if (issues.length !== 1 || issues[0].amount !== r.amount || issues[0].at !== r.decisionAt) return false
    const payments = lines.filter((e) => e.kind === 'repayment')
    return (
      payments.every((e) => e.at >= issues[0].at) &&
      payments.reduce((sum, e) => sum + e.amount, 0) <= r.amount
    )
  })
}
export function validate(data: unknown): Snapshot {
  const checked = snapshotSchema.safeParse(data)
  if (!checked.success || !unique(checked.data.merchants) || !checked.data.merchants.every(reconcile))
    throw new Error('The saved demo ledger could not be verified.')
  return checked.data
}
