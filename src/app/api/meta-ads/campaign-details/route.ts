import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { getMetaAdsConfig } from "@/lib/meta-ads/config";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount();
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaign_id");

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const config = getMetaAdsConfig();
    if (!config.access_token) {
      return NextResponse.json({ error: "Meta Access Token not configured" }, { status: 400 });
    }

    const token = config.access_token;

    // 1. Fetch Campaign Details
    const campFields = "id,name,status,objective,daily_budget,lifetime_budget,buying_type,bid_strategy,created_time,start_time,special_ad_categories";
    const campRes = await fetch(`${GRAPH_BASE}/${campaignId}?fields=${campFields}&access_token=${token}`);
    const campaign = await campRes.json();

    if (campaign.error) {
      return NextResponse.json({ error: campaign.error.message }, { status: 400 });
    }

    // 2. Fetch Ad Sets
    const adsetFields = "id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,destination_type,targeting,promoted_object,created_time,start_time";
    const adsetsRes = await fetch(`${GRAPH_BASE}/${campaignId}/adsets?fields=${adsetFields}&access_token=${token}`);
    const adsetsData = await adsetsRes.json();
    const adsets = adsetsData.data || [];

    // 3. Fetch Ads & Creatives
    const adsFields = "id,name,status,adset_id,creative{id,name,call_to_action_type,object_story_spec,asset_feed_spec},created_time";
    const adsRes = await fetch(`${GRAPH_BASE}/${campaignId}/ads?fields=${adsFields}&access_token=${token}`);
    const adsData = await adsRes.json();
    const ads = adsData.data || [];

    // 4. Enrich Ads with Video Streaming Source if available
    for (const ad of ads) {
      const videoId = ad.creative?.object_story_spec?.video_data?.video_id;
      if (videoId) {
        try {
          const videoRes = await fetch(`${GRAPH_BASE}/${videoId}?fields=id,source,picture,length&access_token=${token}`);
          const videoJson = await videoRes.json();
          if (videoJson.source) {
            ad.creative_video = {
              source: videoJson.source,
              picture: videoJson.picture,
              length: videoJson.length,
            };
          }
        } catch (e) {
          console.warn("[CampaignDetails] Failed to fetch video source:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign,
      adsets,
      ads,
    });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Only admins can modify campaigns" }, { status: 403 });
    }

    const body = await req.json();
    const {
      campaign_id,
      campaign_name,
      status,
      adset_id,
      adset_name,
      adset_status,
      adset_budget_inr,
      targeting,
      ad_id,
      ad_name,
      ad_status,
      headline,
      primary_text,
      call_to_action,
    } = body;

    const config = getMetaAdsConfig();
    if (!config.access_token) {
      return NextResponse.json({ error: "Meta Access Token not configured" }, { status: 400 });
    }

    const token = config.access_token;
    const results: any = {};

    // 1. Update Campaign Level (Name & Status)
    if (campaign_id && (status || campaign_name)) {
      const payload: any = {};
      if (status) payload.status = status;
      if (campaign_name) payload.name = campaign_name;

      const res = await fetch(`${GRAPH_BASE}/${campaign_id}?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      results.campaign = data;
    }

    // 2. Update AdSet Level (Name, Status, Budget, and Geographic/Age Targeting)
    if (adset_id) {
      const adsetPayload: any = {};
      if (adset_name) adsetPayload.name = adset_name;
      if (adset_status) adsetPayload.status = adset_status;
      if (adset_budget_inr) {
        adsetPayload.daily_budget = Math.round(Number(adset_budget_inr) * 100);
      }

      if (targeting) {
        try {
          const curRes = await fetch(`${GRAPH_BASE}/${adset_id}?fields=targeting&access_token=${token}`);
          const curData = await curRes.json();
          const existingTargeting = curData.targeting || {};

          const newRegions = targeting.regions && targeting.regions.length > 0
            ? targeting.regions.map((r: any) => ({
                key: String(r.key),
                name: r.name,
                country: r.country || "IN",
              }))
            : [];

          const newCities = targeting.cities && targeting.cities.length > 0
            ? targeting.cities.map((c: any) => ({
                key: String(c.key),
                name: c.name,
                radius: c.radius || 25,
                distance_unit: "kilometer",
              }))
            : [];

          const geoLocations: any = {
            location_types: ["home", "recent"],
          };
          if (newRegions.length > 0) geoLocations.regions = newRegions;
          if (newCities.length > 0) geoLocations.cities = newCities;
          if (newRegions.length === 0 && newCities.length === 0) {
            geoLocations.countries = ["IN"];
          }

          adsetPayload.targeting = {
            ...existingTargeting,
            geo_locations: geoLocations,
            age_min: targeting.age_min || existingTargeting.age_min || 21,
            age_max: targeting.age_max || existingTargeting.age_max || 65,
          };

          if (targeting.excluded_regions && targeting.excluded_regions.length > 0) {
            adsetPayload.targeting.excluded_geo_locations = {
              location_types: ["home", "recent"],
              regions: targeting.excluded_regions.map((r: any) => ({
                key: String(r.key),
                name: r.name,
                country: r.country || "IN",
              })),
            };
          }

          if (targeting.genders && Array.isArray(targeting.genders)) {
            adsetPayload.targeting.genders = targeting.genders;
          }

          if (targeting.interests && Array.isArray(targeting.interests)) {
            const existingFlex =
              existingTargeting.flexible_spec && existingTargeting.flexible_spec.length > 0
                ? existingTargeting.flexible_spec[0]
                : {};
            adsetPayload.targeting.flexible_spec = [
              {
                ...existingFlex,
                interests: targeting.interests.map((it: any) => ({
                  id: String(it.id),
                  name: it.name,
                })),
              },
            ];
          }
        } catch (targetErr) {
          console.error("Error reading targeting for update:", targetErr);
        }
      }

      const res = await fetch(`${GRAPH_BASE}/${adset_id}?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsetPayload),
      });
      const data = await res.json();
      results.adset = data;
    }

    // 3. Update Ad Level (Name & Status)
    if (ad_id) {
      const adPayload: any = {};
      if (ad_name) adPayload.name = ad_name;
      if (ad_status) adPayload.status = ad_status;

      if (Object.keys(adPayload).length > 0) {
        const res = await fetch(`${GRAPH_BASE}/${ad_id}?access_token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adPayload),
        });
        const data = await res.json();
        results.ad = data;
      }
    }

    // Record copy updates
    if (headline || primary_text || call_to_action) {
      results.creative_customizations = {
        headline,
        primary_text,
        call_to_action,
        saved_at: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
