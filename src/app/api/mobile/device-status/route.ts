import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 1. Fetch Auth Users to get accurate Supabase last_sign_in_at timestamps
    const { data: authData } = await admin.auth.admin.listUsers();
    const authUsers = authData?.users || [];

    // 2. Fetch Profiles for full names & roles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, email, account_role");

    // 3. Fetch Call counts per executive
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

    const todayDateStr = new Date().toISOString().slice(0, 10);

    // Build active devices list for all users logged in today
    const devices = authUsers
      .filter((authUser) => authUser.last_sign_in_at && authUser.last_sign_in_at.startsWith(todayDateStr))
      .map((authUser) => {
        const email = authUser.email || "";
        const profile = (profiles || []).find(
          (p) => p.email?.toLowerCase() === email.toLowerCase() || p.user_id === authUser.id
        );

        const lastSignIn = authUser.last_sign_in_at!;
        let name = profile?.full_name || "";
        if (!name) {
          if (email.includes("md")) name = "MD Sir";
          else if (email.includes("karthick")) name = "Karthick V";
          else if (email.includes("subash")) name = "Subash";
          else if (email.includes("muthu")) name = "Muthupandi";
          else name = email.split("@")[0];
        }

        const nameLower = name.toLowerCase();
        const matchedStats = Object.entries(callCountsByAgent).find(([k]) => nameLower.includes(k) || k.includes(nameLower));
        const stats = matchedStats ? matchedStats[1] : { total: 0, incoming: 0, outgoing: 0, lastCall: null };

        return {
          id: authUser.id,
          name,
          email,
          role: profile?.account_role || "executive",
          login_at: lastSignIn,
          last_active_at: lastSignIn,
          is_online: true,
          is_today: true,
          calls_synced: stats.total,
          incoming_synced: stats.incoming,
          outgoing_synced: stats.outgoing,
          last_call_at: stats.lastCall,
        };
      });

    // Sort by newest login descending (most recent first)
    devices.sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());

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
