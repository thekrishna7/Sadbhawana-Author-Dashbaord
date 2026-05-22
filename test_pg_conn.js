const { Client } = require("pg");

const host = "db.wdppaupdvxrbgfwtngka.supabase.co";
const user = "postgres";
const database = "postgres";
const port = 6543; // Transaction pooler/direct

const passwords = [
  "publishing-setup-2026",
  "postgres",
  "supabase",
  "supabase_password",
  "Supabase12345!",
  "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-"
];

async function tryConnect() {
  for (const password of passwords) {
    console.log(`Trying password: ${password.substring(0, 10)}...`);
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
      console.log(`SUCCESS! Connected with password: ${password}`);
      const res = await client.query("SELECT version();");
      console.log(res.rows[0]);
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
    }
  }
  console.log("None of the standard passwords worked.");
}

tryConnect();
