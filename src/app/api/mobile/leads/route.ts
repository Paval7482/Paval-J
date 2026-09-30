import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const search = url.searchParams.get("search") || "";
    const agentName = (url.searchParams.get("agent_name") || url.searchParams.get("agent") || "").trim();
    const isAdmin = !agentName || /admin|paval|owner/i.test(agentName);

    // 1. Fetch conversations to identify WhatsApp leads
    const { data: convs } = await admin
      .from("conversations")
      .select("contact_id")
      .limit(1000);

    const whatsappContactIdSet = new Set<string>();
    (convs || []).forEach((c) => {
      if (c.contact_id) whatsappContactIdSet.add(c.contact_id);
    });

    // 2. Fetch TeleCRM/MyTelly contact notes
    const { data: telecrmNotes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, contacts(id, phone, name)")
      .or("note_text.ilike.%TeleCRM%,note_text.ilike.%mytelly%,note_text.ilike.%Audio Recording%,note_text.ilike.%Call Status%")
      .order("created_at", { ascending: false })
      .limit(500);

    const mytellyContactIdSet = new Set<string>();
    const mytellyPhoneMap = new Map<string, any>();

    (telecrmNotes || []).forEach((n: any) => {
      const noteText = n.note_text || "";
      const execMatch = noteText.match(/(?:👤\s*Executive|Executive):\s*([^|\n]+)/i);
      const noteExec = execMatch ? execMatch[1].trim() : "";

      // Check if matches agent filter
      const matchesAgent = isAdmin || !noteExec || (agentName && noteExec.toLowerCase().includes(agentName.toLowerCase()));

      if (matchesAgent) {
        if (n.contact_id) mytellyContactIdSet.add(n.contact_id);
        const phone = n.contacts?.phone || "";
        const digits = phone.replace(/\D/g, "").slice(-10);
        if (digits && !mytellyPhoneMap.has(digits)) {
          mytellyPhoneMap.set(digits, {
            contact_id: n.contact_id,
            name: n.contacts?.name || `Customer ${digits.slice(-4)}`,
            phone: phone || `+91${digits}`,
            notes: n.note_text,
            created_at: n.created_at,
            executive: noteExec,
          });
        }
      }
    });

    // 3. Fetch call_logs
    const { data: allCallLogs } = await admin
      .from("call_logs")
      .select("id, customer_number, virtual_number, agent_name, call_duration, call_status, call_date, recording_url, outcome, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    (allCallLogs || []).forEach((cl) => {
      const callAgent = cl.agent_name || "";
      const matchesAgent = isAdmin || !callAgent || (agentName && callAgent.toLowerCase().includes(agentName.toLowerCase()));

      if (matchesAgent) {
        const num = cl.customer_number || "";
        const digits = num.replace(/\D/g, "").slice(-10);
        if (digits && !mytellyPhoneMap.has(digits)) {
          mytellyPhoneMap.set(digits, {
            contact_id: null,
            name: `My Telly Caller (${cl.agent_name || digits.slice(-4)})`,
            phone: cl.customer_number || `+91${digits}`,
            notes: `IVR Call handled by ${cl.agent_name || "Executive"}. Duration: ${cl.call_duration || "00:30"}`,
            created_at: cl.created_at || cl.call_date,
            executive: callAgent,
          });
        }
      }
    });

    // 4. Fetch contacts
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

      // Determine Source strictly
      let source = "Direct Call";
      if (whatsappContactIdSet.has(c.id)) {
        source = "WhatsApp";
      } else if (mytellyContactIdSet.has(c.id) || (digits10 && mytellyPhoneMap.has(digits10))) {
        source = "My Telly";
      } else if (c.email && c.email.includes("@")) {
        source = "Meta Ads";
      }

      const mytellyData = digits10 ? mytellyPhoneMap.get(digits10) : null;
      const notes = mytellyData?.notes || `Lead from ${source}`;

      return {
        id: c.id,
        name: c.name || "Customer " + (cleanPhone ? cleanPhone.slice(-4) : ""),
        phone: c.phone || "",
        stage: "lead",
        source: source,
        company: c.company || "",
        created_at: c.created_at,
        notes: notes,
        followUpDate: null,
      };
    });

    // 5. Merge any MyTelly calls/notes not in contacts table
    const mytellyExtraLeads: any[] = [];
    mytellyPhoneMap.forEach((val, digits) => {
      if (!contactPhoneSet.has(digits)) {
        contactPhoneSet.add(digits);
        mytellyExtraLeads.push({
          id: "MYTELLY-" + digits,
          name: val.name || `My Telly Caller (${digits.slice(-4)})`,
          phone: val.phone,
          stage: "lead",
          source: "My Telly",
          company: "My Telly Telephony",
          created_at: val.created_at,
          notes: val.notes || "My Telly IVR Call",
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
