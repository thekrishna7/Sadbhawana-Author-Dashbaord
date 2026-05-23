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
      if (line.includes("SUCCESS! Connected") || line.includes("SUCCESS! Succeeded")) {
        console.log(`[${dirName}] FOUND SUCCESS:`, line);
      }
    }
  } catch (err) {
    // Skip
  }
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
