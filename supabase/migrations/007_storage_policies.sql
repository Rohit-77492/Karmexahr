-- ================================================================
-- KarmexaHR — Storage Bucket Policies
-- Run in Supabase SQL Editor after creating buckets
-- ================================================================

-- ─── DOCUMENTS BUCKET (private) ──────────────────────────────

-- Only authenticated users can upload to their company's folder
CREATE POLICY "documents_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT cm.company_id::text
    FROM company_members cm
    WHERE cm.user_id = auth.uid() AND cm.is_active = true
  )
);

-- Users can view documents from their company
CREATE POLICY "documents_view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT cm.company_id::text
    FROM company_members cm
    WHERE cm.user_id = auth.uid() AND cm.is_active = true
  )
);

-- HR/Admin can delete documents
CREATE POLICY "documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT cm.company_id::text
    FROM company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.role IN ('super_admin','admin','hr_manager')
      AND cm.is_active = true
  )
);

-- ─── AVATARS BUCKET (public read, auth write) ─────────────────

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ─── PAYSLIP PDFs bucket (secure) ────────────────────────────

-- Payslips are generated server-side and stored here
-- Employees can only read their own payslips

CREATE POLICY "payslips_upload_service"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'payslips');

CREATE POLICY "payslips_read_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payslips'
  AND (
    -- Employee reads their own payslip
    (storage.foldername(name))[2] IN (
      SELECT e.id::text FROM employees e WHERE e.user_id = auth.uid()
    )
    OR
    -- HR can read all payslips from their company
    (storage.foldername(name))[1] IN (
      SELECT cm.company_id::text FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('super_admin','admin','hr_manager')
        AND cm.is_active = true
    )
  )
);
