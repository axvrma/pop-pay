import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { ExternalLink, IndianRupee, Zap } from 'lucide-react'

export interface PopCardProps {
  customerName: string
  amount: number
  merchantVpa: string
  merchantName: string
  merchantId?: string   // optional — enables DB settlement on pay
}

export function PopCard({ customerName, amount, merchantVpa, merchantName, merchantId }: PopCardProps) {
  const upiLink = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`

  const payPageUrl = `/pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&name=${encodeURIComponent(customerName)}${merchantId ? `&mid=${merchantId}` : ''}`

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,10,10,0.95)',
          border: '1px solid rgba(255,45,135,0.3)',
          boxShadow: '0 0 24px rgba(255,45,135,0.12)',
        }}
      >
        {/* Header stripe */}
        <div className="bg-[#FF2D87] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            <span className="text-white text-xs font-black uppercase tracking-wider">PopPay</span>
          </div>
          <span className="text-white/80 text-xs font-medium">Collect from {customerName}</span>
        </div>

        <div className="p-4 flex flex-col items-center gap-4">
          {/* Amount */}
          <div className="text-center">
            <p className="text-xs text-white/35 mb-1">Amount Due</p>
            <div className="flex items-center justify-center gap-1">
              <IndianRupee className="w-6 h-6 text-[#00FF87]" strokeWidth={2.5} />
              <span className="text-3xl font-black text-white">{amount.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-white/30 font-mono mt-1">{merchantVpa}</p>
          </div>

          {/* QR Code */}
          <div className="bg-white p-2.5 rounded-xl">
            <QRCodeSVG
              value={upiLink}
              size={130}
              fgColor="#000"
              bgColor="#fff"
              level="M"
            />
          </div>

          {/* Pay Now button — opens mock payment page */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => window.open(payPageUrl, '_blank')}
            className="w-full py-2.5 rounded-xl bg-[#00FF87] text-black font-black text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_16px_rgba(0,255,135,0.35)] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Pay Now ₹{amount.toLocaleString('en-IN')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
