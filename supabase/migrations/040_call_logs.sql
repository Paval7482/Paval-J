-- ============================================================
-- 040_call_logs.sql — MyTelly Virtual Call Logs Integration
-- ============================================================

CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  call_id TEXT,
  virtual_number TEXT NOT NULL DEFAULT '9672115123',
  customer_number TEXT NOT NULL,
  agent_name TEXT,
  agent_phone TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  call_status TEXT NOT NULL DEFAULT 'Connected',
  call_duration TEXT DEFAULT '00:00:00',
  duration_seconds INTEGER DEFAULT 0,
  call_date TEXT,
  start_time TEXT,
  end_time TEXT,
  recording_url TEXT,
  customer_location TEXT,
  notes TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_account_created ON public.call_logs(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer ON public.call_logs(customer_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs(call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_assigned_to ON public.call_logs(assigned_to);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage call logs" ON public.call_logs;
CREATE POLICY "Users can manage call logs" ON public.call_logs FOR ALL USING (true);
