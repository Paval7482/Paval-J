export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  advertising_channel_type: "SEARCH" | "DISPLAY" | "PERFORMANCE_MAX" | "DEMAND_GEN" | "VIDEO";
  budget_amount_inr: number;
  bidding_strategy_type: "MAXIMIZE_CONVERSIONS" | "TARGET_CPA" | "MAXIMIZE_CLICKS" | "MANUAL_CPC";
  target_cpa_inr?: number;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number; // percentage e.g. 4.2%
    average_cpc_inr: number;
    cost_inr: number;
    conversions: number; // leads / calls
    cost_per_conversion_inr: number; // CPL
  };
  ad_groups_count: number;
  keywords_count: number;
  created_at: string;
}

export interface GoogleKeywordItem {
  id: string;
  text: string;
  match_type: "EXACT" | "PHRASE" | "BROAD";
  monthly_searches: number;
  average_cpc_inr: number;
  competition: "LOW" | "MEDIUM" | "HIGH";
  intent_score: number; // 0 - 100
  is_negative?: boolean;
}

export interface GoogleResponsiveSearchAd {
  headlines: string[]; // up to 15
  descriptions: string[]; // up to 4
  final_url: string;
  display_path_1?: string;
  display_path_2?: string;
  phone_number?: string;
  callout_extensions?: string[];
  sitelinks?: Array<{ title: string; url: string }>;
}

export interface GoogleLeadPayload {
  lead_id: string;
  form_id: string;
  campaign_id: string;
  google_key: string;
  user_column_data: Array<{
    column_id: string;
    string_value: string;
    column_name: string;
  }>;
}
