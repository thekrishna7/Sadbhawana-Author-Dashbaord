-- Sadbhawana Author Dashboard Extra Migration
-- Please run this SQL script in your Supabase Dashboard SQL Editor.

-- 1. Add monthly breakdown JSONB columns to sales table
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS website_sales_monthly jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS amazon_sales_monthly jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Add soft-delete visibility flags to documents table
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS deleted_by_author boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_admin boolean NOT NULL DEFAULT false;
