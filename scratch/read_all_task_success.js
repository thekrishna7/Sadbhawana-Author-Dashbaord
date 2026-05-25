const fs = require("fs");
const path = require("path");

const brainDir = "C:/Users/krish/.gemini/antigravity-ide/brain";

function main() {
  try {
    const dirs = fs.readdirSync(brainDir);
    for (const d of dirs) {
      const taskDir = path.join(brainDir, d, ".system_generated", "tasks");
      if (fs.existsSync(taskDir)) {
        const files = fs.readdirSync(taskDir);
        for (const file of files) {
          if (file.endsWith(".log")) {
            const filePath = path.join(taskDir, file);
            const content = fs.readFileSync(filePath, "utf8");
            if (content.includes("SUCCESS") || content.includes("Connected") || content.includes("successfully")) {
              console.log(`=== Brain: ${d}, Task File: ${file} ===`);
              console.log(content.substring(0, 1000));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading tasks:", err.message);
  }
}

main();
