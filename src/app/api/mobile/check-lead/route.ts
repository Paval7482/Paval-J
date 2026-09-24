import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawPhone = url.searchParams.get("phone")?.replace(/\D/g, "") || "";

    if (!rawPhone || rawPhone.length < 6) {
      return NextResponse.json({ ok: false, isLead: false, error: "Invalid phone number" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const last10 = rawPhone.slice(-10);

    // 1. Check contacts table
    const { data: contact } = await admin
      .from("contacts")
      .select("id, name, phone, assigned_to, stage")
      .ilike("phone", `%${last10}`)
      .limit(1)
      .maybeSingle();

    if (contact) {
      return NextResponse.json({
        ok: true,
        isLead: true,
        contactId: contact.id,
        contactName: contact.name || "Customer",
        assignedTo: contact.assigned_to,
        stage: contact.stage,
      });
    }

    // 2. Check meta leads / whatsapp conversations
    const { data: convo } = await admin
      .from("conversations")
      .select("id, contact_id, status")
      .ilike("phone", `%${last10}`)
      .limit(1)
      .maybeSingle();

    if (convo) {
      return NextResponse.json({
        ok: true,
        isLead: true,
        contactId: convo.contact_id || convo.id,
        contactName: "WhatsApp Lead",
      });
    }

    // Number not in CRM (Personal / Family / Unknown) -> Tell the app to skip recording
    return NextResponse.json({
      ok: true,
      isLead: false,
      message: "Number not found in CRM leads list. Skip recording.",
    });
  } catch (error: any) {
    console.error("[Mobile Check Lead] Error:", error);
    return NextResponse.json({ ok: false, isLead: false, error: error.message }, { status: 500 });
  }
}
