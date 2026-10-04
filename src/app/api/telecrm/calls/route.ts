import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status") || "all";
    const agent = url.searchParams.get("agent") || "all";
    const callTypeParam = url.searchParams.get("callType") || "all";
    const startDate = url.searchParams.get("startDate")?.trim() || "";
    const endDate = url.searchParams.get("endDate")?.trim() || "";

    // Resolve caller profile to determine if they are an executive or admin
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

    const serverHubUrl = process.env.SLI_SERVER_HUB_URL || process.env.NEXT_PUBLIC_SLI_SERVER_HUB_URL || "http://127.0.0.1:8080";

    // 1. Query call_logs table (Direct Mobile App & 8TB Hub syncs)
    const { data: callLogs } = await admin
      .from("call_logs")
      .select("*")
      .eq("account_id", ctx.accountId)
      .order("call_date", { ascending: false })
      .limit(1000);

    // 2. Query contact notes with call markers (Companion App, 8TB Live, TeleCRM, etc.)
    const { data: notes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, contacts(phone, name)")
      .eq("account_id", ctx.accountId)
      .or("note_text.ilike.%Call%,note_text.ilike.%Executive%,note_text.ilike.%Duration%,note_text.ilike.%TeleCRM%")
      .order("created_at", { ascending: false })
      .limit(1000);

    // Build contacts lookup for call_logs customer names
    const { data: allContacts } = await admin
      .from("contacts")
      .select("id, name, phone")
      .eq("account_id", ctx.accountId)
      .limit(2000);

    const contactMap = new Map<string, string>();
    (allContacts || []).forEach((c: any) => {
      if (c.phone) contactMap.set(c.phone.replace(/\D/g, "").slice(-10), c.name || "Customer");
    });

    const parsedCallLogs = (callLogs || []).map((cl: any) => {
      const cleanPhone = (cl.customer_number || "").replace(/\D/g, "");
      const last10 = cleanPhone.slice(-10);
      const custName = contactMap.get(last10) || `Customer (+91${last10})`;
      const isIncoming = (cl.call_type || "").toLowerCase().includes("in");
      const callType = isIncoming ? "Incoming" : "Outgoing";
      const durStr = cl.call_duration || "00:00:00";
      const durParts = durStr.split(":").map(Number);
      let durSecs = 0;
      if (durParts.length === 3) durSecs = durParts[0] * 3600 + durParts[1] * 60 + durParts[2];
      else if (durParts.length === 2) durSecs = durParts[0] * 60 + durParts[1];
      else durSecs = parseInt(durStr, 10) || 0;

      let recUrl = cl.recording_url || null;
      if (recUrl && recUrl.startsWith("/api/audio/")) {
        // Can be streamed from local 8TB hub or proxy
        recUrl = `${serverHubUrl}${recUrl}`;
      }

      const callDateStr = cl.call_date ? String(cl.call_date).slice(0, 10) : (cl.created_at ? String(cl.created_at).slice(0, 10) : "");

      return {
        id: cl.id,
        action_id: cl.id,
        account_id: ctx.accountId,
        customer_name: custName,
        customer_number: cleanPhone.length === 10 ? `+91${cleanPhone}` : cl.customer_number,
        agent_name: cl.agent_name || "Sales Executive",
        call_type: callType,
        call_status: (cl.call_status || "connected").toLowerCase().includes("miss") ? "Missed" : "Connected",
        call_duration: durStr.includes(":") ? durStr : `${durSecs}s`,
        duration_seconds: durSecs,
        call_date: callDateStr,
        start_time: cl.call_date ? new Date(cl.call_date).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
        recording_url: recUrl,
        recording_name: recUrl ? recUrl.split("/").pop() : null,
        created_at: cl.created_at || cl.call_date,
      };
    });

    const parsedNotesLogs = (notes || []).map((n: any) => {
      const text = n.note_text || "";
      const isIncoming = text.toLowerCase().includes("incoming");
      const isOutgoing = text.toLowerCase().includes("outgoing");
      const call_type = isIncoming ? "Incoming" : isOutgoing ? "Outgoing" : "Call";

      const isMissed =
        text.toLowerCase().includes("missed") ||
        text.toLowerCase().includes("no answer") ||
        text.toLowerCase().includes("rejected") ||
        text.toLowerCase().includes("none (missed");

      const agentMatch = text.match(/(?:👤\s*Executive|Executive):\s*([^|\n]+)/);
      const durationMatch = text.match(/(?:⏱️\s*Duration|Duration):\s*([^|\n]+)/);
      const audioMatch = text.match(/(?:🎙️\s*Audio Recording|Audio|Recording):\s*([^|\n]+)/);
      let recording_url: string | null = null;
      let recording_name: string | null = null;
      if (audioMatch) {
        const rawAudio = audioMatch[1].trim();
        if (rawAudio && rawAudio !== "[object Object]" && !rawAudio.toLowerCase().includes("invalid")) {
          if (rawAudio.startsWith("http://") || rawAudio.startsWith("https://")) {
            recording_url = rawAudio;
          } else if (rawAudio.startsWith("/api/audio/")) {
            recording_url = `${serverHubUrl}${rawAudio}`;
          } else {
            recording_name = rawAudio;
          }
        }
      }

      const timeMatch = text.match(/(?:📅\s*Time|Time):\s*([^|\n]+)/);
      const statusMatch = text.match(/(?:📞\s*Call Status|Status):\s*([^|\n]+)/);
      const actionIdMatch = text.match(/ActionId:\s*([^\s|\n]+)/);

      const agent_name = agentMatch ? agentMatch[1].trim().replace(/\(\+\d+\)/g, "").trim() : "Sales Executive";

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

      if (!call_date && n.created_at) {
        call_date = new Date(n.created_at).toISOString().split("T")[0];
      }

      let call_status = isMissed ? "Missed" : "Connected";
      if (statusMatch) {
        const s = statusMatch[1].trim();
        if (s) call_status = s;
      }

      const durationStr = durationMatch ? durationMatch[1].trim() : "00:00:00";
      const durParts = durationStr.split(":").map(Number);
      let durationSeconds = 0;
      if (durParts.length === 3) {
        durationSeconds = durParts[0] * 3600 + durParts[1] * 60 + durParts[2];
      } else if (durParts.length === 2) {
        durationSeconds = durParts[0] * 60 + durParts[1];
      } else {
        durationSeconds = parseInt(durationStr, 10) || 0;
      }

      return {
        id: n.id,
        action_id: actionIdMatch ? actionIdMatch[1] : n.id,
        account_id: ctx.accountId,
        customer_name: n.contacts?.name || "Customer",
        customer_number: n.contacts?.phone || "Unknown",
        agent_name,
        call_type,
        call_status,
        call_duration: durationStr,
        duration_seconds: durationSeconds,
        call_date,
        start_time,
        recording_url,
        recording_name,
        created_at: n.created_at,
      };
    });

    // Merge and deduplicate calls by customer number and recording / timestamp
    const seenMap = new Set<string>();
    const allLogs: any[] = [];

    for (const log of [...parsedCallLogs, ...parsedNotesLogs]) {
      const key = `${log.customer_number}_${log.call_date}_${log.call_duration}`;
      if (!seenMap.has(key)) {
        seenMap.add(key);
        allLogs.push(log);
      }
    }

    // Sort by newest created_at / call_date descending
    allLogs.sort((a, b) => new Date(b.created_at || b.call_date).getTime() - new Date(a.created_at || a.call_date).getTime());

    const category = url.searchParams.get("category") || "all"; // "all" | "smart_app" | "mytelly"

    // Tag each log with source
    const taggedLogs = allLogs.map((log) => {
      const text = (log.raw_text || "").toLowerCase();
      const rec = (log.recording_url || "").toLowerCase();
      const isSmartApp =
        text.includes("companion app") ||
        text.includes("8tb server") ||
        rec.includes("/api/audio/") ||
        log.source === "sli_mobile_sync" ||
        log.source === "sli_8tb_server_sync" ||
        ["karthick", "subash", "muthupandi"].some((u) => (log.agent_name || "").toLowerCase().includes(u));

      return {
        ...log,
        source: isSmartApp ? "sli_smart_app" : "mytelly",
        source_label: isSmartApp ? "SLI Smart App" : "MyTelly IVR",
      };
    });

    let filteredLogs = taggedLogs;

    // Filter by category
    if (category === "smart_app") {
      filteredLogs = filteredLogs.filter((l) => l.source === "sli_smart_app");
    } else if (category === "mytelly") {
      filteredLogs = filteredLogs.filter((l) => l.source === "mytelly");
    }

    // Filter by executive role if not admin
    if (executiveName) {
      filteredLogs = filteredLogs.filter((l) =>
        l.agent_name.toLowerCase().includes(executiveName.toLowerCase())
      );
    } else if (agent !== "all") {
      filteredLogs = filteredLogs.filter((l) =>
        l.agent_name.toLowerCase().includes(agent.toLowerCase())
      );
    }

    // Filter by call type (Incoming / Outgoing)
    if (callTypeParam !== "all") {
      filteredLogs = filteredLogs.filter(
        (l) => l.call_type.toLowerCase() === callTypeParam.toLowerCase()
      );
    }

    // Filter by status
    if (status !== "all") {
      filteredLogs = filteredLogs.filter((l) =>
        l.call_status.toLowerCase().includes(status.toLowerCase())
      );
    }

    // Filter by date
    if (startDate) {
      filteredLogs = filteredLogs.filter((l) => {
        const d = l.call_date || (l.created_at ? l.created_at.slice(0, 10) : "");
        return !d || d >= startDate;
      });
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter((l) => {
        const d = l.call_date || (l.created_at ? l.created_at.slice(0, 10) : "");
        return !d || d <= endDate;
      });
    }

    // Search query
    if (search) {
      const s = search.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (l) =>
          l.customer_number.toLowerCase().includes(s) ||
          l.customer_name.toLowerCase().includes(s) ||
          l.agent_name.toLowerCase().includes(s)
      );
    }

    // Calculate Executive Analytics
    const totalCalls = filteredLogs.length;
    const connectedCalls = filteredLogs.filter((c) =>
      c.call_status.toLowerCase().includes("connected")
    ).length;
    const missedCalls = filteredLogs.filter(
      (c) =>
        c.call_status.toLowerCase().includes("missed") ||
        c.call_status.toLowerCase().includes("no answer") ||
        c.call_status.toLowerCase().includes("rejected")
    ).length;
    const incomingCalls = filteredLogs.filter((c) => c.call_type === "Incoming").length;
    const outgoingCalls = filteredLogs.filter((c) => c.call_type === "Outgoing").length;

    const totalDurationSeconds = filteredLogs.reduce(
      (acc, c) => acc + (c.duration_seconds || 0),
      0
    );

    const formatTime = (secs: number) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    // Executive breakdown with incoming/outgoing counts
    const execMap = new Map<string, { total: number; incoming: number; outgoing: number; connected: number; missed: number; duration: number }>();
    taggedLogs.forEach((l) => {
      const name = l.agent_name || "Sales Executive";
      const current = execMap.get(name) || { total: 0, incoming: 0, outgoing: 0, connected: 0, missed: 0, duration: 0 };
      current.total++;
      if (l.call_type === "Incoming") current.incoming++;
      else current.outgoing++;

      if (l.call_status.toLowerCase().includes("connected")) {
        current.connected++;
      } else {
        current.missed++;
      }
      current.duration += l.duration_seconds || 0;
      execMap.set(name, current);
    });

    const appUsersList = ["karthick", "subash", "muthupandi"];

    const executiveBreakdown = Array.from(execMap.entries()).map(([name, stats]) => {
      const isAppUser = appUsersList.some((u) => name.toLowerCase().includes(u));
      return {
        name,
        ...stats,
        isAppUser,
        formattedDuration: formatTime(stats.duration),
        connectionRate: stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      logs: filteredLogs,
      stats: {
        totalCalls,
        connectedCalls,
        missedCalls,
        incomingCalls,
        outgoingCalls,
        totalDurationSeconds,
        formattedTotalDuration: formatTime(totalDurationSeconds),
        connectionRate: totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0,
      },
      executiveBreakdown,
      isAdmin: isCallerAdmin,
      currentExecutive: executiveName,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
