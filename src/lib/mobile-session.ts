import fs from "fs";

export function recordMobileHeartbeat(agentName?: string | null, email?: string | null) {
  if (!agentName && !email) return;

  try {
    const sessionFile = "C:\\SLICRMDATA\\active_mobile_sessions.json";
    let sessions: any[] = [];
    if (fs.existsSync(sessionFile)) {
      try {
        sessions = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
      } catch (e) {
        sessions = [];
      }
    }

    const cleanName = (agentName || "").trim();
    const cleanEmail = (email || `${cleanName.toLowerCase().replace(/\s+/g, "_")}@srilakshmiindustries.co.in`).trim();

    if (!cleanName && !cleanEmail) return;

    const existingIdx = sessions.findIndex(
      (s: any) =>
        (cleanEmail && s.email?.toLowerCase() === cleanEmail.toLowerCase()) ||
        (cleanName && s.name?.toLowerCase().includes(cleanName.toLowerCase())) ||
        (cleanName && cleanName.toLowerCase().includes((s.name || "").toLowerCase()))
    );

    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      sessions[existingIdx] = {
        ...sessions[existingIdx],
        name: cleanName || sessions[existingIdx].name,
        email: cleanEmail || sessions[existingIdx].email,
        last_active_at: now,
        is_online: true,
      };
    } else {
      sessions.push({
        id: `sess_${Date.now()}`,
        name: cleanName || "Sales Executive",
        email: cleanEmail,
        login_at: now,
        last_active_at: now,
        is_online: true,
      });
    }

    fs.writeFileSync(sessionFile, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Mobile Heartbeat] Error writing session file:", err);
  }
}
