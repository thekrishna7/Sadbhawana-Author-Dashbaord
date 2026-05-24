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
      // Look for lines containing postgresql:// or postgres://
      if (lower.includes("postgresql://") || lower.includes("postgres://") || lower.includes("db_password=") || lower.includes("supabase_password=")) {
        console.log(`[${dirName}] Found connection string/password:`);
        console.log(line.substring(0, 1000));
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
