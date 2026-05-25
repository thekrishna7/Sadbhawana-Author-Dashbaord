const fs = require("fs");
const path = require("path");

const adminDir = "e:/AUTHOR_DASHBOARD/src/app/(protected)/admin";

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx")) {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/(\bex\s*=)|(\bex\s*\.)|(\bex\s*\[)|(\bex\s*\()|(\bex\s+\w+)/.test(line)) {
          console.log(`[${filePath}:${idx + 1}] ${line.trim()}`);
        }
      });
    }
  }
}

searchDir(adminDir);
console.log("Done searching admin folder.");
