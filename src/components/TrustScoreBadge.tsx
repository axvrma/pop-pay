'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, TrendingUp, Clock, Repeat, Zap, Info } from 'lucide-react'

export type TrustGrade = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'D'

interface TrustScoreData {
  score: number
  grade: TrustGrade
  factors: {
    repayment_rate: number
    avg_amount_score: number
    frequency_score: number
    recency_score: number
    settlement_speed_score: number
    total_transactions: number
    settled_count: number
    approved_count: number
    pending_count: number
    avg_days_to_settle: number | null
  }
  label: string
  color: string
}

interface TrustScoreBadgeProps {
  customerId: string
  /** Optional pre-loaded data (from DB cache) */
  prefill?: TrustScoreData | null
}

const GRADE_CONFIG: Record<TrustGrade, { color: string; bg: string; border: string; ring: string; label: string }> = {
  AAA: { color: '#00FF87', bg: 'rgba(0,255,135,0.08)',  border: 'rgba(0,255,135,0.25)',  ring: '#00FF87', label: 'Excellent'  },
  AA:  { color: '#00D4FF', bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.25)',  ring: '#00D4FF', label: 'Very Good'  },
  A:   { color: '#A8FF00', bg: 'rgba(168,255,0,0.08)',  border: 'rgba(168,255,0,0.25)',  ring: '#A8FF00', label: 'Good'       },
  B:   { color: '#FFD700', bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.25)',  ring: '#FFD700', label: 'Fair'       },
  C:   { color: '#FF8C00', bg: 'rgba(255,140,0,0.08)',  border: 'rgba(255,140,0,0.25)',  ring: '#FF8C00', label: 'Poor'       },
  D:   { color: '#FF2D87', bg: 'rgba(255,45,135,0.08)', border: 'rgba(255,45,135,0.25)', ring: '#FF2D87', label: 'High Risk'  },
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 20
  const circ = 2 * Math.PI * radius
  const dash = (score / 100) * circ

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      {/* Track */}
      <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
      {/* Progress */}
      <motion.circle
        cx="26" cy="26" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        transform="rotate(-90 26 26)"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
      />
      <text x="26" y="31" textAnchor="middle" fontSize="13" fontWeight="800" fill="white" fontFamily="Space Grotesk, Inter, sans-serif">
        {score}
      </text>
    </svg>
  )
}

function FactorBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-white/60 text-[10px] font-medium">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <span className="text-[10px] font-bold text-white/80">{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  )
}

export function TrustScoreBadge({ customerId, prefill }: TrustScoreBadgeProps) {
  const [data, setData] = useState<TrustScoreData | null>(prefill ?? null)
  const [loading, setLoading] = useState(!prefill)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefill) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/trust-score/${customerId}`)
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // Silent fail — no trust score shown
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [customerId, prefill])

  // Close tooltip on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    if (showTooltip) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTooltip])

  if (loading) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
        <div className="space-y-1">
          <div className="w-16 h-2.5 rounded bg-white/5 animate-pulse" />
          <div className="w-10 h-2 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const cfg = GRADE_CONFIG[data.grade]

  return (
    <div className="relative mt-2" ref={tooltipRef}>
      {/* Badge Row */}
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => setShowTooltip(v => !v)}
        className="flex items-center gap-2.5 w-full text-left rounded-xl px-2 py-1.5 transition-colors hover:bg-white/5"
        style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
        aria-label={`Trust score: ${data.score} ${data.grade}`}
      >
        <ScoreRing score={data.score} color={cfg.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
            <span className="text-xs font-bold" style={{ color: cfg.color }}>
              {data.grade}
            </span>
            <span className="text-[10px] text-white/50">·</span>
            <span className="text-[10px] text-white/50">{cfg.label}</span>
          </div>
          <div className="text-[10px] text-white/35 mt-0.5">
            {data.factors.total_transactions} txns · {data.factors.settled_count} settled
          </div>
        </div>
        <Info className="w-3.5 h-3.5 text-white/25 shrink-0" />
      </motion.button>

      {/* Breakdown Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl p-3 space-y-2.5"
            style={{
              background: 'rgba(12,12,12,0.97)',
              border: `1px solid ${cfg.border}`,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.border}`,
            }}
          >
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Score Breakdown</p>
            
            <FactorBar label="Repayment Rate"    value={data.factors.repayment_rate}         icon={Repeat}    color={cfg.color} />
            <FactorBar label="Amount Profile"    value={data.factors.avg_amount_score}        icon={TrendingUp} color={cfg.color} />
            <FactorBar label="Frequency"         value={data.factors.frequency_score}         icon={Zap}       color={cfg.color} />
            <FactorBar label="Recent Activity"   value={data.factors.recency_score}           icon={Clock}     color={cfg.color} />
            <FactorBar label="Settlement Speed"  value={data.factors.settlement_speed_score}  icon={Shield}    color={cfg.color} />

            <div className="border-t border-white/8 pt-2 flex items-center justify-between text-[10px] text-white/30">
              <span>{data.factors.total_transactions} total · {data.factors.approved_count} active · {data.factors.settled_count} settled</span>
              {data.factors.avg_days_to_settle && (
                <span>~{data.factors.avg_days_to_settle}d avg repay</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
