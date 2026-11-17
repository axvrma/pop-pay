import { MAX_PAISE } from './limits'
const dayMs = 86_400_000
const tz = 'Asia/Kolkata'
const indiaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: tz,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const displayDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: tz })
const integer = new Intl.NumberFormat('en-IN')
export const today = (at: Date = new Date()) => indiaDay.format(at)
export const dayDiff = (a: string, b: string) => (Date.parse(a) - Date.parse(b)) / dayMs
export const plusDays = (day: string, n: number) =>
  new Date(Date.parse(day) + n * dayMs).toISOString().slice(0, 10)
export const shortDate = (value: string) => displayDate.format(new Date(value))
export const eventDay = (instant: string) => today(new Date(instant))
export function money(amount: number) {
  const magnitude = Math.abs(amount)
  return `${amount < 0 ? '−' : ''}₹${integer.format(Math.floor(magnitude / 100))}${magnitude % 100 ? '.' + String(magnitude % 100).padStart(2, '0') : ''}`
}
export function rupees(amount: number) {
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`
}
export function parseMoney(input: string) {
  const raw = input.trim()
  if (!/^(?:\d{1,7})(?:\.\d{1,2})?$/.test(raw))
    throw new Error('Enter an amount in rupees with up to two decimal places.')
  const [whole, fraction = ''] = raw.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (amount < 1 || amount > MAX_PAISE) throw new Error('Enter an amount between ₹0.01 and ₹10,00,000.')
  return amount
}
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
