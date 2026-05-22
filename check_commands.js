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
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === "run_command") {
            console.log(`[Step ${obj.step_index}] CommandLine: ${tc.args.CommandLine}`);
          }
        }
      }
      if (obj.type === "RUN_COMMAND") {
        console.log(`  [Step ${obj.step_index}] Result: ${obj.content ? obj.content.substring(0, 500) : "no content"}`);
      }
    } catch (e) {}
  }
}

main().catch(console.error);
