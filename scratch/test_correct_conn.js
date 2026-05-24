const { Client } = require("pg");

const host = "aws-1-ap-south-1.pooler.supabase.com";
const user = "postgres.wdppaupdvxrbgfwtngka";
const password = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";
const database = "postgres";
const port = 6543;

async function main() {
  console.log("Connecting...");
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log("SUCCESS! Connection established.");
    const res = await client.query("SELECT NOW();");
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

main().catch(console.error);
