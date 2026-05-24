const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data, error } = await supabase
    .from("sales")
    .select("id, book_id, website_sales_monthly")
    .limit(1);

  if (error) {
    console.error("SELECT error:", error.message);
  } else {
    console.log("SELECT success:", data);
  }
}

main().catch(console.error);
