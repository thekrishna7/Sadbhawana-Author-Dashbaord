const { Client } = require("pg");

const config = {
  host: "aws-1-ap-south-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.wdppaupdvxrbgfwtngka",
  password: "publishing-setup-2026",
  database: "postgres",
  ssl: { rejectUnauthorized: false }
};

async function main() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log("SUCCESSFULLY CONNECTED!");
    const res = await client.query("SELECT version();");
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

main();
