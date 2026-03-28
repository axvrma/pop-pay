'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Client-side auth callback handler.
 * With implicit flow, Supabase returns tokens in the URL hash (#access_token=...).
 * This page detects the session from the URL and redirects to /dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // detectSessionInUrl: true means the client auto-reads the hash tokens
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        // Listen for the auth state change (hash is processed async)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe()
              router.replace('/dashboard')
            } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
              subscription.unsubscribe()
              router.replace('/login?error=auth_failed')
            }
          }
        )

        // Safety timeout — if nothing happens in 8s, send to login
        setTimeout(() => {
          subscription.unsubscribe()
          router.replace('/login?error=timeout')
        }, 8000)
      }
    })
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--page-bg)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: '#00FF87' }}
        >
          <span className="text-black font-black text-xl">P</span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Signing you in…
        </p>
      </div>
    </div>
  )
}
