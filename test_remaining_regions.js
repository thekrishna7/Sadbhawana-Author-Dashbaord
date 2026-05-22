const { Client } = require("pg");

const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const regions = [
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "eu-west-3",
  "eu-north-1",
  "sa-east-1",
  "ca-central-1"
];

const passwords = ["supabase"]; // Just one password to find if tenant is recognized

async function tryConnect() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Checking region ${region} (host: ${host})...`);
    
    try {
      const dns = await require("dns").promises.lookup(host);
      console.log(`DNS resolves to: ${dns.address}`);
    } catch (dnsErr) {
      console.log(`DNS lookup failed for ${host}: ${dnsErr.message}`);
      continue;
    }

    const client = new Client({
      host,
      port,
      user,
      password: passwords[0],
      database,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log(`SUCCESS! Connected to ${host}`);
      await client.end();
      return;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }
  console.log("No more regions worked.");
}

tryConnect();
