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
    .or("phone.ilike.%7200032027%,name.ilike.%Simmu%");

  console.log("Contact:", contacts);

  if (contacts && contacts[0]) {
    const { data: convs } = await admin
      .from("conversations")
      .select("id, contact_id, user_id, assigned_agent_id, updated_at")
      .eq("contact_id", contacts[0].id);
    console.log("Conversations:", convs);

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, role")
      .in("user_id", [contacts[0].user_id, convs?.[0]?.assigned_agent_id, convs?.[0]?.user_id]);
    console.log("Profiles:", profiles);
  }
}

run().catch(console.error);
