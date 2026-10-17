import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { MetaMarketingApiClient } from "@/lib/meta-ads/client";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount();
    const { searchParams } = new URL(req.url);
    const datePreset = searchParams.get("date_preset") || "maximum";
    const client = new MetaMarketingApiClient();
    const bundle = await client.getFullReportBundle(datePreset);
    return NextResponse.json(bundle);
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
