const { Client } = require("pg");
const config = {
  host: "aws-1-ap-south-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.wdppaupdvxrbgfwtngka",
  password: "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-",
  database: "postgres",
  ssl: { rejectUnauthorized: false }
};
async function main() {
  const client = new Client(config);
  await client.connect();
  console.log("Connected to DB!");
  
  const sql = `
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS designation text;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature_url text;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled boolean default false;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb default '{"email": true, "push": false}'::jsonb;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference text default 'dark';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_login_history jsonb default '[]'::jsonb;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret text;
  `;
  await client.query(sql);
  console.log("Columns added successfully!");
  await client.end();
}
main().catch(console.error);
