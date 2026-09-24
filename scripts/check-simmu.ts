import { supabaseAdmin } from "../src/lib/automations/admin-client";

async function main() {
  const admin = supabaseAdmin();
  const { data: contacts } = await admin
    .from("contacts")
    .select("id, name, phone, user_id, assigned_to, updated_at")
    .or("phone.ilike.%7200032027%,name.ilike.%Simmu%");

  console.log("Contacts found:", JSON.stringify(contacts, null, 2));

  if (contacts && contacts.length > 0) {
    for (const c of contacts) {
      const { data: convs } = await admin
        .from("conversations")
        .select("id, contact_id, user_id, assigned_agent_id, updated_at, last_message_at")
        .eq("contact_id", c.id);
      console.log(`Convs for ${c.id}:`, JSON.stringify(convs, null, 2));

      if (convs && convs.length > 0) {
        const { data: msgs } = await admin
          .from("messages")
          .select("id, conversation_id, sender_type, content_text, created_at")
          .eq("conversation_id", convs[0].id)
          .order("created_at", { ascending: false });
        console.log(`Messages for conv ${convs[0].id}:`, JSON.stringify(msgs, null, 2));
      }

      const { data: notes } = await admin
        .from("contact_notes")
        .select("id, note_text, created_at")
        .eq("contact_id", c.id);
      console.log(`Notes for contact ${c.id}:`, JSON.stringify(notes, null, 2));
    }
  }

  // Also check all contacts updated in the last 1 hour
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: recentContacts } = await admin
    .from("contacts")
    .select("id, name, phone, user_id, assigned_to, updated_at")
    .gte("updated_at", oneHourAgo);
  console.log("Recent contacts in last 1 hour:", JSON.stringify(recentContacts, null, 2));

  // Check recent messages
  const { data: recentMsgs } = await admin
    .from("messages")
    .select("id, conversation_id, sender_type, content_text, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("Latest 10 messages in database:", JSON.stringify(recentMsgs, null, 2));
}

main().catch(console.error);
