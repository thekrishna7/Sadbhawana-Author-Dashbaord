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
    
    // Look for success messages, password definitions, or SQL statements
    if (
      lower.includes("success") || 
      lower.includes("connected") || 
      lower.includes("alter table") ||
      lower.includes("migration")
    ) {
      if (lower.includes("fail") || lower.includes("error")) {
        continue;
      }
      try {
        const obj = JSON.parse(line);
        console.log(`[Line ${lineNum}] Step ${obj.step_index}`);
        if (obj.content) {
          const matchedLines = obj.content.split("\n").filter(l => 
            l.toLowerCase().includes("pass") || 
            l.toLowerCase().includes("success") || 
            l.toLowerCase().includes("connect")
          );
          if (matchedLines.length > 0) {
            console.log("  Content:", matchedLines.join(" | ").substring(0, 300));
          }
        }
        if (obj.tool_calls) {
          console.log("  Tool calls:", JSON.stringify(obj.tool_calls).substring(0, 300));
        }
      } catch (err) {
        // Not JSON
      }
    }
  }
}

main().catch(console.error);
