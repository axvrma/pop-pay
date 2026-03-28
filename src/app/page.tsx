'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    })
  }, [])

  // Blank loading state while checking session
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--page-bg)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: '#00FF87' }}
        >
          <span className="text-black font-black text-xl">P</span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          PopPay
        </p>
      </div>
    </div>
  )
}
