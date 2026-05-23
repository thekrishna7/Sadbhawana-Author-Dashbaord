const fs = require("fs");
const path = require("path");

const dir = "C:/Users/krish/.gemini/antigravity-ide/brain/3b5f6c48-ffef-410f-a672-03137886e5ee/.system_generated/tasks";

function main() {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith(".log")) {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      if (content.includes("SUCCESS") || content.includes("Connected")) {
        console.log(`=== FILE: ${file} ===`);
        console.log(content);
      }
    }
  }
}

main();
