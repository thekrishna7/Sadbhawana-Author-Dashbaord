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
      if (line.includes("/api/setup/migrate") || line.includes("migrate-royalties")) {
        try {
          const obj = JSON.parse(line);
          console.log(`[${dirName}] Step ${obj.step_index}:`);
          console.log(JSON.stringify(obj).substring(0, 1500));
        } catch (e) {}
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
