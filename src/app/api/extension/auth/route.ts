import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { getLeadRoutingConfig } from "@/lib/whatsapp/lead-alert";
import { validatePassKey } from "@/lib/whatsapp/sync-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/extension/auth
 * Extension Pass Key Authentication
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passKey } = body;

    if (!passKey) {
      return NextResponse.json(
        { ok: false, error: "Pass key is required" },
        { status: 400 }
      );
    }

    const exec = await validatePassKey(passKey);

    if (!exec) {
      return NextResponse.json(
        { ok: false, error: "Invalid SLI Extension Pass Key. Please check your key in CRM Settings > WhatsApp Chat Sync." },
        { status: 401 }
      );
    }

    const admin = supabaseAdmin();
    const routingConfig = await getLeadRoutingConfig();

    // 1. Staff / Executive Numbers for Firewall
    const staffPhones = new Set<string>();
    (routingConfig.executives || []).forEach((e) => {
      if (e.phone) staffPhones.add(e.phone.replace(/\D/g, ""));
    });
    (routingConfig.adminRecipients || []).forEach((a) => {
      if (a.phone) staffPhones.add(a.phone.replace(/\D/g, ""));
    });

    // 2. Fetch Customer Phone Numbers
    const { data: contacts } = await admin
      .from("contacts")
      .select("id, name, phone, user_id");

    const customerPhoneMap: Record<
      string,
      { contactId: string; name: string; isCustomer: boolean }
    > = {};

    (contacts || []).forEach((c) => {
      if (c.phone) {
        const clean = c.phone.replace(/\D/g, "");
        if (clean) {
          customerPhoneMap[clean] = {
            contactId: c.id,
            name: c.name || "Customer",
            isCustomer: true,
          };
        }
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        executive: {
          id: exec.id,
          name: exec.name,
          phone: exec.phone,
          userId: exec.userId,
          syncMode: exec.syncMode,
        },
        staffPhones: Array.from(staffPhones),
        customerPhoneMap,
        officialBusinessNumber: "919944775513", // Meta Cloud API (Untouched)
      },
    });
  } catch (err: any) {
    console.error("[ExtensionAuth] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Authentication error" },
      { status: 500 }
    );
  }
}
