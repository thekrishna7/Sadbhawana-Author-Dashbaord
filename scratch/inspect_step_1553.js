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
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 1625 && obj.step_index <= 1670) {
        console.log(`[Step ${obj.step_index}] Type: ${obj.type}, Status: ${obj.status}`);
        if (obj.content) console.log("Content snippet:", obj.content.substring(0, 500));
        if (obj.tool_calls) console.log("Tool calls:", JSON.stringify(obj.tool_calls));
      }
    } catch {
      // not json
    }
  }
}

main().catch(console.error);
