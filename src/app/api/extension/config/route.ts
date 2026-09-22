import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { getLeadRoutingConfig } from "@/lib/whatsapp/lead-alert";

export const dynamic = "force-dynamic";

/**
 * GET /api/extension/config
 * Provides the Chrome extension with:
 * 1. Active company staff/executive blacklist numbers
 * 2. CRM customer/lead phone cache for local matching
 * 3. Logged-in executive binding information
 */
export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);
    const executiveUserId = url.searchParams.get("userId") || "";

    // 1. Fetch Lead Routing Config for Staff/Executive Numbers
    const routingConfig = await getLeadRoutingConfig();
    const staffPhones = new Set<string>();

    (routingConfig.executives || []).forEach((e) => {
      if (e.phone) {
        staffPhones.add(e.phone.replace(/\D/g, ""));
      }
    });

    (routingConfig.adminRecipients || []).forEach((a) => {
      if (a.phone) {
        staffPhones.add(a.phone.replace(/\D/g, ""));
      }
    });

    // Also fetch all profile users from database
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, role");

    // 2. Fetch Customer Phone Numbers & Deals
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

    // 3. Find Executive details for binding
    const boundExec = (routingConfig.executives || []).find(
      (e) => e.user_id === executiveUserId
    );

    return NextResponse.json({
      ok: true,
      data: {
        staffPhones: Array.from(staffPhones),
        customerPhoneMap,
        boundExecutive: boundExec
          ? {
              id: boundExec.id,
              name: boundExec.name,
              phone: boundExec.phone.replace(/\D/g, ""),
              userId: boundExec.user_id,
            }
          : null,
        officialBusinessNumber: "919944775513", // Meta Cloud API (Untouched)
      },
    });
  } catch (err: any) {
    console.error("[ExtensionConfig] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
