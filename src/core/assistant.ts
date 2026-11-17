import { accounts, customerStats, metrics, reminderText } from './ledger'
import { money, parseMoney, plusDays, shortDate } from './format'
import type { Command, Workspace } from './model'

type TableData = { headers: string[]; rows: string[][] }
export type Reply = {
  text: string
  table?: TableData
  action?: { label: string; command: Command; details: string[] }
}
export const prompts = [
  'How much is outstanding?',
  'Who owes me the most?',
  'Show overdue customers',
  'How much did I collect this week?',
  'Show pending credit requests',
  'Which customers pay on time?',
]

function lookup(input: string, w: Workspace) {
  const tokens = input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const full = w.customers.filter((c) =>
    (' ' + tokens.join(' ') + ' ').includes(' ' + c.name.toLowerCase() + ' '),
  )
  if (full.length === 1) return full[0]
  const hits = w.customers.filter((c) =>
    c.name
      .toLowerCase()
      .split(' ')
      .some((name) => tokens.includes(name)),
  )
  return hits.length === 1 ? hits[0] : null
}

function amountFrom(input: string) {
  const matches = [...input.matchAll(/(?:₹\s*|\b(?:inr|rs)\.?\s*)?([+-]?\d[\d,]*(?:\.\d+)?)/gi)]
  if (/[+-]\s+\d/.test(input) || matches.length !== 1)
    throw new Error('Include exactly one amount, such as ₹500 or ₹200.50.')
  const amount = matches[0][1]
  if (
    amount.includes(',') &&
    !/^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(amount)
  )
    throw new Error('Check the amount’s comma placement.')
  return parseMoney(amount.replaceAll(',', ''))
}

