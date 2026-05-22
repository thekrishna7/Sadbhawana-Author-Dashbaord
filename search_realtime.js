const fs = require("fs");
const readline = require("readline");

const logFile = "C:/Users/krish/.gemini/antigravity-ide/brain/3b5f6c48-ffef-410f-a672-03137886e5ee/.system_generated/logs/transcript.jsonl";

async function main() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    const lower = line.toLowerCase();
    
    if (lower.includes("realtime") || lower.includes("drop table") || lower.includes("alter publication")) {
      try {
        const obj = JSON.parse(line);
        console.log(`[Line ${lineNum}] Step ${obj.step_index} (${obj.type}):`);
        if (obj.content) {
          console.log(`  Content: ${obj.content.substring(0, 500)}`);
        }
        if (obj.tool_calls) {
          console.log(`  Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
        }
      } catch (err) {
        // Not JSON
      }
    }
  }
}

main().catch(console.error);
