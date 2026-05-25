const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabase.from("documents").select("*").limit(1);
  if (error) {
    console.error("Error querying documents:", error);
  } else {
    console.log("Documents record columns:", Object.keys(data[0] || {}));
  }
}

run();
