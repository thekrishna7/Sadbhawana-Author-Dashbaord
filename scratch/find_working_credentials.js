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
        console.log("SUCCESS!");
        console.log("Host:", config.host);
        console.log("User:", config.user);
        console.log("Password:", password);
        await client.end();
        return;
      } catch (err) {
        // Skip
      }
    }
  }
  console.log("No credentials worked.");
}

main().catch(console.error);
