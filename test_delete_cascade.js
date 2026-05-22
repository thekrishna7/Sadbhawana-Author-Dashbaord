const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key);

async function main() {
  // 1. Get a valid author id
  const { data: authors } = await supabase.from("profiles").select("id").eq("role", "author").limit(1);
  if (!authors || authors.length === 0) {
    console.log("No author found to run test.");
    return;
  }
  const authorId = authors[0].id;

  // 2. Insert dummy book
  console.log("Inserting dummy book...");
  const { data: book, error: bookErr } = await supabase.from("books").insert({
    title: "Test Cascade Book",
    author_id: authorId,
    serial_number: "TEST-0001",
    book_type: "sell"
  }).select("id").single();

  if (bookErr) {
    console.error("Error inserting test book:", bookErr.message);
    return;
  }
  const bookId = book.id;
  console.log("Inserted test book with id:", bookId);

  // 3. Insert some dummy details
  const { error: mErr } = await supabase.from("manuscripts").insert({
    book_id: bookId,
    status: "submitted"
  });
  console.log("Inserted manuscript status:", mErr ? mErr.message : "Success");

  const { error: cErr } = await supabase.from("conversations").insert({
    book_id: bookId,
    title: "Test Chat",
    type: "general"
  });
  console.log("Inserted conversation status:", cErr ? cErr.message : "Success");

  // 4. Try to delete the book
  console.log("Attempting to delete the book...");
  const { error: delErr } = await supabase.from("books").delete().eq("id", bookId);
  if (delErr) {
    console.error("Delete failed:", delErr.message);
  } else {
    console.log("Delete succeeded! Cascade is enabled.");
  }
}

main().catch(console.error);
