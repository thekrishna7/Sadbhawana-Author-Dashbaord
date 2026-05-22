const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key);

async function inspect() {
  const { data, error } = await supabase.from("notifications").select("*").limit(1);
  if (error) {
    console.error("Error fetching notifications:", error);
  } else {
    console.log("Sample notification record:", data);
  }
}

inspect();
