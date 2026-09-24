import { NextRequest, NextResponse } from "next/server";
import { syncTeleCrmCalls } from "@/lib/telecrm/call-sync";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, status: "TeleCRM Webhook Active" });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      // Ignored
    }

    console.log("[TeleCRM Webhook] Received payload:", JSON.stringify(body));

    // Run sync in background/immediate to pull latest call records
    syncTeleCrmCalls(10).catch((err) => {
      console.error("[TeleCRM Webhook] Background sync error:", err);
    });

    return NextResponse.json({
      ok: true,
      status: "received",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[TeleCRM Webhook] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
