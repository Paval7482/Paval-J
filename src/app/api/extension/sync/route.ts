import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { getLeadRoutingConfig } from "@/lib/whatsapp/lead-alert";
import { updateExecutiveSyncStats } from "@/lib/whatsapp/sync-config";

export const dynamic = "force-dynamic";

export interface SyncMessagePayload {
  executiveUserId: string;
  executiveWhatsAppPhone: string;
  customerPhone: string;
  customerName?: string;
  isGroup?: boolean;
  messages: Array<{
    whatsappMessageId: string;
    direction: "inbound" | "outbound";
    contentText: string;
    timestamp: number | string;
    mediaType?: string;
    mediaUrl?: string;
  }>;
}

/**
 * POST /api/extension/sync
 * Secure manual sync ingestion endpoint with Mandatory Server-Side Firewall Validation
 */
export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body: SyncMessagePayload = await req.json();

    const {
      executiveUserId,
      executiveWhatsAppPhone,
      customerPhone,
      customerName,
      isGroup,
      messages,
    } = body;

    // ─────────────────────────────────────────────────────────────
    // MANDATORY SERVER-SIDE ELIGIBILITY FIREWALL (Defense-in-Depth)
    // ─────────────────────────────────────────────────────────────

    // 1. Group chats are unconditionally rejected
    if (isGroup || customerPhone?.includes("@g.us")) {
      return NextResponse.json(
        { ok: false, error: "FIREWALL_BLOCKED: Group chats are not eligible for CRM sync." },
        { status: 403 }
      );
    }

    if (!customerPhone || !executiveUserId) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameters (customerPhone, executiveUserId)." },
        { status: 400 }
      );
    }

    const cleanCustomerPhone = customerPhone.replace(/\D/g, "");
    const cleanExecPhone = (executiveWhatsAppPhone || "").replace(/\D/g, "");

    if (cleanCustomerPhone.length < 10) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PHONE: Customer phone number must have at least 10 digits." },
        { status: 400 }
      );
    }

    // 2. Protect Official Meta Cloud API Business Number (+91 99447 75513)
    if (cleanCustomerPhone === "919944775513" || cleanExecPhone === "919944775513") {
      return NextResponse.json(
        {
          ok: false,
          error: "FIREWALL_BLOCKED: Official Meta Cloud API number (+91 99447 75513) is protected and cannot be synced via extension.",
        },
        { status: 403 }
      );
    }

    // 3. Staff / Colleague Filter Check
    const routingConfig = await getLeadRoutingConfig();
    const staffPhones = new Set<string>();
    (routingConfig.executives || []).forEach((e) => {
      if (e.phone) staffPhones.add(e.phone.replace(/\D/g, ""));
    });
    (routingConfig.adminRecipients || []).forEach((a) => {
      if (a.phone) staffPhones.add(a.phone.replace(/\D/g, ""));
    });

    if (staffPhones.has(cleanCustomerPhone)) {
      return NextResponse.json(
        { ok: false, error: "FIREWALL_BLOCKED: Internal company staff numbers cannot be synced." },
        { status: 403 }
      );
    }

    // 4. Executive-to-WhatsApp Number Binding Verification
    const boundExec = (routingConfig.executives || []).find(
      (e) => e.user_id === executiveUserId
    );

    if (boundExec) {
      const expectedPhone = boundExec.phone.replace(/\D/g, "");
      if (cleanExecPhone && cleanExecPhone !== expectedPhone) {
        return NextResponse.json(
          {
            ok: false,
            error: `BINDING_MISMATCH: Logged-in executive (${boundExec.name}) is bound to +${expectedPhone}, but WhatsApp Web is connected to +${cleanExecPhone}.`,
          },
          { status: 403 }
        );
      }
    }

    // 5. Lookup or Resolve Customer Contact in CRM
    const last10Digits = cleanCustomerPhone.slice(-10);
    const formattedWithPlus = `+91${last10Digits}`;
    const formattedWith91 = `91${last10Digits}`;

    const { data: matchedContacts } = await admin
      .from("contacts")
      .select("id, name, phone, account_id, user_id")
      .or(`phone.ilike.%${last10Digits}%,phone.eq.${formattedWithPlus},phone.eq.${formattedWith91},phone.eq.${last10Digits}`)
      .order("created_at", { ascending: true })
      .limit(5);

    let contactId = matchedContacts?.[0]?.id;
    let accountId = matchedContacts?.[0]?.account_id;

    if (!contactId) {
      // Find default account ID
      const { data: accounts } = await admin.from("accounts").select("id").limit(1);
      accountId = accounts?.[0]?.id;

      if (!accountId) {
        return NextResponse.json({ ok: false, error: "Account not found" }, { status: 500 });
      }

      const { data: newContact, error: createContactErr } = await admin
        .from("contacts")
        .insert({
          account_id: accountId,
          user_id: executiveUserId,
          name: customerName || `WA Customer +${last10Digits}`,
          phone: formattedWithPlus,
        })
        .select("id")
        .single();

      if (createContactErr || !newContact) {
        return NextResponse.json(
          { ok: false, error: "Failed to create contact record" },
          { status: 500 }
        );
      }
      contactId = newContact.id;
    }

    // 6. Lookup or Create Conversation
    let conversationId: string | null = null;
    const { data: existingConvs } = await admin
      .from("conversations")
      .select("id, assigned_agent_id")
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingConvs && existingConvs.length > 0) {
      conversationId = existingConvs[0].id;
      // Re-assign conversation to active syncing executive so it appears in their CRM list
      await admin
        .from("conversations")
        .update({
          assigned_agent_id: executiveUserId,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } else {
      const { data: newConv, error: newConvErr } = await admin
        .from("conversations")
        .insert({
          account_id: accountId,
          user_id: executiveUserId,
          contact_id: contactId,
          assigned_agent_id: executiveUserId,
          status: "open",
        })
        .select("id")
        .single();

      if (newConv) {
        conversationId = newConv.id;
      } else {
        console.error("[ExtensionSync] Failed to create conversation:", newConvErr);
      }
    }

    // 7. Ingest Messages with Deduplication
    let syncedCount = 0;
    if (messages && messages.length > 0 && conversationId) {
      for (const msg of messages) {
        const msgId = msg.whatsappMessageId || `manual-${Date.now()}-${Math.random()}`;

        const senderType = msg.direction === "outbound" ? "agent" : "customer";
        const contentText = (msg.contentText || "").trim();

        if (!contentText && !msg.mediaType) continue;

        // 1. Check deduplication by message_id
        const { data: duplicateById } = await admin
          .from("messages")
          .select("id")
          .eq("message_id", msgId)
          .limit(1);

        // 2. Also check deduplication by exact content in this conversation
        const { data: duplicateByContent } = await admin
          .from("messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("sender_type", senderType)
          .eq("content_text", contentText)
          .limit(1);

        if (
          (!duplicateById || duplicateById.length === 0) &&
          (!duplicateByContent || duplicateByContent.length === 0)
        ) {
          const createdAt =
            typeof msg.timestamp === "number"
              ? new Date(msg.timestamp * 1000 > 1e12 ? msg.timestamp : msg.timestamp * 1000).toISOString()
              : new Date().toISOString();

          const { error: msgInsertErr } = await admin.from("messages").insert({
            conversation_id: conversationId,
            sender_type: senderType,
            sender_id: senderType === "agent" ? executiveUserId : null,
            content_type: msg.mediaType ? "media" : "text",
            content_text: contentText,
            media_url: msg.mediaUrl || null,
            media_type: msg.mediaType || null,
            message_id: msgId,
            status: "delivered",
            created_at: createdAt,
          });

          if (msgInsertErr) {
            console.error("[ExtensionSync] Error inserting message:", msgInsertErr);
          } else {
            syncedCount++;
          }
        }
      }

      // Update conversation and contact timestamp
      await Promise.all([
        admin
          .from("conversations")
          .update({
            assigned_agent_id: executiveUserId,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId),
        admin
          .from("contacts")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", contactId),
      ]);
    }

    // 8. Add Audit Note to Contact Timeline
    await admin.from("contact_notes").insert({
      account_id: accountId,
      user_id: executiveUserId,
      contact_id: contactId,
      note_text: `📥 [Extension Manual Sync] Executive synced ${syncedCount} message(s) from WhatsApp Web (+${cleanExecPhone || "Personal"}).`,
    });

    // 9. Update executive sync stats in background
    await updateExecutiveSyncStats(executiveUserId, syncedCount);

    return NextResponse.json({
      ok: true,
      syncedCount,
      contactId,
      conversationId,
      message: `Successfully synced ${syncedCount} message(s) to CRM customer timeline.`,
    });
  } catch (err: any) {
    console.error("[ExtensionSync] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal sync error" },
      { status: 500 }
    );
  }
}
