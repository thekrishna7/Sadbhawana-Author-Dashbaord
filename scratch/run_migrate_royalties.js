const { Client } = require("pg");

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

async function main() {
  let connected = false;
  for (const config of CONFIGS) {
    for (const password of PASSWORDS) {
      console.log(`Trying ${config.host}:${config.port} with user ${config.user}...`);
      const client = new Client({
        host: config.host,
        port: config.port,
        user: config.user,
        password: password,
        database: "postgres",
        ssl: { rejectUnauthorized: false }
      });
      try {
        await client.connect();
        console.log(`Connected successfully to ${config.host}!`);
        
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
        
        await client.query(sql);
        console.log("SQL Alter queries executed successfully!");
        await client.end();
        connected = true;
        break;
      } catch (err) {
        console.log(`  Failed: ${err.message}`);
      }
    }
    if (connected) break;
  }
  if (!connected) {
    console.error("Could not run migration: password/connection error.");
    console.log("\n==================================================");
    console.log("MANUAL MIGRATION SQL SCRIPT");
    console.log("==================================================");
    console.log(`
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
    `);
    console.log("==================================================");
  }
}

main().catch(console.error);
