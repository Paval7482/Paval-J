import { getMetaAdsConfig, getCachedOrBaselineReport, saveSnapshotReport } from "./config";
import type { LaunchCampaignPayload, MetaCampaign, MetaReportBundle } from "./types";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export class MetaMarketingApiClient {
  private adAccountId: string;
  private pageId: string;
  private instagramActorId: string;
  private accessToken: string;

  constructor() {
    const config = getMetaAdsConfig();
    this.adAccountId = config.ad_account_id.startsWith("act_")
      ? config.ad_account_id
      : `act_${config.ad_account_id}`;
    this.pageId = config.page_id;
    this.instagramActorId = config.instagram_actor_id;
    this.accessToken = config.access_token;
  }

  public isConfigured(): boolean {
    return !!this.accessToken && this.accessToken.length > 20;
  }

  public async testConnection(): Promise<{
    connected: boolean;
    name?: string;
    currency?: string;
    account_status?: number;
    balance?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        connected: false,
        error: "Meta Ads Access Token not configured. Please paste your token in settings.",
      };
    }

    try {
      const url = `${GRAPH_BASE}/${this.adAccountId}?fields=name,account_status,currency,balance,spend_cap,amount_spent&access_token=${this.accessToken}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data.error) {
        return {
          connected: false,
          error: data.error.message || "Failed to authenticate with Meta Ads API",
        };
      }

      return {
        connected: true,
        name: data.name,
        currency: data.currency,
        account_status: data.account_status,
        balance: data.balance,
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err.message || "Network error contacting Meta Graph API",
      };
    }
  }

  public async getCampaigns(datePreset: string = "maximum"): Promise<MetaCampaign[]> {
    if (!this.isConfigured()) {
      return getCachedOrBaselineReport().campaigns;
    }

    try {
      const fields = `id,name,status,objective,daily_budget,lifetime_budget,created_time,start_time,insights.date_preset(${datePreset}){spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type}`;
      const url = `${GRAPH_BASE}/${this.adAccountId}/campaigns?fields=${fields}&effective_status=['ACTIVE','PAUSED','ARCHIVED']&limit=100&access_token=${this.accessToken}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data.error || !data.data) {
        console.warn("[MetaClient] Failed to fetch live campaigns, using fallback:", data.error);
        return getCachedOrBaselineReport().campaigns;
      }

      const campaigns: MetaCampaign[] = data.data.map((c: any) => {
        const ins = c.insights?.data?.[0];
        let results = 0;
        let costPerResult = 0;
        let resultType = "Leads";

        if (ins?.actions) {
          const isWhatsAppCampaign =
            c.name?.toLowerCase().includes("whatsapp") ||
            c.name?.toLowerCase().includes("whats app") ||
            c.name?.toLowerCase().includes("message");

          const isCallCampaign =
            c.name?.toLowerCase().includes("call");

          const leadAction = ins.actions.find(
            (a: any) =>
              a.action_type === "lead" ||
              a.action_type === "onsite_conversion.lead_grouped" ||
              a.action_type === "contact"
          );
          const msgAction = ins.actions.find(
            (a: any) =>
              a.action_type === "onsite_conversion.total_messaging_connection" ||
              a.action_type === "onsite_conversion.messaging_conversation_started_7d"
          );
          const callAction = ins.actions.find(
            (a: any) =>
              a.action_type === "click_to_call_call_confirm" ||
              a.action_type === "click_to_call_native_call_placed"
          );

          if (isCallCampaign && callAction) {
            results = parseInt(callAction.value || "0", 10);
            resultType = "Phone Calls";
          } else if (isWhatsAppCampaign && msgAction) {
            results = parseInt(msgAction.value || "0", 10);
            resultType = "WhatsApp Chat";
          } else if (leadAction) {
            results = parseInt(leadAction.value || "0", 10);
            resultType = "Lead Form";
          } else if (callAction && parseInt(callAction.value || "0", 10) > 0) {
            results = parseInt(callAction.value || "0", 10);
            resultType = "Phone Calls";
          } else if (msgAction && parseInt(msgAction.value || "0", 10) > 0) {
            results = parseInt(msgAction.value || "0", 10);
            resultType = "WhatsApp Chat";
          }
        }

        const spend = ins ? parseFloat(ins.spend || "0") : 0;
        if (results > 0 && spend > 0) {
          costPerResult = +(spend / results).toFixed(2);
        }

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          daily_budget: c.daily_budget,
          lifetime_budget: c.lifetime_budget,
          created_time: c.created_time,
          start_time: c.start_time,
          insights: ins
            ? {
                spend,
                impressions: parseInt(ins.impressions || "0", 10),
                clicks: parseInt(ins.clicks || "0", 10),
                cpc: parseFloat(ins.cpc || "0"),
                cpm: parseFloat(ins.cpm || "0"),
                ctr: parseFloat(ins.ctr || "0"),
                results,
                cost_per_result: costPerResult,
                result_type: resultType,
              }
            : undefined,
        };
      });

      return campaigns;
    } catch (err) {
      console.error("[MetaClient] getCampaigns exception:", err);
      return getCachedOrBaselineReport().campaigns;
    }
  }

  public async updateCampaignStatus(
    campaignId: string,
    status: "ACTIVE" | "PAUSED"
  ): Promise<{ success: boolean; local_only?: boolean; error?: string }> {
    if (!this.isConfigured()) {
      const snap = getCachedOrBaselineReport();
      const camp = snap.campaigns.find((c) => c.id === campaignId);
      if (camp) {
        camp.status = status;
        saveSnapshotReport(snap);
      }
      return { success: true, local_only: true };
    }

    try {
      const url = `${GRAPH_BASE}/${campaignId}?access_token=${this.accessToken}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async updateCampaignBudget(
    campaignId: string,
    dailyBudgetInr: number
  ): Promise<{ success: boolean; local_only?: boolean; error?: string }> {
    if (!this.isConfigured()) {
      const snap = getCachedOrBaselineReport();
      const camp = snap.campaigns.find((c) => c.id === campaignId);
      if (camp) {
        camp.daily_budget = String(Math.round(dailyBudgetInr * 100));
        saveSnapshotReport(snap);
      }
      return { success: true, local_only: true };
    }

    try {
      // In Meta API, daily_budget for INR is in paise (₹100 = 10000 paise)
      const budgetInPaise = Math.round(dailyBudgetInr * 100);
      const url = `${GRAPH_BASE}/${campaignId}?access_token=${this.accessToken}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_budget: budgetInPaise }),
      });
      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async getFullReportBundle(datePreset: string = "maximum"): Promise<MetaReportBundle> {
    const fallback = getCachedOrBaselineReport();
    if (!this.isConfigured()) {
      return { ...fallback, is_cached: true };
    }

    try {
      const campaigns = await this.getCampaigns(datePreset);
      const accountRes = await this.testConnection();

      if (!accountRes.connected) {
        return { ...fallback, is_cached: true };
      }

      // Live account-level metrics directly matching Meta Ads Manager
      let liveSpend = 0;
      let liveLeads = 0;
      let liveChats = 0;
      let liveCalls = 0;
      let liveSaves = fallback.overview.saves_count || 0;
      let liveShares = fallback.overview.shares_count || 0;

      try {
        const accInsightsUrl = `${GRAPH_BASE}/${this.adAccountId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type&access_token=${this.accessToken}`;
        const accInsightsRes = await fetch(accInsightsUrl, { cache: "no-store" });
        const accInsightsData = await accInsightsRes.json();
        const accRow = accInsightsData.data?.[0];
        if (accRow) {
          liveSpend = parseFloat(accRow.spend || "0");
          const acts = accRow.actions || [];
          const lAct = acts.find(
            (a: any) =>
              a.action_type === "lead" ||
              a.action_type === "onsite_conversion.lead_grouped" ||
              a.action_type === "offsite_conversion.fb_pixel_lead"
          );
          if (lAct) liveLeads = parseInt(lAct.value || "0", 10);

          const cAct = acts.find(
            (a: any) =>
              a.action_type === "onsite_conversion.total_messaging_connection" ||
              a.action_type === "onsite_conversion.messaging_conversation_started_7d"
          );
          if (cAct) liveChats = parseInt(cAct.value || "0", 10);

          const callAct = acts.find(
            (a: any) =>
              a.action_type === "click_to_call_call_confirm" ||
              a.action_type === "click_to_call_native_call_placed"
          );
          if (callAct) liveCalls = parseInt(callAct.value || "0", 10);

          const saveAct = acts.find(
            (a: any) =>
              a.action_type === "onsite_conversion.post_save" ||
              a.action_type === "onsite_conversion.post_net_save"
          );
          if (saveAct) liveSaves = parseInt(saveAct.value || "0", 10);

          const shareAct = acts.find((a: any) => a.action_type === "post");
          if (shareAct) liveShares = parseInt(shareAct.value || "0", 10);
        }
      } catch (e) {
        console.warn("[MetaClient] Failed to fetch direct account insights:", e);
      }

      // If direct account insights had 0, fallback to summing campaigns
      if (liveSpend === 0 && liveLeads === 0 && campaigns.length > 0) {
        for (const c of campaigns) {
          if (c.insights) {
            liveSpend += c.insights.spend || 0;
            if (c.insights.result_type === "WhatsApp Chat") {
              liveChats += c.insights.results || 0;
            } else if (c.insights.result_type === "Phone Calls") {
              liveCalls += c.insights.results || 0;
            } else {
              liveLeads += c.insights.results || 0;
            }
          }
        }
      }

      const totalResults = liveLeads + liveChats + liveCalls;
      const avgCpl = totalResults > 0 && liveSpend > 0 ? +(liveSpend / totalResults).toFixed(1) : 0;
      const rawBalance = parseFloat(accountRes.balance || "0");
      const walletBalance = rawBalance > 10000 ? +(rawBalance / 100).toFixed(2) : rawBalance;

      // Live metrics bundle
      const bundle: MetaReportBundle = {
        ...fallback,
        account: {
          ...fallback.account,
          id: this.adAccountId,
          name: accountRes.name || fallback.account.name,
          currency: accountRes.currency || "INR",
          balance: accountRes.balance || fallback.account.balance,
        },
        overview: {
          total_spend_30d: +liveSpend.toFixed(2),
          total_leads_30d: liveLeads,
          total_chats_30d: liveChats,
          total_calls_30d: liveCalls,
          avg_cpl: avgCpl,
          wallet_balance: walletBalance,
          saves_count: liveSaves,
          shares_count: liveShares,
        },
        campaigns,
        is_cached: false,
        cached_at: new Date().toISOString(),
      };

      saveSnapshotReport(bundle);
      return bundle;
    } catch (err) {
      console.warn("[MetaClient] Failed to assemble live bundle, returning cached:", err);
      return { ...fallback, is_cached: true };
    }
  }

  public async launchCampaign(payload: LaunchCampaignPayload): Promise<{
    success: boolean;
    campaign_id?: string;
    adset_id?: string;
    ad_id?: string;
    local_only?: boolean;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      const snap = getCachedOrBaselineReport();
      const mockId = `draft_${Date.now()}`;
      let resultType = "Lead Form";
      if (payload.objective === "CLICK_TO_WHATSAPP") resultType = "WhatsApp Chat";
      if (payload.objective === "CLICK_TO_CALL") resultType = "Direct Phone Call";

      snap.campaigns.unshift({
        id: mockId,
        name: payload.campaign_name,
        status: payload.status,
        objective:
          payload.objective === "CLICK_TO_WHATSAPP"
            ? "MESSAGES"
            : payload.objective === "CLICK_TO_CALL"
            ? "CALLS"
            : "OUTCOME_LEADS",
        daily_budget: String(Math.round(payload.daily_budget_inr * 100)),
        created_time: new Date().toISOString(),
        insights: {
          spend: 0,
          impressions: 0,
          clicks: 0,
          cpc: 0,
          cpm: 0,
          ctr: 0,
          results: 0,
          cost_per_result: 0,
          result_type: resultType,
        },
      });
      saveSnapshotReport(snap);
      return {
        success: true,
        campaign_id: mockId,
        local_only: true,
      };
    }

    try {
      // 1. Create Campaign
      const objective =
        payload.objective === "CLICK_TO_WHATSAPP"
          ? "OUTCOME_LEADS" // Meta 2026 unified objective
          : "OUTCOME_LEADS";

      const campUrl = `${GRAPH_BASE}/${this.adAccountId}/campaigns?access_token=${this.accessToken}`;
      const campRes = await fetch(campUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.campaign_name,
          objective,
          status: payload.status,
          special_ad_categories: [],
        }),
      });
      const campData = await campRes.json();

      if (campData.error) {
        return { success: false, error: `Campaign creation error: ${campData.error.message}` };
      }

      const campaignId = campData.id;

      // 2. Build Geo Targets
      let countries = ["IN"];
      let regions: any[] = [];
      let cities: any[] = [];
      let excludedGeo: any = undefined;

      if (payload.targeted_locations && payload.targeted_locations.length > 0) {
        payload.targeted_locations.forEach((loc) => {
          if (loc.type === "region") {
            regions.push({ key: loc.key });
          } else if (loc.type === "city" || loc.type === "neighborhood") {
            cities.push({ key: loc.key, radius: 25, distance_unit: "kilometer" });
          }
        });
      } else if (payload.cluster === "tamil_nadu_kerala") {
        regions = [
          { key: "1744" }, // Tamil Nadu
          { key: "1733" }, // Kerala
        ];
      } else if (payload.cluster === "north_hindi_belt") {
        regions = [
          { key: "1735" }, // Maharashtra
          { key: "1729" }, // Gujarat
          { key: "1753" }, // Madhya Pradesh
          { key: "1728" }, // Delhi
        ];
      } else if (payload.cluster === "telugu_south") {
        regions = [
          { key: "1724" }, // Andhra Pradesh
          { key: "4100" }, // Telangana
        ];
      }

      if (payload.excluded_locations && payload.excluded_locations.length > 0) {
        const exRegions = payload.excluded_locations
          .filter((l) => l.type === "region")
          .map((l) => ({ key: l.key }));
        if (exRegions.length > 0) {
          excludedGeo = { regions: exRegions };
        }
      }

      // 3. Build Ad Set
      const budgetInPaise = Math.round(payload.daily_budget_inr * 100);
      const adsetUrl = `${GRAPH_BASE}/${this.adAccountId}/adsets?access_token=${this.accessToken}`;
      
      const targeting: any = {
        geo_locations: {
          countries,
          regions: regions.length > 0 ? regions : undefined,
          cities: cities.length > 0 ? cities : undefined,
        },
        excluded_geo_locations: excludedGeo,
        age_min: payload.min_age || 26,
        age_max: payload.max_age || 55,
        genders: payload.gender === "all" ? [1, 2] : [1], // Male by default
        flexible_spec: [
          {
            interests:
              payload.interests && payload.interests.length > 0
                ? payload.interests.map((it: any) => ({
                    id: String(it.id),
                    name: it.name,
                  }))
                : [
                    { id: "6003139268396", name: "Food processing" },
                    { id: "6003014389182", name: "Bakery" },
                    { id: "6003117565191", name: "Snack" },
                  ],
          },
        ],
      };

      let destinationType = "ON_AD";
      let optimizationGoal = "QUALITY_LEAD";

      if (payload.objective === "CLICK_TO_WHATSAPP") {
        destinationType = "WHATSAPP";
        optimizationGoal = "CONVERSATIONS";
      } else if (payload.objective === "CLICK_TO_CALL") {
        destinationType = "PHONE_CALL";
        optimizationGoal = "QUALITY_CALL";
      }

      const adsetBody: any = {
        name: payload.adset_name || `${payload.campaign_name} - Ad Set`,
        campaign_id: campaignId,
        daily_budget: budgetInPaise,
        billing_event: "IMPRESSIONS",
        optimization_goal: optimizationGoal,
        status: payload.status,
        targeting,
        destination_type: destinationType,
      };

      const adsetRes = await fetch(adsetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsetBody),
      });
      const adsetData = await adsetRes.json();

      if (adsetData.error) {
        return {
          success: false,
          campaign_id: campaignId,
          error: `Ad Set creation error: ${adsetData.error.message}`,
        };
      }

      return {
        success: true,
        campaign_id: campaignId,
        adset_id: adsetData.id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
