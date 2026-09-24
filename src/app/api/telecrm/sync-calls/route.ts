import { NextRequest, NextResponse } from "next/server";
import { syncTeleCrmCalls } from "@/lib/telecrm/call-sync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 50;

    const result = await syncTeleCrmCalls(limit);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[POST /api/telecrm/sync-calls] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await syncTeleCrmCalls(50);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[GET /api/telecrm/sync-calls] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
