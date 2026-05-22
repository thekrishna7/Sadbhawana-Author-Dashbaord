const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
  console.log("--- CONVERSATIONS ---");
  const { data: conv, error: convErr } = await supabase.from("conversations").select("*").limit(1);
  if (convErr) console.error("Conversations error:", convErr);
  else console.log("Conversations sample:", conv);

  console.log("--- PARTICIPANTS ---");
  const { data: part, error: partErr } = await supabase.from("conversation_participants").select("*").limit(1);
  if (partErr) console.error("Participants error:", partErr);
  else console.log("Participants sample:", part);

  console.log("--- MESSAGES ---");
  const { data: msg, error: msgErr } = await supabase.from("messages").select("*").limit(1);
  if (msgErr) console.error("Messages error:", msgErr);
  else console.log("Messages sample:", msg);
}

test();
