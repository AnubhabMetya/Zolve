-- KYC Storage — Govt ID & Trade License verification
-- Bucket: kyc-docs (private, authenticated upload)
-- Run: supabase storage create-bucket kyc-docs --public false
-- Policies:
-- INSERT: authenticated users can upload to <auth.uid()>/...
-- SELECT: owner can read own, admin can read all via service_role
-- Example RLS for storage.objects (apply via Dashboard SQL):
-- CREATE POLICY "kyc_owner_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-docs' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
-- CREATE POLICY "kyc_owner_read" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-docs' AND ( (storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin')));
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS kyc_document_url TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected'));
