import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const sessionFile = "C:\\SLICRMDATA\\active_mobile_sessions.json";
    let activeSessions: any[] = [];

    if (fs.existsSync(sessionFile)) {
      try {
        activeSessions = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
      } catch (e) {
        activeSessions = [];
      }
    }

    // Count synced calls per executive from call_logs table
    const { data: appLogs } = await admin
      .from("call_logs")
      .select("agent_name, call_type, created_at")
      .eq("source", "sli_mobile_sync")
      .order("created_at", { ascending: false })
      .limit(500);

    const callCountsByAgent: Record<string, { total: number; incoming: number; outgoing: number; lastCall: string }> = {};

    (appLogs || []).forEach((l: any) => {
      const name = (l.agent_name || "Unknown").toLowerCase();
      if (!callCountsByAgent[name]) {
        callCountsByAgent[name] = { total: 0, incoming: 0, outgoing: 0, lastCall: l.created_at };
      }
      callCountsByAgent[name].total++;
      if ((l.call_type || "").toLowerCase().includes("in")) {
        callCountsByAgent[name].incoming++;
      } else {
        callCountsByAgent[name].outgoing++;
      }
    });

    // Merge session data with actual call counts
    const devices = activeSessions.map((s) => {
      const nameLower = (s.name || "").toLowerCase();
      const matched = Object.entries(callCountsByAgent).find(([k]) => nameLower.includes(k) || k.includes(nameLower));
      const stats = matched ? matched[1] : { total: 0, incoming: 0, outgoing: 0, lastCall: null };

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        login_at: s.login_at,
        last_active_at: s.last_active_at || s.login_at,
        is_online: true,
        calls_synced: stats.total,
        incoming_synced: stats.incoming,
        outgoing_synced: stats.outgoing,
        last_call_at: stats.lastCall,
      };
    });

    return NextResponse.json({
      ok: true,
      devices,
      totalActiveDevices: devices.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
