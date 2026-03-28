'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { PopAI } from '@/components/PopAI'
import { ThemeToggle } from '@/components/ThemeProvider'
import { TrustScoreBadge } from '@/components/TrustScoreBadge'
import { DecisionCountdown } from '@/components/DecisionCountdown'
import {
  IndianRupee, Bell, Users, ExternalLink, CheckCheck,
  TrendingUp, Search, Zap, Clock, Sparkles, ChevronRight, XCircle, Banknote
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<any>(null)
  const [merchantId, setMerchantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [stats, setStats] = useState({ totalCredit: 0, totalPending: 0, customersCount: 0 })
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Not logged in — send to login page
        router.replace('/login')
        return
      }
      setSession(session)
      setMerchantId(session.user.id)
      setLoading(false)
      initMerchant(session.user).then(() => {
        fetchData(session.user.id)
        setupRealtime(session.user.id)
      })
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF87] flex items-center justify-center animate-pulse">
            <span className="text-black font-black text-lg">P</span>
          </div>
          <p className="text-sm text-white/40">Loading your empire...</p>
        </div>
      </div>
    )
  }

  async function initMerchant(user: any) {
    const { error } = await supabase.from('merchants').upsert({
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0] || 'PopPay Merchant',
      vpa: `${user.email?.split('@')[0]}@ybl`
    }, { onConflict: 'id' })
    if (error) console.error('Error auto-creating merchant:', error)
  }

  async function fetchData(merchantId: string) {
    const { data: customersData } = await supabase
      .from('customers')
      .select('*, transactions(*)')
      .eq('merchant_id', merchantId)

    let totalCredit = 0
    let customersArray: any[] = []

    if (customersData) {
      customersArray = customersData.map(c => {
        const approvedTxs = c.transactions.filter((t: any) => t.status === 'approved')
        const due = approvedTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0)
        totalCredit += due

        // Repayment due date = most recent approved tx created_at + 30 days
        let dueDate: string | null = null
        if (approvedTxs.length > 0) {
          const latestApproved = approvedTxs
            .map((t: any) => new Date(t.created_at).getTime())
            .sort((a: number, b: number) => b - a)[0]
          dueDate = new Date(latestApproved + 30 * 24 * 60 * 60 * 1000).toISOString()
        }

        return { ...c, totalDue: due, dueDate }
      })
      setCustomers(customersArray)
    }

    const { data: pendingData } = await supabase
      .from('transactions')
      .select('*, customer:customers(id, name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingData) setPendingRequests(pendingData)

    setStats({
      totalCredit,
      totalPending: pendingData?.reduce((s, t) => s + t.amount, 0) || 0,
      customersCount: customersArray.length,
    })
  }

  function setupRealtime(merchantId: string) {
    const newChannel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        if (payload.new.status === 'pending') {
          toast('⚡ New Pulse!', {
            description: 'Udhaar request incoming — check it out.',
            style: { background: '#00FF87', color: '#000', fontWeight: 700 },
          })
          fetchData(merchantId)
        }
      })
      .subscribe()
    setChannel(newChannel)
  }

  async function handleApprove(txId: string) {
    const { error } = await supabase.from('transactions').update({ status: 'approved' }).eq('id', txId)
    if (error) { toast.error('Failed to approve'); return }
    toast.success('Approved! 💸')
    fetch('/api/sheets/sync', { method: 'POST', body: JSON.stringify({ txId }) })
      .catch(e => console.error('Sheet sync error', e))
    if (session) fetchData(session.user.id)
  }

  async function handleReject(txId: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', txId)
    if (error) { toast.error('Failed to reject'); return }
    toast('Request declined', {
      description: 'The credit request has been declined.',
      icon: '🚫',
    })
    if (session) fetchData(session.user.id)
  }

  async function handleSettle(txId: string) {
    const { error } = await supabase.from('transactions').update({ status: 'settled' }).eq('id', txId)
    if (!error) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#00FF87', '#FF2D87', '#fff'] })
      toast.success('Settled! 🎉')
      if (session) fetchData(session.user.id)
    }
  }

  async function handleSettleAll(customerId: string) {
    // Settle all approved transactions for this customer (cash payment)
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'settled' })
      .eq('customer_id', customerId)
      .eq('status', 'approved')
    if (error) { toast.error('Failed to mark settled'); return }
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#00FF87', '#FFD700', '#fff'] })
    toast.success('Settled in cash! 💵', { description: 'All dues marked as paid.' })
    if (session) fetchData(session.user.id)
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  const merchantName = session?.user?.email?.split('@')[0] || 'Merchant'

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)', color: 'var(--page-fg)', fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>

      {/* Background orbs */}
      <div className="fixed top-[-300px] right-[-200px] w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'var(--orb-green)' }} />
      <div className="fixed bottom-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'var(--orb-pink)' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--pop-green)] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                <span className="text-gradient-green">PopPay</span>
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--page-fg-muted)' }}>
                Hey <span className="font-semibold" style={{ color: 'var(--page-fg)' }}>{merchantName}</span> 👋 Here's your empire
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!merchantId) return
                window.open(`/request/${merchantId}`, '_blank')
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FF2D87]/30 text-[#FF2D87] text-sm font-semibold hover:bg-[#FF2D87]/10 hover:border-[#FF2D87]/50 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              QR Credit Portal
            </motion.button>
          </div>
        </header>

        {/* ── Stats Bento Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Udhaar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="pop-card p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00FF87] to-transparent" />
            <div className="flex justify-between items-start">
              <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--page-fg-muted)' }}>Total Udhaar</p>
                <p className="text-3xl font-black stat-number" style={{ color: 'var(--page-fg)' }}>
                  ₹<span className="text-gradient-green">{stats.totalCredit.toLocaleString()}</span>
                </p>
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--page-fg-subtle)' }}>
                  <TrendingUp className="w-3 h-3 text-[#00FF87]" /> Active credit deployed
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-[#00FF87]" />
              </div>
            </div>
          </motion.div>

          {/* Pending */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="pop-card p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FF2D87] to-transparent" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--page-fg-muted)' }}>Awaiting Approval</p>
                <p className="text-3xl font-black stat-number" style={{ color: 'var(--page-fg)' }}>₹{stats.totalPending.toLocaleString()}</p>
                <p className="text-xs text-[#FF2D87] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF2D87] pulse-dot" />
                  {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} pending
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FF2D87]/10 border border-[#FF2D87]/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#FF2D87]" />
              </div>
            </div>
          </motion.div>

          {/* Customers */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="pop-card p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-white/20 to-transparent" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--page-fg-muted)' }}>Customers</p>
                <p className="text-3xl font-black stat-number" style={{ color: 'var(--page-fg)' }}>{stats.customersCount}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--page-fg-subtle)' }}>In your network</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-white/50" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Customer Table — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold" style={{ color: 'var(--page-fg)' }}>Customer Ledger</h2>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                <input
                  type="text"
                  placeholder="Search name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--page-fg)',
                  }}
                />
              </div>
            </div>

            <div className="pop-card overflow-hidden">
              {/* Table header */}
              <div suppressHydrationWarning className="grid px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ borderBottom: '1px solid var(--divider)', color: 'var(--page-fg-subtle)', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                <span>Customer</span>
                <span>Phone</span>
                <span>Due Date</span>
                <span className="text-right">Dues</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                {filteredCustomers.length === 0 ? (
                  <div className="py-16 text-center text-sm flex flex-col items-center gap-2" style={{ color: 'var(--page-fg-subtle)' }}>
                    <Users className="w-6 h-6 text-white/15" />
                    <span>No customers yet. Share your QR portal to get started!</span>
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    // Due date display + colour
                    let dueDateLabel = '—'
                    let dueDateColor = 'var(--page-fg-subtle)'
                    if (c.dueDate) {
                      const msLeft = new Date(c.dueDate).getTime() - Date.now()
                      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
                      const d = new Date(c.dueDate)
                      dueDateLabel = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
                      if (daysLeft < 0)       dueDateColor = '#FF2D87'
                      else if (daysLeft <= 7) dueDateColor = '#FFD700'
                      else                    dueDateColor = 'var(--page-fg-muted)'
                    }

                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid px-4 py-3.5 transition-colors group items-center"
                        style={{ cursor: 'default', gridTemplateColumns: '1fr 1fr 1fr auto' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00FF87]/20 to-[#00FF87]/5 border border-[#00FF87]/15 flex items-center justify-center text-xs font-bold text-[#00FF87]">
                            {c.name[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--page-fg)' }}>{c.name}</span>
                        </div>

                        <span className="text-sm" style={{ color: 'var(--page-fg-muted)' }}>{c.phone}</span>

                        <div>
                          {c.totalDue > 0 ? (
                            <span className="text-xs font-semibold tabular-nums" style={{ color: dueDateColor }}>
                              {dueDateLabel}
                              {c.dueDate && new Date(c.dueDate).getTime() < Date.now() && (
                                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#FF2D87' }}>Overdue</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--page-fg-subtle)' }}>—</span>
                          )}
                        </div>

                        {/* Dues + settle */}
                        <div className="flex items-center justify-end gap-2">
                          {c.totalDue > 0 ? (
                            <>
                              <span className="text-sm font-black text-[#FF2D87] stat-number">₹{c.totalDue.toLocaleString()}</span>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => handleSettleAll(c.id)}
                                title="Mark all dues as settled (cash payment)"
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                style={{
                                  background: 'rgba(0,255,135,0.1)',
                                  border: '1px solid rgba(0,255,135,0.25)',
                                  color: '#00FF87',
                                }}
                              >
                                <Banknote className="w-3 h-3" />
                                Cash
                              </motion.button>
                            </>
                          ) : (
                            <span className="text-xs text-[#00FF87] font-semibold">Settled ✓</span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Pending Requests sidebar — 1/3 width */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--page-fg)' }}>
                <Clock className="w-4 h-4 text-[#FF2D87]" />
                Action Required
              </h2>
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF2D87] text-white text-xs font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence>
                {pendingRequests.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="pop-card p-8 text-center flex flex-col items-center gap-2"
                  >
                    <Sparkles className="w-6 h-6" style={{ color: 'var(--pop-green)', opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: 'var(--page-fg-subtle)' }}>All clear! No pending requests.</p>
                  </motion.div>
                ) : pendingRequests.map((req, i) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.05 }}
                    className="pop-card p-4 relative overflow-hidden"
                  >
                    {/* Green accent strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00FF87] rounded-l-xl" />

                    <div className="pl-3">
                      {/* Header row */}
                      <div className="flex justify-between items-start">
                        <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--page-fg)' }}>{req.customer.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--page-fg-muted)' }}>{req.reason || 'Udhaar request'}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xl font-black text-[#00FF87] stat-number">₹{req.amount}</p>
                          <p className="text-xs" style={{ color: 'var(--page-fg-subtle)' }}>{req.customer.phone}</p>
                        </div>
                      </div>

                      {/* Trust Score Badge */}
                      <TrustScoreBadge customerId={req.customer.id} />

                      {/* Decision Countdown */}
                      {req.decision_deadline && (
                        <DecisionCountdown deadline={req.decision_deadline} />
                      )}

                      {/* Action buttons row */}
                      <div className="flex gap-2 mt-3">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 py-2.5 rounded-xl bg-[#00FF87] text-black text-sm font-bold flex items-center justify-center gap-1.5 hover:shadow-[0_0_16px_rgba(0,255,135,0.3)] transition-all"
                        >
                          <CheckCheck className="w-4 h-4" />
                          Approve
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleReject(req.id)}
                          className="px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all border"
                          style={{
                            background: 'rgba(255,45,135,0.08)',
                            borderColor: 'rgba(255,45,135,0.3)',
                            color: '#FF2D87',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,45,135,0.18)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,45,135,0.08)')}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* PopAI floating widget */}
      <PopAI merchantVpa={`${merchantName}@ybl`} merchantName={merchantName} merchantId={session?.user?.id ?? ''} />
    </div>
  )
}
