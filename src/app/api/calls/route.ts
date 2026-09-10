import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status") || "all";
    const agent = url.searchParams.get("agent") || "all";

    // Resolve caller profile to determine if they are an executive
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("full_name, account_role")
      .eq("user_id", ctx.userId)
      .maybeSingle();

    const isCallerAdmin =
      ctx.role === "owner" ||
      ctx.role === "admin" ||
      callerProfile?.account_role === "admin" ||
      callerProfile?.account_role === "owner";

    const executiveName = !isCallerAdmin ? (callerProfile?.full_name || "").trim() : "";

    // 1. Try querying call_logs table first
    let query = admin
      .from("call_logs")
      .select("*")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (status !== "all") {
      query = query.ilike("call_status", `%${status}%`);
    }

    if (executiveName) {
      // Non-admin executives only see their own assigned calls
      query = query.ilike("agent_name", `%${executiveName}%`);
    } else if (agent !== "all") {
      query = query.ilike("agent_name", `%${agent}%`);
    }

    if (search) {
      query = query.or(`customer_number.ilike.%${search}%,agent_name.ilike.%${search}%`);
    }

    const { data: callLogs, error: callErr } = await query;

    if (!callErr && callLogs) {
      return NextResponse.json({ ok: true, logs: callLogs });
    }

    // 2. Fallback: Parse from contact_notes if call_logs table hasn't been migrated yet
    const { data: notes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, contacts(phone, name)")
      .eq("account_id", ctx.accountId)
      .ilike("note_text", "%MyTelly%")
      .order("created_at", { ascending: false })
      .limit(50);

    const fallbackLogs = (notes || []).map((n: any) => {
      const text = n.note_text || "";
      const isMissed = text.toLowerCase().includes("missed");
      const agentMatch = text.match(/Executive:\s*([^\n]+)/);
      const durationMatch = text.match(/Duration:\s*([^\n]+)/);
      const audioMatch = text.match(/(?:Audio|Recording):\s*([^\n]+)/);
      const timeMatch = text.match(/Time:\s*([^\n]+)/);

      const fullAgent = agentMatch ? agentMatch[1].trim() : isMissed ? "--" : "Sales";
      let agent_name = fullAgent;
      let agent_phone = null;
      const phoneInParen = fullAgent.match(/\(([^)]+)\)/);
      if (phoneInParen) {
        agent_phone = phoneInParen[1];
        agent_name = fullAgent.replace(/\s*\([^)]+\)/, "").trim();
      }

      let call_date = "Sep 9, 2026";
      let start_time = "";
      if (timeMatch) {
        const parts = timeMatch[1].trim().split(/\s+/);
        if (parts.length >= 4) {
          call_date = parts.slice(0, 3).join(" ");
          start_time = parts.slice(3).join(" ");
        } else {
          start_time = timeMatch[1].trim();
        }
      }

      return {
        id: n.id,
        account_id: ctx.accountId,
        customer_number: n.contacts?.phone || "Unknown",
        virtual_number: "9672115123",
        agent_name,
        agent_phone,
        call_status: isMissed ? "Missed" : "Connected",
        call_duration: durationMatch ? durationMatch[1].trim() : "00:00:00",
        call_date,
        start_time,
        recording_url: audioMatch ? audioMatch[1].trim() : null,
        created_at: n.created_at,
      };
    });

    let filteredLogs = fallbackLogs;
    if (executiveName) {
      filteredLogs = fallbackLogs.filter((l: any) =>
        l.agent_name.toLowerCase().includes(executiveName.toLowerCase())
      );
    } else if (agent !== "all") {
      filteredLogs = fallbackLogs.filter((l: any) =>
        l.agent_name.toLowerCase().includes(agent.toLowerCase())
      );
    }

    return NextResponse.json({ ok: true, logs: filteredLogs });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const body = await req.json();
    const { callId, assignedTo, agentName } = body;

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    const { error } = await admin
      .from("call_logs")
      .update({
        assigned_to: assignedTo,
        agent_name: agentName,
      })
      .eq("id", callId)
      .eq("account_id", ctx.accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
