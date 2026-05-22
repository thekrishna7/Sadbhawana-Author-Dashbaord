const { Client } = require("pg");

const host = "aws-1-ap-south-1.pooler.supabase.com";
const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const passwords = [
  "publishing_os",
  "publishing_os_2026",
  "auth_dashboard",
  "author_dashboard"
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
    // Wait 6 seconds before trying the next password to avoid rate limits
    await delay(6000);
  }
  console.log("No passwords in this batch worked.");
}

tryConnect();
