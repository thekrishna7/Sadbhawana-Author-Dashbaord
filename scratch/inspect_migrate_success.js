const fs = require("fs");
const path = require("path");
const readline = require("readline");

const logFile = "C:/Users/krish/.gemini/antigravity-ide/brain/3b5f6c48-ffef-410f-a672-03137886e5ee/.system_generated/logs/transcript.jsonl";

async function main() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes("/api/setup/migrate") && line.includes("read_url_content") && !line.includes("stepIndex")) {
      console.log("FOUND CALL:", line);
    }
    if (line.includes("Database migration completed") || line.includes("database migration completed")) {
      console.log("FOUND MIGRATION OUTPUT:", line);
    }
  }
}

main().catch(console.error);
