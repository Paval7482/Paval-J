import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const search = url.searchParams.get("search") || "";
    const agentId = url.searchParams.get("agent_id") || "";
    const agentName = url.searchParams.get("agent_name") || "";

    // 1. Fetch conversations to identify WhatsApp leads
    const { data: convs } = await admin
      .from("conversations")
      .select("contact_id, phone")
      .limit(500);

    const whatsappPhoneSet = new Set<string>();
    const whatsappContactIdSet = new Set<string>();
    (convs || []).forEach((c) => {
      if (c.contact_id) whatsappContactIdSet.add(c.contact_id);
      if (c.phone) {
        const digits = c.phone.replace(/\D/g, "").slice(-10);
        if (digits) whatsappPhoneSet.add(digits);
      }
    });

    // 2. Fetch MyTelly Call Logs
    const { data: allCallLogs } = await admin
      .from("call_logs")
      .select("id, customer_number, virtual_number, agent_name, call_duration, call_status, call_date, recording_url, outcome, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    const mytellyPhoneMap = new Map<string, any>();
    (allCallLogs || []).forEach((cl) => {
      const num = cl.customer_number || "";
      const digits = num.replace(/\D/g, "").slice(-10);
      if (digits && !mytellyPhoneMap.has(digits)) {
        mytellyPhoneMap.set(digits, cl);
      }
    });

    // 3. Fetch contacts
    let query = admin
      .from("contacts")
      .select("id, name, phone, email, company, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: contacts, error } = await query;
    if (error) {
      console.error("[api/mobile/leads] Error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const contactPhoneSet = new Set<string>();
    const mappedContacts = (contacts || []).map((c) => {
      const cleanPhone = (c.phone || "").replace(/\D/g, "");
      const digits10 = cleanPhone.slice(-10);
      if (digits10) contactPhoneSet.add(digits10);

      // Resolve Accurate Source
      let source = "Direct Call";
      if (whatsappContactIdSet.has(c.id) || (digits10 && whatsappPhoneSet.has(digits10))) {
        source = "WhatsApp";
      } else if (c.email && c.email.includes("@")) {
        source = "Meta Ads";
      } else if (digits10 && mytellyPhoneMap.has(digits10)) {
        source = "My Telly";
      }

      const call = digits10 ? mytellyPhoneMap.get(digits10) : null;
      const isFollowUp = call?.outcome === "callback" || call?.outcome === "interested";

      return {
        id: c.id,
        name: c.name || "Customer " + (cleanPhone ? cleanPhone.slice(-4) : ""),
        phone: c.phone || "",
        stage: isFollowUp ? "follow_up" : "lead",
        source: source,
        company: c.company || "",
        created_at: c.created_at,
        notes: call?.notes || "Lead from " + source,
        followUpDate: isFollowUp ? "Today, 5:00 PM" : null,
      };
    });

    // 4. Merge MyTelly IVR Callers who might not be in contacts table yet (e.g. +919080519175)
    const mytellyExtraLeads: any[] = [];
    (allCallLogs || []).forEach((cl) => {
      const num = cl.customer_number || "";
      const digits = num.replace(/\D/g, "").slice(-10);
      if (digits && !contactPhoneSet.has(digits)) {
        contactPhoneSet.add(digits);
        mytellyExtraLeads.push({
          id: "MYTELLY-" + (cl.id || digits),
          name: "My Telly Caller (" + (cl.agent_name ? cl.agent_name + " attended" : digits.slice(-4)) + ")",
          phone: cl.customer_number || `+91${digits}`,
          stage: "lead",
          source: "My Telly",
          company: "MyTelly IVR Call",
          created_at: cl.created_at || cl.call_date,
          notes: `IVR Call handled by ${cl.agent_name || "Executive"}. Duration: ${cl.call_duration || "00:30"}`,
          followUpDate: null,
        });
      }
    });

    const combinedLeads = [...mappedContacts, ...mytellyExtraLeads];

    return NextResponse.json({
      ok: true,
      data: combinedLeads,
    });
  } catch (err: any) {
    console.error("[api/mobile/leads] Exception:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
