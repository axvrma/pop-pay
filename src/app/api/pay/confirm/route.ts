import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { merchantId, customerName, amount } = await req.json()

    const supabase = await createClient()

    // Find the customer by name + merchant (case-insensitive partial match)
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .eq('merchant_id', merchantId)
      .ilike('name', `%${customerName}%`)

    if (!customers || customers.length === 0) {
      // Nothing to update — still return success for MVP
      return NextResponse.json({ success: true, note: 'Customer not found, no DB update' })
    }

    const customerId = customers[0].id

    // Find the most recent approved transaction for this customer + amount
    const { data: txs } = await supabase
      .from('transactions')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'approved')
      .eq('amount', amount)
      .order('created_at', { ascending: false })
      .limit(1)

    if (txs && txs.length > 0) {
      // Mark as settled
      await supabase
        .from('transactions')
        .update({ status: 'settled' })
        .eq('id', txs[0].id)
    } else {
      // Fallback: mark any approved transaction for this customer as settled
      const { data: anyTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', customerId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)

      if (anyTx && anyTx.length > 0) {
        await supabase
          .from('transactions')
          .update({ status: 'settled' })
          .eq('id', anyTx[0].id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Pay confirm error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
