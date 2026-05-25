const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHBhdXBkdnhyYmdmd3RuZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjg3NDYsImV4cCI6MjA5NDYwNDc0Nn0.pI32w_dFJnDJj2cEXrHbDjEJ-UwQPUrXH4XauCuOMNA";

// We will sign in as the author "krishnasharmaambah961u@gmail.com".
// Wait, we need to know the password. Let's try some common passwords,
// or we can use the admin client to reset the password of this author to "testing123!" first!
const adminKey = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

async function run() {
  const admin = createClient(url, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const email = "krishnasharmaambah961u@gmail.com";
  const tempPassword = "Password123!";

  console.log("Resetting test author password via admin client...");
  // Find user by email
  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    return;
  }
  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  // Update user password
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    password: tempPassword
  });
  if (updateErr) {
    console.error("Failed to update password:", updateErr);
    return;
  }
  console.log("Password reset successfully to:", tempPassword);

  // Now create the client-side supabase client and sign in
  const client = createClient(url, anonKey);
  console.log("Signing in as author...");
  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: tempPassword
  });

  if (signInErr) {
    console.error("Sign in failed:", signInErr);
    return;
  }
  console.log("Signed in successfully as author! User ID:", authData.user.id);

  // Try the query from author dashboard
  console.log("Running document query as logged in author...");
  const { data: docs, error: queryErr } = await client
    .from("documents")
    .select("*, uploader:profiles!uploaded_by(full_name), book:books(title)")
    .eq("author_id", authData.user.id)
    .neq("uploaded_by", authData.user.id)
    .order("created_at", { ascending: false });

  if (queryErr) {
    console.error("QUERY ERROR:", queryErr);
  } else {
    console.log("Query Succeeded! Loaded documents count:", docs.length);
    console.log("Documents:", docs);
  }
}

run().catch(console.error);
