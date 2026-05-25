-- ============================================================
-- SADBHAWANA AUTHOR DASHBOARD — FULL BACKEND FIX MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times (uses IF NOT EXISTS everywhere)
-- ============================================================

-- ── 1. SALES TABLE FIXES ─────────────────────────────────────
-- Add monthly breakdown JSONB columns (stores { "Jan-Feb": 5, "Mar-Apr": 2 } etc)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS amazon_sales_monthly  jsonb  NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS website_sales_monthly jsonb  NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_by            uuid   REFERENCES profiles(id) ON DELETE SET NULL;

-- ── 2. DOCUMENTS TABLE FIXES ─────────────────────────────────
-- Ensure file metadata columns exist
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_size   bigint,
  ADD COLUMN IF NOT EXISTS file_name   text,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'uploaded';

-- ── 3. DOCUMENTS TABLE RLS POLICIES ──────────────────────────
-- Enable RLS (idempotent)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (clean slate)
DROP POLICY IF EXISTS "documents_admin_all"        ON documents;
DROP POLICY IF EXISTS "documents_author_select"    ON documents;
DROP POLICY IF EXISTS "documents_author_insert"    ON documents;
DROP POLICY IF EXISTS "documents_author_update"    ON documents;
DROP POLICY IF EXISTS "documents_author_delete"    ON documents;

-- Admin (super_admin) — full access to ALL documents
CREATE POLICY "documents_admin_all"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  );

-- Author — SELECT: can see documents where they are the assigned author OR they uploaded
CREATE POLICY "documents_author_select"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR uploaded_by = auth.uid()
  );

-- Author — INSERT: can only upload documents where they are the uploader
CREATE POLICY "documents_author_insert"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND author_id = auth.uid()
  );

-- Author — UPDATE: can only update their own visibility flag
CREATE POLICY "documents_author_update"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR author_id = auth.uid()
  );

-- Author — DELETE: can delete documents they uploaded
CREATE POLICY "documents_author_delete"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
  );

-- ── 4. SUPABASE STORAGE — DOCUMENTS BUCKET POLICIES ──────────
-- NOTE: Supabase storage policies use the storage.objects table.

-- Drop old storage policies (safe)
DROP POLICY IF EXISTS "storage_documents_admin_all"      ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_author_upload"  ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_author_read"    ON storage.objects;

-- Admin/Staff — full access to documents bucket
CREATE POLICY "storage_documents_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  );

-- Authors — can upload to their own folder
CREATE POLICY "storage_documents_author_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      -- author-uploads/{author_id}/...
      name LIKE ('author-uploads/' || auth.uid()::text || '/%')
    )
  );

-- Authors — can read/download files uploaded for them (by admin) or their own uploads
CREATE POLICY "storage_documents_author_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      -- Their own uploads
      name LIKE ('author-uploads/' || auth.uid()::text || '/%')
      -- Admin uploads addressed to them
      OR name LIKE ('admin-uploads/' || auth.uid()::text || '/%')
    )
  );

-- ── 5. STORAGE POLICIES FOR MANUSCRIPTS BUCKET ────────────────
DROP POLICY IF EXISTS "storage_manuscripts_admin_all"    ON storage.objects;
DROP POLICY IF EXISTS "storage_manuscripts_author_read"  ON storage.objects;
DROP POLICY IF EXISTS "storage_manuscripts_author_write" ON storage.objects;

CREATE POLICY "storage_manuscripts_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'manuscripts'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  )
  WITH CHECK (
    bucket_id = 'manuscripts'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  );

CREATE POLICY "storage_manuscripts_author_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'manuscripts'
    AND EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id::text = split_part(name, '/', 2)
        AND books.author_id = auth.uid()
    )
  );

CREATE POLICY "storage_manuscripts_author_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'manuscripts'
    AND EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id::text = split_part(name, '/', 2)
        AND books.author_id = auth.uid()
    )
  );

