import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

function getMetaCredentials() {
  const configPath = path.join(process.cwd(), "data", "meta_ads_config.json");
  if (!fs.existsSync(configPath)) return null;
  const conf = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return {
    token: conf.access_token,
    pageToken: conf.page_access_token,
    adAccountId: conf.ad_account_id,
  };
}

function getTagsFilePath() {
  return path.join(process.cwd(), "data", "ad_creative_tags.json");
}

function readSavedTags(): Record<string, any> {
  const p = getTagsFilePath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function saveAdTag(adId: string, tags: any) {
  const p = getTagsFilePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const existing = readSavedTags();
  existing[adId] = {
    ...existing[adId],
    ...tags,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(p, JSON.stringify(existing, null, 2), "utf-8");
  return existing[adId];
}

// In-memory cache for video metadata (30 min TTL)
interface VideoMeta {
  source?: string | null;
  embed_html?: string | null;
  permalink_url?: string | null;
  timestamp: number;
}
const videoMetaCache: Map<string, VideoMeta> = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;

async function fetchVideoMeta(videoId: string, token: string): Promise<VideoMeta | null> {
  const cached = videoMetaCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${videoId}?fields=id,source,picture,embed_html,permalink_url&access_token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.error) {
      console.warn(`[CreativeIntelligence] Error fetching video ${videoId}:`, data.error.message);
      return null;
    }

    let permalink = data.permalink_url || null;
    if (permalink && permalink.startsWith("/")) {
      permalink = `https://www.facebook.com${permalink}`;
    }

    const result: VideoMeta = {
      source: data.source || null,
      embed_html: data.embed_html || null,
      permalink_url: permalink,
      timestamp: Date.now(),
    };

    videoMetaCache.set(videoId, result);
    return result;
  } catch (err) {
    console.warn(`[CreativeIntelligence] Failed to fetch video ${videoId}:`, err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount();
    const creds = getMetaCredentials();
    if (!creds || !creds.token || !creds.adAccountId) {
      return NextResponse.json({ error: "Meta credentials not found" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const datePreset = searchParams.get("date_preset") || "last_7d";
    const adId = searchParams.get("ad_id");

    const savedTags = readSavedTags();

    // 1. If ad_id is requested, fetch daily trend line chart data for that specific ad
    if (adId) {
      const dailyUrl = `https://graph.facebook.com/v21.0/${adId}/insights?date_preset=last_30d&time_increment=1&fields=date_start,date_stop,spend,impressions,clicks,cpc,ctr,actions&limit=35&access_token=${creds.token}`;
      const dailyRes = await fetch(dailyUrl, { cache: "no-store" });
      const dailyData = await dailyRes.json();

      const timeline = (dailyData.data || []).map((d: any) => ({
        date: d.date_start,
        spend: parseFloat(d.spend || "0"),
        impressions: parseInt(d.impressions || "0", 10),
        clicks: parseInt(d.clicks || "0", 10),
        cpc: parseFloat(d.cpc || "0"),
        ctr: parseFloat(d.ctr || "0"),
      }));

      // Ad details with full creative & video spec
      const adDetailUrl = `https://graph.facebook.com/v21.0/${adId}?fields=id,name,status,campaign{id,name},adset{id,name},creative{id,name,thumbnail_url,image_url,video_id,object_story_spec,asset_feed_spec}&access_token=${creds.token}`;
      const adDetailRes = await fetch(adDetailUrl, { cache: "no-store" });
      const adDetail = await adDetailRes.json();

      const cr = adDetail.creative || {};
      const oss = cr.object_story_spec || {};
      const afs = cr.asset_feed_spec || {};
      const vidId = oss.video_data?.video_id || cr.video_id || (afs.videos && afs.videos[0]?.video_id);

      let videoMeta: VideoMeta | null = null;
      if (vidId) {
        videoMeta = await fetchVideoMeta(vidId, creds.token);
      }

      return NextResponse.json({
        ok: true,
        ad: {
          id: adDetail.id,
          name: adDetail.name,
          status: adDetail.status,
          campaign_name: adDetail.campaign?.name || "Meta Campaign",
          adset_name: adDetail.adset?.name || "Ad Set",
          thumbnail_url: adDetail.creative?.thumbnail_url || adDetail.creative?.image_url,
          video_id: vidId || null,
          video_url: videoMeta?.source || null,
          embed_html: videoMeta?.embed_html || null,
          permalink_url: videoMeta?.permalink_url || null,
        },
        daily_trend: timeline,
        saved_tags: savedTags[adId] || {
          hook: "Attention interrupt",
          tone: "Commercial B2B",
          promise: "High Production Murukku Extruder",
          proof: "4,000+ Happy Customers & 20+ Yrs Trust",
          production_style: "Factory live demo",
        },
      });
    }

    // 2. Fetch all ads with creative info and insights
    const adsUrl = `https://graph.facebook.com/v21.0/${creds.adAccountId}/ads?fields=id,name,status,created_time,campaign{id,name,status},adset{id,name},creative{id,name,thumbnail_url,image_url,video_id,object_story_spec,asset_feed_spec},insights.date_preset(${datePreset}){spend,impressions,clicks,cpc,ctr,actions}&limit=25&access_token=${creds.token}`;
    const adsRes = await fetch(adsUrl, { cache: "no-store" });
    const adsData = await adsRes.json();

    const rawAds = adsData.data || [];

    // Find all unique video IDs across ads
    const uniqueVideoIds = new Set<string>();
    rawAds.forEach((ad: any) => {
      const cr = ad.creative || {};
      const oss = cr.object_story_spec || {};
      const afs = cr.asset_feed_spec || {};
      const vidId = oss.video_data?.video_id || cr.video_id || (afs.videos && afs.videos[0]?.video_id);
      if (vidId) uniqueVideoIds.add(vidId);
    });

    // Batch fetch video metadata
    const videoMap: Record<string, VideoMeta> = {};
    await Promise.all(
      Array.from(uniqueVideoIds).map(async (vid) => {
        const meta = await fetchVideoMeta(vid, creds.token);
        if (meta) videoMap[vid] = meta;
      })
    );

    const adsList = rawAds.map((ad: any) => {
      const ins = ad.insights?.data?.[0];
      const spend = ins ? parseFloat(ins.spend || "0") : 0;
      const impressions = ins ? parseInt(ins.impressions || "0", 10) : 0;
      const clicks = ins ? parseInt(ins.clicks || "0", 10) : 0;
      const cpc = ins ? parseFloat(ins.cpc || "0") : 0;
      const ctr = ins ? parseFloat(ins.ctr || "0") : 0;

      let healthStatus: "fresh" | "active" | "fatigued" = "active";
      if (ctr >= 1.5) {
        healthStatus = "fresh";
      } else if (ctr < 0.9 && spend > 1500) {
        healthStatus = "fatigued";
      }

      const campName = ad.campaign?.name || "";
      const isWhatsApp =
        campName.toLowerCase().includes("whatsapp") ||
        campName.toLowerCase().includes("whats app");

      const cr = ad.creative || {};
      const oss = cr.object_story_spec || {};
      const afs = cr.asset_feed_spec || {};
      const vidId = oss.video_data?.video_id || cr.video_id || (afs.videos && afs.videos[0]?.video_id);
      const vMeta = vidId ? videoMap[vidId] : null;

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        campaign_id: ad.campaign?.id,
        campaign_name: campName,
        campaign_status: ad.campaign?.status,
        adset_name: ad.adset?.name,
        thumbnail_url:
          ad.creative?.thumbnail_url ||
          ad.creative?.image_url ||
          "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
        video_id: vidId || null,
        video_url: vMeta?.source || null,
        embed_html: vMeta?.embed_html || null,
        permalink_url: vMeta?.permalink_url || null,
        spend,
        impressions,
        clicks,
        cpc,
        ctr,
        cpc_trend: cpc < 4.5 ? "up" : "down",
        ctr_trend: ctr >= 1.2 ? "up" : "down",
        health_status: healthStatus,
        is_whatsapp: isWhatsApp,
        tags: savedTags[ad.id] || {
          hook: "Attention interrupt",
          tone: isWhatsApp ? "Conversational WhatsApp" : "Commercial Machinery",
        },
      };
    });

    // 3. Fetch Region Geography Breakdown (Image 3)
    let geography: any[] = [];
    try {
      const geoUrl = `https://graph.facebook.com/v21.0/${creds.adAccountId}/insights?date_preset=${datePreset}&breakdowns=region&fields=spend,impressions,clicks,cpc,ctr&limit=20&access_token=${creds.token}`;
      const geoRes = await fetch(geoUrl, { cache: "no-store" });
      const geoData = await geoRes.json();

      if (geoData.data && Array.isArray(geoData.data)) {
        geography = geoData.data
          .filter((g: any) => g.region && g.region !== "Unknown")
          .map((g: any) => ({
            region: g.region,
            spend: parseFloat(g.spend || "0"),
            impressions: parseInt(g.impressions || "0", 10),
            clicks: parseInt(g.clicks || "0", 10),
            cpc: parseFloat(g.cpc || "0"),
            ctr: parseFloat(g.ctr || "0"),
          }))
          .sort((a: any, b: any) => b.spend - a.spend);
      }
    } catch (e) {
      console.warn("[CreativeIntelligence] Failed to fetch geography:", e);
    }

    return NextResponse.json({
      ok: true,
      ads: adsList,
      geography,
      summary: {
        total_ads: adsList.length,
        active_ads: adsList.filter((a: any) => a.status === "ACTIVE").length,
        total_spend: adsList.reduce((acc: number, a: any) => acc + a.spend, 0),
        avg_cpc: adsList.length > 0
          ? +(adsList.reduce((acc: number, a: any) => acc + a.cpc, 0) / adsList.length).toFixed(2)
          : 0,
        avg_ctr: adsList.length > 0
          ? +(adsList.reduce((acc: number, a: any) => acc + a.ctr, 0) / adsList.length).toFixed(2)
          : 0,
      },
    });
  } catch (err: any) {
    console.error("[CreativeIntelligence] Error:", err);
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentAccount();
    const creds = getMetaCredentials();
    if (!creds || !creds.token) {
      return NextResponse.json({ error: "Meta credentials not found" }, { status: 400 });
    }

    const body = await req.json();
    const { adId, status, tags } = body;

    if (!adId) {
      return NextResponse.json({ error: "adId is required" }, { status: 400 });
    }

    // 1. If status update requested (Active / Paused toggle)
    if (status) {
      const updateUrl = `https://graph.facebook.com/v21.0/${adId}?status=${encodeURIComponent(status)}&access_token=${creds.token}`;
      const res = await fetch(updateUrl, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }
    }

    // 2. If AI tags update requested
    if (tags) {
      saveAdTag(adId, tags);
    }

    return NextResponse.json({ ok: true, adId, status, tags });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
