'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Zap, ArrowRight, Mail, Sparkles, RotateCcw } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [code, setCode]       = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const supabase = createClient()

  /* ── Step 1: send OTP ─────────────────────────────────────────── */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },   // no emailRedirectTo — token code only
    })

    if (error) {
      toast.error('Could not send code', { description: error.message })
    } else {
      setSent(true)
      toast.success('6-digit code sent to your inbox!')
    }
    setIsLoading(false)
  }

  /* ── Step 2: verify 6-digit code ─────────────────────────────── */
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const token = code.join('')
    if (token.length < 6) return

    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      toast.error('Invalid code', { description: error.message })
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } else {
      toast.success('Logged in! 🎉')
      router.replace('/dashboard')
    }
    setVerifying(false)
  }

  /* ── OTP box key handler ──────────────────────────────────────── */
  function handleDigit(val: string, idx: number) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[idx] = digit
    setCode(next)
    if (digit && idx < 5) inputs.current[idx + 1]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    setCode([...digits, ...Array(6 - digits.length).fill('')])
    inputs.current[Math.min(digits.length, 5)]?.focus()
  }

  return (
    <div className="animated-gradient min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background orbs */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-[#00FF87]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-[#FF2D87]/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#00FF87] flex items-center justify-center glow-green-lg">
              <Zap className="w-7 h-7 text-black" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF2D87] flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-gradient-pop mb-2">PopPay</h1>
          <p className="text-sm text-white/40 font-medium">Udhaar, managed like a boss.</p>
        </div>

        <div className="pop-card p-6 glow-green">
          <AnimatePresence mode="wait">

            {/* ── EMAIL STEP ── */}
            {!sent && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                onSubmit={handleSend}
                className="space-y-5"
              >
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Merchant Login</p>
                  <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#00FF87]/50 focus:ring-2 focus:ring-[#00FF87]/20 transition-all"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading || !email}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className="w-full py-3 rounded-xl bg-[#00FF87] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_rgba(0,255,135,0.4)]"
                >
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    : <><Mail className="w-4 h-4" /> Send Code <ArrowRight className="w-4 h-4" /></>
                  }
                </motion.button>

                <p className="text-center text-xs text-white/25">
                  We'll email you a 6-digit code. No password needed. ✨
                </p>
              </motion.form>
            )}

            {/* ── CODE STEP ── */}
            {sent && (
              <motion.form
                key="code"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                onSubmit={handleVerify}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-[#00FF87]" />
                  </div>
                  <p className="text-sm font-semibold text-white">Enter the 6-digit code</p>
                  <p className="text-xs text-white/40 mt-1">
                    Sent to <span className="text-[#00FF87]">{email}</span>
                  </p>
                </div>

                {/* 6 digit boxes */}
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigit(e.target.value, i)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className="w-11 h-12 rounded-xl text-center text-xl font-black text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#00FF87]/60 focus:ring-2 focus:ring-[#00FF87]/20 transition-all caret-transparent"
                    />
                  ))}
                </div>

                <motion.button
                  type="submit"
                  disabled={verifying || code.join('').length < 6}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className="w-full py-3 rounded-xl bg-[#00FF87] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_rgba(0,255,135,0.4)]"
                >
                  {verifying
                    ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    : <>Verify & Sign In <ArrowRight className="w-4 h-4" /></>
                  }
                </motion.button>

                <button
                  type="button"
                  onClick={() => { setSent(false); setCode(['', '', '', '', '', '']) }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Use a different email
                </button>
              </motion.form>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          PopPay © 2025 · Built for merchants who mean business.
        </p>
      </motion.div>
    </div>
  )
}
