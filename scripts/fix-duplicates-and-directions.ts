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
  const convId = "17d4e9b7-020d-4eb8-8d60-de0e683d95e4";

  // 1. Fetch all messages in this conversation
  const { data: messages } = await admin
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  console.log(`Found ${messages?.length} total messages before deduplication.`);

  // 2. Identify unique messages by content_text
  const seenTexts = new Set<string>();
  const toDeleteIds: string[] = [];
  const agentTextKeywords = [
    "9 Person 2Female 7Male",
    "Various of places like Madurai Karnataka Erode",
    "Vinoth Kumar S",
    "mam Ippa nan Velliya iruken",
    "Full Rice Half Rice Half Steam Rice",
    "Yes",
  ];

  if (messages) {
    for (const m of messages) {
      const text = (m.content_text || "").trim();
      
      // Determine if this was an outgoing reply from executive
      const isAgentReply = agentTextKeywords.some(k => text.includes(k));

      if (isAgentReply && m.sender_type !== "agent") {
        await admin
          .from("messages")
          .update({ sender_type: "agent" })
          .eq("id", m.id);
        console.log(`Updated message to sender_type='agent': "${text.slice(0, 40)}"`);
      }

      if (text) {
        if (seenTexts.has(text)) {
          toDeleteIds.push(m.id);
        } else {
          seenTexts.add(text);
        }
      }
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`Deleting ${toDeleteIds.length} duplicate messages...`);
    await admin.from("messages").delete().in("id", toDeleteIds);
  }

  const { data: remaining } = await admin
    .from("messages")
    .select("id, sender_type, content_text, created_at")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  console.log(`Remaining clean messages (${remaining?.length}):`, JSON.stringify(remaining, null, 2));
}

run().catch(console.error);
