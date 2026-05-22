const { Client } = require("pg");

const host = "2406:da1a:314:7102:60e3:df3e:70e9:fb"; // Direct IPv6 address
const user = "postgres";
const database = "postgres";
const port = 5432;

const passwords = [
  "publishing-setup-2026",
  "postgres",
  "supabase",
  "supabase_password",
  "Supabase12345!"
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
  console.log("Direct IPv6 connection failed.");
}

tryConnect();
