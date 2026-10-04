import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";
import { findExistingContact } from "@/lib/contacts/dedupe";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const formData = await req.formData();

    const audioFile = formData.get("audio") as File | null;
    const customerPhone = String(formData.get("customer_number") || formData.get("phone") || "").replace(/\D/g, "");
    const agentPhone = String(formData.get("agent_phone") || "").replace(/\D/g, "");
    const agentName = String(formData.get("agent_name") || "Sales Executive").trim();
    const callType = String(formData.get("call_type") || "outbound").toLowerCase();
    const duration = String(formData.get("duration") || formData.get("call_duration") || "0").trim();
    const callStatus = String(formData.get("call_status") || "connected").toLowerCase();
    const recordedAt = String(formData.get("timestamp") || new Date().toISOString());

    if (!customerPhone || customerPhone.length < 6) {
      return NextResponse.json({ ok: false, error: "Valid customer number required" }, { status: 400 });
    }

    const last10 = customerPhone.slice(-10);
    let recordingUrl: string | null = null;

    // 1. Upload audio file directly to Sri Lakshmi 8TB Server Storage (Bypass Supabase Storage)
    if (audioFile && audioFile.size > 0) {
      try {
        const serverHubUrl = process.env.SLI_SERVER_HUB_URL || process.env.NEXT_PUBLIC_SLI_SERVER_HUB_URL || "http://127.0.0.1:8080";
        const forwardForm = new FormData();
        forwardForm.append("customer_number", customerPhone);
        forwardForm.append("agent_name", agentName);
        forwardForm.append("agent_phone", agentPhone);
        forwardForm.append("call_type", callType);
        forwardForm.append("duration", duration);
        forwardForm.append("call_status", callStatus);
        forwardForm.append("timestamp", recordedAt);
        forwardForm.append("audio", audioFile);

        const hubRes = await fetch(`${serverHubUrl}/api/upload-call`, {
          method: "POST",
          body: forwardForm,
        });

        if (hubRes.ok) {
          const hubData = await hubRes.json();
          recordingUrl = hubData.recordingUrl || null;
          console.log("[8TB SERVER STORAGE] ✅ Audio uploaded directly to 8TB Server:", recordingUrl);
        } else {
          console.warn("[8TB SERVER STORAGE] Server hub responded with status:", hubRes.status);
        }
      } catch (serverErr) {
        console.warn("[8TB SERVER STORAGE] Server hub forward warning:", serverErr);
      }
    }

    // 2. Fetch default account_id
    const { data: defaultProfile } = await admin
      .from("profiles")
      .select("account_id")
      .not("account_id", "is", null)
      .limit(1)
      .maybeSingle();

    const accountId = defaultProfile?.account_id || null;

    // 3. Match or Create Contact in CRM
    let contactId: string | null = null;
    let contactName: string = "Customer";

    if (accountId) {
      const existing = await findExistingContact(admin, accountId, customerPhone);
      if (existing) {
        contactId = existing.id;
        contactName = existing.name || "Customer";
      } else {
        const { data: newContact } = await admin
          .from("contacts")
          .insert({
            account_id: accountId,
            phone: customerPhone,
            name: `Lead ${last10}`,
            source: "mobile_call",
            stage: "lead",
          })
          .select("id, name")
          .maybeSingle();

        if (newContact) {
          contactId = newContact.id;
          contactName = newContact.name;
        }
      }
    }

    // 4. Log in call_logs table
    if (accountId) {
      try {
        await admin.from("call_logs").insert({
          account_id: accountId,
          customer_number: customerPhone,
          agent_name: agentName,
          agent_phone: agentPhone || null,
          call_type: callType.includes("in") ? "inbound" : "outbound",
          call_status: callStatus,
          call_duration: duration,
          recording_url: recordingUrl,
          call_date: recordedAt,
          source: "sli_mobile_sync",
        });
      } catch (logErr) {
        console.warn("[Mobile Upload Call] call_logs table insert error:", logErr);
      }

      // 5. Also log note in contact_notes for 360-degree customer view
      if (contactId) {
        const icon = callType.includes("in") ? "📲 Incoming Call" : "📞 Outgoing Call";
        const noteText = [
          `${icon} (SLI Companion App)`,
          `👤 Executive: ${agentName} ${agentPhone ? `(+${agentPhone})` : ""}`,
          `⏱️ Duration: ${duration}`,
          `📅 Time: ${new Date(recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
          `📞 Status: ${callStatus}`,
          recordingUrl ? `🎙️ Audio Recording: ${recordingUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        await admin.from("contact_notes").insert({
          account_id: accountId,
          contact_id: contactId,
          note_text: noteText,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Call synced successfully",
      recordingUrl,
      contactName,
      contactId,
    });
  } catch (error: any) {
    console.error("[Mobile Upload Call] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
