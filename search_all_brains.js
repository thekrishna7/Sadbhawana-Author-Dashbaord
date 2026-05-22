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

    let lineNum = 0;
    for await (const line of rl) {
      lineNum++;
      const lower = line.toLowerCase();
      if (
        (lower.includes("password") || lower.includes("db_password") || lower.includes("postgres") || lower.includes("aws-1")) &&
        !lower.includes("wrong_password_on_purpose") &&
        !lower.includes("auth_dashboard") &&
        !lower.includes("publishing_os") &&
        !lower.includes("krishna_sharma") &&
        !lower.includes("supabase12345!")
      ) {
        try {
          const obj = JSON.parse(line);
          const content = obj.content || "";
          // Look for actual passwords or successful connections
          if (content.includes("SUCCESS") || content.includes("connected") || (content.length > 5 && content.length < 150 && !content.includes("Failed"))) {
            console.log(`[${dirName}] Line ${lineNum} Step ${obj.step_index}:`);
            console.log(`Source: ${obj.source}, Type: ${obj.type}`);
            console.log(`Content: ${content.substring(0, 300)}`);
          }
          if (obj.tool_calls) {
            console.log(`[${dirName}] Tool Calls in Step ${obj.step_index}:`, JSON.stringify(obj.tool_calls));
          }
        } catch (e) {
          // Ignore parse error
        }
      }
    }
  } catch (err) {
    // Skip errors
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
  console.log("Completed searching all conversations.");
}

main().catch(console.error);
