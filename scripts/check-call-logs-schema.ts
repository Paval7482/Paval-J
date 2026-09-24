import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const admin = createClient(url, key);

async function run() {
  const { data, error } = await admin.from("call_logs").select("*").limit(5);
  console.log("Call logs sample:", data, error);

  // Test insert a dummy call log
  const { data: accounts } = await admin.from("accounts").select("id").limit(1);
  const accountId = accounts?.[0]?.id;

  const testInsert = await admin.from("call_logs").insert({
    account_id: accountId,
    customer_number: "+917603830507",
    customer_name: "SRI LAKSHMI Karthi",
    agent_name: "Karthi",
    call_type: "Outgoing",
    call_status: "Connected",
    call_duration: 20,
    call_date: new Date().toISOString(),
  }).select();

  console.log("Test insert result:", testInsert);
}

run().catch(console.error);
