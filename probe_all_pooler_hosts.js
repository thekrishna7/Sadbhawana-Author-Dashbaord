const { Client } = require("pg");

const projectRef = "wdppaupdvxrbgfwtngka";
const user = `postgres.${projectRef}`;
const database = "postgres";
const port = 6543;

const prefixes = ["aws-0", "aws-1", "gcp-0", "gcp-1"];
const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "sa-east-1", "ca-central-1"
];

async function probe() {
  for (const prefix of prefixes) {
    for (const region of regions) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      
      // Check DNS first
      try {
        await require("dns").promises.lookup(host);
      } catch {
        // DNS doesn't exist for this host, skip
        continue;
      }

      console.log(`Probing host: ${host}`);
      const client = new Client({
        host,
        port,
        user,
        password: "wrong_password_on_purpose",
        database,
        ssl: { rejectUnauthorized: false }
      });

      try {
        await client.connect();
        console.log(`  Connected?! That shouldn't happen with a wrong password.`);
        await client.end();
      } catch (err) {
        // We look for a "password authentication failed" error, which means tenant was found!
        // If tenant is NOT found, it says "Tenant or user not found" or "tenant/user not found".
        const msg = err.message.toLowerCase();
        if (msg.includes("password authentication failed")) {
          console.log(`FOUND IT! Host is: ${host}`);
          console.log(`Error was: ${err.message}`);
          return;
        } else {
          console.log(`  Host ${host} failed with: ${err.message}`);
        }
      }
    }
  }
  console.log("Completed probing all poolers.");
}

probe();
