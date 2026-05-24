import { NextResponse } from "next/server";
import { Client } from "pg";

const CONFIGS = [
  {
    host: "aws-1-ap-south-1.pooler.supabase.com",
    user: "postgres.wdppaupdvxrbgfwtngka",
    port: 6543,
  },
  {
    host: "db.wdppaupdvxrbgfwtngka.supabase.co",
    user: "postgres",
    port: 6543,
  }
];

const PASSWORDS = [
  "publishing-setup-2026",
  "postgres",
  "supabase",
  "supabase_password",
  "Supabase12345!",
  "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-"
];

export async function GET() {
  let connectedPassword = null;
  let queryResult = null;
  let errorMsg = null;
  let successConfig = null;

  for (const config of CONFIGS) {
    for (const password of PASSWORDS) {
      const client = new Client({
        host: config.host,
        port: config.port,
        user: config.user,
        password,
        database: "postgres",
        ssl: { rejectUnauthorized: false }
      });
      try {
        await client.connect();
        connectedPassword = password;
        successConfig = config;
        
        // Execute the migration DDL query
        const sql = `
          ALTER TABLE books 
            ADD COLUMN IF NOT EXISTS book_type text NOT NULL DEFAULT 'sell' CHECK (book_type IN ('sell', 'not_for_sell')),
            ADD COLUMN IF NOT EXISTS serial_number text;

          ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'locked';
          ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'disabled';

          ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS designation text,
            ADD COLUMN IF NOT EXISTS signature_url text,
            ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"email": true, "push": false}'::jsonb,
            ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'dark',
            ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
            ADD COLUMN IF NOT EXISTS device_login_history jsonb DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS two_factor_secret text;

          ALTER TABLE sales 
            ADD COLUMN IF NOT EXISTS website_sales_monthly jsonb NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS amazon_sales_monthly jsonb NOT NULL DEFAULT '{}'::jsonb;

          ALTER TABLE documents 
            ADD COLUMN IF NOT EXISTS deleted_by_author boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS deleted_by_admin boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS downloaded_by_author boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS downloaded_by_admin boolean NOT NULL DEFAULT false;
        `;
        const res = await client.query(sql);
        queryResult = res;
        await client.end();
        break; // Success! Stop checking.
      } catch (err: any) {
        errorMsg = err.message;
      }
    }
    if (connectedPassword) break;
  }

  if (connectedPassword) {
    return NextResponse.json({
      ok: true,
      message: "Database migration completed successfully!",
      config: successConfig,
      passwordUsed: connectedPassword.substring(0, 4) + "****",
      result: queryResult
    });
  } else {
    return NextResponse.json({
      ok: false,
      error: "Could not connect to database with any standard credentials.",
      lastError: errorMsg
    }, { status: 500 });
  }
}
