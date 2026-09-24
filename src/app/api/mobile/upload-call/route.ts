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

    // 1. Upload audio file to Supabase storage if provided
    if (audioFile && audioFile.size > 0) {
      try {
        const bucketName = "call-recordings";
        // Ensure bucket exists
        const { data: buckets } = await admin.storage.listBuckets();
        const hasBucket = (buckets || []).some((b) => b.name === bucketName);
        if (!hasBucket) {
          await admin.storage.createBucket(bucketName, { public: true });
        }

        const ext = audioFile.name?.split(".").pop() || "m4a";
        const fileName = `sync_${Date.now()}_${last10}.${ext}`;
        const buffer = Buffer.from(await audioFile.arrayBuffer());

        const { error: uploadError } = await admin.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: audioFile.type || "audio/mp4",
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = admin.storage.from(bucketName).getPublicUrl(fileName);
          recordingUrl = publicUrlData?.publicUrl || null;
        } else {
          console.warn("[Mobile Upload Call] Supabase Storage upload error:", uploadError);
        }
      } catch (storageErr) {
        console.error("[Mobile Upload Call] Storage exception:", storageErr);
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
