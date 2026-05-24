const fs = require("fs");
const path = require("path");
const readline = require("readline");

const brainDir = "C:/Users/krish/.gemini/antigravity-ide/brain";

async function searchFile(filePath, dirName) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const lower = line.toLowerCase();
      if (lower.includes("success") && (lower.includes("migration") || lower.includes("connect") || lower.includes("migrate"))) {
        try {
          const obj = JSON.parse(line);
          const content = obj.content || "";
          console.log(`[${dirName}] ${content.substring(0, 500)}`);
          if (obj.tool_calls) {
            console.log(`[${dirName}] Tool calls:`, JSON.stringify(obj.tool_calls).substring(0, 500));
          }
        } catch (e) {}
      }
    }
  } catch (err) {}
}

async function main() {
  const dirs = fs.readdirSync(brainDir);
  for (const d of dirs) {
    const filePath = path.join(brainDir, d, ".system_generated", "logs", "transcript.jsonl");
    if (fs.existsSync(filePath)) {
      await searchFile(filePath, d);
    }
  }
}

main().catch(console.error);
