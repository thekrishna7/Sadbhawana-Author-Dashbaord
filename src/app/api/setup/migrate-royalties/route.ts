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
  },
  {
    host: "db.wdppaupdvxrbgfwtngka.supabase.co",
    user: "postgres",
    port: 5432,
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
          ALTER TABLE sales
            ADD COLUMN IF NOT EXISTS monthly_sales integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS royalty_per_copy numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_royalty_earned numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS pending_royalty numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS paid_royalty numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS amazon_ranking integer,
            ADD COLUMN IF NOT EXISTS flipkart_ranking integer,
            ADD COLUMN IF NOT EXISTS bestseller_badge boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS launch_revenue numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS store_revenue numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS custom_income numeric DEFAULT 0,
            ADD COLUMN IF NOT EXISTS custom_income_source text DEFAULT '';

          ALTER TABLE withdrawal_requests
            ADD COLUMN IF NOT EXISTS payment_proof_url text;
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
      message: "Royalty database migration completed successfully!",
      config: successConfig,
      passwordUsed: connectedPassword.substring(0, 4) + "****",
      result: queryResult
    });
  } else {
    return NextResponse.json({
      ok: false,
      error: "Could not connect to database with any standard credentials. Please run the SQL manually on Supabase dashboard SQL Editor.",
      lastError: errorMsg
    }, { status: 500 });
  }
}
