const fs = require("fs");
const path = require("path");
const readline = require("readline");

const brainDir = "C:\\Users\\krish\\.gemini\\antigravity-ide\\brain";

async function main() {
  const dirs = fs.readdirSync(brainDir);
  for (const d of dirs) {
    const filePath = path.join(brainDir, d, ".system_generated", "logs", "transcript.jsonl");
    if (fs.existsSync(filePath)) {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      for await (const line of rl) {
        if (line.includes("Database migration completed successfully!")) {
          console.log(`[${d}] FOUND SUCCESS:`, line.substring(0, 300));
        }
      }
    }
  }
}

main().catch(console.error);
