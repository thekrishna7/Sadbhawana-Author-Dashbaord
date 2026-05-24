const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Testing query 1: *, uploader:profiles(full_name)...");
  const { data, error } = await supabase
    .from("documents")
    .select("*, uploader:profiles(full_name)")
    .limit(1);

  if (error) {
    console.error("Query 1 failed:", error);
  } else {
    console.log("Query 1 succeeded:", data);
  }

  console.log("\nTesting query 2: *, uploader:profiles!uploaded_by(full_name)...");
  const { data: data2, error: error2 } = await supabase
    .from("documents")
    .select("*, uploader:profiles!uploaded_by(full_name)")
    .limit(1);

  if (error2) {
    console.error("Query 2 failed:", error2);
  } else {
    console.log("Query 2 succeeded:", data2);
  }

  console.log("\nTesting query 3: *, profiles!uploaded_by(full_name)...");
  const { data: data3, error: error3 } = await supabase
    .from("documents")
    .select("*, profiles!uploaded_by(full_name)")
    .limit(1);

  if (error3) {
    console.error("Query 3 failed:", error3);
  } else {
    console.log("Query 3 succeeded:", data3);
  }
}

main().catch(console.error);
