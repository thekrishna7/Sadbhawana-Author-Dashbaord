const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHBhdXBkdnhyYmdmd3RuZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjg3NDYsImV4cCI6MjA5NDYwNDc0Nn0.pI32w_dFJnDJj2cEXrHbDjEJ-UwQPUrXH4XauCuOMNA";

async function run() {
  const email = "krishnasharmaambah961u@gmail.com";
  const tempPassword = "Password123!";

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

  console.log("\n--- Querying PROFILES table as author ---");
  const { data: profs, error: profsErr } = await client.from("profiles").select("id, full_name, role");
  if (profsErr) console.error("Profiles error:", profsErr);
  else console.log(`Profiles success! Count: ${profs.length}. Profiles:`, profs);

  console.log("\n--- Querying BOOKS table as author ---");
  const { data: books, error: booksErr } = await client.from("books").select("id, title, author_id");
  if (booksErr) console.error("Books error:", booksErr);
  else console.log(`Books success! Count: ${books.length}. Books:`, books);
}

run().catch(console.error);
