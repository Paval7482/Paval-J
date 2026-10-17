import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { lintAdCopy } from "@/lib/meta-ads/policy-linter";
import { MetaMarketingApiClient } from "@/lib/meta-ads/client";
import type { LaunchCampaignPayload } from "@/lib/meta-ads/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Only admins can launch ad campaigns" }, { status: 403 });
    }

    const payload: LaunchCampaignPayload = await req.json();

    // 1. Mandatory Policy & Murukku Exclusivity Linting
    const lint = lintAdCopy(payload.headline, payload.primary_text);
    if (!lint.valid) {
      return NextResponse.json(
        {
          error: "Ad copy violates Meta Policy or Sri Lakshmi Murukku guidelines",
          violations: lint.errors,
          suggestions: lint.suggestions,
        },
        { status: 422 }
      );
    }

    // 2. Launch through Meta Marketing API
    const client = new MetaMarketingApiClient();
    const result = await client.launchCampaign(payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaign_id: result.campaign_id,
      adset_id: result.adset_id,
      local_only: result.local_only,
      lint_score: lint.score,
      lint_warnings: lint.warnings,
    });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
