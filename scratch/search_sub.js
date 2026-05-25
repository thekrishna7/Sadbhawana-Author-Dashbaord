const fs = require("fs");
const file = "e:/AUTHOR_DASHBOARD/src/app/(protected)/admin/admin-dashboard-client.tsx";
const content = fs.readFileSync(file, "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  // Regex to look for "ex" used as a variable (e.g. ex., ex[, ex(, ex=, ex )
  if (/(\bex\s*=)|(\bex\s*\.)|(\bex\s*\[)|(\bex\s*\()|(\bex\s+\w+)/.test(line)) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
console.log("Done search_sub.");
