const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const bucket = "documents";
  const path = "admin-uploads/07804513-38a2-4e43-9d7d-33232fb186c0/1779641033834-Shri-Radha-Rani-The-Essence-of-Divine-Love-by-Jagadguru-Shri-Kripalu-Ji-Maharaj-Jagadguru-Kripalu-Parishat.png";

  console.log("Generating signed URL via admin service role...");
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 86400);

  if (error) {
    console.error("Signed URL Error:", error);
  } else {
    console.log("SUCCESS! Signed URL:", data.signedUrl);
  }
}

run();
