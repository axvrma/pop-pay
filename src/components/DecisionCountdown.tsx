'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Timer, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface DecisionCountdownProps {
  deadline: string // ISO timestamp
}

interface TimeLeft {
  totalMs: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

function getTimeLeft(deadline: string): TimeLeft {
  const target = new Date(deadline).getTime()
  const now = Date.now()
  const diff = target - now

  if (diff <= 0) {
    return { totalMs: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  return {
    totalMs: diff,
    hours:   Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function DecisionCountdown({ deadline }: DecisionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  // Urgency levels
  const isExpired  = timeLeft.expired
  const isCritical = !isExpired && timeLeft.totalMs < 2 * 60 * 60 * 1000   // < 2h
  const isWarning  = !isExpired && timeLeft.totalMs < 8 * 60 * 60 * 1000   // < 8h
  const isHealthy  = !isExpired && !isCritical && !isWarning

  const color = isExpired ? '#666' : isCritical ? '#FF2D87' : isWarning ? '#FFD700' : '#00FF87'
  const bg    = isExpired ? 'rgba(255,255,255,0.04)'
              : isCritical ? 'rgba(255,45,135,0.08)'
              : isWarning  ? 'rgba(255,215,0,0.08)'
              : 'rgba(0,255,135,0.06)'
  const border = isExpired ? 'rgba(255,255,255,0.08)'
               : isCritical ? 'rgba(255,45,135,0.25)'
               : isWarning  ? 'rgba(255,215,0,0.25)'
               : 'rgba(0,255,135,0.15)'

  if (isExpired) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 mt-1"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <AlertTriangle className="w-3 h-3 text-white/30" />
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
          Decision Window Expired
        </span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 rounded-lg px-2 py-1 mt-1"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* Pulsing dot for critical */}
      {isCritical ? (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
      ) : (
        <Timer className="w-3 h-3 shrink-0" style={{ color }} />
      )}

      <div className="flex items-baseline gap-0.5">
        <span className="text-[10px] text-white/40 mr-1">Decide in</span>

        {timeLeft.hours > 0 && (
          <>
            <span
              className="text-xs font-black tabular-nums"
              style={{ color, fontFamily: 'Space Grotesk, monospace' }}
            >
              {pad(timeLeft.hours)}
            </span>
            <span className="text-[9px] text-white/30 mr-0.5">h</span>
          </>
        )}

        <span
          className="text-xs font-black tabular-nums"
          style={{ color, fontFamily: 'Space Grotesk, monospace' }}
        >
          {pad(timeLeft.minutes)}
        </span>
        <span className="text-[9px] text-white/30 mr-0.5">m</span>

        <span
          className="text-xs font-black tabular-nums"
          style={{ color, fontFamily: 'Space Grotesk, monospace' }}
        >
          {pad(timeLeft.seconds)}
        </span>
        <span className="text-[9px] text-white/30">s</span>
      </div>

      {isCritical && (
        <span
          className="ml-auto text-[9px] font-bold uppercase tracking-wider animate-pulse"
          style={{ color }}
        >
          Urgent!
        </span>
      )}
    </motion.div>
  )
}
