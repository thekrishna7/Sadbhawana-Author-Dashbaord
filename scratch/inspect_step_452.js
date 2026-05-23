const fs = require("fs");
const path = require("path");
const readline = require("readline");

const logFile = "C:/Users/krish/.gemini/antigravity-ide/brain/8d76d33a-a17a-408a-ae7d-79ac73558610/.system_generated/logs/transcript.jsonl";

async function main() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 450 && obj.step_index <= 455) {
        console.log(`[Step ${obj.step_index}] Type: ${obj.type}`);
        if (obj.content) console.log("Content snippet:", obj.content.substring(0, 1500));
        if (obj.tool_calls) console.log("Tool calls:", JSON.stringify(obj.tool_calls));
      }
    } catch {
      // not json
    }
  }
}

main().catch(console.error);
