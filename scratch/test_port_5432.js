const { Client } = require("pg");

const host = "aws-1-ap-south-1.pooler.supabase.com";
const user = "postgres.wdppaupdvxrbgfwtngka";
const port = 5432;

const PASSWORDS = [
  "publishing-setup-2026",
  "postgres",
  "supabase",
  "supabase_password",
  "Supabase12345!",
  "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-"
];

async function main() {
  for (const password of PASSWORDS) {
    console.log(`Trying password: ${password.substring(0, 8)}...`);
    const client = new Client({
      host,
      port,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log("SUCCESS! Connected on port 5432.");
      console.log("Password:", password);
      await client.end();
      return;
    } catch (err) {
      console.log("  Failed:", err.message);
    }
  }
  console.log("None of the passwords worked on port 5432.");
}

main().catch(console.error);
