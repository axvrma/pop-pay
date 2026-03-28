// ============================================================
// PopPay Trust Score Engine
// Computes a 0–100 trust score from a customer's transaction history
// ============================================================

export type TrustGrade = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'D'

export interface TrustScoreFactors {
  repayment_rate: number        // 0–100: % of approved txns that were settled
  avg_amount_score: number      // 0–100: lower avg relative to history = safer
  frequency_score: number       // 0–100: consistent borrow-repay cycles
  recency_score: number         // 0–100: recent settlements boost score
  settlement_speed_score: number // 0–100: faster repayment = better
  total_transactions: number
  settled_count: number
  approved_count: number
  pending_count: number
  avg_days_to_settle: number | null
}

export interface TrustScoreResult {
  score: number           // 0–100
  grade: TrustGrade
  factors: TrustScoreFactors
  computed_at: string
  label: string           // human-readable label for the grade
  color: string           // CSS hex color
}

export interface Transaction {
  id: string
  amount: number
  status: 'pending' | 'approved' | 'settled'
  created_at: string
  decision_deadline?: string
}

// ── Grade thresholds ──────────────────────────────────────────
const GRADE_MAP: { threshold: number; grade: TrustGrade; label: string; color: string }[] = [
  { threshold: 85, grade: 'AAA', label: 'Excellent',   color: '#00FF87' },
  { threshold: 70, grade: 'AA',  label: 'Very Good',   color: '#00D4FF' },
  { threshold: 55, grade: 'A',   label: 'Good',        color: '#A8FF00' },
  { threshold: 40, grade: 'B',   label: 'Fair',        color: '#FFD700' },
  { threshold: 25, grade: 'C',   label: 'Poor',        color: '#FF8C00' },
  { threshold: 0,  grade: 'D',   label: 'High Risk',   color: '#FF2D87' },
]

function getGrade(score: number): { grade: TrustGrade; label: string; color: string } {
  for (const g of GRADE_MAP) {
    if (score >= g.threshold) return { grade: g.grade, label: g.label, color: g.color }
  }
  return { grade: 'D', label: 'High Risk', color: '#FF2D87' }
}

// ── Factor: Repayment Rate (40%) ─────────────────────────────
function computeRepaymentRate(transactions: Transaction[]): number {
  const closable = transactions.filter(t => t.status === 'approved' || t.status === 'settled')
  if (closable.length === 0) {
    // No history — neutral score for new customers
    return 50
  }
  const settled = closable.filter(t => t.status === 'settled').length
  return Math.round((settled / closable.length) * 100)
}

// ── Factor: Amount Score (20%) ──────────────────────────────
// Lower average amounts relative to history → higher trust
function computeAmountScore(transactions: Transaction[]): number {
  const amounts = transactions.map(t => t.amount)
  if (amounts.length === 0) return 50
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
  // Scale: ₹0–₹500 → 100, ₹500–₹2000 → 80-60, ₹2000–₹5000 → 60-30, >₹5000 → 10
  if (avg <= 300) return 100
  if (avg <= 500) return 90
  if (avg <= 1000) return 75
  if (avg <= 2000) return 60
  if (avg <= 3500) return 40
  if (avg <= 5000) return 25
  return 10
}

// ── Factor: Frequency Score (15%) ──────────────────────────
// Healthy borrow-repay cycle: 2–6 transactions per month is ideal
function computeFrequencyScore(transactions: Transaction[]): number {
  if (transactions.length === 0) return 50
  if (transactions.length === 1) return 40

  const dates = transactions.map(t => new Date(t.created_at).getTime()).sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24)
  if (totalDays === 0) return 60

  const perMonth = (transactions.length / totalDays) * 30
  // Ideal: 2–5 per month
  if (perMonth >= 2 && perMonth <= 5) return 90
  if (perMonth >= 1 && perMonth < 2) return 75
  if (perMonth > 5 && perMonth <= 8) return 65
  if (perMonth < 1) return 55
  return 40 // very high frequency = risky
}

// ── Factor: Recency Score (15%) ─────────────────────────────
// Recent settlements in last 30 days boost score
function computeRecencyScore(transactions: Transaction[]): number {
  const settled = transactions.filter(t => t.status === 'settled')
  if (settled.length === 0) return 30

  const sortedSettled = settled
    .map(t => new Date(t.created_at).getTime())
    .sort((a, b) => b - a)

  const mostRecent = sortedSettled[0]
  const daysSince = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24)

  if (daysSince <= 7) return 100
  if (daysSince <= 14) return 88
  if (daysSince <= 30) return 75
  if (daysSince <= 60) return 55
  if (daysSince <= 90) return 40
  return 25
}

// ── Factor: Settlement Speed Score (10%) ─────────────────────
// Faster repayment = more trustworthy
function computeSettlementSpeed(transactions: Transaction[]): { score: number; avgDays: number | null } {
  const settled = transactions.filter(t => t.status === 'settled')
  if (settled.length === 0) return { score: 40, avgDays: null }

  // Use created_at as proxy (in real system, we'd have settled_at timestamp)
  // For now use a heuristic: settled txns with recent created_at = faster
  // We rely on stored factors for actual avg_days_to_settle
  const avgDays: number | null = null

  // Fallback: give medium score when we don't have settlement timestamps
  return { score: 65, avgDays }
}

// ── Main Engine ───────────────────────────────────────────────
export function computeTrustScore(transactions: Transaction[]): TrustScoreResult {
  const settled = transactions.filter(t => t.status === 'settled')
  const approved = transactions.filter(t => t.status === 'approved')
  const pending = transactions.filter(t => t.status === 'pending')

  const repaymentRate      = computeRepaymentRate(transactions)
  const avgAmountScore     = computeAmountScore(transactions)
  const frequencyScore     = computeFrequencyScore(transactions)
  const recencyScore       = computeRecencyScore(transactions)
  const { score: settlementSpeedScore, avgDays } = computeSettlementSpeed(transactions)

  // Weighted composite score
  const score = Math.round(
    repaymentRate      * 0.40 +
    avgAmountScore     * 0.20 +
    frequencyScore     * 0.15 +
    recencyScore       * 0.15 +
    settlementSpeedScore * 0.10
  )

  const clampedScore = Math.max(0, Math.min(100, score))
  const { grade, label, color } = getGrade(clampedScore)

  const factors: TrustScoreFactors = {
    repayment_rate:         repaymentRate,
    avg_amount_score:       avgAmountScore,
    frequency_score:        frequencyScore,
    recency_score:          recencyScore,
    settlement_speed_score: settlementSpeedScore,
    total_transactions:     transactions.length,
    settled_count:          settled.length,
    approved_count:         approved.length,
    pending_count:          pending.length,
    avg_days_to_settle:     avgDays,
  }

  return {
    score: clampedScore,
    grade,
    factors,
    computed_at: new Date().toISOString(),
    label,
    color,
  }
}

// ── Utility: Score from stored factors (from DB) ─────────────
export function getTrustMeta(score: number): { grade: TrustGrade; label: string; color: string } {
  return getGrade(score)
}
