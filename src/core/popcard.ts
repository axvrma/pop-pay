import { z } from 'zod'
import { date, key, merchantId, paise } from './model'
import type { Request, Workspace } from './model'
import { personas } from './seed'

const payloadSchema = z.tuple([
  z.literal(1),
  key,
  key,
  merchantId,
  z.number().int().min(0).max(5),
  paise,
  date,
])
export type CardSnapshot = {
  id: string
  revision: string
  merchant: string
  customer: string
  amount: number
  due: string
}
export function cardLink(w: Workspace, request: Request, revision: string, origin: string) {
  const i = w.customers.findIndex((c) => c.id === request.customerId)
  const minimal = payloadSchema.parse([1, request.id, revision, w.id, i, request.amount, request.due])
  const encoded = btoa(JSON.stringify(minimal)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  return `${origin}/popcard/${request.id}#card=${encoded}`
}
export function readCard(id: string, hash: string): CardSnapshot | null {
  if (!hash) return null
  try {
    if (!/^#card=[A-Za-z0-9_-]{1,320}$/.test(hash)) throw new Error()
    const raw = JSON.parse(atob(hash.slice(6).replaceAll('-', '+').replaceAll('_', '/')))
    if (Array.isArray(raw) && typeof raw[0] === 'number' && raw[0] !== 1) throw new Error('version')
    const [, requestId, revision, merchant, idx, amount, due] = payloadSchema.parse(raw)
    if (requestId !== id) throw new Error()
    const p = personas.find((p) => p.id === merchant)!
    return { id, revision, merchant: p.name, customer: p.customers[idx], amount, due }
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message === 'version'
        ? 'This PopCard version is unsupported.'
        : 'This PopCard link is incomplete or invalid.',
      { cause: e },
    )
  }
}
