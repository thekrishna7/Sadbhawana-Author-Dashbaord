const fs = require("fs");
const path = require("path");
const readline = require("readline");

const brainDir = "C:/Users/krish/.gemini/antigravity-ide/brain";

async function searchFile(filePath, dirName) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.includes("run_command") && (line.includes("run_migration") || line.includes("test_pg_conn") || line.includes("test_passwords") || line.includes("test_select"))) {
        try {
          const obj = JSON.parse(line);
          if (obj.tool_calls) {
            obj.tool_calls.forEach(tc => {
              if (tc.name === "run_command") {
                console.log(`FOUND COMMAND in [${dirName}] Step ${obj.step_index}: ${tc.args.CommandLine}`);
              }
            });
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    // Skip
  }
}

async function main() {
  const dirs = fs.readdirSync(brainDir);
  for (const d of dirs) {
    const filePath = path.join(brainDir, d, ".system_generated", "logs", "transcript.jsonl");
    if (fs.existsSync(filePath)) {
      await searchFile(filePath, d);
    }
  }
}

main().catch(console.error);
