const { createClient } = require("@supabase/supabase-js");

const url = "https://wdppaupdvxrbgfwtngka.supabase.co";
const key = "sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-";

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Querying books...");
  const { data: books, error: booksErr } = await supabase.from("books").select("*").limit(1);
  if (booksErr) console.error("Books error:", booksErr);
  else console.log("Books columns:", Object.keys(books[0] || {}));

  console.log("\nQuerying sales...");
  const { data: sales, error: salesErr } = await supabase.from("sales").select("*").limit(1);
  if (salesErr) console.error("Sales error:", salesErr);
  else console.log("Sales columns:", Object.keys(sales[0] || {}));

  console.log("\nQuerying documents...");
  const { data: docs, error: docsErr } = await supabase.from("documents").select("*").limit(1);
  if (docsErr) console.error("Documents error:", docsErr);
  else console.log("Documents columns:", Object.keys(docs[0] || {}));
}

main().catch(console.error);
