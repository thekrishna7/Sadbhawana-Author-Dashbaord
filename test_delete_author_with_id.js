const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key);

async function main() {
  const dummyId = crypto.randomUUID();
  console.log("Inserting dummy profile with id:", dummyId);

  const { error: profErr } = await supabase.from("profiles").insert({
    id: dummyId,
    full_name: "Test Cascade Author With ID",
    role: "author",
    email: `cascade-${dummyId.substring(0,8)}@example.com`
  });

  if (profErr) {
    console.error("Error inserting test profile:", profErr.message);
    return;
  }
  console.log("Inserted test profile.");

  // 2. Insert dummy book for this author
  console.log("Inserting dummy book...");
  const { data: book, error: bookErr } = await supabase.from("books").insert({
    title: "Test Cascade Book for Author With ID",
    author_id: dummyId,
    serial_number: `T-${dummyId.substring(0,4)}`,
    book_type: "sell"
  }).select("id").single();

  if (bookErr) {
    console.error("Error inserting test book:", bookErr.message);
    // Cleanup profile
    await supabase.from("profiles").delete().eq("id", dummyId);
    return;
  }
  const bookId = book.id;
  console.log("Inserted test book with id:", bookId);

  // 3. Try to delete the author profile
  console.log("Attempting to delete the author profile...");
  const { error: delErr } = await supabase.from("profiles").delete().eq("id", dummyId);
  if (delErr) {
    console.error("Delete profile failed:", delErr.message);
    // Cleanup manually
    await supabase.from("books").delete().eq("id", bookId);
    await supabase.from("profiles").delete().eq("id", dummyId);
  } else {
    console.log("Delete profile succeeded! Cascade for author to books is enabled.");
  }
}

main().catch(console.error);
