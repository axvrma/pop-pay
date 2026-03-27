import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export interface PopCardProps {
  customerName: string
  amount: number
  merchantVpa: string
  merchantName: string
}

export function PopCard({ customerName, amount, merchantVpa, merchantName }: PopCardProps) {
  // UPI Deep Link Format
  // upi://pay?pa=UPIID&pn=NAME&am=AMOUNT&cu=INR
  const upiLink = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiLink)
    toast.success('Payment Link Copied!', {
      description: 'You can now paste and send it to ' + customerName,
      style: { backgroundColor: '#00FF00', color: '#000' }
    })
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="w-full max-w-sm bg-[#111] border-[#FF00FF] border-2 shadow-[0_0_15px_rgba(255,0,255,0.2)] overflow-hidden">
        <div className="bg-[#FF00FF] p-2 text-center">
          <h3 className="text-black font-extrabold uppercase tracking-widest text-sm">Collect from {customerName}</h3>
        </div>
        <CardContent className="p-6 flex flex-col items-center space-y-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Amount Due</p>
            <div className="text-4xl font-black text-[#00FF00] font-mono flex items-center justify-center">
              <IndianRupee className="w-8 h-8 mr-1 " />{amount}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-inner">
            <QRCodeSVG 
              value={upiLink} 
              size={160}
              fgColor="#000000"
              bgColor="#FFFFFF"
              level="M"
            />
          </div>

          <div className="w-full space-y-3">
            <Button 
              className="w-full bg-[#00FF00] text-black hover:bg-[#00FF00]/80 font-bold h-12 text-md gap-2 rounded-xl"
              onClick={copyToClipboard}
            >
              <Copy className="w-4 h-4" /> Copy Payment Link
            </Button>
            <p className="text-xs text-gray-500 text-center font-mono break-all">{merchantVpa}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
