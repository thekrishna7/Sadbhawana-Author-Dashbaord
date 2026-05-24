const { Client } = require("pg");

const config = {
  host: "db.wdppaupdvxrbgfwtngka.supabase.co",
  port: 5432,
  user: "postgres",
  password: "publishing-setup-2026",
  database: "postgres",
  ssl: { rejectUnauthorized: false }
};

async function main() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log("SUCCESSFULLY CONNECTED DIRECTLY!");
    const res = await client.query("SELECT version();");
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Direct connection failed:", err.message);
  }
}

main();
