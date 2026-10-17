import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { getMetaAdsConfig } from "@/lib/meta-ads/config";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

// Smart semantic expansion mappings for small business queries
const INTENT_KEYWORD_EXPANSIONS: Record<string, string[]> = {
  "new business": ["entrepreneurship", "small business", "start-up company", "self-employment"],
  "business": ["small business", "entrepreneurship", "business development"],
  "startup": ["start-up company", "entrepreneurship", "small business"],
  "start-up": ["start-up company", "entrepreneurship", "small business"],
  "own business": ["self-employment", "small business", "entrepreneurship"],
  "small business": ["small business", "small business owners", "entrepreneurship"],
  "food business": ["food processing", "snack food", "bakery", "restaurant"],
  "food machine": ["food processing", "machinery", "packaging and labelling"],
  "cloth": ["boutique", "clothing", "sari", "fashion design"],
  "dress": ["boutique", "clothing", "fashion design", "shopping"],
  "beauty": ["beauty salon", "cosmetics", "skin care", "hair care"],
  "salon": ["beauty salon", "hair care", "spa", "make-up artist"],
  "gym": ["physical fitness", "gym", "bodybuilding", "yoga"],
  "fitness": ["fitness and wellness", "physical fitness", "gym"],
  "tuition": ["tutoring", "higher education", "school", "learning"],
  "coaching": ["tutoring", "competitive examination", "learning"],
  "real estate": ["real estate", "property", "apartment", "house"],
};

// Known high-intent core fallback interests for small businesses
const CORE_BUSINESS_INTERESTS = [
  { id: "6003371567474", name: "Entrepreneurship", topic: "Business and industry" },
  { id: "6002714898572", name: "Small business owners", topic: "Behaviors" },
  { id: "6002884511422", name: "Small business", topic: "Business and industry" },
  { id: "6003325004380", name: "Start-up company", topic: "Business and industry" },
  { id: "6003214937861", name: "Self-employment", topic: "Business and industry" },
];

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const config = getMetaAdsConfig();
    if (!config.access_token) {
      return NextResponse.json({ error: "Meta Access Token not configured" }, { status: 400 });
    }

    const token = config.access_token;
    const qLower = query.toLowerCase();

    // Check if query triggers semantic expansions
    const queriesToExecute = [query];
    for (const [key, expansions] of Object.entries(INTENT_KEYWORD_EXPANSIONS)) {
      if (qLower.includes(key)) {
        for (const exp of expansions) {
          if (!queriesToExecute.includes(exp)) {
            queriesToExecute.push(exp);
          }
        }
      }
    }

    // Execute queries (up to 3 in parallel to stay fast)
    const activeQueries = queriesToExecute.slice(0, 3);
    const fetchPromises = activeQueries.map((q) =>
      fetch(`${GRAPH_BASE}/search?type=adinterest&q=${encodeURIComponent(q)}&limit=12&access_token=${token}`)
        .then((r) => r.json())
        .catch(() => ({ data: [] }))
    );

    const responses = await Promise.all(fetchPromises);
    const rawItems: any[] = [];
    for (const res of responses) {
      if (res && Array.isArray(res.data)) {
        rawItems.push(...res.data);
      }
    }

    // Filter out Meta's known irrelevant junk noise
    const seenIds = new Set<string>();
    const formatted: Array<{ id: string; name: string; audience_size: number | null; topic: string }> = [];

    // If query is about business / startup, inject core verified business interests first
    if (qLower.includes("business") || qLower.includes("startup") || qLower.includes("entrepreneur")) {
      for (const core of CORE_BUSINESS_INTERESTS) {
        if (!seenIds.has(core.id)) {
          seenIds.add(core.id);
          formatted.push({
            id: core.id,
            name: core.name,
            audience_size: 150000000,
            topic: core.topic,
          });
        }
      }
    }

    for (const item of rawItems) {
      if (seenIds.has(item.id)) continue;

      const nameLower = (item.name || "").toLowerCase();

      // Junk / Noise Filter for business queries
      const isNoise =
        (nameLower.includes("musical theatre") && !qLower.includes("theatre")) ||
        (nameLower.includes("tv reality show") && !qLower.includes("tv")) ||
        (nameLower.includes("simulation") && !qLower.includes("simulation") && !qLower.includes("game")) ||
        (nameLower.includes("education (social concept)") && !qLower.includes("education")) ||
        (nameLower.includes("school of business") && !qLower.includes("school") && !qLower.includes("college"));

      if (isNoise) continue;

      seenIds.add(item.id);
      formatted.push({
        id: item.id,
        name: item.name,
        audience_size: item.audience_size_lower_bound || item.audience_size_upper_bound || null,
        topic: item.topic || item.disambiguation_category || "Interest",
      });
    }

    return NextResponse.json({ success: true, data: formatted.slice(0, 20) });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
