-- Certification — Skill Training Academy + NSQF-aligned verifiable certs
CREATE TABLE IF NOT EXISTS public.certifications (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  module_name TEXT NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_name TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('certified','failed')),
  cert_no TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_till TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_own_certs" ON public.certifications FOR SELECT USING (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
