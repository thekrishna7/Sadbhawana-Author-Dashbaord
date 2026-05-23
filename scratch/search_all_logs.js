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
      if (
        (lower.includes("success") || lower.includes("migration completed")) &&
        !lower.includes("view_file") &&
        !lower.includes("replace_file_content")
      ) {
        try {
          const obj = JSON.parse(line);
          if (obj.content && (obj.content.includes("successfully") || obj.content.includes("SUCCESS"))) {
            console.log(`FOUND SUCCESS in [${dirName}] Step ${obj.step_index}:`);
            console.log(`  Content: ${obj.content.substring(0, 300)}`);
          }
        } catch {
          // not json
        }
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
