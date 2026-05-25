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
      if (line.includes("Database migration completed") || line.includes("migration completed successfully")) {
        // filter out view_file or plan descriptions
        if (!line.includes("view_file") && !line.includes("route.ts") && !line.includes("PLANNER_RESPONSE") && !line.includes("write_to_file") && !line.includes("implementation_plan")) {
          console.log(`[${dirName}] FOUND:`, line.substring(0, 500));
        }
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
