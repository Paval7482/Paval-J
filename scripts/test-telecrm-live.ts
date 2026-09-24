import https from "https";

const syncToken = "bf96a38f-72b4-48a2-8006-f6b7855ce4991790162024443:8a3c803e-ddb6-4d46-92c7-6a7bf57bda18";
const enterpriseId = "6aacd4164ef3c52f7005fb4e";

async function makeRequest(url: string, method: string = "GET", body: any = null) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const postData = body ? JSON.stringify(body) : "";

    const options: any = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncToken}`,
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

async function run() {
  console.log("1. Testing Sync API Lead Search (All leads)...");
  const searchRes: any = await makeRequest(
    `https://next.telecrm.in/autoupdate/v2/enterprise/${enterpriseId}/lead/search?limit=10`,
    "POST",
    {}
  );
  console.log("Search Result Status:", searchRes.status);
  console.log("Search Result Data:", JSON.stringify(searchRes.data || searchRes.raw, null, 2));

  console.log("\n2. Testing Lead Search with Calls Filter (OUTGOING_CALL, INCOMING_CALL)...");
  const callSearchRes: any = await makeRequest(
    `https://next.telecrm.in/autoupdate/v2/enterprise/${enterpriseId}/lead/search?limit=10`,
    "POST",
    {
      actions: {
        type: ["OUTGOING_CALL", "INCOMING_CALL", "MISSED_CALL", "REJECTED_CALL"],
      },
    }
  );
  console.log("Calls Search Status:", callSearchRes.status);
  console.log("Calls Search Data:", JSON.stringify(callSearchRes.data || callSearchRes.raw, null, 2));

  // If leads returned, inspect one lead's timeline actions
  const leadList = searchRes.data?.data || callSearchRes.data?.data;
  if (leadList && leadList.length > 0) {
    const firstLeadId = leadList[0].id;
    console.log(`\n3. Fetching detailed timeline for Lead ID: ${firstLeadId}...`);
    const leadDetail: any = await makeRequest(
      `https://next.telecrm.in/autoupdate/v2/enterprise/${enterpriseId}/lead/${firstLeadId}?includeActions=true&limit=20`,
      "GET"
    );
    console.log("Lead Detail Status:", leadDetail.status);
    console.log("Lead Actions / Calls:", JSON.stringify(leadDetail.data?.actions || leadDetail.data, null, 2));
  }
}

run().catch(console.error);
