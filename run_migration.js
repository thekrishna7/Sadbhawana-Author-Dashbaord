const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const password = process.argv[2] || process.env.DB_PASSWORD;

if (!password) {
  console.error("Usage: node run_migration.js <db_password>");
  process.exit(1);
}

const config = {
  host: "aws-1-ap-south-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.wdppaupdvxrbgfwtngka",
  password: password,
  database: "postgres",
  ssl: { rejectUnauthorized: false }
};

async function main() {
  const client = new Client(config);
  try {
    console.log("Connecting to Supabase PostgreSQL Database Pooler...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("Reading migration.sql...");
    const sqlPath = path.join(__dirname, "migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Executing migration SQL...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

main();
