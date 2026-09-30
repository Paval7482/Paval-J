import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const agentName = (url.searchParams.get("agent_name") || url.searchParams.get("agent") || "").trim();
    const isAdmin = !agentName || /admin|paval|owner/i.test(agentName);

    // 1. Fetch from call_logs table
    const { data: rawCallLogs } = await admin
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    // 2. Fetch TeleCRM/MyTelly contact_notes with audio recordings
    const { data: notes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, contacts(phone, name)")
      .or("note_text.ilike.%TeleCRM%,note_text.ilike.%mytelly%,note_text.ilike.%Audio Recording%,note_text.ilike.%Call Status%")
      .order("created_at", { ascending: false })
      .limit(300);

    const noteLogs = (notes || []).map((n: any) => {
      const text = n.note_text || "";
      const isIncoming = text.toLowerCase().includes("incoming");
      const callType = isIncoming ? "inbound" : "outbound";
      const isMissed = text.toLowerCase().includes("missed") || text.toLowerCase().includes("no answer");

      const agentMatch = text.match(/(?:👤\s*Executive|Executive):\s*([^|\n]+)/i);
      const durationMatch = text.match(/(?:⏱️\s*Duration|Duration):\s*([^|\n]+)/i);
      const audioMatch = text.match(/(?:🎙️\s*Audio Recording|Audio|Recording):\s*([^|\n]+)/i);
      const timeMatch = text.match(/(?:📅\s*Time|Time):\s*([^|\n]+)/i);

      let recording_url: string | null = null;
      if (audioMatch) {
        const rawAudio = audioMatch[1].trim();
        if (rawAudio && rawAudio !== "[object Object]" && !rawAudio.toLowerCase().includes("invalid")) {
          recording_url = rawAudio;
        }
      }

      return {
        id: n.id,
        customer_number: n.contacts?.phone || "",
        agent_name: agentMatch ? agentMatch[1].trim() : "Sales Executive",
        call_type: callType,
        call_status: isMissed ? "missed" : "connected",
        call_duration: durationMatch ? durationMatch[1].trim() : "00:30",
        recording_url: recording_url,
        call_date: timeMatch ? timeMatch[1].trim() : n.created_at,
        created_at: n.created_at,
        outcome: isMissed ? "missed_call" : "connected",
        notes: text,
      };
    });

    const combined = [...(rawCallLogs || []), ...noteLogs];
    
    // Deduplicate by phone + created_at
    const seen = new Set<string>();
    const uniqueLogs = combined.filter((l) => {
      const key = `${l.customer_number}_${l.created_at?.slice(0, 16)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter by executive if not admin
    const filteredLogs = isAdmin
      ? uniqueLogs
      : uniqueLogs.filter((l) => {
          const lAgent = (l.agent_name || "").toLowerCase();
          const target = agentName.toLowerCase();
          return lAgent.includes(target) || target.includes(lAgent);
        });

    return NextResponse.json({
      ok: true,
      logs: filteredLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
