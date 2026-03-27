'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { User, IndianRupee, Bell, ExternalLink, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { PopAI } from '@/components/PopAI'

export default function DashboardPage() {
  const supabase = createClient()
  const [session, setSession] = useState<any>(null)
  
  const [customers, setCustomers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [stats, setStats] = useState({ totalCredit: 0, totalPending: 0, customersCount: 0 })
  const [search, setSearch] = useState('')
  
  // Realtime subscription instance
  const [channel, setChannel] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        initMerchant(session.user).then(() => {
          fetchData(session.user.id)
          setupRealtime(session.user.id)
        })
      }
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  async function initMerchant(user: any) {
    // Auto-create merchant profile for MVP if it doesn't exist
    const { error } = await supabase.from('merchants').upsert({
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0] || 'PopPay Merchant',
      vpa: `${user.email?.split('@')[0]}@ybl` // Dummy VPA
    }, { onConflict: 'id' })
    if (error) console.error("Error auto-creating merchant:", error)
  }

  async function fetchData(merchantId: string) {
    // Fetch customers
    const { data: customersData } = await supabase
      .from('customers')
      .select('*, transactions(*)')
      .eq('merchant_id', merchantId)
    
    // Process stats
    let totalCredit = 0
    let customersArray: any[] = []
    
    if (customersData) {
      customersArray = customersData.map(c => {
        const approvedTx = c.transactions.filter((t: any) => t.status === 'approved')
        const due = approvedTx.reduce((sum: number, tx: any) => sum + tx.amount, 0)
        totalCredit += due
        return { ...c, totalDue: due }
      })
      setCustomers(customersArray)
    }

    // Fetch pending
    const { data: pendingData } = await supabase
      .from('transactions')
      .select('*, customer:customers(name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      // note: in a real environment RLS takes care of only sending this merchant's requests

    if (pendingData) {
      setPendingRequests(pendingData)
    }

    setStats({
      totalCredit,
      totalPending: pendingData?.reduce((s, t) => s + t.amount, 0) || 0,
      customersCount: customersArray.length
    })
  }

  function setupRealtime(merchantId: string) {
    const newChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          if (payload.new.status === 'pending') {
            toast('Pulse Received! 🟢', {
              description: 'New Udhaar request received.',
              style: { backgroundColor: '#00FF00', color: '#000' }
            })
            // Refresh data
            fetchData(merchantId)
          }
        }
      )
      .subscribe()
    setChannel(newChannel)
  }

  async function handleApprove(txId: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'approved' })
      .eq('id', txId)
      
    if (error) {
      toast.error('Failed to approve request')
      return
    }

    toast.success('Request Approved! 💸')
    
    // Trigger Sheets Sync (Phase 4 integration hook)
    fetch('/api/sheets/sync', {
      method: 'POST',
      body: JSON.stringify({ txId })
    }).catch(e => console.error("Sheet sync error", e))
    
    if (session) fetchData(session.user.id)
  }

  async function handleSettle(txId: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'settled' })
      .eq('id', txId)
      
    if (!error) {
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FF00', '#FF00FF']
      })
      toast.success('Amount Settled! ✨')
      if (session) fetchData(session.user.id)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-[#00FF00] uppercase italic tracking-tighter">Command Center</h1>
            <p className="text-gray-400">Manage your Udhaar empire.</p>
          </div>
          <Button 
            variant="outline" 
            className="border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black gap-2"
            onClick={() => window.open(`/request/${session?.user.id}`, '_blank')}
          >
            <ExternalLink size={16} /> QR Portal
          </Button>
        </header>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-950 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Udhaar</CardTitle>
              <IndianRupee className="h-4 w-4 text-[#00FF00]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">₹{stats.totalCredit}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-950 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pending Requests</CardTitle>
              <Bell className="h-4 w-4 text-[#FF00FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">₹{stats.totalPending}</div>
              <p className="text-xs text-[#FF00FF] mt-1">{pendingRequests.length} requests waiting</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-950 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Customers</CardTitle>
              <User className="h-4 w-4 text-[#00FF00]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.customersCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          
          {/* Left / Main: The Data Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Customers</h2>
              <Input
                placeholder="Search name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs bg-gray-950 border-gray-800 focus-visible:ring-[#00FF00] rounded-xl"
              />
            </div>
            
            <Card className="bg-gray-950 border-gray-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Phone</TableHead>
                    <TableHead className="text-right text-gray-400">Total Dues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 && (
                    <TableRow className="border-gray-800 hover:bg-gray-900/50">
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredCustomers.map((c) => (
                    <TableRow key={c.id} className="border-gray-800 hover:bg-gray-900/50">
                      <TableCell className="font-medium text-white">{c.name}</TableCell>
                      <TableCell className="text-gray-400">{c.phone}</TableCell>
                      <TableCell className="text-right">
                        <span className={c.totalDue > 0 ? 'text-[#FF00FF] font-bold font-mono' : 'text-gray-500 font-mono'}>
                          ₹{c.totalDue}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Right Sidebar: Pending Approvals */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex gap-2 items-center">
              Action Required <Badge className="bg-[#FF00FF]">{pendingRequests.length}</Badge>
            </h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {pendingRequests.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center p-8 border border-dashed border-gray-800 rounded-xl text-gray-500"
                  >
                    All caught up! ✨
                  </motion.div>
                )}
                {pendingRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-gray-950 border-[#00FF00]/30 shadow-[0_0_10px_rgba(0,255,0,0.05)] pt-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#00FF00]"></div>
                      <CardContent className="space-y-4 pl-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-white">{req.customer.name}</h3>
                            <p className="text-sm text-gray-400">{req.reason}</p>
                          </div>
                          <div className="text-xl font-bold text-[#00FF00] font-mono">
                            ₹{req.amount}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="bg-[#00FF00] text-black hover:bg-[#00FF00]/80 w-full font-bold"
                            onClick={() => handleApprove(req.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
      
      {/* PopAI Chat Bubble */}
      <PopAI merchantVpa="vpa@upi" merchantName="Merchant" />
    </div>
  )
}
