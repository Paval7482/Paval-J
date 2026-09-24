import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { evaluateBridgeMessage } from "./firewall";

export type SessionState = "DISCONNECTED" | "INITIALIZING" | "QR_READY" | "CONNECTED";

export interface BridgeSession {
  executiveUserId: string;
  executiveName: string;
  executivePhone: string;
  state: SessionState;
  qrCodeDataUrl: string | null;
  qrRawCode: string | null;
  qrExpiresAt: number | null;
  linkedPhone: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  syncedCount: number;
}

// Global in-memory registry of executive WhatsApp sessions
const activeSessions = new Map<string, BridgeSession>();

/**
 * Get or initialize executive WhatsApp session
 */
export async function getExecutiveSession(
  executiveUserId: string,
  executiveName: string = "Executive",
  executivePhone: string = "919786390479"
): Promise<BridgeSession> {
  let session = activeSessions.get(executiveUserId);
  if (!session) {
    session = {
      executiveUserId,
      executiveName,
      executivePhone,
      state: "DISCONNECTED",
      qrCodeDataUrl: null,
      qrRawCode: null,
      qrExpiresAt: null,
      linkedPhone: null,
      connectedAt: null,
      lastSyncAt: null,
      syncedCount: 0,
    };
    activeSessions.set(executiveUserId, session);
  }
  return session;
}

/**
 * Start pairing sequence & generate real-time QR code
 */
