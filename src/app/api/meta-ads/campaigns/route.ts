import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { MetaMarketingApiClient } from "@/lib/meta-ads/client";

export const maxDuration = 60;

export async function GET() {
  try {
    await getCurrentAccount();
    const client = new MetaMarketingApiClient();
    const campaigns = await client.getCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Only admins can modify campaigns" }, { status: 403 });
    }

    const body = await req.json();
    const { campaign_id, status, daily_budget_inr } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const client = new MetaMarketingApiClient();

    let isLocalOnly = false;
    if (status) {
      const res = await client.updateCampaignStatus(campaign_id, status);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      if (res.local_only) isLocalOnly = true;
    }

    if (daily_budget_inr) {
      const res = await client.updateCampaignBudget(campaign_id, Number(daily_budget_inr));
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      if (res.local_only) isLocalOnly = true;
    }

    return NextResponse.json({ success: true, local_only: isLocalOnly });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
