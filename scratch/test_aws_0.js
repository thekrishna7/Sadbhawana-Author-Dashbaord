const { Client } = require("pg");

const host = "aws-0-ap-south-1.pooler.supabase.com";
const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const passwords = [
  "publishing-setup-2026",
  "postgres",
  "supabase",
  "supabase_password",
  "Supabase12345!"
];

async function tryConnect() {
  for (const password of passwords) {
    console.log(`Trying host ${host} with password: ${password}...`);
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
  }
  console.log("No passwords worked for aws-0.");
}

tryConnect();
