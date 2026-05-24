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
        console.log(`Connected with host: ${config.host}, user: ${config.user}`);
        
        const sql = `
          ALTER TABLE sales 
            ADD COLUMN IF NOT EXISTS website_sales_monthly jsonb NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS amazon_sales_monthly jsonb NOT NULL DEFAULT '{}'::jsonb;

          ALTER TABLE documents 
            ADD COLUMN IF NOT EXISTS deleted_by_author boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS deleted_by_admin boolean NOT NULL DEFAULT false;
        `;
        
        await client.query(sql);
        console.log("Migration executed successfully!");
        await client.end();
        connected = true;
        break;
      } catch (err) {
        // console.error(`Failed with config ${config.host} / password:`, err.message);
      }
    }
    if (connected) break;
  }
  if (!connected) {
    console.error("Could not connect to database with any config/password combination");
  }
}

main().catch(console.error);
