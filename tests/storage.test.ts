import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { DemoDB, openDemo } from '../src/core/storage'
import { seed } from '../src/core/seed'
import { plusDays, today } from '../src/core/format'
import type { Command } from '../src/core/model'

const dbs: DemoDB[] = []
function db(name: string = crypto.randomUUID()) {
  const item = new DemoDB(name)
  dbs.push(item)
  return item
}
afterEach(async () => {
  const names = new Set(dbs.map((db) => db.name))
  dbs.splice(0).forEach((db) => db.close())
  for (const name of names) await Dexie.delete(name)
})
const command: Command = {
  kind: 'create',
  amount: 125_050,
  customerId: 'kirana-c1',
  due: plusDays(today(), 7),
  source: 'merchant',
  purpose: 'Persistence test',
}
describe('IndexedDB store', () => {
  it('seeds exactly once across concurrent opens and persists on reconnect', async () => {
    const original = db()
    const [first, second] = await Promise.all([openDemo(original), openDemo(db(original.name))])
    const initial = await first.read()
    expect(initial.merchants).toHaveLength(3)
    expect((await second.read()).revision).toBe(initial.revision)
    await first.run('kirana', initial.revision, command, 'work')
    original.close()
    const reopened = await openDemo(db(original.name))
    expect((await reopened.read()).merchants[0].requests.find((r) => r.id === 'work')).toMatchObject({
      amount: 125_050,
    })
    const reset = await reopened.reset()
    expect(reset.merchants).toEqual(seed(reset.anchor).merchants)
    expect(reset.revision).not.toBe(initial.revision)
    await expect(reopened.run('kirana', initial.revision, command, 'late')).rejects.toThrow('was reset')
  })
  it('migrates a v1 snapshot without deleting financial records', async () => {
    const target = db()
    const v1 = new Dexie(target.name)
    v1.version(1).stores({ snapshot: 'id' })
    await v1.open()
    const legacy = seed()
    await v1
      .table('snapshot')
      .add({ id: 'demo', data: { anchor: legacy.anchor, merchants: legacy.merchants } })
    v1.close()
    const store = await openDemo(target)
    const upgraded = await store.read()
    expect(upgraded.revision).toBeTruthy()
    expect(upgraded.merchants).toEqual(legacy.merchants)
  })
  it('reports an invalid record and recovers only with an explicit reset', async () => {
    const raw = db()
    const store = await openDemo(raw)
    const data = await store.read()
    data.merchants[0].ledger[0].amount = -1
    await raw.snapshot.put({ id: 'demo', data })
    await expect(store.read()).rejects.toThrow('could not be verified')
    await expect(store.run('kirana', data.revision, command, 'work')).rejects.toThrow()
    expect((await raw.snapshot.get('demo'))?.data.merchants[0].ledger[0].amount).toBe(-1)
    expect((await store.reset()).merchants[0].ledger[0].amount).toBeGreaterThan(0)
  })
  it('has a temporary store if IndexedDB cannot open', async () => {
    const blocked = db()
    blocked.open = () => {
      throw new DOMException('Storage blocked', 'SecurityError')
    }
    const store = await openDemo(blocked)
    expect(store.mode).toBe('temporary')
    const state = await store.read()
    const next = await store.run('kirana', state.revision, command, 'offline')
    expect(next.merchants[0].requests.some((r) => r.id === 'offline')).toBe(true)
    expect(
      (await openDemo(blocked).then((s) => s.read())).merchants[0].requests.some((r) => r.id === 'offline'),
    ).toBe(false)
  })
  it('serializes competing repayments and notifies another db connection of committed state', async () => {
    const d = db()
    const a = await openDemo(d)
    const b = await openDemo(db(d.name))
    const initial = await a.read()
    let stop = () => {}
    const seen = new Promise<void>((resolve, reject) => {
      stop = b.watch((s) => {
        if (s.merchants[0].ledger.some((e) => e.id.startsWith('race-'))) resolve()
      }, reject)
    })
    const repay = {
      kind: 'repay',
      requestId: 'kirana-open-1',
      amount: 415_000,
      source: 'merchant',
    } as const
    const results = await Promise.allSettled([
      a.run('kirana', initial.revision, repay, 'race-one'),
      b.run('kirana', initial.revision, repay, 'race-two'),
    ])
    try {
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
      await seen
    } finally {
      stop()
    }
  })
})