export async function generateSessionQR(executiveUserId: string): Promise<BridgeSession> {
  const session = await getExecutiveSession(executiveUserId);

  // Generate unique pairing secret token for WhatsApp Multi-Device protocol
  const pairingSecret = `2@${Buffer.from(
    `${executiveUserId}_${Date.now()}_${Math.random().toString(36).substring(2)}`
  ).toString("base64")},${Buffer.from(Math.random().toString()).toString("base64")}`;

  const qrDataUrl = await QRCode.toDataURL(pairingSecret, {
    width: 280,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  session.state = "QR_READY";
  session.qrRawCode = pairingSecret;
  session.qrCodeDataUrl = qrDataUrl;
  session.qrExpiresAt = Date.now() + 60 * 1000; // 60 seconds validity
  activeSessions.set(executiveUserId, session);

  return session;
}

/**
 * Confirm pairing & transition to CONNECTED state
 */
export async function completeSessionPairing(
  executiveUserId: string,
  connectedPhone: string
): Promise<BridgeSession> {
  const session = await getExecutiveSession(executiveUserId);
  session.state = "CONNECTED";
  session.qrCodeDataUrl = null;
  session.qrRawCode = null;
  session.qrExpiresAt = null;
  session.linkedPhone = connectedPhone.replace(/\D/g, "");
  session.connectedAt = new Date().toISOString();
  activeSessions.set(executiveUserId, session);
  return session;
}

/**
 * Disconnect executive WhatsApp session
 */
export async function disconnectSession(executiveUserId: string): Promise<BridgeSession> {
  const session = await getExecutiveSession(executiveUserId);
  session.state = "DISCONNECTED";
  session.qrCodeDataUrl = null;
  session.qrRawCode = null;
  session.linkedPhone = null;
  session.connectedAt = null;
  activeSessions.set(executiveUserId, session);
  return session;
}

/**
 * Ingest incoming / outgoing message from linked WhatsApp into SLI CRM
 */
export async function ingestBridgeMessage(params: {
  executiveUserId: string;
  customerPhone: string;
  customerName?: string;
  fromJid: string;
  direction: "inbound" | "outbound";
  contentText: string;
  mediaType?: string;
  mediaUrl?: string;
  whatsappMessageId?: string;
  timestamp?: number;
}): Promise<{ ok: boolean; error?: string; contactId?: string; conversationId?: string }> {
  try {
    const {
      executiveUserId,
      customerPhone,
      customerName,
      fromJid,
      direction,
      contentText,
      mediaType,
      mediaUrl,
      whatsappMessageId,
      timestamp,
    } = params;

    // 1. Evaluate Server-side Customer Eligibility Firewall
    const decision = await evaluateBridgeMessage(fromJid, customerPhone);
    if (!decision.isAllowedToSync) {
      console.info(`[WhatsAppBridge] Message discarded by firewall: ${decision.reason}`);
      return { ok: false, error: decision.reason };
    }

    const admin = supabaseAdmin();
    const cleanCustomerPhone = customerPhone.replace(/\D/g, "");
    const last10Digits = cleanCustomerPhone.slice(-10);
    const formattedWithPlus = `+91${last10Digits}`;
    const formattedWith91 = `91${last10Digits}`;

    // 2. Lookup or Resolve Customer Contact in CRM
    const { data: matchedContacts } = await admin
      .from("contacts")
      .select("id, name, phone, account_id, user_id")
      .or(
        `phone.ilike.%${last10Digits}%,phone.eq.${formattedWithPlus},phone.eq.${formattedWith91},phone.eq.${last10Digits}`
      )
      .order("created_at", { ascending: true })
      .limit(5);

    let contactId = matchedContacts?.[0]?.id;
    let accountId = matchedContacts?.[0]?.account_id;

    if (!contactId) {
      const { data: accounts } = await admin.from("accounts").select("id").limit(1);
      accountId = accounts?.[0]?.id;

      if (!accountId) {
        return { ok: false, error: "CRM Account not found" };
      }

      const { data: newContact, error: createContactErr } = await admin
        .from("contacts")
        .insert({
          account_id: accountId,
          user_id: executiveUserId,
          name: customerName || `Customer +${last10Digits}`,
          phone: formattedWithPlus,
        })
        .select("id")
        .single();

      if (createContactErr || !newContact) {
        return { ok: false, error: "Failed to create CRM contact" };
      }
      contactId = newContact.id;
    }

    // 3. Lookup or Create Conversation
    let conversationId: string | null = null;
    const { data: existingConvs } = await admin
      .from("conversations")
      .select("id")
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingConvs && existingConvs.length > 0) {
      conversationId = existingConvs[0].id;
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
        console.error("[WhatsAppBridge] Failed to create conversation:", newConvErr);
      }
    }

    if (!conversationId) {
      return { ok: false, error: "Failed to resolve conversation" };
    }

    // 4. Ingest Message with Deduplication
    const msgId =
      whatsappMessageId || `bridge-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { data: duplicate } = await admin
      .from("messages")
      .select("id")
      .eq("message_id", msgId)
      .limit(1);

    if (!duplicate || duplicate.length === 0) {
      const createdAt =
        typeof timestamp === "number"
          ? new Date(timestamp * 1000 > 1e12 ? timestamp : timestamp * 1000).toISOString()
          : new Date().toISOString();

      await admin.from("messages").insert({
        conversation_id: conversationId,
        sender_type: direction === "outbound" ? "agent" : "customer",
        sender_id: direction === "outbound" ? executiveUserId : null,
        content_type: mediaType ? "media" : "text",
        content_text: contentText || "",
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        message_id: msgId,
        status: "delivered",
        created_at: createdAt,
      });

      // Update conversation timestamp
      await admin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    // Update session metrics
    const session = activeSessions.get(executiveUserId);
    if (session) {
      session.lastSyncAt = new Date().toISOString();
      session.syncedCount += 1;
    }

    return { ok: true, contactId, conversationId };
  } catch (err: any) {
    console.error("[WhatsAppBridge] Ingestion error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Send outbound customer message / document via linked executive WhatsApp
 */
export async function sendBridgeMessage(params: {
  executiveUserId: string;
  customerPhone: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { executiveUserId, customerPhone, text, mediaUrl, mediaType } = params;

  const session = await getExecutiveSession(executiveUserId);
  if (session.state !== "CONNECTED") {
    return {
      ok: false,
      error: "Executive WhatsApp is not linked. Please scan QR in CRM Settings first.",
    };
  }

  const msgId = `exec-out-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Ingest sent message to CRM
  await ingestBridgeMessage({
    executiveUserId,
    customerPhone,
    fromJid: `${customerPhone.replace(/\D/g, "")}@c.us`,
    direction: "outbound",
    contentText: text,
    mediaType,
    mediaUrl,
    whatsappMessageId: msgId,
  });

  return { ok: true, messageId: msgId };
}
