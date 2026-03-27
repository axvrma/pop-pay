'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function RequestCreditPage() {
  const params = useParams()
  const merchant_id = params.merchant_id as string
  const supabase = createClient()

  const [merchantName, setMerchantName] = useState('Merchant')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    amount: '',
    reason: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Fetch merchant name on load
  useEffect(() => {
    async function fetchMerchant() {
      if (!merchant_id) return
      const { data, error } = await supabase
        .from('merchants')
        .select('display_name')
        .eq('id', merchant_id)
        .single()
      
      if (data && !error) {
        setMerchantName(data.display_name)
      }
    }
    fetchMerchant()
  }, [merchant_id, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 1. Create or Find Customer
      // For this public MVP, we'll try to find by phone + merchant_id, otherwise create.
      let customerId = ''
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('merchant_id', merchant_id)
        .eq('phone', formData.phone)
        .single()
      
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const { data: newCustomer, error: customerErr } = await supabase
          .from('customers')
          .insert({
            merchant_id,
            name: formData.name,
            phone: formData.phone
          })
          .select('id')
          .single()
          
        if (customerErr) throw customerErr
        customerId = newCustomer.id
      }

      // 2. Insert Transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          customer_id: customerId,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          status: 'pending'
        })
      
      if (txError) throw txError

      // Trigger "Pulse" notification functionally done via Supabase Realtime catching this insert on the merchant dashboard
      toast.success('Request Sent!', {
        description: `Your request for ₹${formData.amount} has been sent to ${merchantName}.`
      })
      setIsSuccess(true)
    } catch (err: any) {
      toast.error('Failed to submit request', {
        description: err.message || 'Something went wrong.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-24 h-24 bg-[#00FF00] rounded-full flex items-center justify-center mx-auto text-black text-4xl mb-6">
            ✓
          </div>
          <h1 className="text-3xl font-bold text-[#00FF00]">Sent to {merchantName}!</h1>
          <p className="text-gray-400">They will review your Udhaar request soon.</p>
          <Button 
            className="mt-6 bg-transparent border border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black"
            onClick={() => {
              setFormData({ name: '', phone: '', amount: '', reason: '' })
              setIsSuccess(false)
            }}
          >
            Submit Another Request
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#00FF00] mb-2 uppercase italic">PopPay</h1>
          <p className="text-gray-400">Request Udhaar from <span className="text-[#FF00FF] font-semibold">{merchantName}</span></p>
        </div>

        <Card className="border-[#00FF00] bg-black text-white rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.15)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#00FF00] uppercase text-xs font-bold tracking-wider">Your Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Rahul"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-gray-800 bg-gray-950/50 text-white focus-visible:ring-[#00FF00] rounded-xl h-12 text-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#00FF00] uppercase text-xs font-bold tracking-wider">Phone Number</Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="border-gray-800 bg-gray-950/50 text-white focus-visible:ring-[#00FF00] rounded-xl h-12 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[#00FF00] uppercase text-xs font-bold tracking-wider">Amount (₹)</Label>
                <Input
                  id="amount"
                  required
                  type="number"
                  min="1"
                  placeholder="500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="border-gray-800 bg-gray-950/50 text-white focus-visible:ring-[#00FF00] rounded-xl h-12 text-lg font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-[#00FF00] uppercase text-xs font-bold tracking-wider">Reason</Label>
                <Input
                  id="reason"
                  placeholder="e.g. Chai and Samosa"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="border-gray-800 bg-gray-950/50 text-white focus-visible:ring-[#00FF00] rounded-xl h-12 text-lg"
                />
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#00FF00] text-black hover:bg-[#00FF00]/80 h-14 rounded-xl text-lg font-bold uppercase tracking-widest mt-4"
                >
                  {isSubmitting ? 'Sending Pulse...' : 'Send Request'}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
