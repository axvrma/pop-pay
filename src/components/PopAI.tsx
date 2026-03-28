import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Bot } from 'lucide-react'
import { PopCard } from '@/components/PopCard'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function PopAI({ merchantVpa, merchantName, merchantId }: { merchantVpa: string, merchantName: string, merchantId?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [localInput, setLocalInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const renderMessageContent = (content: string) => {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        const cmd = JSON.parse(jsonMatch[1])
        if (cmd.action === 'generate_popcard') {
          return (
            <div className="mt-2 w-[230px]">
              <PopCard
                customerName={cmd.customerName}
                amount={cmd.amount}
                merchantVpa={merchantVpa}
                merchantName={merchantName}
                merchantId={merchantId}
              />
            </div>
          )
        }
      } catch (e) {}
    }
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {content.replace(/```json\n[\s\S]*?\n```/g, '✨ Generating PopCard...')}
      </p>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = localInput.trim()
    if (!text || isLoading) return
    setLocalInput('')

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsLoading(true)

    try {
      abortRef.current = new AbortController()
      
      // Build messages history for the API
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
        parts: [{ type: 'text', text: m.content }],
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        
        // Parse the "0:..." stream protocol
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2))
              accumulated += text
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
              )
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: '⚠️ Something went wrong. Try again!' }
            : m
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-5 w-80 md:w-[360px] h-[520px] max-h-[78vh] flex flex-col z-50 overflow-hidden rounded-2xl"
            style={{
              background: 'rgba(8,8,8,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 0 1px rgba(0,255,135,0.15), 0 32px 64px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,135,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/6">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#00FF87] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">PopAI</p>
                  <p className="text-[10px] text-[#00FF87] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] inline-block pulse-dot" />
                    {isLoading ? 'Thinking...' : 'Online · gemini-2.5-flash'}
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center mx-auto">
                    <Bot className="w-6 h-6 text-[#00FF87]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Hey boss! 👋</p>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">
                      Ask me about your Udhaar.<br />
                      Or try: <span className="text-[#00FF87]/70 italic">"Generate a payment link for Rahul for ₹500"</span>
                    </p>
                  </div>
                </motion.div>
              )}

              {messages.map((m, i) => {
                const isUser = m.role === 'user'
                const isEmpty = !m.content && !isUser
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isEmpty ? (
                      <div className="bg-white/6 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay }}
                            className="w-1.5 h-1.5 bg-[#00FF87] rounded-full"
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                          isUser
                            ? 'bg-[#FF2D87] text-white rounded-br-sm font-medium'
                            : 'bg-white/6 text-white/85 rounded-bl-sm border border-white/8'
                        }`}
                      >
                        {renderMessageContent(m.content)}
                      </div>
                    )}
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={onSubmit} className="p-3 border-t border-white/6 flex gap-2">
              <input
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                placeholder="Ask PopAI anything..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#00FF87]/40 focus:ring-2 focus:ring-[#00FF87]/10 transition-all disabled:opacity-50"
              />
              <motion.button
                type="submit"
                disabled={isLoading || !localInput.trim()}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-[#00FF87] flex items-center justify-center text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_16px_rgba(0,255,135,0.3)] shrink-0"
              >
                <Send className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-2xl flex items-center justify-center z-50 transition-all"
        style={{
          background: isOpen ? '#FF2D87' : 'linear-gradient(135deg, #00FF87, #00D4FF)',
          boxShadow: isOpen
            ? '0 0 24px rgba(255,45,135,0.4)'
            : '0 0 24px rgba(0,255,135,0.35)',
        }}
      >
        {isOpen
          ? <X className="w-6 h-6 text-white" />
          : <Sparkles className="w-6 h-6 text-black" strokeWidth={2.5} />
        }
      </motion.button>
    </>
  )
}
