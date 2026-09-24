import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const admin = createClient(url, key);

async function run() {
  console.log("Connecting to Supabase URL:", url);

  // 1. Search for contact by phone 7200032027
  const { data: contacts, error: cErr } = await admin
    .from("contacts")
    .select("*")
    .or("phone.ilike.%7200032027%,phone.ilike.%72000 32027%,name.ilike.%Simmu%");

  console.log("Contacts search by 7200032027 / Simmu:", JSON.stringify(contacts, null, 2), cErr);

  // 2. Latest 10 messages
  const { data: messages } = await admin
    .from("messages")
    .select("id, conversation_id, sender_type, content_text, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("Latest 10 messages in database:", JSON.stringify(messages, null, 2));

  // 3. Check conversations for Subash or latest 5 conversations
  const { data: convs } = await admin
    .from("conversations")
    .select("id, contact_id, user_id, assigned_agent_id, updated_at, last_message_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  console.log("Latest 5 conversations:", JSON.stringify(convs, null, 2));
}

run().catch(console.error);
