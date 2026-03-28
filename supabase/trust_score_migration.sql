-- ============================================================
-- PopPay Trust Score System — Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add decision_deadline to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS decision_deadline TIMESTAMP WITH TIME ZONE
    DEFAULT (NOW() + INTERVAL '24 hours');

-- Also backfill existing rows
UPDATE public.transactions
  SET decision_deadline = created_at + INTERVAL '24 hours'
  WHERE decision_deadline IS NULL;

-- 2. Trust Scores Table
CREATE TABLE IF NOT EXISTS public.trust_scores (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id      UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    score            INT NOT NULL CHECK (score >= 0 AND score <= 100),
    grade            TEXT NOT NULL CHECK (grade IN ('AAA', 'AA', 'A', 'B', 'C', 'D')),
    factors          JSONB NOT NULL DEFAULT '{}',
    computed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

-- Merchants can read trust scores for their own customers
CREATE POLICY "Merchants read trust scores for their customers"
  ON public.trust_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = public.trust_scores.customer_id
      AND c.merchant_id = auth.uid()
    )
  );

-- Service role can upsert (our API route uses the service role for writes)
CREATE POLICY "Service can upsert trust scores"
  ON public.trust_scores
  FOR ALL
  USING (true)
  WITH CHECK (true);
