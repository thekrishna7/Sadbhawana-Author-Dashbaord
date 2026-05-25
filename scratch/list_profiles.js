const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone")
    .eq("role", "author")
    .limit(5);

  if (error) {
    console.error("Error querying profiles:", error);
  } else {
    console.log("Authors:", data);
  }
}

run();
