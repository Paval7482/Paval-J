import { supabaseAdmin } from "@/lib/automations/admin-client";
import { getLeadRoutingConfig, DEFAULT_SALES_EXECUTIVES } from "@/lib/whatsapp/lead-alert";
import https from "https";

export const TELECRM_ENTERPRISE_ID = "6aacd4164ef3c52f7005fb4e";
export const TELECRM_SYNC_TOKEN = "bf96a38f-72b4-48a2-8006-f6b7855ce4991790162024443:8a3c803e-ddb6-4d46-92c7-6a7bf57bda18";
export const TELECRM_ASYNC_TOKEN = "260da51e-b72e-4c7d-b2e7-8e8840cb49881790161435595:710434f3-d1c3-4bbc-aa8e-73da7b03eba7";

interface TeleCrmAction {
  id: string;
  type: string;
  creationTimestamp: number;
  modificationTimestamp?: number;
  employeeid?: string;
  phoneNumber?: string;
  feedback?: string;
  duration?: number;
  callRecording?: string | null;
  note?: string;
}

interface TeleCrmLead {
  id: string;
  employeeid?: string;
  createdBy?: string;
  fields?: Record<string, any>;
  status?: string;
}

async function fetchFromTeleCrm(path: string, method: string = "GET", body: any = null): Promise<any> {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : "";
    const options: any = {
      hostname: "next.telecrm.in",
      port: 443,
      path: `/autoupdate/v2/enterprise/${TELECRM_ENTERPRISE_ID}${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TELECRM_SYNC_TOKEN}`,
      },
    };

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", (err) => resolve({ error: err.message }));
    if (body) req.write(postData);
    req.end();
  });
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Sync TeleCRM Incoming & Outgoing Calls into SLI CRM database
 */
