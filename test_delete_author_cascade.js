const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key);

async function main() {
  // 1. Create a dummy author profile
  console.log("Inserting dummy profile...");
  const { data: profile, error: profErr } = await supabase.from("profiles").insert({
    full_name: "Test Cascade Author",
    role: "author",
    email: "cascade-test@example.com"
  }).select("id").single();

  if (profErr) {
    console.error("Error inserting test profile:", profErr.message);
    return;
  }
  const authorId = profile.id;
  console.log("Inserted test profile with id:", authorId);

  // 2. Insert dummy book for this author
  console.log("Inserting dummy book...");
  const { data: book, error: bookErr } = await supabase.from("books").insert({
    title: "Test Cascade Book for Author",
    author_id: authorId,
    serial_number: "TEST-0002",
    book_type: "sell"
  }).select("id").single();

  if (bookErr) {
    console.error("Error inserting test book:", bookErr.message);
    // Cleanup profile
    await supabase.from("profiles").delete().eq("id", authorId);
    return;
  }
  const bookId = book.id;
  console.log("Inserted test book with id:", bookId);

  // 3. Try to delete the author profile
  console.log("Attempting to delete the author profile...");
  const { error: delErr } = await supabase.from("profiles").delete().eq("id", authorId);
  if (delErr) {
    console.error("Delete profile failed:", delErr.message);
    // Cleanup manually
    await supabase.from("books").delete().eq("id", bookId);
    await supabase.from("profiles").delete().eq("id", authorId);
  } else {
    console.log("Delete profile succeeded! Cascade for author to books is enabled.");
  }
}

main().catch(console.error);
