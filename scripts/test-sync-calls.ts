import fs from "fs";
import path from "path";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

import { syncTeleCrmCalls } from "../src/lib/telecrm/call-sync";

async function main() {
  console.log("Triggering TeleCRM Call Sync...");
  const res = await syncTeleCrmCalls(50);
  console.log("Sync Result:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
