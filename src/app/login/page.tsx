'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Zap, ArrowRight, Mail, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      toast.error('Error sending magic link', { description: error.message })
    } else {
      setSent(true)
      toast.success('Magic link sent!')
    }
    setIsLoading(false)
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
        {/* Logo mark */}
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

        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-gradient-pop mb-2">PopPay</h1>
          <p className="text-sm text-white/40 font-medium">Udhaar, managed like a boss.</p>
        </div>

        {/* Card */}
        <div className="pop-card p-6 glow-green">
          {!sent ? (
            <form onSubmit={handleLogin} className="space-y-5">
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
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>Send Magic Link <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>

              <p className="text-center text-xs text-white/25">
                No password needed. We'll email you a secure link. ✨
              </p>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-[#00FF87]" />
              </div>
              <h3 className="font-bold text-white">Check your inbox!</h3>
              <p className="text-sm text-white/40">
                We sent a magic link to <br />
                <span className="text-[#00FF87] font-medium">{email}</span>
              </p>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          PopPay © 2025 · Built for merchants who mean business.
        </p>
      </motion.div>
    </div>
  )
}
