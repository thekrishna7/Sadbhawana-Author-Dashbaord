const { Client } = require("pg");
const host = "aws-1-ap-south-1.pooler.supabase.com";
const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

async function tryConnect() {
  const password = "publishing-setup-2026";
  console.log(`Trying password: ${password}`);
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
    console.log("SUCCESS! Connected!");
    const res = await client.query("SELECT version();");
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.log(`Failed: ${err.message}`);
  }
}

tryConnect().catch(console.error);
