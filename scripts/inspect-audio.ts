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

async function inspect() {
  const detailRes: any = await fetchFromTeleCrm(`/lead/6ab4a67983da5fe4192d9ffe?includeActions=true&limit=10`, "GET");
  console.log("Detail response data:", JSON.stringify(detailRes.data, null, 2));
}

inspect();
