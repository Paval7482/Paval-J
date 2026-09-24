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
  const { data: contacts } = await admin
    .from("contacts")
    .select("id, name, phone, user_id, created_at, updated_at")
    .or("phone.ilike.%7200032027%,phone.ilike.%72000 32027%,name.ilike.%Simmu%");

  console.log("CONTACTS:", JSON.stringify(contacts, null, 2));

  if (contacts && contacts[0]) {
    const { data: convs } = await admin
      .from("conversations")
      .select("*")
      .eq("contact_id", contacts[0].id);
    console.log("CONVERSATIONS:", JSON.stringify(convs, null, 2));
    if (convs && convs[0]) {
      const { data: msgs } = await admin
        .from("messages")
        .select("id, sender_type, content_text, created_at")
        .eq("conversation_id", convs[0].id)
        .order("created_at", { ascending: false });
      console.log("MSGS FOR CONTACT:", JSON.stringify(msgs, null, 2));
    }
  }
}

run().catch(console.error);
