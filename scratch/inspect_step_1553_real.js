const fs = require("fs");
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
      if (obj.step_index >= 1550 && obj.step_index <= 1560) {
        console.log(`[Step ${obj.step_index}] Source: ${obj.source}, Type: ${obj.type}, Status: ${obj.status}`);
        if (obj.content) console.log("Content:", obj.content.substring(0, 1000));
        if (obj.tool_calls) console.log("Tool calls:", JSON.stringify(obj.tool_calls));
      }
    } catch (e) {}
  }
}

main().catch(console.error);
