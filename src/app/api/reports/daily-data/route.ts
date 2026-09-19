import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";

function parseDurationToSeconds(durStr: string | null | undefined): number {
  if (!durStr) return 0;
  const parts = durStr.trim().split(":").map(Number);
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return Number(durStr) || 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const executiveId = searchParams.get("executive") || "all";

  try {
    const admin = supabaseAdmin();

    // 1. Fetch team members / profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, email, account_role")
      .order("full_name");

    const activeProfiles = (profiles || []).filter(
      (p) => !p.email?.includes("admin@")
    );

    // Build IST date range
    const istStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
    const istEnd = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();

    // 2. Fetch Calls from contact_notes
    const { data: callNotes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, user_id, contacts(id, phone, name)")
      .ilike("note_text", "%Call Status%")
      .gte("created_at", istStart)
      .lte("created_at", istEnd)
      .order("created_at", { ascending: false });

    // Map call notes to structured CallRecord
    const allCalls = (callNotes || []).map((n: any) => {
      const text = n.note_text || "";
      const isMissed =
        text.toLowerCase().includes("missed") ||
        text.toLowerCase().includes("none (missed");
      const agentMatch = text.match(/Executive:\s*([^\n]+)/);
      const durationMatch = text.match(/Duration:\s*([^\n]+)/);
      const audioMatch = text.match(/(?:Audio|Recording):\s*([^\n]+)/);
      const timeMatch = text.match(/Time:\s*([^\n]+)/);

      const fullAgent = agentMatch
        ? agentMatch[1].trim()
        : isMissed
        ? "--"
        : "Sales";
      let agent_name = fullAgent;
      let agent_phone = null;
      const phoneInParen = fullAgent.match(/\(([^)]+)\)/);
      if (phoneInParen) {
        agent_phone = phoneInParen[1];
        agent_name = fullAgent.replace(/\s*\([^)]+\)/, "").trim();
      }

      const durStr = durationMatch ? durationMatch[1].trim() : "00:00";
      const durSec = parseDurationToSeconds(durStr);

      let call_date = "";
      let start_time = "";
      if (timeMatch) {
        const rawTimeStr = timeMatch[1].trim();
        const parts = rawTimeStr.split(/\s+/);
        if (parts.length >= 2) {
          call_date = parts[0];
          start_time = parts.slice(1).join(" ");
        } else {
          start_time = rawTimeStr;
        }
      }

      return {
        id: n.id,
        call_id: n.id,
        customer_number: n.contacts?.phone || "Unknown",
        agent_name: isMissed ? "--" : agent_name,
        agent_phone,
        assigned_to: n.user_id,
        call_status: isMissed ? "Missed" : "Connected",
        call_duration: durStr,
        duration_seconds: durSec,
        start_time:
          start_time ||
          (n.created_at ? new Date(n.created_at).toLocaleTimeString() : ""),
        recording_url: audioMatch ? audioMatch[1].trim() : null,
        created_at: n.created_at,
      };
    });

    // 3. Fetch Deals created for the date (Meta Leads & Inbound)
    const { data: dealsData } = await admin
      .from("deals")
      .select("id, title, status, notes, user_id, assigned_to, created_at, contacts(id, name, phone)")
      .gte("created_at", istStart)
      .lte("created_at", istEnd)
      .order("created_at", { ascending: false });

    // Exclude virtual call log deals from pure leads list
    const pureLeads = (dealsData || [])
      .filter((d: any) => !d.title.startsWith("📞") && !d.title.startsWith("🔴"))
      .map((d: any) => ({
        ...d,
        stage: d.status || "new",
      }));

    // 4. Fetch WhatsApp conversations active today
    const { data: convsData } = await admin
      .from("conversations")
      .select("id, assigned_agent_id, status, last_message_text, last_message_at, unread_count, contact:contacts(name, phone)")
      .gte("last_message_at", istStart)
      .lte("last_message_at", istEnd)
      .order("last_message_at", { ascending: false });

    // 5. Aggregate Executive Stats
    const execStatsMap: Record<string, {
      userId: string;
      profileId: string;
      name: string;
      totalCalls: number;
      connectedCalls: number;
      missedCalls: number;
      totalDurationSeconds: number;
      metaLeadsCount: number;
      whatsappChatsCount: number;
      followUpsCount: number;
    }> = {};

    activeProfiles.forEach((p) => {
      execStatsMap[p.user_id] = {
        userId: p.user_id,
        profileId: p.id,
        name: p.full_name,
        totalCalls: 0,
        connectedCalls: 0,
        missedCalls: 0,
        totalDurationSeconds: 0,
        metaLeadsCount: 0,
        whatsappChatsCount: 0,
        followUpsCount: 0,
      };
    });

    // Helper map from executive name / profile ID to userId
    const nameToUserId: Record<string, string> = {};
    const profileIdToUserId: Record<string, string> = {};
    activeProfiles.forEach((p) => {
      profileIdToUserId[p.id] = p.user_id;
      nameToUserId[p.full_name.toLowerCase()] = p.user_id;
      nameToUserId[p.full_name.split(" ")[0].toLowerCase()] = p.user_id;
    });

    allCalls.forEach((c) => {
      let targetUserId = c.assigned_to;
      if (!targetUserId || !execStatsMap[targetUserId]) {
        const cleanName = (c.agent_name || "").toLowerCase();
        targetUserId = nameToUserId[cleanName];
      }
      if (targetUserId && execStatsMap[targetUserId]) {
        const exec = execStatsMap[targetUserId];
        exec.totalCalls++;
        if (c.call_status === "Connected") {
          exec.connectedCalls++;
          exec.totalDurationSeconds += c.duration_seconds;
        } else {
          exec.missedCalls++;
        }
      }
    });

    pureLeads.forEach((d: any) => {
      let targetUserId = d.user_id;
      if (!targetUserId || !execStatsMap[targetUserId]) {
        if (d.assigned_to && profileIdToUserId[d.assigned_to]) {
          targetUserId = profileIdToUserId[d.assigned_to];
        }
      }
      if (targetUserId && execStatsMap[targetUserId]) {
        execStatsMap[targetUserId].metaLeadsCount++;
        execStatsMap[targetUserId].followUpsCount++;
      }
    });

    (convsData || []).forEach((c: any) => {
      if (c.assigned_agent_id && execStatsMap[c.assigned_agent_id]) {
        execStatsMap[c.assigned_agent_id].whatsappChatsCount++;
      }
    });

    // Apply executive filter if selected
    let filteredCalls = allCalls;
    let filteredDeals = pureLeads;
    let filteredConvs = convsData || [];

    if (executiveId !== "all") {
      filteredCalls = allCalls.filter(
        (c) =>
          c.assigned_to === executiveId ||
          nameToUserId[c.agent_name.toLowerCase()] === executiveId
      );
      filteredDeals = pureLeads.filter(
        (d: any) =>
          d.user_id === executiveId ||
          profileIdToUserId[d.assigned_to] === executiveId
      );
      filteredConvs = (convsData || []).filter(
        (c: any) => c.assigned_agent_id === executiveId
      );
    }

    return NextResponse.json({
      ok: true,
      date: dateStr,
      executives: activeProfiles,
      stats: Object.values(execStatsMap),
      calls: filteredCalls,
      deals: filteredDeals,
      conversations: filteredConvs,
    });
  } catch (err: any) {
    console.error("Daily report data error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
