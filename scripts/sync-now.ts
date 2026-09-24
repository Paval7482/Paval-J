import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { syncTeleCrmCalls } from "../src/lib/telecrm/call-sync";

async function run() {
  console.log("Running syncTeleCrmCalls(50)...");
  const result = await syncTeleCrmCalls(50);
  console.log("Sync result:", result);
}

run();
