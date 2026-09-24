import https from "https";

const token = "260da51e-b72e-4c7d-b2e7-8e8840cb49881790161435595:710434f3-d1c3-4bbc-aa8e-73da7b03eba7";

async function testEndpoint(url: string, headers: any, method: string = "GET", body: any = null) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data.slice(0, 1000),
        });
      });
    });

    req.on("error", (err) => resolve({ error: err.message }));
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log("Testing TeleCRM API Token...");

  const candidateUrls = [
    "https://api.telecrm.in/enterprise/652f750b2c15ba0018f6e80b/lead/list", // example
    "https://api.telecrm.in/enterprise/leads",
    "https://api.telecrm.in/v1/leads",
    "https://api.telecrm.in/v1/calls",
    "https://api.telecrm.in/enterprise/calls",
    "https://api.telecrm.in/enterprise/user/profile",
  ];

  const headerVariants = [
    { Authorization: `Bearer ${token}` },
    { "X-Api-Key": token },
    { token: token },
    { "api-key": token },
    { Authorization: token },
  ];

  for (const url of candidateUrls) {
    for (const h of headerVariants) {
      const res: any = await testEndpoint(url, h);
      if (res.status !== 404 && !res.error) {
        console.log(`URL: ${url} | Header: ${JSON.stringify(h)} | Status: ${res.status}`);
        console.log(`Response: ${res.data}\n`);
      }
    }
  }
}

main().catch(console.error);
