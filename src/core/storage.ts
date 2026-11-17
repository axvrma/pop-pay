import Dexie, { liveQuery, type Table } from 'dexie'
import type { Command, MerchantId, Snapshot } from './model'
import { uid } from './model'
import { apply, validate } from './ledger'
import { seed } from './seed'

type Saved = { id: 'demo'; data: Snapshot }
export class DemoDB extends Dexie {
  declare snapshot: Table<Saved, 'demo'>
  constructor(name: string) {
    super(name)
    // V1 stored the same document without the revision used to reset UI state in V2.
    this.version(1).stores({ snapshot: 'id' })
    this.version(2)
      .stores({ snapshot: 'id' })
      .upgrade((tx) =>
        tx
          .table('snapshot')
          .toCollection()
          .modify((row) => {
            row.data.revision ??= uid()
          }),
      )
  }
}
export interface DemoStore {
  mode: 'persistent' | 'temporary'
  read(): Promise<Snapshot>
  watch(next: (s: Snapshot) => void, error: (e: unknown) => void): () => void
  run(merchant: MerchantId, revision: string, cmd: Command, opId: string): Promise<Snapshot>
  reset(): Promise<Snapshot>
}
function update(s: Snapshot, merchant: MerchantId, revision: string, cmd: Command, opId: string) {
  if (s.revision !== revision) throw new Error('The demo was reset. Reopen the action to continue.')
  const w = s.merchants.find((m) => m.id === merchant)
  if (!w) throw new Error('Workspace unavailable.')
  apply(w, cmd, opId)
  return validate(s)
}
export function temporaryStore(): DemoStore {
  let data = seed(undefined, uid())
  const listeners = new Set<(s: Snapshot) => void>()
  const read = () => structuredClone(data)
  const publish = () => {
    for (const next of listeners) next(read())
    return read()
  }
  return {
    mode: 'temporary',
    read: async () => read(),
    watch(next) {
      listeners.add(next)
      next(read())
      return () => {
        listeners.delete(next)
      }
    },
    async run(merchant, revision, cmd, opId) {
      data = update(read(), merchant, revision, cmd, opId)
      return publish()
    },
    async reset() {
      data = seed(undefined, uid())
      return publish()
    },
  }
}
export async function openDemo(db = new DemoDB('poppay-local')): Promise<DemoStore> {
  try {
    await db.open()
    await db.transaction('rw', db.snapshot, async () => {
      if (!(await db.snapshot.get('demo')))
        await db.snapshot.add({ id: 'demo', data: seed(undefined, uid()) })
    })
  } catch {
    db.close()
    return temporaryStore()
  }
  const read = async () => validate((await db.snapshot.get('demo'))?.data)
  return {
    mode: 'persistent',
    read,
    watch(next, error) {
      const sub = liveQuery(read).subscribe({ next, error })
      return () => sub.unsubscribe()
    },
    run: (merchant, revision, cmd, opId) =>
      db.transaction('rw', db.snapshot, async () => {
        const data = update(await read(), merchant, revision, cmd, opId)
        await db.snapshot.put({ id: 'demo', data })
        return data
      }),
    reset: () =>
      db.transaction('rw', db.snapshot, async () => {
        const data = seed(undefined, uid())
        await db.snapshot.put({ id: 'demo', data })
        return data
      }),
  }
}
