import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { txId } = await req.json()
    if (!txId) return NextResponse.json({ error: 'txId is required' }, { status: 400 })

    const supabase = await createClient()

    // 1. Fetch transaction details
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*, customer:customers(*, merchant:merchants(*))')
      .eq('id', txId)
      .single()

    if (txError || !tx) {
      return NextResponse.json({ error: 'Transaction not found or inaccessible' }, { status: 404 })
    }

    // 2. Setup Google Sheets Auth
    // In production, these should be set in .env.local
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const sheetId = process.env.GOOGLE_SHEET_ID

    if (!clientEmail || !privateKey || !sheetId) {
      console.warn("Google Sheets credentials missing. Skipping sync.")
      return NextResponse.json({ success: true, warning: 'Google Sheets credentials missing' })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // 3. Append Row
    // Columns: [Date, Customer Name, Phone, Amount, Reason, Status, Merchant VPA]
    const row = [
      new Date(tx.created_at).toISOString(),
      tx.customer.name,
      tx.customer.phone,
      tx.amount.toString(),
      tx.reason || '',
      tx.status,
      tx.customer.merchant.vpa || ''
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:G', // Adjust as needed
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Sheets Sync Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
