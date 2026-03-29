'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function RootHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')

    if (code) {
      // PKCE magic link lands here with ?code= — exchange it for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data.session) {
          router.replace('/dashboard')
        } else {
          console.error('[root] code exchange failed:', error?.message)
          router.replace('/login?error=auth_failed')
        }
      })
      return
    }

    // No code — check for an existing session (also picks up implicit #hash tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
        return
      }

      // Listen briefly for implicit flow hash auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            router.replace('/dashboard')
          }
        }
      )

      // Fallback: if no session after 1.5s, go to login
      setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          subscription.unsubscribe()
          router.replace(session ? '/dashboard' : '/login')
        })
      }, 1500)
    })
  }, [])

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

// Suspense is required because useSearchParams reads from the URL
export default function RootPage() {
  return (
    <Suspense>
      <RootHandler />
    </Suspense>
  )
}
