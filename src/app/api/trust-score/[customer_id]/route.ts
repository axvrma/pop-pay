import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeTrustScore, Transaction } from '@/lib/trust-score'

// Use service-role key for writes (upsert trust_scores bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customer_id: string }> }
) {
  const { customer_id } = await params

  if (!customer_id) {
    return NextResponse.json({ error: 'Missing customer_id' }, { status: 400 })
  }

  try {
    // 1. Optional cache check — trust_scores table may not exist yet, never throw
    try {
      const { data: cached, error: cacheErr } = await supabase
        .from('trust_scores')
        .select('*')
        .eq('customer_id', customer_id)
        .single()

      if (!cacheErr && cached) {
        const ageMs = Date.now() - new Date(cached.computed_at).getTime()
        if (ageMs < 60 * 60 * 1000) {
          return NextResponse.json({
            score:       cached.score,
            grade:       cached.grade,
            factors:     cached.factors,
            computed_at: cached.computed_at,
            from_cache:  true,
          })
        }
      }
    } catch (_) {
      // trust_scores table doesn't exist yet — compute fresh below
    }

    // 2. Fetch transaction history using ONLY guaranteed existing columns
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, amount, status, created_at')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: true })

    if (txError) throw txError

    // 3. Compute score
    const result = computeTrustScore((transactions ?? []) as Transaction[])

    // 4. Best-effort cache write — fire and forget, never blocks response
    supabase
      .from('trust_scores')
      .upsert({
        customer_id,
        score:       result.score,
        grade:       result.grade,
        factors:     result.factors,
        computed_at: result.computed_at,
      }, { onConflict: 'customer_id' })
      .then(({ error }) => {
        if (error) console.log('[trust-score] cache skipped (migration not run yet):', error.message)
      })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[trust-score] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
