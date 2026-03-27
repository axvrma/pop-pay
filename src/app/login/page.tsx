'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error('Error sending magic link', {
        description: error.message,
      })
    } else {
      toast.success('Magic link sent!', {
        description: 'Check your email for the login link.',
      })
      setEmail('')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <Card className="w-full max-w-sm border-[#00FF00] bg-black text-white p-2">
        <CardHeader>
          <CardTitle className="text-2xl text-[#00FF00]">Merchant Login</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your email to receive a magic link to access your PopPay command center.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#00FF00]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-800 bg-gray-950 focus-visible:ring-[#00FF00]"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#00FF00] text-black hover:bg-[#00FF00]/80 transition-colors font-bold"
              disabled={isLoading}
            >
              {isLoading ? 'Sending Link...' : 'Send Magic Link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
