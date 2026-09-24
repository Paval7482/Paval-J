import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { getLeadRoutingConfig } from "@/lib/whatsapp/lead-alert";
import {
  getExecutiveSession,
  generateSessionQR,
  completeSessionPairing,
  disconnectSession,
  ingestBridgeMessage,
} from "@/lib/whatsapp-bridge/engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp-bridge/session
 * Returns executive's live WhatsApp linked session state
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount().catch(() => null);
    const userId =
      ctx?.userId || req.nextUrl.searchParams.get("userId") || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1";

    const routing = await getLeadRoutingConfig();
    const exec = (routing.executives || []).find((e) => e.user_id === userId);

    const session = await getExecutiveSession(
      userId,
      exec?.name || "Satheesh",
      exec?.phone || "919786390479"
    );

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp-bridge/session
 * Actions: GENERATE_QR | CONFIRM_PAIRING | DISCONNECT | INGEST_CHAT
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount().catch(() => null);
    const body = await req.json();
    const { action, userId: requestedUserId, phone, messages, customerPhone, customerName, fromJid } = body;

    const userId =
      requestedUserId || ctx?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1";

    if (action === "GENERATE_QR") {
      const session = await generateSessionQR(userId);
      return NextResponse.json({ ok: true, session });
    }

    if (action === "CONFIRM_PAIRING") {
      const routing = await getLeadRoutingConfig();
      const exec = (routing.executives || []).find((e) => e.user_id === userId);
      const targetPhone = phone || exec?.phone || "919786390479";

      const session = await completeSessionPairing(userId, targetPhone);
      return NextResponse.json({ ok: true, session });
    }

    if (action === "DISCONNECT") {
      const session = await disconnectSession(userId);
      return NextResponse.json({ ok: true, session });
    }

    if (action === "INGEST_CHAT") {
      if (!customerPhone || !messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { ok: false, error: "Missing required parameters (customerPhone, messages)" },
          { status: 400 }
        );
      }

      let count = 0;
      for (const msg of messages) {
        const res = await ingestBridgeMessage({
          executiveUserId: userId,
          customerPhone,
          customerName,
          fromJid: fromJid || `${customerPhone.replace(/\D/g, "")}@c.us`,
          direction: msg.direction || "inbound",
          contentText: msg.contentText || msg.text || "",
          mediaType: msg.mediaType,
          mediaUrl: msg.mediaUrl,
          whatsappMessageId: msg.whatsappMessageId,
          timestamp: msg.timestamp,
        });
        if (res.ok) count++;
      }

      return NextResponse.json({ ok: true, syncedCount: count });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[WhatsAppBridge API] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
