import { z } from 'zod'

import { MAX_PAISE } from './limits'
export const key = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/)
export const paise = z.number().int().min(1).max(MAX_PAISE)
export const date = z.iso.date()
const instant = z.iso.datetime({ precision: 3 })
export const status = z.enum(['pending', 'approved', 'rejected', 'cancelled'])
export const origin = z.enum(['merchant', 'customer', 'assistant'])
export const merchantIds = ['kirana', 'cafe', 'boutique'] as const
export const merchantId = z.enum(merchantIds)
export const templateIds = ['friendly', 'due', 'overdue', 'thanks'] as const
export type Template = (typeof templateIds)[number]
const message = z.string().trim().min(1).max(600)
const title = z.string().trim().min(1).max(100)
const description = z.string().trim().min(1).max(120)
const customer = z.strictObject({ id: key, name: title, since: date, limit: paise })
const request = z.strictObject({
  id: key,
  customerId: key,
  amount: paise,
  purpose: description,
  due: date,
  createdAt: instant,
  source: origin,
  status,
  decisionAt: instant.optional(),
})
const entry = z.strictObject({
  id: key,
  requestId: key,
  kind: z.enum(['issue', 'repayment']),
  amount: paise,
  at: instant,
  source: origin,
})
const note = z.strictObject({
  id: key,
  customerId: key,
  kind: z.enum(['note', 'reminder']),
  text: message,
  at: instant,
})
const result = z.strictObject({ kind: z.enum(['request', 'entry', 'note', 'template']), id: key })
const op = z.strictObject({ id: key, fingerprint: z.string().max(2000), result })
export const workspaceSchema = z.strictObject({
  id: merchantId,
  name: title,
  category: title,
  location: title,
  customers: z.array(customer),
  requests: z.array(request),
  ledger: z.array(entry),
  notes: z.array(note),
  operations: z.array(op),
  templates: z.partialRecord(z.enum(templateIds), message),
})
export const snapshotSchema = z.strictObject({
  anchor: date,
  revision: key,
  merchants: z.array(workspaceSchema).length(3),
})
const createFields = { customerId: key, amount: paise, purpose: description, due: date, source: origin }
export const commandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('create'), ...createFields }),
  z.strictObject({
    kind: z.literal('decide'),
    requestId: key,
    decision: z.enum(['approved', 'rejected', 'cancelled']),
  }),
  z.strictObject({ kind: z.literal('repay'), requestId: key, amount: paise, source: origin }),
  z.strictObject({ kind: z.literal('note'), customerId: key, text: message }),
  z.strictObject({ kind: z.literal('reminder'), customerId: key, template: z.enum(templateIds) }),
  z.strictObject({ kind: z.literal('template'), template: z.enum(templateIds), text: message }),
])
export type MerchantId = z.infer<typeof merchantId>
export type Workspace = z.infer<typeof workspaceSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type Request = z.infer<typeof request>
export type Customer = z.infer<typeof customer>
export type Entry = z.infer<typeof entry>
export type Command = z.infer<typeof commandSchema>
export type Result = z.infer<typeof result>

export function uid() {
  return crypto.randomUUID()
}