-- ── 6. STORAGE POLICIES FOR COVER-DESIGNS BUCKET ─────────────
DROP POLICY IF EXISTS "storage_covers_admin_all"    ON storage.objects;
DROP POLICY IF EXISTS "storage_covers_author_read"  ON storage.objects;
DROP POLICY IF EXISTS "storage_covers_author_write" ON storage.objects;

CREATE POLICY "storage_covers_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'cover-designs'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  )
  WITH CHECK (
    bucket_id = 'cover-designs'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  );

CREATE POLICY "storage_covers_author_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cover-designs'
    AND EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id::text = split_part(name, '/', 2)
        AND books.author_id = auth.uid()
    )
  );

CREATE POLICY "storage_covers_author_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cover-designs'
    AND EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id::text = split_part(name, '/', 2)
        AND books.author_id = auth.uid()
    )
  );

-- ── 7. STORAGE POLICIES FOR MESSAGE-ATTACHMENTS BUCKET ────────
DROP POLICY IF EXISTS "storage_messages_admin_all"   ON storage.objects;
DROP POLICY IF EXISTS "storage_messages_author_all"  ON storage.objects;

CREATE POLICY "storage_messages_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  )
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  );

CREATE POLICY "storage_messages_author_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id::text = split_part(name, '/', 2)
        AND conversation_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id::text = split_part(name, '/', 2)
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- ── 8. ADDITIONAL DATABASE TABLE POLICIES ────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscript_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_author_select" ON public.profiles;
DROP POLICY IF EXISTS "books_author_select" ON public.books;
DROP POLICY IF EXISTS "manuscripts_author_select" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscript_versions_author_select" ON public.manuscript_versions;
DROP POLICY IF EXISTS "manuscript_versions_author_insert" ON public.manuscript_versions;
DROP POLICY IF EXISTS "cover_designs_author_select" ON public.cover_designs;
DROP POLICY IF EXISTS "cover_designs_author_insert" ON public.cover_designs;

-- Profiles: Authenticated users can view their own profile and all admin/staff profiles
CREATE POLICY "profiles_author_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR role IN ('super_admin', 'staff')
  );

-- Books: Authors can view books assigned to them
CREATE POLICY "books_author_select"
  ON public.books
  FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
  );

-- Manuscripts: Authors can view manuscripts for their books
CREATE POLICY "manuscripts_author_select"
  ON public.manuscripts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = manuscripts.book_id
        AND books.author_id = auth.uid()
    )
  );

-- Manuscript Versions: Authors can view versions of their manuscripts
CREATE POLICY "manuscript_versions_author_select"
  ON public.manuscript_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manuscripts
      JOIN public.books ON books.id = manuscripts.book_id
      WHERE manuscripts.id = manuscript_versions.manuscript_id
        AND books.author_id = auth.uid()
    )
  );

-- Manuscript Versions: Authors can insert versions of their manuscripts
CREATE POLICY "manuscript_versions_author_insert"
  ON public.manuscript_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.manuscripts
      JOIN public.books ON books.id = manuscripts.book_id
      WHERE manuscripts.id = manuscript_versions.manuscript_id
        AND books.author_id = auth.uid()
    )
  );

-- Cover Designs: Authors can view cover designs for their books
CREATE POLICY "cover_designs_author_select"
  ON public.cover_designs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = cover_designs.book_id
        AND books.author_id = auth.uid()
    )
  );

-- Cover Designs: Authors can insert cover designs for their books
CREATE POLICY "cover_designs_author_insert"
  ON public.cover_designs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = cover_designs.book_id
        AND books.author_id = auth.uid()
    )
  );

-- ── 9. SALES TABLE RLS POLICIES ──────────────────────────────
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_admin_all"     ON sales;
DROP POLICY IF EXISTS "sales_author_select" ON sales;

-- Admin/Staff — full access to all sales
CREATE POLICY "sales_admin_all"
  ON sales
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'staff')
    )
  );

-- Author — can only SELECT their own book's sales
CREATE POLICY "sales_author_select"
  ON sales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = sales.book_id
        AND books.author_id = auth.uid()
    )
  );
