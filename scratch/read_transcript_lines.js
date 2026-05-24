const fs = require("fs");
const readline = require("readline");

const logFile = "C:/Users/krish/.gemini/antigravity-ide/brain/bbbfa56a-7ba2-4f2c-a3c7-605e45ba7708/.system_generated/logs/transcript.jsonl";

async function main() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum >= 1440 && lineNum <= 1460) {
      console.log(`L${lineNum}: ${line}`);
    }
  }
}

main().catch(console.error);
