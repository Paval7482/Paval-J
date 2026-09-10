import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";
import { findExistingContact } from "@/lib/contacts/dedupe";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return handleMyTellyCall(req);
}

export async function POST(req: NextRequest) {
  return handleMyTellyCall(req);
}

async function handleMyTellyCall(req: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 1. Parse payload across multiple possible encodings (JSON, Form Data, URL query)
    const url = new URL(req.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    let bodyParams: Record<string, unknown> = {};
    let rawText = "";
    try {
      rawText = await req.text();
    } catch {
      // Ignore
    }

    if (rawText && rawText.trim().length > 0) {
      try {
        bodyParams = JSON.parse(rawText);
      } catch {
        try {
          const sp = new URLSearchParams(rawText);
          sp.forEach((val, key) => {
            bodyParams[key] = val;
          });
        } catch {
          // Ignore
        }
      }
    }

    const payload: Record<string, unknown> = { ...queryParams, ...bodyParams };
    console.log("[MyTelly Webhook] Method:", req.method, "URL:", req.url);
    console.log("[MyTelly Webhook] Raw body text:", rawText);
    console.log("[MyTelly Webhook] Parsed payload:", JSON.stringify(payload));

    // 2. Extract fields safely converting any number or null into strings
    const rawCaller = String(
      payload.caller_number ??
      payload.caller ??
      payload.customer_no ??
      payload.CustomerNo ??
      payload.phone ??
      ""
    ).trim();

    const agentName = String(
      payload.agent_name ??
      payload.AgentName ??
      payload.agent ??
      ""
    ).trim();

    const agentPhone = String(
      payload.connected_to ??
      payload.agent_phone ??
      payload.AgentConnected ??
      ""
    ).trim();

    const rawStatus = String(
      payload.call_status ??
      payload.CallStatus ??
      payload.status ??
      "Connected"
    ).trim();

    const durationVal = payload.call_duration ?? payload.duration ?? 0;
    const callDuration =
      typeof durationVal === "number"
        ? `${Math.floor(durationVal / 60)
            .toString()
            .padStart(2, "0")}:${(durationVal % 60).toString().padStart(2, "0")}`
        : String(durationVal || "00:00:00");

    const recordingUrl = payload.local_recording_path
      ? String(payload.local_recording_path)
      : payload.recording_url
      ? String(payload.recording_url)
      : "";

    const callDate = String(payload.call_date ?? "");
    const callTime = String(payload.call_time ?? "");
    const customerLocation = String(payload.customer_location ?? "");
    const virtualNumber = String(payload.vn ?? payload.virtual_number ?? "9672115123");

    if (!rawCaller || rawCaller.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Missing caller_number parameter" },
        { status: 400 },
      );
    }

    // 3. Normalize Caller Phone (+91...)
    const cleanDigits = rawCaller.replace(/\D/g, "");
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

    // 4. Resolve Target Account and Owner (Sri Lakshmi Industries default)
    const { data: accounts } = await admin
      .from("accounts")
      .select("id, owner_user_id")
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: false, error: "No account found" }, { status: 500 });
    }

    const accountId = accounts[0].id;
    const adminUserId = accounts[0].owner_user_id;

    // 5. Determine if it's a Missed Call or Connected Call
    const statusLower = rawStatus.toLowerCase();
    const isMissed =
      statusLower.includes("not") ||
      statusLower.includes("miss") ||
      statusLower.includes("fail") ||
      statusLower.includes("disconnect") ||
      !agentName ||
      agentName === "--" ||
      agentName.toLowerCase() === "not connected";

    const displayStatus = isMissed ? "Missed" : "Connected";

    let assignedUserId = adminUserId; // Default to Admin for missed calls or unassigned

    if (!isMissed && agentName) {
      // Look for a matching executive profile by name or email
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("account_id", accountId);

      if (profiles && profiles.length > 0) {
        const needle = agentName.toLowerCase();
        const matched = profiles.find(
          (p) =>
            p.full_name?.toLowerCase().includes(needle) ||
            p.email?.toLowerCase().includes(needle),
        );
        if (matched) {
          assignedUserId = matched.user_id;
        }
      }
    }

    // 6. Contact Lookup or Create
    let contact = await findExistingContact(admin, accountId, formattedPhone);

    if (!contact) {
      const contactName = customerLocation
        ? `Lead (${customerLocation})`
        : `Customer ${cleanDigits.slice(-4)}`;

      const { data: newContact, error: contactErr } = await admin
        .from("contacts")
        .insert({
          account_id: accountId,
          user_id: adminUserId,
          name: contactName,
          phone: formattedPhone,
        })
        .select("*")
        .single();

      if (contactErr) {
        console.error("[MyTelly Webhook] Failed to create contact:", contactErr);
      } else {
        contact = newContact;
      }
    }

    const contactId = contact ? contact.id : null;

    // 7. Pipeline & Deal Creation
    const { data: pipelines } = await admin
      .from("pipelines")
      .select("id")
      .eq("account_id", accountId)
      .limit(1);

    if (pipelines && pipelines.length > 0 && contactId) {
      const pipelineId = pipelines[0].id;
      const { data: stages } = await admin
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true })
        .limit(1);

      if (stages && stages.length > 0) {
        const stageId = stages[0].id;
        const dealTitle = isMissed
          ? `🔴 Missed Call: ${formattedPhone}`
          : `📞 Call: ${formattedPhone} (${agentName || "Executive"})`;

        const dealNotes = [
          `MyTelly Call Log: ${displayStatus}`,
          `Virtual Number: ${virtualNumber}`,
          `Agent: ${agentName || "None"} ${agentPhone ? `(${agentPhone})` : ""}`,
          `Duration: ${callDuration}`,
          callDate || callTime ? `Time: ${callDate} ${callTime}` : "",
          recordingUrl ? `Recording URL: ${recordingUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        await admin.from("deals").insert({
          account_id: accountId,
          user_id: assignedUserId,
          assigned_to: assignedUserId,
          pipeline_id: pipelineId,
          stage_id: stageId,
          contact_id: contactId,
          title: dealTitle,
          value: 0,
          notes: dealNotes,
        });
      }
    }

    // 8. Contact Notes (Audio link included for direct play)
    if (contactId) {
      const noteLines = [
        `📞 Call Status: ${displayStatus}`,
        `👤 Executive: ${isMissed ? "None (Missed Call)" : agentName}`,
        `⏱️ Duration: ${callDuration}`,
        callDate || callTime ? `📅 Time: ${callDate} ${callTime}` : "",
        recordingUrl ? `🎙️ Audio Recording: ${recordingUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await admin.from("contact_notes").insert({
        account_id: accountId,
        user_id: assignedUserId,
        contact_id: contactId,
        note_text: noteLines,
      });
    }

    // 9. Store in call_logs table for dedicated Calls View
    const { error: logErr } = await admin.from("call_logs").insert({
      account_id: accountId,
      virtual_number: virtualNumber,
      customer_number: formattedPhone,
      agent_name: isMissed ? "--" : agentName || "Sales",
      agent_phone: agentPhone || null,
      assigned_to: assignedUserId,
      call_status: displayStatus,
      call_duration: callDuration,
      call_date: callDate || new Date().toLocaleDateString(),
      start_time: callTime || new Date().toLocaleTimeString(),
      recording_url: recordingUrl || null,
      customer_location: customerLocation || null,
      raw_payload: payload,
    });

    if (logErr) {
      console.warn("[MyTelly Webhook] Warning inserting to call_logs:", logErr.message);
    }

    // 10. In-App Notification (Admin for Missed Calls, Executive for Assigned Calls)
    if (contactId) {
      await admin.from("notifications").insert({
        account_id: accountId,
        user_id: assignedUserId,
        type: "conversation_assigned",
        contact_id: contactId,
        title: isMissed
          ? `🔴 Missed Call: ${formattedPhone}`
          : `📞 Call Attended: ${formattedPhone}`,
        body: isMissed
          ? `Missed call on virtual number ${virtualNumber}. Please reassign or call back immediately.`
          : `Call handled by ${agentName} (${callDuration}). Recording available in Calls tab.`,
      });
    }

    return NextResponse.json({
      ok: true,
      status: "processed",
      callStatus: rawStatus,
      isMissed,
      assignedTo: assignedUserId === adminUserId ? "Admin" : agentName,
      recordingUrl: recordingUrl || null,
    });
  } catch (err) {
    console.error("[MyTelly Webhook] Processing failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
