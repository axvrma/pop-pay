'use client'

import { motion } from 'framer-motion'

export function PopSpinner({ text = 'Pop is popping...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-full h-full border-4 border-[#00FF00] rounded-full"
        />
        <motion.div
          animate={{ scale: [0.5, 1.2, 0.5], rotate: [0, 180, 360] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'backInOut' }}
          className="w-8 h-8 bg-[#FF00FF] rounded-sm"
        />
      </div>
      <motion.p 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="font-bold tracking-widest uppercase text-[#00FF00] text-sm"
      >
        {text}
      </motion.p>
    </div>
  )
}
