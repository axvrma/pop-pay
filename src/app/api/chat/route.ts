import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30
export const runtime = 'nodejs'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export async function POST(req: Request) {
  const body = await req.json()

  // ai-sdk v6 sendMessage sends {role, parts:[{type:'text',text}]}
  // Normalize to plain strings
  const rawMessages: any[] = body.messages ?? []
  const normalized = rawMessages.map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'model',
    content: typeof m.content === 'string'
      ? m.content
      : (m.parts ?? []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join(''),
  }))

  // The last message is the current user input
  const lastMsg = normalized[normalized.length - 1]?.content ?? ''
  // History is everything before the last message
  const history = normalized.slice(0, -1).map(m => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }))

  // Build ledger context from Supabase
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  let ledgerContext = 'No data available.'

  if (session) {
    const { data: customers } = await supabase
      .from('customers')
      .select('*, transactions(*)')
      .eq('merchant_id', session.user.id)

    if (customers) {
      const summary = customers.map(c => {
        const due = c.transactions
          .filter((t: any) => t.status === 'approved')
          .reduce((sum: number, tx: any) => sum + tx.amount, 0)
        return due > 0 ? `${c.name} (${c.phone}) owes ₹${due}` : null
      }).filter(Boolean)

      ledgerContext = summary.length > 0
        ? summary.join('\n')
        : 'All amounts are settled. No pending Udhaar.'
    }
  }

  const systemPrompt = `You are PopAI, an energetic Gen Z AI assistant for PopPay merchants.
Your role is to help them manage their Udhaar (credit) collections.

Here is the current ledger summary for the merchant:
${ledgerContext}

If the user asks to generate a payment link for a specific person, respond with ONLY this JSON block (no extra text):
\`\`\`json
{
  "action": "generate_popcard",
  "customerName": "[Name]",
  "amount": [Amount as number]
}
\`\`\`

For any other question, chat normally with high energy and emojis. Keep responses short and snappy!`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  })

  const chat = model.startChat({ history })

  // Stream the response
  const streamResult = await chat.sendMessageStream(lastMsg)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of streamResult.stream) {
        const text = chunk.text()
        if (text) {
          // Format as AI SDK UI stream protocol (text part)
          controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`))
        }
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  })
}
