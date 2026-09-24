import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const agentName = url.searchParams.get("agent") || "";
    const isTeamLead = url.searchParams.get("teamLead") === "true";
    const date = url.searchParams.get("date") || "";

    let query = admin
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!isTeamLead && agentName && agentName !== "all") {
      query = query.ilike("agent_name", `%${agentName}%`);
    }

    if (date) {
      query = query.gte("call_date", `${date}T00:00:00Z`).lte("call_date", `${date}T23:59:59Z`);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Compute basic today stats
    const today = new Date().toISOString().split("T")[0];
    const todayLogs = (logs || []).filter((l) => (l.call_date || l.created_at || "").startsWith(today));
    const totalCalls = todayLogs.length;
    const connectedCalls = todayLogs.filter((l) => !String(l.call_status || "").toLowerCase().includes("missed")).length;
    const missedCalls = totalCalls - connectedCalls;

    return NextResponse.json({
      ok: true,
      logs: logs || [],
      todayStats: {
        totalCalls,
        connectedCalls,
        missedCalls,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
