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

    let assignedContactIds: string[] | null = null;

    if (agentId) {
      // Find contacts assigned to this agent in conversations
      const { data: agentConvs } = await admin
        .from("conversations")
        .select("contact_id")
        .eq("assigned_agent_id", agentId);
      
      const convContactIds = (agentConvs || []).map((c) => c.contact_id).filter(Boolean) as string[];

      // Also find contacts from call_logs for this agent
      const { data: callLogs } = await admin
        .from("call_logs")
        .select("customer_number")
        .or(`agent_name.ilike.%${agentName}%,user_id.eq.${agentId}`);

      const callPhones = (callLogs || []).map((c) => c.customer_number).filter(Boolean);
      let callContactIds: string[] = [];
      if (callPhones.length > 0) {
        const { data: matchedContacts } = await admin
          .from("contacts")
          .select("id")
          .in("phone", callPhones);
        callContactIds = (matchedContacts || []).map((m) => m.id);
      }

      const mergedIds = Array.from(new Set([...convContactIds, ...callContactIds]));
      if (mergedIds.length > 0) {
        assignedContactIds = mergedIds;
      }
    }

    let query = admin
      .from("contacts")
      .select("id, name, phone, email, company, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (assignedContactIds && assignedContactIds.length > 0) {
      query = query.in("id", assignedContactIds);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: contacts, error } = await query;
    if (error) {
      console.error("[api/mobile/leads] Error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // If no assigned contacts specifically, fallback to all contacts so the executive sees leads
    let finalContacts = contacts || [];
    if (finalContacts.length === 0 && assignedContactIds && assignedContactIds.length === 0) {
      const { data: allContacts } = await admin
        .from("contacts")
        .select("id, name, phone, email, company, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      finalContacts = allContacts || [];
    }

    const mapped = (finalContacts || []).map((c) => ({
      id: c.id,
      name: c.name || "Customer " + (c.phone ? c.phone.slice(-4) : ""),
      phone: c.phone || "",
      stage: "lead",
      source: "CRM Lead",
      company: c.company || "",
      created_at: c.created_at,
    }));

    return NextResponse.json({
      ok: true,
      data: mapped,
    });
  } catch (err: any) {
    console.error("[api/mobile/leads] Exception:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
