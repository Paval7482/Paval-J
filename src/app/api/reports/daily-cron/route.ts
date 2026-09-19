import { NextResponse } from "next/server";
import { getDailyReportConfig } from "@/lib/reports/daily-config";

export async function GET(req: Request) {
  try {
    const config = await getDailyReportConfig();
    if (!config.enabled) {
      return NextResponse.json({ ok: true, skipped: "Daily report is disabled in settings." });
    }

    // Get current time in Asia/Kolkata
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const [targetHour, targetMinute] = config.triggerTime.split(":").map(Number);
    const [currentHour, currentMinute] = istTimeStr.split(":").map(Number);

    // Check if within 5-minute window of trigger time
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const targetTotalMinutes = targetHour * 60 + targetMinute;

    const diff = Math.abs(currentTotalMinutes - targetTotalMinutes);
    const isDue = diff <= 5;

    if (!isDue) {
      return NextResponse.json({
        ok: true,
        skipped: `Current IST time (${istTimeStr}) does not match trigger time (${config.triggerTime})`,
      });
    }

    // Trigger send-now internally
    const origin = req.headers.get("host") ? `https://${req.headers.get("host")}` : "https://sli-crm-rho.vercel.app";
    const res = await fetch(`${origin}/api/reports/send-now`, { method: "POST" });
    const result = await res.json();

    return NextResponse.json({ ok: true, triggerTime: config.triggerTime, currentTime: istTimeStr, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
