const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabase.from("sales").select("*").limit(1);
  if (error) {
    console.error("Error querying sales:", error);
  } else {
    console.log("Sales record:", data);
  }
}

run();
