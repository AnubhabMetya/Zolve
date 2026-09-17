-- Insurance & Welfare — SIH Worker welfare & insurance integration
-- 4% cooperative reserve per booking funds ₹5L cover; auto-created on SERVICE_COMPLETED
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_name TEXT,
  city TEXT,
  cover_amount INTEGER NOT NULL DEFAULT 500000,
  premium_from_reserve INTEGER NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','claimed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_till TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review','approved','rejected','paid')),
  filed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
-- RLS: provider can read own policies/claims; admin can read all
CREATE POLICY "provider_own_policies" ON public.insurance_policies FOR SELECT USING (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "provider_own_claims" ON public.insurance_claims FOR SELECT USING (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
