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
    
    // Check for success or execution patterns
    if (
      (lower.includes("success") && (lower.includes("password") || lower.includes("connect") || lower.includes("db"))) ||
      lower.includes("alter table books") ||
      (lower.includes("run_migration.js") && lower.includes("node")) ||
      lower.includes("database_url")
    ) {
      try {
        const obj = JSON.parse(line);
        console.log(`--- Line ${lineNum} (Step ${obj.step_index}) ---`);
        console.log(`Source: ${obj.source}, Type: ${obj.type}`);
        if (obj.content) {
          console.log(`Content: ${obj.content.substring(0, 1000)}`);
        }
        if (obj.tool_calls) {
          console.log(`Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
        }
      } catch (err) {
        console.log(`--- Line ${lineNum} (Parse error) ---`);
        console.log(line.substring(0, 500));
      }
    }
  }
}

main().catch(console.error);
