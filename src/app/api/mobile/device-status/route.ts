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

    const targetMobileEmails = [
      "karthick_v@srilakshmiindustries.co.in",
      "subash@srilakshmiindustries.co.in",
      "muthupandi@srilakshmiindustries.com",
    ];

    const todayDateStr = new Date().toISOString().slice(0, 10);

    // Build active devices list
    const devices = targetMobileEmails
      .map((email) => {
        const authUser = authUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        const profile = (profiles || []).find(
          (p) => p.email?.toLowerCase() === email.toLowerCase() || p.user_id === authUser?.id
        );

        if (!authUser || !authUser.last_sign_in_at) {
          return null;
        }

        const lastSignIn = authUser.last_sign_in_at;
        const isToday = lastSignIn.startsWith(todayDateStr);
        const name = profile?.full_name || (email.includes("karthick") ? "Karthick V" : email.includes("subash") ? "Subash" : "Muthupandi");
        const nameLower = name.toLowerCase();

        const matchedStats = Object.entries(callCountsByAgent).find(([k]) => nameLower.includes(k) || k.includes(nameLower));
        const stats = matchedStats ? matchedStats[1] : { total: 0, incoming: 0, outgoing: 0, lastCall: null };

        // Determine online status: signed in today
        const isOnline = isToday;

        return {
          id: authUser.id,
          name,
          email,
          login_at: lastSignIn,
          last_active_at: lastSignIn,
          is_online: isOnline,
          is_today: isToday,
          calls_synced: stats.total,
          incoming_synced: stats.incoming,
          outgoing_synced: stats.outgoing,
          last_call_at: stats.lastCall,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null && Boolean(d.is_today));

    // Sort by newest login descending
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
