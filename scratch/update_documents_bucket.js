const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Updating documents bucket...");
  const { data, error } = await supabase.storage.updateBucket('documents', {
    public: false,
    file_size_limit: 52428800,
    allowed_mime_types: null, // this will allow all file types
  });
  if (error) {
    console.error("Error updating bucket:", error);
  } else {
    console.log("Bucket updated successfully:", data);
  }
}

main().catch(console.error);
