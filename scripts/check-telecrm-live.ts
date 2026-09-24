import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import https from "https";

const TELECRM_ENTERPRISE_ID = "6aacd4164ef3c52f7005fb4e";
const TELECRM_SYNC_TOKEN = "bf96a38f-72b4-48a2-8006-f6b7855ce4991790162024443:8a3c803e-ddb6-4d46-92c7-6a7bf57bda18";

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

async function checkTeleCrm() {
  console.log("Searching latest leads in TeleCRM...");
  const searchRes: any = await fetchFromTeleCrm("/lead/search?limit=20", "POST", {});
  console.log("Search status:", searchRes.status);
  const leads = searchRes.data?.data || [];
  console.log(`Found ${leads.length} leads in TeleCRM:\n`);

  for (const lead of leads) {
    const phone = lead.fields?.phone;
    const name = lead.fields?.name;
    const lastActivity = lead.fields?.last_activity_type;
    const lastActivityOn = lead.fields?.last_activity_on
      ? new Date(lead.fields.last_activity_on).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "None";

    console.log(`- Lead [${lead.id}] ${name || "No Name"} (+${phone}) | Last Activity: ${lastActivity} on ${lastActivityOn}`);

    // Fetch actions for this lead
    const detailRes: any = await fetchFromTeleCrm(`/lead/${lead.id}?includeActions=true&limit=10`, "GET");
    const actions = detailRes.data?.actions || [];
    const callActions = actions.filter((a: any) =>
      ["OUTGOING_CALL", "INCOMING_CALL", "MISSED_CALL", "REJECTED_CALL"].includes(a.type)
    );
    console.log(`  -> Call actions: ${callActions.length}`);
    callActions.forEach((c: any) => {
      const timeStr = new Date(c.creationTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      console.log(`     * Type: ${c.type} | Feedback: ${c.feedback || "None"} | Duration: ${c.duration}s | Time: ${timeStr} | Audio: ${c.callRecording || "None"}`);
    });
  }
}

checkTeleCrm();
