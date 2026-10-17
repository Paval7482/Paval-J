import { NextResponse } from "next/server";
import { GOOGLE_ADS_ACCOUNT_INFO, INITIAL_GOOGLE_CAMPAIGNS } from "@/lib/google-ads/mock-data";
import { GoogleAdsCampaign } from "@/lib/google-ads/types";

// In-memory campaign store for local live manipulation
let campaignsStore: GoogleAdsCampaign[] = [...INITIAL_GOOGLE_CAMPAIGNS];

export async function GET(request: Request) {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || GOOGLE_ADS_ACCOUNT_INFO.cleanCustomerId;

  // Calculate live summary totals
  const totalSpend = campaignsStore.reduce((acc, c) => acc + c.metrics.cost_inr, 0);
  const totalClicks = campaignsStore.reduce((acc, c) => acc + c.metrics.clicks, 0);
  const totalImpressions = campaignsStore.reduce((acc, c) => acc + c.metrics.impressions, 0);
  const totalConversions = campaignsStore.reduce((acc, c) => acc + c.metrics.conversions, 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpl = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return NextResponse.json({
    account: {
      ...GOOGLE_ADS_ACCOUNT_INFO,
      customerId,
      status: "ACTIVE",
    },
    overview: {
      total_spend_inr: Math.round(totalSpend),
      total_clicks: totalClicks,
      total_impressions: totalImpressions,
      total_conversions: totalConversions,
      average_cpc_inr: parseFloat(avgCpc.toFixed(2)),
      average_cpl_inr: parseFloat(avgCpl.toFixed(2)),
      ctr: parseFloat(overallCtr.toFixed(2)),
      active_campaigns_count: campaignsStore.filter((c) => c.status === "ENABLED").length,
    },
    campaigns: campaignsStore,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, campaignId, status, newCampaign } = body;

    if (action === "toggle_status" && campaignId) {
      campaignsStore = campaignsStore.map((c) =>
        c.id === campaignId ? { ...c, status: status || (c.status === "ENABLED" ? "PAUSED" : "ENABLED") } : c
      );
      return NextResponse.json({ success: true, campaigns: campaignsStore });
    }

    if (action === "create" && newCampaign) {
      const created: GoogleAdsCampaign = {
        id: `g_cmp_${Date.now()}`,
        name: newCampaign.name || "New Google Search Ad Campaign",
        status: newCampaign.status || "ENABLED",
        advertising_channel_type: newCampaign.advertising_channel_type || "SEARCH",
        budget_amount_inr: newCampaign.budget_amount_inr || 500,
        bidding_strategy_type: newCampaign.bidding_strategy_type || "MAXIMIZE_CONVERSIONS",
        target_cpa_inr: newCampaign.target_cpa_inr || 40,
        metrics: {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          average_cpc_inr: 0,
          cost_inr: 0,
          conversions: 0,
          cost_per_conversion_inr: 0,
        },
        ad_groups_count: 1,
        keywords_count: newCampaign.keywords_count || 10,
        created_at: new Date().toISOString(),
      };

      campaignsStore = [created, ...campaignsStore];
      return NextResponse.json({ success: true, campaign: created, campaigns: campaignsStore });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
