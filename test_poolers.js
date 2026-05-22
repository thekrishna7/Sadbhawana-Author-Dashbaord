const { Client } = require("pg");

const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2"
];

const passwords = [
  "publishing-setup-2026",
  "postgres",
  "supabase",
  "supabase_password",
  "Supabase12345!"
];

async function tryConnect() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Checking region ${region} (host: ${host})...`);
    
    // First, verify DNS resolves
    try {
      const dns = await require("dns").promises.lookup(host);
      console.log(`DNS resolves to: ${dns.address}`);
    } catch (dnsErr) {
      console.log(`DNS lookup failed for ${host}: ${dnsErr.message}`);
      continue;
    }

    for (const password of passwords) {
      console.log(`  Trying password: ${password.substring(0, 10)}...`);
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
  }
  console.log("No poolers worked.");
}

tryConnect();
