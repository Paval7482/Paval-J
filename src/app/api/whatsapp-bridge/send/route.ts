import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { sendBridgeMessage } from "@/lib/whatsapp-bridge/engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp-bridge/send
 * Direct 1-to-1 customer messaging from CRM via Executive's Linked WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount().catch(() => null);
    const body = await req.json();
    const { customerPhone, text, mediaUrl, mediaType, userId } = body;

    const executiveUserId =
      userId || ctx?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1";

    if (!customerPhone || !text) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields (customerPhone, text)" },
        { status: 400 }
      );
    }

    const result = await sendBridgeMessage({
      executiveUserId,
      customerPhone,
      text,
      mediaUrl,
      mediaType,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
