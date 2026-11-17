import { expect, it } from 'vitest'
import { seed } from '../src/core/seed'
import { answer } from '../src/core/assistant'
import { cardLink, readCard } from '../src/core/popcard'
import { apply, customerStats, metrics } from '../src/core/ledger'
import { money } from '../src/core/format'
import { csv, report } from '../src/core/reports'

const day = '2026-11-17'
const at = day + 'T06:00:00.000Z'
it('round-trips only bounded fictional PopCard data', () => {
  const w = seed(day).merchants[0]
  const r = { ...w.requests[0], purpose: 'never share this purpose' }
  const url = new URL(cardLink(w, r, 'revision-1', 'https://poppay.example'))
  expect(url.search).toBe('')
  expect(readCard(r.id, url.hash)).toEqual({
    id: r.id,
    revision: 'revision-1',
    merchant: w.name,
    customer: 'Rahul Sharma',
    amount: r.amount,
    due: r.due,
  })
  expect(atob(url.hash.slice(6))).not.toContain('purpose')
  expect(readCard(r.id, '')).toBeNull()
  expect(() => readCard('different-id', url.hash)).toThrow('invalid')
  expect(() => readCard(r.id, '#card=' + 'a'.repeat(321))).toThrow('invalid')
  expect(() => readCard(r.id, '#card=' + btoa('[9]').replace(/=+$/, ''))).toThrow('unsupported')
})
it('grounds answers in the active merchant and customer records', () => {
  const [w, cafe] = seed(day).merchants
  for (const m of [w, cafe]) {
    expect(answer('How much is outstanding?', m, day).text).toContain(money(metrics(m, day).outstanding))
    expect(answer('How much did I collect this week?', m, day).text).toContain(money(metrics(m, day).week))
    expect(answer('Show pending credit requests', m, day).table?.rows).toHaveLength(3)
    expect(answer('Show overdue customers', m, day).text).toContain(money(metrics(m, day).overdue))
    expect(answer('Who owes me the most?', m, day).table?.rows.length).toBeGreaterThan(0)
  }
  expect(answer('Outstanding balance for Rahul?', w, day).text).toContain(
    money(customerStats(w, 'kirana-c1', day).balance),
  )
  expect(answer('Record a ₹200 repayment for Rahul', cafe, day).action).toBeUndefined()
  expect(answer('What is tomorrow’s weather?', w, day).text).toContain('I can look up')
})
it('creates no mutation until executing a valid proposed command', () => {
  const w = seed(day).merchants[0]
  const before = structuredClone(w)
  const preview = answer('Record a ₹200.25 repayment for Rahul', w, day)
  expect(preview.action?.command).toMatchObject({
    kind: 'repay',
    requestId: 'kirana-open-1',
    amount: 20_025,
  })
  expect(answer('Record a ₹-200 repayment for Rahul', w, day).action).toBeUndefined()
  expect(answer('Generate a PopCard for ₹500', w, day).action).toBeUndefined()
  expect(answer('Generate a PopCard for ₹500 for Rahul', w, day).action?.command).toMatchObject({
    kind: 'create',
    amount: 50_000,
  })
  expect(answer('Prepare a reminder for Rahul', w, day).action?.command.kind).toBe('reminder')
  expect(w).toEqual(before)
  apply(w, preview.action!.command, 'explicit-confirm', at)
  expect(metrics(w, day).outstanding).toBe(metrics(before, day).outstanding - 20_025)
})
it('exports scoped transactions with a demo disclosure and neutralized formulas', () => {
  const w = seed(day).merchants[0]
  w.requests[0].purpose = '=2+2'
  const statement = report(w, 'statement', day, 'kirana-c1')
  const exported = csv(statement)
  expect(exported).toContain('Fictional PopPay demo data')
  expect(exported).toContain('"\'=2+2"')
  expect(exported).toContain('Rahul Sharma')
  expect(exported).not.toContain('Priya Patel')
  expect(csv(report(w, 'summary', day, 'kirana-c1'))).toContain('48650.00')
})
