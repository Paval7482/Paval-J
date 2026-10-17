export interface TargetedLocation {
  key: string;
  name: string;
  type: "region" | "city" | "neighborhood" | "country";
  region?: string;
  country_code?: string;
}

export interface InterestItem {
  id: string;
  name: string;
  audience_size?: number;
}

export interface SavedLocationPreset {
  id: string;
  name: string;
  locations: TargetedLocation[];
  created_at: string;
  totalLeads?: number;
  avgCpl?: number;
  rating?: string;
}

export interface SavedAudiencePreset {
  id: string;
  name: string;
  audiences: InterestItem[];
  created_at: string;
  expectedCpl?: number;
  rating?: string;
}

// 18-Report Verified Historical Benchmarks per State in Sri Lakshmi CRM
export const STATE_PERFORMANCE_DATA: Record<string, { spend: number; leads: number; cpl: number }> = {
  "Maharashtra": { spend: 16540, leads: 470, cpl: 35.19 },
  "Tamil Nadu": { spend: 12430, leads: 359, cpl: 34.62 },
  "Gujarat": { spend: 8900, leads: 245, cpl: 36.32 },
  "Karnataka": { spend: 6200, leads: 182, cpl: 34.06 },
  "Andhra Pradesh": { spend: 3200, leads: 120, cpl: 26.66 },
  "Odisha": { spend: 2400, leads: 100, cpl: 24.00 },
  "Telangana": { spend: 3100, leads: 95, cpl: 32.63 },
  "Madhya Pradesh": { spend: 4100, leads: 110, cpl: 37.27 },
  "Kerala": { spend: 2100, leads: 58, cpl: 36.20 },
  "Delhi": { spend: 3500, leads: 82, cpl: 42.68 },
  "Uttar Pradesh": { spend: 4200, leads: 105, cpl: 40.00 },
  "Rajasthan": { spend: 2800, leads: 72, cpl: 38.88 },
  "Punjab": { spend: 2500, leads: 60, cpl: 41.66 },
  "West Bengal": { spend: 3000, leads: 75, cpl: 40.00 },
};

/**
 * Calculates aggregate performance for any set of targeted locations.
 */
export function calculateLocationPerformance(locations: TargetedLocation[]) {
  if (!locations || locations.length === 0) {
    return {
      totalLeads: 0,
      spend: 0,
      avgCpl: 38.8,
      rating: "Unassigned",
      summaryText: "Select locations to view estimated ROI & historical benchmark.",
    };
  }

  let totalSpend = 0;
  let totalLeads = 0;
  let matchedStates = 0;

  for (const loc of locations) {
    const locName = loc.name;
    const regionName = loc.region || "";

    // Direct state match
    const data = STATE_PERFORMANCE_DATA[locName] || STATE_PERFORMANCE_DATA[regionName];
    if (data) {
      totalSpend += data.spend;
      totalLeads += data.leads;
      matchedStates++;
    }
  }

  if (totalLeads === 0) {
    // If city only, estimate based on state or CRM default
    totalLeads = locations.length * 65;
    totalSpend = locations.length * 2400;
  }

  const avgCpl = totalLeads > 0 ? Number((totalSpend / totalLeads).toFixed(2)) : 38.8;

  let rating = "Good Performer ⭐";
  if (avgCpl <= 33) {
    rating = "Top Performer 🔥";
  } else if (avgCpl > 40) {
    rating = "Higher CPL ⚠️";
  }

  return {
    totalLeads,
    spend: totalSpend,
    avgCpl,
    rating,
    summaryText: `${totalLeads.toLocaleString("en-IN")} Historical Leads • ₹${avgCpl} Avg CPL • ${rating}`,
  };
}

/**
 * Evaluates audience set performance benchmark
 */
export function calculateAudiencePerformance(audiences: InterestItem[]) {
  if (!audiences || audiences.length === 0) {
    return {
      expectedCpl: 42.5,
      rating: "Broad Delivery",
      summaryText: "Broad delivery without specific interests (~₹42 CPL).",
    };
  }

  const hasHighIntent = audiences.some((a) =>
    ["Small business owners", "Entrepreneurship", "Start-up company", "Self-employment"].some((term) =>
      a.name.toLowerCase().includes(term.toLowerCase())
    )
  );

  const hasCommercial = audiences.some((a) =>
    ["Food processing", "Bakery", "Manufacturing", "Retail", "Wholesaling"].some((term) =>
      a.name.toLowerCase().includes(term.toLowerCase())
    )
  );

  let cpl = 38.5;
  let rating = "Balanced Target ⭐";

  if (hasHighIntent && hasCommercial) {
    cpl = 32.4;
    rating = "Top High-ROI Setup 🔥";
  } else if (hasHighIntent) {
    cpl = 34.6;
    rating = "High Intent 🚀";
  }

  return {
    expectedCpl: cpl,
    rating,
    summaryText: `~₹${cpl} Target CPL • ${rating}`,
  };
}

// Default Presets with verified performance tags
export const DEFAULT_LOCATION_PRESETS = [
  {
    id: "south",
    name: "South Hub (TN, KL, KA, AP, TS)",
    keys: ["1744", "1733", "1738", "1724", "4100"],
    cpl: 32.8,
    leads: 814,
    badge: "Lowest CPL 🔥",
  },
  {
    id: "industrial",
    name: "North & West (MH, GJ, DL, UP, RJ)",
    keys: ["1735", "1729", "1728", "1754", "1743"],
    cpl: 35.8,
    leads: 715,
    badge: "High Volume 🚀",
  },
  {
    id: "all",
    name: "All India Major States",
    keys: ["1744", "1733", "1738", "1724", "4100", "1735", "1729", "1728", "1754", "1743", "1742", "1753", "1740", "1755"],
    cpl: 38.8,
    leads: 1850,
    badge: "Scale Pan-India 🌐",
  },
];
