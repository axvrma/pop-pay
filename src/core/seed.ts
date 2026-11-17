import type { Snapshot, Workspace } from './model'
import { plusDays, today } from './format'

export const personas = [
  {
    id: 'kirana',
    name: 'Sharma Kirana Store',
    category: 'Neighborhood grocery',
    location: 'Jaipur, Rajasthan',
    customers: ['Rahul Sharma', 'Priya Patel', 'Vikram Singh', 'Anjali Desai', 'Mohan Kumar', 'Neha Verma'],
    purposes: [
      'Monthly groceries',
      'Household supplies',
      'Festival groceries',
      'Pantry restock',
      'Weekly groceries',
      'Kitchen essentials',
    ],
  },
  {
    id: 'cafe',
    name: 'Urban Brew Café',
    category: 'Coffee & quick bites',
    location: 'Pune, Maharashtra',
    customers: ['Aarav Mehta', 'Isha Rao', 'Kabir Nair', 'Diya Shah', 'Naina Roy', 'Rohan Kale'],
    purposes: [
      'Team coffee tab',
      'Lunch tab',
      'Event catering',
      'Coffee subscription',
      'Office snacks',
      'Breakfast order',
    ],
  },
  {
    id: 'boutique',
    name: 'CityStyle Boutique',
    category: 'Independent fashion',
    location: 'Surat, Gujarat',
    customers: ['Zoya Malik', 'Kavya Joshi', 'Sana Sheikh', 'Riya Iyer', 'Dev Kapoor', 'Tara Jain'],
    purposes: [
      'Festive order',
      'Alterations',
      'Occasion wear',
      'Accessories',
      'Tailoring balance',
      'Seasonal wardrobe',
    ],
  },
] as const
export function seed(anchor = today(), revision = 'initial'): Snapshot {
  const day = (offset: number) => plusDays(anchor, offset)
  const at = (offset: number) => `${day(offset)}T06:30:00.000Z`
  const merchants = personas.map((p, i): Workspace => {
    const customers = p.customers.map((name, n) => ({
      id: `${p.id}-c${n + 1}`,
      name,
      since: day(-150 + 12 * n),
      limit: (15_000 + n * 1500) * 100,
    }))
    const w: Workspace = {
      id: p.id,
      name: p.name,
      category: p.category,
      location: p.location,
      customers,
      requests: [],
      ledger: [],
      notes: [],
      operations: [],
      templates: {},
    }
    const scale = (r: number) => r * [100, 65, 120][i]
    function add(
      c: number,
      suffix: string,
      amount: number,
      start: number,
      due: number,
      repayments: [number, number][] = [],
      state: 'approved' | 'pending' | 'rejected' = 'approved',
    ) {
      const id = `${p.id}-${suffix}`
      w.requests.push({
        id,
        customerId: customers[c].id,
        amount: scale(amount),
        purpose: p.purposes[c],
        due: day(due),
        createdAt: at(start),
        source: state === 'pending' ? 'customer' : 'merchant',
        status: state,
        ...(state !== 'pending' ? { decisionAt: at(start) } : {}),
      })
      if (state === 'approved') {
        w.ledger.push({
          id: id + '-issue',
          requestId: id,
          kind: 'issue',
          amount: scale(amount),
          at: at(start),
          source: 'merchant',
        })
        repayments.forEach(([date, rupees], n) =>
          w.ledger.push({
            id: id + '-repay-' + n,
            requestId: id,
            kind: 'repayment',
            amount: scale(rupees),
            at: at(date),
            source: n % 2 ? 'merchant' : 'customer',
          }),
        )
      }
    }
    add(0, 'open-1', 6000, -13, 4, [[-4, 1850]])
    add(1, 'open-2', 9000, -19, 2, [[-9, 1500]])
    add(2, 'open-3', 12800, -45, -18, [[-16, 4300]])
    add(3, 'open-4', 12600, -46, -4, [[-36, 6000]])
    add(4, 'open-5', 12700, -110, -64)
    add(5, 'open-6', 9200, -12, 11)
    add(0, 'paid-1', 2400, -39, -31, [[-34, 2400]])
    add(0, 'paid-2', 3800, -20, -9, [[-10, 3800]])
    add(1, 'paid-3', 3200, -33, -26, [[-29, 3200]])
    add(2, 'paid-4', 5500, -26, -17, [
      [-19, 3000],
      [-14, 2500],
    ])
    add(3, 'paid-5', 4100, -9, -2, [[-3, 4100]])
    add(5, 'paid-6', 2100, -7, 3, [[-2, 2100]])
    add(0, 'pending-1', 1250, -1, 14, [], 'pending')
    add(1, 'pending-2', 2400, -2, 15, [], 'pending')
    add(5, 'pending-3', 980, -3, 12, [], 'pending')
    add(4, 'rejected-1', 1600, -4, 8, [], 'rejected')
    w.notes.push({
      id: `${p.id}-note-1`,
      customerId: customers[2].id,
      kind: 'note',
      text: 'Check in after the weekend about the remaining balance.',
      at: at(-5),
    })
    return w
  })
  return { anchor, merchants, revision }
}