export async function syncTeleCrmCalls(limit: number = 50): Promise<{
  syncedCount: number;
  totalCallsFound: number;
  message: string;
}> {
  try {
    const admin = supabaseAdmin();
    const routingConfig = await getLeadRoutingConfig();
    const executives = routingConfig.executives || DEFAULT_SALES_EXECUTIVES;

    // Get default account and owner user id
    const { data: accounts } = await admin.from("accounts").select("id, owner_user_id").limit(1);
    const accountId = accounts?.[0]?.id;
    const defaultUserId = accounts?.[0]?.owner_user_id;

    if (!accountId || !defaultUserId) {
      return { syncedCount: 0, totalCallsFound: 0, message: "No CRM account found" };
    }

    // 1. Search leads with call actions from TeleCRM
    const searchRes: any = await fetchFromTeleCrm("/lead/search?limit=" + limit, "POST", {
      actions: {
        type: ["OUTGOING_CALL", "INCOMING_CALL", "MISSED_CALL", "REJECTED_CALL"],
      },
    });

    const leads: TeleCrmLead[] = searchRes.data?.data || [];
    let syncedCount = 0;
    let totalCallsFound = 0;

    for (const lead of leads) {
      const rawPhone = String(lead.fields?.phone || "").replace(/\D/g, "");
      const customerName = lead.fields?.name || (rawPhone.length >= 10 ? `Customer +${rawPhone.slice(-10)}` : "Customer");

      if (!rawPhone || rawPhone.length < 10) continue;
      const last10 = rawPhone.slice(-10);

      // 2. Fetch full timeline actions for this lead to get individual calls & recordings
      const detailRes: any = await fetchFromTeleCrm(`/lead/${lead.id}?includeActions=true&limit=50`, "GET");
      const actions: TeleCrmAction[] = detailRes.data?.actions || [];

      const callActions = actions.filter((a) =>
        ["OUTGOING_CALL", "INCOMING_CALL", "MISSED_CALL", "REJECTED_CALL"].includes(a.type)
      );

      totalCallsFound += callActions.length;

      // 3. Resolve or create customer contact in SLI CRM
      const { data: matchedContacts } = await admin
        .from("contacts")
        .select("id, name, phone, user_id")
        .ilike("phone", `%${last10}%`)
        .limit(1);

      let contactId = matchedContacts?.[0]?.id;

      if (!contactId) {
        const { data: newContact, error: createErr } = await admin
          .from("contacts")
          .insert({
            account_id: accountId,
            user_id: defaultUserId,
            name: customerName,
            phone: `+91${last10}`,
          })
          .select("id")
          .single();

        if (createErr) {
          console.error("[TeleCrmCallSync] Failed to create contact:", createErr);
        } else {
          contactId = newContact?.id;
        }
      }

      if (!contactId) continue;

      // 4. Map and store each call log with deduplication into contact_notes
      for (const call of callActions) {
        const callDateObj = new Date(call.creationTimestamp || Date.now());
        const callDateStr = callDateObj.toISOString().slice(0, 10);
        const callTimeStr = callDateObj.toTimeString().slice(0, 8);
        const fullDateTimeStr = `${callDateStr} ${callTimeStr}`;

        const isIncoming = call.type.toLowerCase().includes("in");
        const callType = isIncoming ? "Incoming" : "Outgoing";
        const isConnected = call.feedback === "CONNECTED" || (call.duration || 0) > 0;
        const callStatus = isConnected ? "Connected" : (call.feedback && call.feedback.trim() ? call.feedback.trim() : "Missed");
        const durationSecs = Math.max(0, call.duration || 0);
        const formattedDuration = formatDuration(durationSecs);

        // Try to resolve executive
        const rawExecIdentity = [
          lead.fields?.employeeid,
          lead.fields?.createdBy,
          lead.employeeid,
          lead.createdBy,
          call.employeeid,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchedExec = executives.find((e) =>
          rawExecIdentity.includes(e.name.toLowerCase()) ||
          (e.tamilName && rawExecIdentity.includes(e.tamilName.toLowerCase())) ||
          (e.phone && rawExecIdentity.includes(e.phone.slice(-10)))
        );

        let agentName = matchedExec ? matchedExec.name : "Sales Executive";
        if (!matchedExec) {
          if (rawExecIdentity.includes("karthick")) agentName = "KARTHICK";
          else if (rawExecIdentity.includes("subash")) agentName = "SUBASH";
          else if (rawExecIdentity.includes("paval")) agentName = "Paval J";
          else if (rawExecIdentity.includes("satheesh")) agentName = "SATHEESH";
          else if (rawExecIdentity.includes("bala")) agentName = "BALA";
          else if (rawExecIdentity.includes("nalla")) agentName = "NALLAKAMAN";
          else if (rawExecIdentity.includes("baskar")) agentName = "BASKAR";
          else if (rawExecIdentity.includes("prasad")) agentName = "RK PRASAD";
        }

        const assignedUserId = matchedExec?.user_id || defaultUserId;

        // Cleanly resolve recording info if present
        let recordingInfo: string | null = null;
        if (typeof call.callRecording === "string" && call.callRecording.trim()) {
          recordingInfo = call.callRecording.trim();
        } else if (call.callRecording && typeof call.callRecording === "object") {
          const recObj = call.callRecording as any;
          recordingInfo = recObj.url || recObj.name || (recObj.filePath ? `Recorded on TeleCRM (${recObj.name || "Mobile App"})` : null);
        }

        // Check deduplication in contact_notes: match by actionId
        const { data: existingNotes } = await admin
          .from("contact_notes")
          .select("id")
          .eq("contact_id", contactId)
          .ilike("note_text", `%${call.id}%`)
          .limit(1);

        if (!existingNotes || existingNotes.length === 0) {
          const recordingPart = recordingInfo ? `\n🎙️ Audio Recording: ${recordingInfo}` : "";
          const noteContent = [
            `📞 [TeleCRM ${callType} Call]`,
            `📞 Call Status: ${callStatus}`,
            `👤 Executive: ${agentName}`,
            `⏱️ Duration: ${formattedDuration}`,
            `📅 Time: ${fullDateTimeStr}${recordingPart}`,
            `ActionId: ${call.id}`,
          ].join("\n");

          const { error: insertErr } = await admin.from("contact_notes").insert({
            account_id: accountId,
            contact_id: contactId,
            user_id: assignedUserId,
            note_text: noteContent,
            created_at: callDateObj.toISOString(),
          });

          if (!insertErr) {
            syncedCount++;
          } else {
            console.error("[TeleCrmCallSync] Failed to insert note:", insertErr);
          }
        }
      }
    }

    return {
      syncedCount,
      totalCallsFound,
      message: `Successfully synced ${syncedCount} calls from TeleCRM.`,
    };
  } catch (err: any) {
    console.error("[TeleCrmCallSync] Error:", err);
    return { syncedCount: 0, totalCallsFound: 0, message: err?.message || "Sync failed" };
  }
}

