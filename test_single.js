const { Client } = require("pg");

const host = "aws-1-ap-south-1.pooler.supabase.com";
const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const password = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

async function tryConnect() {
  console.log(`Trying password: [${password}]`);
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
    console.log(`SUCCESS! Connected successfully!`);
    await client.end();
  } catch (err) {
    console.log(`Failed: ${err.message}`);
  }
}

tryConnect();
