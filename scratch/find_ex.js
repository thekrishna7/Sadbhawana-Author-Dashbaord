const fs = require("fs");
const path = require("path");

const srcDir = "e:/AUTHOR_DASHBOARD/src";

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx")) {
      const content = fs.readFileSync(filePath, "utf8");
      // Find matches where "ex" is declared or used
      // Match whole word "ex"
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        const regex = /\bex\b/;
        if (regex.test(line)) {
          console.log(`[${filePath}:${idx + 1}] ${line.trim()}`);
        }
      });
    }
  }
}

searchDir(srcDir);
console.log("Done searching.");
