const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data, error } = await supabase
    .from("documents")
    .select("*, uploader:profiles!uploaded_by(full_name, role), author:profiles!author_id(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error querying documents:", error);
  } else {
    console.log("Documents counts:", data.length);
    console.log("Documents:", JSON.stringify(data, null, 2));
  }
}

run();
