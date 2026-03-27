import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PopCard } from '@/components/PopCard'

export function PopAI({ merchantVpa, merchantName }: { merchantVpa: string, merchantName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [localInput, setLocalInput] = useState('')
  
  // @ts-ignore
  const { messages, append, isLoading } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Helper to parse PopCard JSON
  const renderMessageContent = (content: string) => {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        const cmd = JSON.parse(jsonMatch[1])
        if (cmd.action === 'generate_popcard') {
          return (
            <div className="mt-2 text-left w-[250px]">
              <PopCard 
                customerName={cmd.customerName}
                amount={cmd.amount}
                merchantVpa={merchantVpa}
                merchantName={merchantName}
              />
            </div>
          )
        }
      } catch (e) {
        // Fallback to normal text if JSON fails to parse
      }
    }
    // Remove the backticks if it was malformed, or just render normally
    return <p className="whitespace-pre-wrap text-sm">{content.replace(/```json\n([\s\S]*?)\n```/g, 'Generating PopCard...')}</p>
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!localInput.trim() || isLoading) return
    append({ role: 'user', content: localInput })
    setLocalInput('')
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] max-h-[70vh] bg-black border border-[#00FF00] rounded-2xl shadow-[0_0_30px_rgba(0,255,0,0.2)] flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#00FF00] p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="text-black w-6 h-6" />
                <h3 className="text-black font-extrabold tracking-tight italic uppercase">PopAI</h3>
              </div>
              <Button size="icon" variant="ghost" className="text-black hover:bg-black/10 h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-950">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-10">
                  <p className="font-bold text-[#FF00FF]">Hey Gen Z Boss! ✨</p>
                  <p className="text-sm mt-2">Ask me who owes you, or say "Generate a payment link for Rahul for ₹500".</p>
                </div>
              )}
              {messages?.map((m: any) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    m.role === 'user' 
                      ? 'bg-[#FF00FF] text-white rounded-br-none' 
                      : 'bg-gray-800 text-[#00FF00] rounded-bl-none border border-gray-700'
                  }`}>
                    {renderMessageContent(m.content)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-[#00FF00] rounded-2xl rounded-bl-none px-4 py-3 border border-gray-700 flex gap-1">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-[#00FF00] rounded-full"></motion.div>
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-[#00FF00] rounded-full"></motion.div>
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-[#00FF00] rounded-full"></motion.div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={onSubmit} className="p-3 bg-black border-t border-gray-800 flex gap-2">
              <Input
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                placeholder="Ask PopAI..."
                className="flex-1 border-gray-800 bg-gray-900 text-white focus-visible:ring-[#00FF00] rounded-xl"
              />
              <Button type="submit" disabled={isLoading || !localInput.trim()} className="bg-[#00FF00] text-black hover:bg-[#00FF00]/80 rounded-xl px-3">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#FF00FF] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,0,255,0.4)] z-50 text-white"
      >
        {isOpen ? <X className="w-6 h-6 text-black" /> : <Bot className="w-7 h-7 text-black" />}
      </motion.button>
    </>
  )
}
