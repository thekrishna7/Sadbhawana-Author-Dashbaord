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
    if (line.includes("SUCCESS!") || line.includes("Connected with")) {
      try {
        const obj = JSON.parse(line);
        if (obj.content) {
          console.log(`[Step ${obj.step_index}] Content:`, obj.content.replace(/\n/g, " ").substring(0, 150));
        } else if (obj.tool_calls) {
          console.log(`[Step ${obj.step_index}] Tool Call:`, JSON.stringify(obj.tool_calls).substring(0, 150));
        }
      } catch {
        // Not JSON
      }
    }
  }
}

main().catch(console.error);
