import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppSyncConfigs,
  saveWhatsAppSyncConfigs,
  generatePassKey,
} from "@/lib/whatsapp/sync-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await getWhatsAppSyncConfigs();
    return NextResponse.json({ ok: true, data: configs });
  } catch (err: any) {
    console.error("[SettingsWhatsAppSync] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load sync configurations" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, syncMode, phone, active } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing executive id" },
        { status: 400 }
      );
    }

    const configs = await getWhatsAppSyncConfigs();
    const exec = configs.find((c) => c.id === id);

    if (!exec) {
      return NextResponse.json(
        { ok: false, error: "Executive not found" },
        { status: 404 }
      );
    }

    if (syncMode !== undefined) {
      exec.syncMode = syncMode === "all" ? "all" : "leads_only";
    }
    if (phone !== undefined) {
      exec.phone = phone.replace(/\D/g, "");
    }
    if (active !== undefined) {
      exec.active = Boolean(active);
    }

    await saveWhatsAppSyncConfigs(configs);

    return NextResponse.json({ ok: true, data: exec });
  } catch (err: any) {
    console.error("[SettingsWhatsAppSync] PATCH error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update sync config" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing executive id" },
        { status: 400 }
      );
    }

    const configs = await getWhatsAppSyncConfigs();
    const exec = configs.find((c) => c.id === id);

    if (!exec) {
      return NextResponse.json(
        { ok: false, error: "Executive not found" },
        { status: 404 }
      );
    }

    if (action === "REGENERATE_PASSKEY") {
      exec.passKey = generatePassKey(exec.userId, exec.phone, `${exec.name}${Date.now()}`);
      await saveWhatsAppSyncConfigs(configs);
      return NextResponse.json({ ok: true, data: exec });
    }

    return NextResponse.json({ ok: true, data: exec });
  } catch (err: any) {
    console.error("[SettingsWhatsAppSync] POST error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
