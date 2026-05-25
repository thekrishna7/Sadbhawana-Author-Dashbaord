const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
// Using the anon key to simulate client-side query behavior
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHBhdXBkdnhyYmdmd3RuZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjg3NDYsImV4cCI6MjA5NDYwNDc0Nn0.pI32w_dFJnDJj2cEXrHbDjEJ-UwQPUrXH4XauCuOMNA";

const supabase = createClient(url, key);

async function run() {
  console.log("Running query on documents...");
  const { data, error } = await supabase
    .from("documents")
    .select("*, uploader:profiles!uploaded_by(full_name), book:books(title)")
    .limit(5);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query success! Data length:", data.length, "Sample data:", data[0]);
  }
}

run();
