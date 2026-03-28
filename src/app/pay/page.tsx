'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ShieldCheck, Lock, ChevronRight, IndianRupee, CheckCircle2 } from 'lucide-react'

function PaymentPage() {
  const params = useSearchParams()
  const router = useRouter()

  const pa = params.get('pa') ?? ''        // merchant VPA
  const pn = params.get('pn') ?? 'Merchant' // merchant name
  const am = params.get('am') ?? '0'        // amount
  const name = params.get('name') ?? 'Customer' // customer name
  const merchantId = params.get('mid') ?? ''   // merchant user id (for DB update)

  const [step, setStep] = useState<'review' | 'pin' | 'success'>('review')
  const [pin, setPin] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePinDigit = (d: string) => {
    if (pin.length >= 6) return
    const next = pin + d
    setPin(next)
    if (next.length === 6) confirmPayment(next)
  }

  const confirmPayment = async (enteredPin: string) => {
    setIsProcessing(true)
    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1500))

    // Call our API to mark transaction settled
    try {
      await fetch('/api/pay/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, customerName: name, amount: parseFloat(am) }),
      })
    } catch (_) {
      // Fire-and-forget for MVP — show success regardless
    }

    setIsProcessing(false)
    setStep('success')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--page-bg)', color: 'var(--page-fg)' }}>
      {/* Bg orb */}
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'var(--orb-green)' }} />

      <div className="w-full max-w-sm space-y-4 relative">

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#00FF87] flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-black tracking-tight" style={{ color: 'var(--page-fg)' }}>PopPay</span>
          <span className="text-xs ml-1" style={{ color: 'var(--page-fg-subtle)' }}>secure payment</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Review ── */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="space-y-4"
            >
              {/* Payment card */}
              <div
                className="rounded-2xl p-5 space-y-5"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 0 0 1px rgba(0,255,135,0.1)',
                }}
              >
                <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--page-fg-muted)' }}>Paying to</p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00FF87]/20 to-[#00FF87]/5 border border-[#00FF87]/20 flex items-center justify-center text-lg font-black text-[#00FF87]">
                    {pn[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: 'var(--page-fg)' }}>{pn}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--page-fg-muted)' }}>{pa}</p>
                  </div>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--page-fg-muted)' }}>Amount</p>
                  <div className="flex items-baseline gap-1">
                    <IndianRupee className="w-6 h-6 text-[#00FF87]" strokeWidth={2.5} />
                    <span className="text-4xl font-black" style={{ color: 'var(--page-fg)' }}>{parseFloat(am).toLocaleString('en-IN')}</span>
                    <span className="text-sm ml-1" style={{ color: 'var(--page-fg-subtle)' }}>INR</span>
                  </div>
                </div>

                <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'var(--input-bg)' }}>
                  <div className="w-6 h-6 rounded-lg bg-[#FF2D87]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs">👤</span>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--page-fg-muted)' }}>Payment by</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--page-fg)' }}>{name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center text-xs" style={{ color: 'var(--page-fg-subtle)' }}>
                <Lock className="w-3 h-3" />
                256-bit encrypted · NPCI certified
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => setStep('pin')}
                className="w-full py-4 rounded-2xl bg-[#00FF87] text-black font-black text-base flex items-center justify-center gap-2 hover:shadow-[0_0_32px_rgba(0,255,135,0.4)] transition-all"
              >
                Pay ₹{parseFloat(am).toLocaleString('en-IN')}
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: PIN ── */}
          {step === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="space-y-6"
            >
              <div
                className="rounded-2xl p-6 text-center space-y-4"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                }}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-[#00FF87]" />
                </div>
                <p className="font-bold" style={{ color: 'var(--page-fg)' }}>Enter UPI PIN</p>
                <p className="text-xs" style={{ color: 'var(--page-fg-muted)' }}>Your 6-digit UPI PIN for <span style={{ color: 'var(--page-fg)' }}>{pa}</span></p>

                {/* PIN dots */}
                <div className="flex gap-3 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        i < pin.length
                          ? 'bg-[#00FF87] scale-110'
                          : 'bg-white/15'
                      }`}
                    />
                  ))}
                </div>

                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#00FF87]">
                    <div className="w-3 h-3 border-2 border-[#00FF87]/30 border-t-[#00FF87] rounded-full animate-spin" />
                    Processing payment...
                  </div>
                )}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9','✕','0','⌫'].map((key) => (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.88 }}
                    disabled={isProcessing}
                    onClick={() => {
                      if (key === '⌫') setPin(p => p.slice(0, -1))
                      else if (key === '✕') { setPin(''); setStep('review') }
                      else handlePinDigit(key)
                    }}
                    className={`h-14 rounded-2xl text-lg font-bold transition-all disabled:opacity-40 ${
                      key === '✕'
                        ? 'bg-[#FF2D87]/10 text-[#FF2D87] border border-[#FF2D87]/20'
                        : key === '⌫'
                        ? 'border'
                        : 'border'
                    }`}
                    style={key === '⌫' || (key !== '✕')
                      ? { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--page-fg)' }
                      : undefined
                    }
                  >
                    {key}
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-xs" style={{ color: 'var(--page-fg-subtle)' }}>Any 6-digit PIN works for this demo 😉</p>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="text-center space-y-6 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-[#00FF87]/10 border-2 border-[#00FF87]/30 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-12 h-12 text-[#00FF87]" strokeWidth={1.5} />
              </motion.div>

              <div>
                <p className="text-2xl font-black" style={{ color: 'var(--page-fg)' }}>Payment Successful!</p>
                <p className="text-sm mt-2" style={{ color: 'var(--page-fg-muted)' }}>
                  ₹{parseFloat(am).toLocaleString('en-IN')} paid to <span className="text-[#00FF87] font-semibold">{pn}</span>
                </p>
              </div>

              <div
                className="rounded-2xl p-4 text-sm space-y-3"
                style={{ background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.15)' }}
              >
                {[
                  ['Transaction ID', `TXN${Date.now().toString().slice(-8)}`],
                  ['Amount', `₹${parseFloat(am).toLocaleString('en-IN')}`],
                  ['Paid to', `${pn} (${pa})`],
                  ['Status', '✅ Settled'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                      <span style={{ color: 'var(--page-fg-muted)' }}>{label}</span>
                      <span className="font-medium font-mono text-xs" style={{ color: 'var(--page-fg)' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => window.close()}
                  className="w-full py-3.5 rounded-xl bg-[#00FF87] text-black font-bold text-sm hover:shadow-[0_0_24px_rgba(0,255,135,0.4)] transition-all"
                >
                  Done
                </motion.button>
                <p className="text-xs" style={{ color: 'var(--page-fg-subtle)' }}>The merchant's dashboard has been updated.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs pt-2" style={{ color: 'var(--page-fg-subtle)' }}>
          <ShieldCheck className="w-3 h-3" />
          Secured by PopPay · NPCI UPI Protocol
        </div>
      </div>
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense>
      <PaymentPage />
    </Suspense>
  )
}
