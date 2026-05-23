const { Client } = require("pg");
const host = "aws-1-ap-south-1.pooler.supabase.com";
const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

async function tryConnect() {
  const password = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";
  console.log(`Trying service key as password: ${password.substring(0, 10)}...`);
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
    console.log("SUCCESS! Connected with service role key!");
    const res = await client.query("SELECT version();");
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.log(`Failed: ${err.message}`);
  }
}

tryConnect().catch(console.error);
