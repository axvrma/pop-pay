-- ============================================================
-- PopPay Trust Score System — Sample Seed Data
-- Run AFTER trust_score_migration.sql
-- Replace {{YOUR_MERCHANT_ID}} with your actual merchant UUID
-- from Supabase auth.users table
-- ============================================================

-- NOTE: We use a variable approach. Replace the DO block's
-- merchant_id value with your actual UUID from:
-- SELECT id FROM auth.users LIMIT 1;

DO $$
DECLARE
  v_merchant_id   UUID := '00000000-0000-0000-0000-000000000001'; -- REPLACE THIS
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
BEGIN

-- ── Customer 1: Rahul Sharma — High Trust (AAA) ──────────────
INSERT INTO public.customers (id, merchant_id, name, phone)
  VALUES (uuid_generate_v4(), v_merchant_id, 'Rahul Sharma', '9876543210')
  RETURNING id INTO c1;

-- 8 approved + settled transactions over past 3 months
INSERT INTO public.transactions (customer_id, amount, reason, status, created_at, decision_deadline)
VALUES
  (c1, 200,  'Chai & Snacks',      'settled',  NOW() - INTERVAL '90 days', NOW() - INTERVAL '89 days'),
  (c1, 500,  'Grocery',            'settled',  NOW() - INTERVAL '75 days', NOW() - INTERVAL '74 days'),
  (c1, 300,  'Monthly Ration',     'settled',  NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days'),
  (c1, 750,  'Medicines',          'settled',  NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days'),
  (c1, 400,  'Chai & Samosa',      'settled',  NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
  (c1, 600,  'Grocery',            'settled',  NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
  (c1, 350,  'Stationary',         'settled',  NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
  (c1, 500,  'Weekly Ration',      'pending',  NOW() - INTERVAL '1 hour',  NOW() + INTERVAL '23 hours');

-- Trust score for Rahul — AAA
INSERT INTO public.trust_scores (customer_id, score, grade, factors)
VALUES (c1, 92, 'AAA', '{
  "repayment_rate": 100,
  "avg_amount_score": 88,
  "frequency_score": 90,
  "recency_score": 95,
  "settlement_speed_score": 85,
  "total_transactions": 8,
  "settled_count": 7,
  "pending_count": 1,
  "avg_days_to_settle": 1.2
}');

-- ── Customer 2: Priya Patel — Good Trust (AA) ────────────────
INSERT INTO public.customers (id, merchant_id, name, phone)
  VALUES (uuid_generate_v4(), v_merchant_id, 'Priya Patel', '9123456789')
  RETURNING id INTO c2;

INSERT INTO public.transactions (customer_id, amount, reason, status, created_at, decision_deadline)
VALUES
  (c2, 1000, 'Festival Shopping',  'settled',  NOW() - INTERVAL '80 days', NOW() - INTERVAL '79 days'),
  (c2, 500,  'Grocery',            'settled',  NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days'),
  (c2, 800,  'Kitchen Items',      'settled',  NOW() - INTERVAL '40 days', NOW() - INTERVAL '37 days'),
  (c2, 600,  'Monthly Grocery',    'approved', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
  (c2, 750,  'Diwali Items',       'pending',  NOW() - INTERVAL '2 hours', NOW() + INTERVAL '22 hours');

INSERT INTO public.trust_scores (customer_id, score, grade, factors)
VALUES (c2, 78, 'AA', '{
  "repayment_rate": 75,
  "avg_amount_score": 70,
  "frequency_score": 75,
  "recency_score": 80,
  "settlement_speed_score": 72,
  "total_transactions": 5,
  "settled_count": 3,
  "pending_count": 1,
  "avg_days_to_settle": 2.5
}');

-- ── Customer 3: Vikram Singh — Medium Trust (B) ──────────────
INSERT INTO public.customers (id, merchant_id, name, phone)
  VALUES (uuid_generate_v4(), v_merchant_id, 'Vikram Singh', '9988776655')
  RETURNING id INTO c3;

INSERT INTO public.transactions (customer_id, amount, reason, status, created_at, decision_deadline)
VALUES
  (c3, 2000, 'Appliance',          'settled',  NOW() - INTERVAL '100 days', NOW() - INTERVAL '95 days'),
  (c3, 1500, 'Rent advance',       'approved', NOW() - INTERVAL '60 days',  NOW() - INTERVAL '59 days'),
  (c3, 800,  'Medical',            'approved', NOW() - INTERVAL '30 days',  NOW() - INTERVAL '29 days'),
  (c3, 1200, 'Grocery + Misc',     'pending',  NOW() - INTERVAL '3 hours',  NOW() + INTERVAL '21 hours');

INSERT INTO public.trust_scores (customer_id, score, grade, factors)
VALUES (c3, 52, 'B', '{
  "repayment_rate": 33,
  "avg_amount_score": 45,
  "frequency_score": 50,
  "recency_score": 55,
  "settlement_speed_score": 60,
  "total_transactions": 4,
  "settled_count": 1,
  "pending_count": 1,
  "avg_days_to_settle": 8.0
}');

-- ── Customer 4: Anjali Desai — Low Trust (C) ─────────────────
INSERT INTO public.customers (id, merchant_id, name, phone)
  VALUES (uuid_generate_v4(), v_merchant_id, 'Anjali Desai', '9876001234')
  RETURNING id INTO c4;

INSERT INTO public.transactions (customer_id, amount, reason, status, created_at, decision_deadline)
VALUES
  (c4, 3000, 'Bulk Order',         'approved', NOW() - INTERVAL '120 days', NOW() - INTERVAL '119 days'),
  (c4, 2500, 'Electronics',        'approved', NOW() - INTERVAL '80 days',  NOW() - INTERVAL '79 days'),
  (c4, 500,  'Small purchase',     'settled',  NOW() - INTERVAL '40 days',  NOW() - INTERVAL '38 days'),
  (c4, 1800, 'Monthly Grocery',    'pending',  NOW() - INTERVAL '5 hours',  NOW() + INTERVAL '19 hours');

INSERT INTO public.trust_scores (customer_id, score, grade, factors)
VALUES (c4, 34, 'C', '{
  "repayment_rate": 25,
  "avg_amount_score": 30,
  "frequency_score": 40,
  "recency_score": 35,
  "settlement_speed_score": 45,
  "total_transactions": 4,
  "settled_count": 1,
  "pending_count": 1,
  "avg_days_to_settle": 15.0
}');

-- ── Customer 5: Mohan Kumar — Very Low Trust (D) ─────────────
INSERT INTO public.customers (id, merchant_id, name, phone)
  VALUES (uuid_generate_v4(), v_merchant_id, 'Mohan Kumar', '9000000001')
  RETURNING id INTO c5;

INSERT INTO public.transactions (customer_id, amount, reason, status, created_at, decision_deadline)
VALUES
  (c5, 5000, 'Large purchase',     'approved', NOW() - INTERVAL '150 days', NOW() - INTERVAL '149 days'),
  (c5, 3000, 'Equipment',          'approved', NOW() - INTERVAL '90 days',  NOW() - INTERVAL '89 days'),
  (c5, 4000, 'Inventory',          'approved', NOW() - INTERVAL '45 days',  NOW() - INTERVAL '44 days'),
  (c5, 2000, 'Emergency',          'pending',  NOW() - INTERVAL '23 hours', NOW() + INTERVAL '1 hour');

INSERT INTO public.trust_scores (customer_id, score, grade, factors)
VALUES (c5, 18, 'D', '{
  "repayment_rate": 0,
  "avg_amount_score": 15,
  "frequency_score": 25,
  "recency_score": 20,
  "settlement_speed_score": 10,
  "total_transactions": 4,
  "settled_count": 0,
  "pending_count": 1,
  "avg_days_to_settle": null
}');

END $$;
