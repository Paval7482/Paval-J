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
  const subashUserId = "b8db6f80-377c-41b9-bc79-458ed7733230";
  const { data: convs, error } = await admin
    .from("conversations")
    .update({
      assigned_agent_id: subashUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", "5e4480eb-3973-4994-9b7a-a32262d96802")
    .select();

  console.log("Updated Simmu conversation:", convs, error);

  // Also update contact updated_at
  await admin
    .from("contacts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", "5e4480eb-3973-4994-9b7a-a32262d96802");
}

run().catch(console.error);
