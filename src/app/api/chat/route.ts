import { google } from '@ai-sdk/google'
import { generateText, streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Define context that the AI will use to answer
  let ledgerContext = 'No data available.'

  if (session) {
    // Fetch merchant's ledger summary
    const { data: customers } = await supabase
      .from('customers')
      .select('*, transactions(*)')
      .eq('merchant_id', session.user.id)

    if (customers) {
      const summary = customers.map(c => {
        const due = c.transactions.filter((t: any) => t.status === 'approved').reduce((sum: number, tx: any) => sum + tx.amount, 0)
        return due > 0 ? `${c.name} (${c.phone}) owes ₹${due}` : null
      }).filter(Boolean)

      if (summary.length > 0) {
        ledgerContext = summary.join('\n')
      } else {
        ledgerContext = "All amounts are settled. No pending Udhaar."
      }
    }
  }

  const systemPrompt = `
You are PopAI, an energetic Gen Z AI assistant for PopPay merchants.
Your role is to help them manage their Udhaar (credit) collections.

Here is the current ledger summary for the merchant:
${ledgerContext}

Users might ask who owes them money or for a payment link.
If they ask to generate a payment link for a specific debtor, you must output a JSON command wrapped in triple backticks as follows:
\`\`\`json
{
  "action": "generate_popcard",
  "customerName": "[Name]",
  "amount": [Amount]
}
\`\`\`

If you don't need to generate a PopCard, just chat normally with high energy, using emojis. Keep responses short and snappy!
`

  const result = streamText({
    model: google('models/gemini-1.5-flash'), // Using as proxy for 3.1 Flash requested in prompt
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
