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
-- Add soft-delete flags (each party can independently hide a file from their view)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS deleted_by_author boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_admin  boolean NOT NULL DEFAULT false;

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
DROP POLICY IF EXISTS "documents_staff_all"        ON documents;

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

-- Author — UPDATE: can only soft-delete their own visibility flag
CREATE POLICY "documents_author_update"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR author_id = auth.uid()
  );

-- ── 4. SUPABASE STORAGE — DOCUMENTS BUCKET POLICIES ──────────
-- These create storage RLS policies so the 'documents' bucket works correctly.
-- NOTE: Supabase storage policies use the storage.objects table.

-- Drop old storage policies (safe)
DROP POLICY IF EXISTS "storage_documents_admin_all"      ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_author_upload"  ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_author_read"    ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_auth_read"      ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_auth_insert"    ON storage.objects;

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
-- This covers: admin-uploads/{author_id}/... AND author-uploads/{author_id}/...
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

-- ── 5. SALES TABLE RLS POLICIES ──────────────────────────────
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

-- ── 6. VERIFY ────────────────────────────────────────────────
-- Quick check — this should return columns including amazon_sales_monthly
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;
