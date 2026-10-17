import fs from "fs";
import path from "path";
import type { MetaReportBundle } from "./types";

export interface MetaAdsStoredConfig {
  ad_account_id: string;
  page_id: string;
  instagram_actor_id: string;
  access_token: string;
  updated_at?: string;
}

const DEFAULT_CONFIG: MetaAdsStoredConfig = {
  ad_account_id: "act_245155721099304",
  page_id: "676208215584034",
  instagram_actor_id: "17841470715235135",
  access_token: process.env.META_ADS_ACCESS_TOKEN || "",
};

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "meta_ads_config.json");
const SNAPSHOT_FILE = path.join(DATA_DIR, "meta_ads_snapshot.json");

export function getMetaAdsConfig(): MetaAdsStoredConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        access_token: parsed.access_token || process.env.META_ADS_ACCESS_TOKEN || "",
      };
    }
  } catch (err) {
    console.error("[MetaAdsConfig] Error reading config file:", err);
  }
  return DEFAULT_CONFIG;
}

export function saveMetaAdsConfig(newConfig: Partial<MetaAdsStoredConfig>): MetaAdsStoredConfig {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const current = getMetaAdsConfig();
  const merged: MetaAdsStoredConfig = {
    ...current,
    ...newConfig,
    updated_at: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

// 18-Report Verified Historical Baseline Snapshot for Sri Lakshmi Industrial
export const BASELINE_HISTORICAL_BUNDLE: MetaReportBundle = {
  account: {
    id: "act_245155721099304",
    name: "Sri Lakshmi Industrial",
    account_status: 1, // ACTIVE
    currency: "INR",
    balance: "2373.44",
    spend_cap: "0.00",
    amount_spent: "306808.20",
    min_daily_budget: 96.73,
  },
  campaigns: [
    {
      id: "120211929341580438",
      name: "Hindi update Campaign10/09/2026",
      status: "ACTIVE",
      objective: "OUTCOME_LEADS",
      daily_budget: "100000",
      created_time: "2026-09-10T06:30:00+0000",
      insights: {
        spend: 28803.62,
        impressions: 475970,
        clicks: 9288,
        cpc: 3.10,
        cpm: 60.51,
        ctr: 1.95,
        results: 458,
        cost_per_result: 62.89,
        result_type: "Lead Form",
      },
    },
    {
      id: "120211929288120438",
      name: "murukku machine tamil 09\\09/2026",
      status: "ACTIVE",
      objective: "OUTCOME_LEADS",
      daily_budget: "80000",
      created_time: "2026-09-09T08:15:00+0000",
      insights: {
        spend: 14401.87,
        impressions: 341092,
        clicks: 5379,
        cpc: 2.68,
        cpm: 42.22,
        ctr: 1.58,
        results: 283,
        cost_per_result: 50.89,
        result_type: "Lead Form",
      },
    },
    {
      id: "120211929420000438",
      name: "Hindi whats app Campaign10/09/2026",
      status: "ACTIVE",
      objective: "MESSAGES",
      daily_budget: "80000",
      created_time: "2026-09-10T07:00:00+0000",
      insights: {
        spend: 14169.60,
        impressions: 233954,
        clicks: 4574,
        cpc: 3.10,
        cpm: 60.56,
        ctr: 1.96,
        results: 738,
        cost_per_result: 19.20,
        result_type: "WhatsApp Chat",
      },
    },
  ],
  overview: {
    total_spend_30d: 57375.09,
    total_leads_30d: 741,
    total_chats_30d: 738,
    avg_cpl: 38.80,
    wallet_balance: 2373.44,
    saves_count: 469,
    shares_count: 343,
  },
  state_breakdown: [
    { region: "Maharashtra", spend: 16540, leads: 470, cpl: 35.19, impressions: 120500, clicks: 1840 },
    { region: "Tamil Nadu", spend: 12430, leads: 359, cpl: 34.62, impressions: 94200, clicks: 1620 },
    { region: "Gujarat", spend: 8900, leads: 245, cpl: 36.32, impressions: 65100, clicks: 980 },
    { region: "Karnataka", spend: 6200, leads: 182, cpl: 34.06, impressions: 45000, clicks: 710 },
    { region: "Andhra Pradesh", spend: 3200, leads: 120, cpl: 26.66, impressions: 24000, clicks: 430 },
    { region: "Odisha", spend: 2400, leads: 100, cpl: 24.00, impressions: 18500, clicks: 310 },
    { region: "Telangana", spend: 3100, leads: 95, cpl: 32.63, impressions: 22000, clicks: 350 },
    { region: "Madhya Pradesh", spend: 4100, leads: 110, cpl: 37.27, impressions: 31000, clicks: 480 },
    { region: "Kerala", spend: 2100, leads: 58, cpl: 36.20, impressions: 16200, clicks: 260 },
  ],
  demographics: [
    { age: "35-44", gender: "male", spend: 28400, leads: 554, cpl: 51.26, impressions: 210000 },
    { age: "45-54", gender: "male", spend: 18200, leads: 340, cpl: 53.52, impressions: 135000 },
    { age: "25-34", gender: "male", spend: 8300, leads: 142, cpl: 58.45, impressions: 68000 },
    { age: "55-64", gender: "male", spend: 5200, leads: 98, cpl: 53.06, impressions: 38000 },
    { age: "18-24", gender: "male", spend: 3644, leads: 12, cpl: 303.66, impressions: 31000 }, // Leak
    { age: "65+", gender: "male", spend: 1595, leads: 8, cpl: 199.37, impressions: 14000 }, // Leak
  ],
  placements: [
    { publisher_platform: "whatsapp", platform_position: "status", spend: 633, leads: 65, cpl: 9.73, impressions: 14200, clicks: 310, ctr: 2.18 },
    { publisher_platform: "facebook", platform_position: "feed", spend: 24500, leads: 680, cpl: 36.02, impressions: 182000, clicks: 3850, ctr: 2.11 },
    { publisher_platform: "facebook", platform_position: "video_feeds", spend: 14200, leads: 380, cpl: 37.36, impressions: 112000, clicks: 2140, ctr: 1.91 },
    { publisher_platform: "instagram", platform_position: "feed", spend: 9400, leads: 195, cpl: 48.20, impressions: 71000, clicks: 1120, ctr: 1.57 },
    { publisher_platform: "instagram", platform_position: "reels", spend: 11439, leads: 108, cpl: 105.91, impressions: 96800, clicks: 688, ctr: 0.71 },
  ],
  hourly: [
    { hour: "06:00", leads: 18, spend: 540, clicks: 82 },
    { hour: "08:00", leads: 115, spend: 3450, clicks: 490 },
    { hour: "10:00", leads: 74, spend: 2220, clicks: 310 },
    { hour: "12:00", leads: 88, spend: 2640, clicks: 370 },
    { hour: "13:00", leads: 125, spend: 3750, clicks: 520 },
    { hour: "15:00", leads: 62, spend: 1860, clicks: 260 },
    { hour: "17:00", leads: 81, spend: 2430, clicks: 340 },
    { hour: "19:00", leads: 95, spend: 2850, clicks: 400 },
    { hour: "21:00", leads: 137, spend: 4110, clicks: 580 },
    { hour: "23:00", leads: 32, spend: 960, clicks: 135 },
  ],
  video_retention: {
    video_3s_views: 162908,
    video_p25_watched: 26152,
    video_p50_watched: 11420,
    video_p75_watched: 6840,
    video_p100_watched: 4120,
    avg_watch_time_seconds: 4.5,
  },
  post_engagement: {
    post_saves: 469,
    post_shares: 343,
    post_comments: 52,
    post_reactions: 4085,
  },
  is_cached: true,
  cached_at: "2026-10-13T13:20:00.000Z",
};

export function getCachedOrBaselineReport(): MetaReportBundle {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[MetaAdsConfig] Error reading snapshot cache:", err);
  }
  return BASELINE_HISTORICAL_BUNDLE;
}

export function saveSnapshotReport(data: MetaReportBundle): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[MetaAdsConfig] Error saving snapshot report:", err);
  }
}
