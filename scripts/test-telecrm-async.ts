import https from "https";

const token = "260da51e-b72e-4c7d-b2e7-8e8840cb49881790161435595:710434f3-d1c3-4bbc-aa8e-73da7b03eba7";
const enterpriseId = "6aacd4164ef3c52f7005fb4e";

async function makeRequest(url: string, method: string = "POST", body: any = null) {
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
        Authorization: `Bearer ${token}`,
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
  console.log("Testing Async API endpoint...");
  const res: any = await makeRequest(
    `https://next-api.telecrm.in/enterprise/${enterpriseId}/autoupdatelead`,
    "POST",
    {
      fields: {
        phone: "919999999999",
      },
    }
  );
  console.log("Async API Result Status:", res.status);
  console.log("Async API Result Data:", res.data || res.raw);
}

run().catch(console.error);
