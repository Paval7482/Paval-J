import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const search = url.searchParams.get("search")?.trim() || "";
    const campaign = url.searchParams.get("campaign") || "all";
    const agent = url.searchParams.get("agent") || "all";
    const startDate = url.searchParams.get("startDate")?.trim() || "";
    const endDate = url.searchParams.get("endDate")?.trim() || "";

    // 1. Fetch profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, email, account_role")
      .eq("account_id", ctx.accountId);

    const allProfiles = profiles || [];
    const callerProfile = allProfiles.find((p) => p.user_id === ctx.userId);

    const isCallerAdmin =
      ctx.role === "owner" ||
      ctx.role === "admin" ||
      callerProfile?.account_role === "admin" ||
      callerProfile?.account_role === "owner";

    const executiveName = !isCallerAdmin ? (callerProfile?.full_name || "").trim().toLowerCase() : "";

    // 2. Fetch deals with Meta Ad / Meta Lead content
    const { data: metaDeals } = await admin
      .from("deals")
      .select("id, contact_id, stage_id, assigned_to, user_id, title, notes, created_at, contacts(id, name, phone, user_id), pipeline_stages(name)")
      .eq("account_id", ctx.accountId)
      .or("title.ilike.%Meta Lead%,notes.ilike.%Meta Lead%,notes.ilike.%murukku machine%,notes.ilike.%Hindi update%")
      .order("created_at", { ascending: false });

    // 3. Fetch contact_notes with Meta Ad / Meta Lead content
    const { data: metaNotes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, contacts(id, name, phone, user_id)")
      .eq("account_id", ctx.accountId)
      .or("note_text.ilike.%Meta Ad%,note_text.ilike.%Meta Lead%,note_text.ilike.%murukku machine%,note_text.ilike.%Hindi update%")
      .order("created_at", { ascending: false });

    const leadsMap = new Map<string, any>();

    // Process deals
    (metaDeals || []).forEach((d: any) => {
      const contact = d.contacts || {};
      const text = d.notes || "";
      const campMatch = text.match(/Campaign:\s*([^\n]+)/i);
      const formMatch = text.match(/Form:\s*([^\n]+)/i);
      const langMatch = text.match(/Language:\s*([^\n]+)/i);
      const locMatch = text.match(/Location:\s*([^\n]+)/i);
      const reqMatch = text.match(/Business:\s*([^\n]+)|Requirement:\s*([^\n]+)/i);

      let campaign_name = campMatch ? campMatch[1].trim() : "Meta Campaign";
      let form_name = formMatch ? formMatch[1].trim() : "Instant Form";
      let language = langMatch ? langMatch[1].trim() : "";
      let location = locMatch ? locMatch[1].trim() : "";
      let requirement = reqMatch ? (reqMatch[1] || reqMatch[2]).trim() : "Murukku Business";

      const combined = `${d.title} ${campaign_name} ${form_name} ${text}`.toLowerCase();
      if (!language) {
        if (combined.includes("hindi") || combined.includes("delhi") || combined.includes("up") || combined.includes("bihar")) {
          language = "Hindi";
        } else {
          language = "Tamil";
        }
      }

      if (!location) {
        location = language === "Hindi" ? "Delhi, India" : "Tamil Nadu";
      }

      let assigned_profile_id = d.assigned_to;
      let assigned_user_id = d.user_id || contact?.user_id;
      let assigned_agent_name = "Sales Admin";

      const matchedProfile = allProfiles.find(
        (p) => p.id === assigned_profile_id || p.user_id === assigned_user_id
      );
      if (matchedProfile) {
        assigned_agent_name = matchedProfile.full_name;
        assigned_profile_id = matchedProfile.id;
        assigned_user_id = matchedProfile.user_id;
      }

      const key = d.contact_id || d.id;
      leadsMap.set(key, {
        id: d.contact_id || d.id,
        note_id: null,
        deal_id: d.id,
        stage_name: d.pipeline_stages?.name || "Enquiry",
        customer_name: contact.name || d.title.replace(/^📥\s*Meta Lead:\s*/i, "").replace(/\s*\([^)]*\)$/, "") || "Meta Lead",
        customer_phone: contact.phone || "--",
        campaign_name,
        form_name,
        language,
        location,
        requirement,
        raw_note: text,
        assigned_profile_id,
        assigned_user_id,
        assigned_agent_name,
        created_at: d.created_at,
      });
    });

    // Process contact_notes
    (metaNotes || []).forEach((n: any) => {
      const key = n.contact_id || n.id;
      const existing = leadsMap.get(key);

      const text = n.note_text || "";
      const contact = n.contacts || {};
      const campMatch = text.match(/Campaign:\s*([^\n]+)/i);
      const formMatch = text.match(/Form:\s*([^\n]+)/i);
      const langMatch = text.match(/Language:\s*([^\n]+)/i);
      const locMatch = text.match(/Location:\s*([^\n]+)/i);
      const reqMatch = text.match(/Requirement:\s*([^\n]+)|Business:\s*([^\n]+)/i);
      const execMatch = text.match(/Assigned Executive:\s*([^\n]+)/i);

      let campaign_name = campMatch ? campMatch[1].trim() : existing?.campaign_name || "Meta Campaign";
      let form_name = formMatch ? formMatch[1].trim() : existing?.form_name || "Instant Form";
      let language = langMatch ? langMatch[1].trim() : existing?.language || "Tamil";
      let location = locMatch ? locMatch[1].trim() : existing?.location || "Tamil Nadu";
      let requirement = reqMatch ? (reqMatch[1] || reqMatch[2]).trim() : existing?.requirement || "Murukku Business";
      let assigned_agent_name = execMatch ? execMatch[1].trim() : existing?.assigned_agent_name || "Sales Admin";

      const combined = `${campaign_name} ${form_name} ${text}`.toLowerCase();
      if (!language || language === "General") {
        if (combined.includes("hindi") || combined.includes("delhi") || combined.includes("up")) {
          language = "Hindi";
        } else {
          language = "Tamil";
        }
      }

      let assigned_profile_id = existing?.assigned_profile_id || null;
      let assigned_user_id = existing?.assigned_user_id || contact?.user_id || null;

      const matchedProfile = allProfiles.find(
        (p) =>
          p.id === assigned_profile_id ||
          p.user_id === assigned_user_id ||
          p.full_name?.toLowerCase().includes(assigned_agent_name.toLowerCase()) ||
          assigned_agent_name.toLowerCase().includes(p.full_name?.toLowerCase() || "___"),
      );

      if (matchedProfile) {
        assigned_agent_name = matchedProfile.full_name;
        assigned_profile_id = matchedProfile.id;
        assigned_user_id = matchedProfile.user_id;
      }

      leadsMap.set(key, {
        id: n.contact_id || n.id,
        note_id: n.id,
        deal_id: existing?.deal_id || null,
        stage_name: existing?.stage_name || "Enquiry",
        customer_name: contact.name || existing?.customer_name || "Meta Lead",
        customer_phone: contact.phone || existing?.customer_phone || "--",
        campaign_name,
        form_name,
        language,
        location,
        requirement,
        raw_note: text || existing?.raw_note,
        assigned_profile_id,
        assigned_user_id,
        assigned_agent_name,
        created_at: existing?.created_at || n.created_at,
      });
    });

    const parsedLeads = Array.from(leadsMap.values());

    // 4. Filters
    let filtered = parsedLeads;

    if (executiveName) {
      filtered = filtered.filter(
        (l) =>
          l.assigned_agent_name?.toLowerCase().includes(executiveName) ||
          l.assigned_user_id === ctx.userId,
      );
    } else if (agent !== "all") {
      filtered = filtered.filter(
        (l) =>
          l.assigned_agent_name?.toLowerCase().includes(agent.toLowerCase()) ||
          l.assigned_profile_id === agent ||
          l.assigned_user_id === agent,
      );
    }

    if (campaign !== "all") {
      const cLower = campaign.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.campaign_name.toLowerCase().includes(cLower) ||
          l.language.toLowerCase().includes(cLower),
      );
    }

    if (startDate) {
      filtered = filtered.filter((l) => {
        const d = l.created_at ? l.created_at.slice(0, 10) : "";
        return !d || d >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter((l) => {
        const d = l.created_at ? l.created_at.slice(0, 10) : "";
        return !d || d <= endDate;
      });
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.customer_name.toLowerCase().includes(s) ||
          l.customer_phone.toLowerCase().includes(s) ||
          l.location.toLowerCase().includes(s) ||
          l.campaign_name.toLowerCase().includes(s) ||
          l.requirement.toLowerCase().includes(s) ||
          l.assigned_agent_name.toLowerCase().includes(s),
      );
    }

    return NextResponse.json({ ok: true, leads: filtered });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const body = await req.json();
    const { contactId, noteId, dealId, profileId } = body;

    if (!contactId || !profileId) {
      return NextResponse.json({ error: "Missing contactId or profileId" }, { status: 400 });
    }

    // Resolve target profile
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("id", profileId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 1. Update deals table
    if (dealId) {
      await admin
        .from("deals")
        .update({
          assigned_to: targetProfile.id,
          user_id: targetProfile.user_id,
        })
        .eq("id", dealId);
    } else {
      await admin
        .from("deals")
        .update({
          assigned_to: targetProfile.id,
          user_id: targetProfile.user_id,
        })
        .eq("contact_id", contactId);
    }

    // 2. Update contacts table
    await admin
      .from("contacts")
      .update({ user_id: targetProfile.user_id })
      .eq("id", contactId);

    // 3. Update note in contact_notes
    if (noteId) {
      const { data: currentNote } = await admin
        .from("contact_notes")
        .select("note_text")
        .eq("id", noteId)
        .single();

      if (currentNote?.note_text) {
        let updatedText = currentNote.note_text;
        if (updatedText.includes("Assigned Executive:")) {
          updatedText = updatedText.replace(
            /Assigned Executive:\s*[^\n]+/i,
            `Assigned Executive: ${targetProfile.full_name}`,
          );
        } else {
          updatedText += `\n👤 Assigned Executive: ${targetProfile.full_name}`;
        }

        await admin
          .from("contact_notes")
          .update({ note_text: updatedText })
          .eq("id", noteId);
      }
    }

    return NextResponse.json({
      ok: true,
      assignedExecutive: targetProfile.full_name,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
