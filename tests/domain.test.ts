import { describe, expect, it } from 'vitest'
import { seed } from '../src/core/seed'
import { account, aging, apply, customerStats, metrics, reconcile, validate } from '../src/core/ledger'
import { money, parseMoney, plusDays } from '../src/core/format'
import type { Command } from '../src/core/model'

const day = '2026-11-17'
const at = day + 'T06:00:00.000Z'
const data = () => seed(day)
const create: Command = {
  kind: 'create',
  amount: 50_050,
  customerId: 'kirana-c1',
  due: plusDays(day, 14),
  purpose: 'Groceries',
  source: 'customer',
}

describe('credit engine', () => {
  it('posts only an approved request, supports exact partial repayments and settles to zero', () => {
    const w = data().merchants[0]
    const baseline = metrics(w, day)
    const result = apply(w, create, 'fresh', at)
    expect(result).toEqual({ kind: 'request', id: 'fresh' })
    const r = w.requests.find((r) => r.id === result.id)!
    expect(account(w, r, day).state).toBe('pending')
    expect(metrics(w, day).outstanding).toBe(baseline.outstanding)
    apply(w, { kind: 'decide', requestId: r.id, decision: 'approved' }, 'approve', at)
    expect(metrics(w, day).outstanding).toBe(baseline.outstanding + 50_050)
    apply(w, { kind: 'repay', requestId: r.id, amount: 20_001, source: 'customer' }, 'part', at)
    expect(account(w, r, day)).toMatchObject({ balance: 30_049, state: 'partially repaid' })
    apply(w, { kind: 'repay', requestId: r.id, amount: 30_049, source: 'merchant' }, 'full', at)
    expect(account(w, r, day)).toMatchObject({ balance: 0, state: 'settled' })
    expect(metrics(w, day)).toMatchObject({
      outstanding: baseline.outstanding,
      week: baseline.week + 50_050,
      month: baseline.month + 50_050,
    })
    expect(reconcile(w)).toBe(true)
  })
  it.each(['cancelled', 'rejected'] as const)('does not issue credit for a %s request', (decision) => {
    const w = data().merchants[0]
    const r = w.requests.find((r) => r.id === 'kirana-pending-1')!
    apply(w, { kind: 'decide', requestId: r.id, decision }, 'decline', at)
    expect(account(w, r, day)).toMatchObject({ state: decision, issued: 0, balance: 0 })
    expect(() => apply(w, { kind: 'decide', requestId: r.id, decision: 'approved' }, 'new', at)).toThrow(
      'Only pending',
    )
    expect(() =>
      apply(w, { kind: 'repay', requestId: r.id, amount: 100, source: 'merchant' }, 'new', at),
    ).toThrow('Only approved')
  })
  it('deduplicates retries and rejects conflicting reuse, invalid amounts, overpayment and double settlement', () => {
    const w = data().merchants[0]
    const requestId = 'kirana-open-1'
    const command = { kind: 'repay', requestId, amount: 20_000, source: 'merchant' } as const
    expect(apply(w, command, 'retry', at)).toEqual(apply(w, command, 'retry', at))
    expect(w.ledger.filter((e) => e.id === 'retry')).toHaveLength(1)
    expect(() => apply(w, { ...command, amount: 10 }, 'retry', at)).toThrow('already been used')
    expect(() => apply(w, { ...command, amount: -100 }, 'negative', at)).toThrow()
    expect(() => apply(w, { ...command, amount: 395_001 }, 'overpay', at)).toThrow('cannot exceed')
    apply(w, { ...command, amount: 395_000 }, 'full', at)
    expect(() => apply(w, command, 'duplicate', at)).toThrow('already settled')
    expect(reconcile(w)).toBe(true)
  })
  it('checks customer limits, merchant isolation and due dates', () => {
    const [w, other] = data().merchants
    expect(() => apply(other, create, 'invalid', at)).toThrow('this workspace')
    expect(() => apply(w, { ...create, due: plusDays(day, -1) }, 'invalid', at)).toThrow('due date')
    expect(() => apply(w, { ...create, amount: 2_000_000 }, 'invalid', at)).toThrow('credit limit')
    apply(w, { ...create, amount: 1_400_000 }, 'too-much', at)
    expect(() =>
      apply(w, { kind: 'decide', requestId: 'too-much', decision: 'approved' }, 'invalid', at),
    ).toThrow('exceed')
    expect(() =>
      apply(
        w,
        { kind: 'decide', requestId: 'kirana-pending-1', decision: 'approved' },
        'invalid',
        plusDays(day, 30) + 'T06:00:00.000Z',
      ),
    ).toThrow('passed')
    expect(other.ledger.some((e) => e.id === 'too-much')).toBe(false)
  })
  it('reconciles totals, aging and trust from seed data without hidden balances', () => {
    const s = validate(data())
    const w = s.merchants[0]
    expect(aging(w, day).map((a) => a.amount)).toEqual([2_085_000, 660_000, 850_000, 0, 1_270_000])
    expect(metrics(w, day)).toMatchObject({
      outstanding: 4_865_000,
      overdue: 2_780_000,
      pending: 3,
      active: 6,
    })
    expect(customerStats(w, 'kirana-c1', day)).toMatchObject({ balance: 415_000, score: 100 })
    const r = w.requests[0]
    expect(account(w, r, r.due).state).toBe('partially repaid')
    expect(account(w, r, plusDays(r.due, 1)).state).toBe('overdue')
    w.ledger.push({ ...w.ledger[0], id: 'bad' })
    expect(() => validate(s)).toThrow('could not be verified')
  })
  it('uses integer paise even with decimal input and Indian grouping', () => {
    expect(parseMoney('0.10') + parseMoney('0.20')).toBe(30)
    expect(parseMoney('125500.05')).toBe(12_550_005)
    expect(money(12_550_005)).toBe('₹1,25,500.05')
    for (const invalid of ['0', '3e2', '2.010', '-1', '1000000.01'])
      expect(() => parseMoney(invalid)).toThrow()
  })
})