export function answer(input: string, w: Workspace, day: string): Reply {
  const q = input.toLowerCase().trim()
  const m = metrics(w, day)
  const c = lookup(input, w)
  const s = c ? customerStats(w, c.id, day) : null
  const customers = w.customers.map((c) => ({ c, ...customerStats(w, c.id, day) }))
  const records = accounts(w, day)
  const create = /\b(generate|create|make|prepare)\b/.test(q) && /\b(popcard|credit request)\b/.test(q)
  const repay = /\b(record|post|simulate)\b/.test(q) && /\b(repayment|payment)\b/.test(q)
  const remind = /\b(prepare|draft|create|write)\b/.test(q) && /\breminder\b/.test(q)
  if ([create, repay, remind].filter(Boolean).length > 1)
    return { text: 'Ask for one action at a time so you can review each change.' }
  if (create || repay || remind) {
    if (!c || !s)
      return {
        text: `I need one customer from ${w.name}. Try “${create ? 'Generate a PopCard for ₹500 for' : repay ? 'Record a ₹200 repayment for' : 'Prepare a reminder for'} ${w.customers[0].name}”.`,
      }
    if (remind) {
      const template = s.overdue ? 'overdue' : 'friendly'
      return {
        text: 'I prepared a draft from the current ledger. You can save it locally after reviewing it.',
        action: {
          label: 'Save reminder draft',
          command: { kind: 'reminder', customerId: c.id, template },
          details: [reminderText(w, c.id, template, day), 'This draft will not be sent.'],
        },
      }
    }
    try {
      const amount = amountFrom(q)
      if (create) {
        if (amount > c.limit) return { text: `That exceeds ${c.name}’s demo limit of ${money(c.limit)}.` }
        const due = plusDays(day, 14)
        return {
          text: 'Review the PopCard before adding it to the request queue.',
          action: {
            label: 'Generate PopCard',
            command: {
              kind: 'create',
              customerId: c.id,
              source: 'assistant',
              amount,
              purpose: 'PopAI credit request',
              due,
            },
            details: [
              `${c.name} · ${money(amount)} · Due ${shortDate(due)}`,
              'Creates a pending request. Approval is separate.',
            ],
          },
        }
      }
      const open = s.records.filter((a) => a.balance > 0)
      if (!open.length) return { text: `${c.name} has no open balance in this workspace.` }
      if (open.length > 1)
        return {
          text: `${c.name} has multiple open accounts. Open the exact record in Credit ledger to avoid posting to the wrong balance.`,
          table: {
            headers: ['Credit', 'Outstanding'],
            rows: open.map((a) => [a.request.purpose, money(a.balance)]),
          },
        }
      const [a] = open
      if (amount > a.balance)
        return {
          text: `The repayment exceeds the ${money(a.balance)} outstanding on ${a.request.purpose}.`,
        }
      return {
        text: 'Review this repayment before it is posted.',
        action: {
          label: 'Record repayment',
          command: { kind: 'repay', source: 'assistant', requestId: a.request.id, amount },
          details: [
            `${c.name} · ${a.request.purpose} · ${money(amount)}`,
            `Current balance ${money(a.balance)}. No money moves.`,
          ],
        },
      }
    } catch (e) {
      return { text: e instanceof Error ? e.message : 'Check the amount and try again.' }
    }
  }
  if (/\b(approve|reject|cancel|delete|reset|send|settle|transfer)\b/.test(q))
    return {
      text: 'PopAI can prepare a PopCard, draft a reminder or preview a simulated repayment. Manage approvals, settlements and resets from the workspace.',
    }
  if (/pending|awaiting review/.test(q)) {
    const pending = records.filter((a) => a.state === 'pending')
    return {
      text: `${m.pending} pending ${m.pending === 1 ? 'request' : 'requests'} at ${w.name}.`,
      ...(pending.length && {
        table: {
          headers: ['Customer', 'Requested', 'Due'],
          rows: pending.map((a) => [
            w.customers.find((c) => c.id === a.request.customerId)!.name,
            money(a.request.amount),
            shortDate(a.request.due),
          ]),
        },
      }),
    }
  }
  if (/overdue|past due/.test(q)) {
    const late = customers.filter((x) => x.overdue > 0).sort((a, b) => b.overdue - a.overdue)
    return c && s
      ? { text: `${c.name} has ${money(s.overdue)} past due.` }
      : {
          text: `${money(m.overdue)} is overdue across ${late.length} ${late.length === 1 ? 'customer' : 'customers'} at ${w.name}.`,
          ...(late.length && {
            table: {
              headers: ['Customer', 'Overdue'],
              rows: late.map((x) => [x.c.name, money(x.overdue)]),
            },
          }),
        }
  }
  if (/\b(on time|on-time|reliable|trust)\b/.test(q)) {
    const list = customers
      .filter((x) => x.relevant > 0 && (!c || c.id === x.c.id))
      .sort((a, b) => b.onTime / b.relevant - a.onTime / a.relevant)
    return list.length
      ? {
          text: 'On-time settlement from the local ledger. Only settled or overdue accounts count.',
          table: {
            headers: ['Customer', 'Settled on time', 'Eligible accounts'],
            rows: list.map((x) => [x.c.name, String(x.onTime), String(x.relevant)]),
          },
        }
      : { text: 'There is no eligible settlement history yet.' }
  }
  if (/owe[s]? (me )?the most|largest (balance|debtor)|top balance/.test(q)) {
    const list = customers.filter((x) => x.balance > 0).sort((a, b) => b.balance - a.balance)
    return list.length
      ? {
          text: `${list[0].c.name} has the largest open balance: ${money(list[0].balance)}.`,
          table: {
            headers: ['Customer', 'Outstanding'],
            rows: list.map((x) => [x.c.name, money(x.balance)]),
          },
        }
      : { text: 'No customers have an open balance.' }
  }
  if (/collect(ed|ions)?|repaid/.test(q)) {
    if (/rate/.test(q))
      return {
        text:
          m.rate === null
            ? 'No credit has been issued yet.'
            : `${w.name} has collected ${m.rate}% of all issued credit (${money(m.collected)} of ${money(m.issued)}).`,
      }
    const period = /\b(this |current )?week\b/.test(q)
      ? 'this week'
      : /\b(this |current )?month\b/.test(q)
        ? 'this month'
        : 'all time'
    if (/\b(last|previous|yesterday|today|quarter|year)\b/.test(q) || (c && period !== 'all time'))
      return {
        text: 'I can report merchant collections for this week, this month or all time. Customer repayment totals are all time.',
      }
    const amount =
      c && s ? s.repaid : period === 'this week' ? m.week : period === 'this month' ? m.month : m.collected
    return { text: `${c ? c.name : w.name} recorded ${money(amount)} in repayments (${period}).` }
  }
  if (!c && /\bfor\s+|\bdoes\b/.test(q) && /outstanding|balance|owe/.test(q))
    return {
      text: 'Name one customer from this workspace, or ask for the merchant’s total outstanding balance.',
    }
  if (/outstanding|balance|how much.*owe/.test(q))
    return {
      text: `${c ? c.name : w.name} has ${money(s?.balance ?? m.outstanding)} outstanding across approved credit.`,
    }
  return {
    text: 'I can look up balances, overdue accounts, collections, repayment reliability and pending requests. I can also prepare a reminder, PopCard or repayment for you to confirm.',
  }
}
