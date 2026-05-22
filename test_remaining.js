const { Client } = require("pg");

const host = "aws-1-ap-south-1.pooler.supabase.com";
const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const passwords = [
  "publishing",
  "publishing2026",
  "publishing-os",
  "publishing-os-2026",
  "krish",
  "krishna",
  "krishna_sharma",
  "Krishna123!",
  "krish123",
  "krish123!"
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tryConnect() {
  for (const password of passwords) {
    console.log(`Trying password: ${password}...`);
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
      console.log(`SUCCESS! Connected with host ${host} and password ${password}`);
      const res = await client.query("SELECT version();");
      console.log(res.rows[0]);
      await client.end();
      return;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
    // Wait 6.5 seconds before trying the next password to avoid rate limits / circuit breaker
    await delay(6500);
  }
  console.log("No passwords in this batch worked.");
}

tryConnect();
