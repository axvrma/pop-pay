-- Schema for PopPay MVP

-- 1. Merchants Table
CREATE TABLE public.merchants (
    id UUID PRIMARY KEY DEFAULT auth.uid(), -- matches Supabase Auth UID
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    vpa TEXT, -- UPI ID for collections
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transactions Table (Udhaar requests/approvals)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'settled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Realtime Configuration
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- RLS Policies

-- Merchants policy: can read/write their own profile
CREATE POLICY "Merchants manage their own profile"
  ON public.merchants
  FOR ALL
  USING (auth.uid() = id);

-- Customers policy:
-- Merchants can manage their customers
CREATE POLICY "Merchants manage their own customers"
  ON public.customers
  FOR ALL
  USING (auth.uid() = merchant_id);

-- Anyone can insert a customer (since it happens via public credit scan portal),
-- but we only want them inserted if they don't exist under that merchant.
CREATE POLICY "Public can insert customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (true);

-- Transactions policy:
-- Merchants can manage transactions belonging to their customers
CREATE POLICY "Merchants manage their customers' transactions"
  ON public.transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = public.transactions.customer_id
      AND c.merchant_id = auth.uid()
    )
  );

-- Public can insert pending transactions (via credit scan portal)
CREATE POLICY "Public can insert pending transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (status = 'pending');
