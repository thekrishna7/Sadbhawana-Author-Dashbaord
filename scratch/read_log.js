const fs = require("fs");
const readline = require("readline");
const path = require("path");

const logFile = "C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\bbbfa56a-7ba2-4f2c-a3c7-605e45ba7708\\.system_generated\\logs\\transcript.jsonl";

async function main() {
  if (!fs.existsSync(logFile)) {
    console.log("File does not exist:", logFile);
    return;
  }
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes("Connected successfully!") || line.includes("SUCCESS!") || line.includes("Connected with host")) {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index}:`, obj.content);
    }
  }
}

main().catch(console.error);
