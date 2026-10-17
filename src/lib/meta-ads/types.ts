export interface MetaAdAccountInfo {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  balance?: string;
  spend_cap?: string;
  amount_spent?: string;
  min_daily_budget?: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  start_time?: string;
  insights?: {
    spend: number;
    impressions: number;
    clicks: number;
    cpc: number;
    cpm: number;
    ctr: number;
    results: number;
    cost_per_result: number;
    result_type: string;
  };
}

export interface MetaActionStat {
  action_type: string;
  value: string;
}

export interface StateInsight {
  region: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  clicks: number;
}

export interface DemographicsInsight {
  age: string;
  gender: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
}

export interface PlacementInsight {
  publisher_platform: string;
  platform_position: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface HourlyInsight {
  hour: string;
  leads: number;
  spend: number;
  clicks: number;
}

export interface VideoRetentionInsight {
  video_3s_views: number;
  video_p25_watched: number;
  video_p50_watched: number;
  video_p75_watched: number;
  video_p100_watched: number;
  avg_watch_time_seconds: number;
}

export interface PostEngagementInsight {
  post_saves: number;
  post_shares: number;
  post_comments: number;
  post_reactions: number;
}

export interface MetaReportBundle {
  account: MetaAdAccountInfo;
  campaigns: MetaCampaign[];
  overview: {
    total_spend_30d: number;
    total_leads_30d: number;
    total_chats_30d: number;
    total_calls_30d?: number;
    avg_cpl: number;
    wallet_balance: number;
    saves_count: number;
    shares_count: number;
  };
  state_breakdown: StateInsight[];
  demographics: DemographicsInsight[];
  placements: PlacementInsight[];
  hourly: HourlyInsight[];
  video_retention: VideoRetentionInsight;
  post_engagement: PostEngagementInsight;
  is_cached?: boolean;
  cached_at?: string;
}

export interface LaunchCampaignPayload {
  mode: "quick_wizard" | "guided_pro" | "retargeting";
  objective: "CLICK_TO_WHATSAPP" | "INSTANT_LEAD_FORM" | "CLICK_TO_CALL";
  campaign_name: string;
  cluster: "tamil_nadu_kerala" | "north_hindi_belt" | "telugu_south";
  daily_budget_inr: number;
  status: "PAUSED" | "ACTIVE";
  enable_ab_test?: boolean;
  budget_guard_limit_inr?: number; // e.g. pause if CPL > ₹60
  
  // Destination & Phone Routing
  whatsapp_number?: string;
  phone_number?: string;
  
  // Creative
  headline: string;
  primary_text: string;
  cta_type: "WHATSAPP_MESSAGE" | "LEARN_MORE" | "GET_QUOTE" | "CALL_NOW";
  video_asset_id?: string;
  video_url?: string;
  image_url?: string;
  media_type?: "video" | "image";
  
  // Targeting overrides (for Guided Pro & Custom Ad Set Inspector Controls)
  adset_name?: string;
  min_age?: number;
  max_age?: number;
  gender?: "male" | "all";
  interests?: any[];
  locations?: string[];
  targeted_locations?: { key: string; name: string; type: string; region?: string; country_code?: string }[];
  excluded_locations?: { key: string; name: string; type: string; region?: string; country_code?: string }[];
  
  // Lead Form Customizer (for Instant Lead Form)
  lead_form_mode?: "existing" | "new";
  existing_form_id?: string;
  form_title?: string;
  questions?: {
    key: string;
    label: string;
    options?: string[];
  }[];
  completion_cta?: "whatsapp" | "call" | "website";
  completion_call_number?: string;
  completion_whatsapp_number?: string;
}
