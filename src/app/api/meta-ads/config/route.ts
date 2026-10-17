import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { getMetaAdsConfig, saveMetaAdsConfig } from "@/lib/meta-ads/config";
import { MetaMarketingApiClient } from "@/lib/meta-ads/client";

export const maxDuration = 60;

export async function GET() {
  try {
    await getCurrentAccount();
    const config = getMetaAdsConfig();
    const client = new MetaMarketingApiClient();
    const testResult = await client.testConnection();

    return NextResponse.json({
      configured: client.isConfigured(),
      ad_account_id: config.ad_account_id,
      page_id: config.page_id,
      instagram_actor_id: config.instagram_actor_id,
      token_preview: config.access_token
        ? `${config.access_token.slice(0, 10)}...${config.access_token.slice(-6)}`
        : "None",
      health: testResult,
      updated_at: config.updated_at,
    });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Only admins can update ad config" }, { status: 403 });
    }

    const body = await req.json();
    const updated = saveMetaAdsConfig({
      access_token: body.access_token?.trim(),
      ad_account_id: body.ad_account_id?.trim(),
      page_id: body.page_id?.trim(),
      instagram_actor_id: body.instagram_actor_id?.trim(),
    });

    const client = new MetaMarketingApiClient();
    const health = await client.testConnection();

    return NextResponse.json({
      success: true,
      health,
      updated_at: updated.updated_at,
    });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
