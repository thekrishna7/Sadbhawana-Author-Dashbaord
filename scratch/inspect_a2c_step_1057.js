const fs = require("fs");
const path = require("path");
const readline = require("readline");

const logFile = "C:/Users/krish/.gemini/antigravity-ide/brain/a2c650de-786a-4e3f-a010-77578ca607be/.system_generated/logs/transcript.jsonl";

async function main() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 1055 && obj.step_index <= 1065) {
        console.log(`[Step ${obj.step_index}] Type: ${obj.type}, Status: ${obj.status}`);
        if (obj.content) console.log("Content snippet:", obj.content.substring(0, 1500));
        if (obj.tool_calls) console.log("Tool calls:", JSON.stringify(obj.tool_calls));
      }
    } catch {
      // not json
    }
  }
}

main().catch(console.error);
