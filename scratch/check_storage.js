const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("--- BUCKETS ---");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.error("Error listing buckets:", bErr);
  } else {
    console.log("Buckets:", buckets);
  }
}

main().catch(console.error);
