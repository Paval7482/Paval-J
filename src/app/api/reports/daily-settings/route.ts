import { NextResponse } from "next/server";
import { getDailyReportConfig, saveDailyReportConfig } from "@/lib/reports/daily-config";

export async function GET() {
  try {
    const config = await getDailyReportConfig();
    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await saveDailyReportConfig(body);
    return NextResponse.json({ ok: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
