async function run() {
  console.log("Triggering migrate endpoint...");
  try {
    const res = await fetch("http://localhost:3000/api/setup/migrate");
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}
run();
