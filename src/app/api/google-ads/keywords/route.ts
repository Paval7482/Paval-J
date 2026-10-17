import { NextResponse } from "next/server";
import {
  GENERAL_BUSINESS_KEYWORDS,
  UNIVERSAL_NEGATIVE_KEYWORDS,
} from "@/lib/google-ads/mock-data";
import { GoogleKeywordItem } from "@/lib/google-ads/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  let matchedKeywords: GoogleKeywordItem[] = [];

  if (q.includes("bakery") || q.includes("cake") || q.includes("bread") || q.includes("oven")) {
    matchedKeywords = GENERAL_BUSINESS_KEYWORDS.bakery;
  } else if (q.includes("restaurant") || q.includes("hotel") || q.includes("kitchen") || q.includes("cooking")) {
    matchedKeywords = GENERAL_BUSINESS_KEYWORDS.restaurant;
  } else if (q.includes("retail") || q.includes("pack") || q.includes("wholesale") || q.includes("store")) {
    matchedKeywords = GENERAL_BUSINESS_KEYWORDS.retail;
  } else if (q) {
    // Generate intelligent dynamic keywords for any typed business/product!
    matchedKeywords = [
      {
        id: `kw_gen_1`,
        text: `buy ${q} wholesale india`,
        match_type: "PHRASE",
        monthly_searches: 8500,
        average_cpc_inr: 8.4,
        competition: "HIGH",
        intent_score: 97,
      },
      {
        id: `kw_gen_2`,
        text: `${q} manufacturers in tamil nadu`,
        match_type: "PHRASE",
        monthly_searches: 6200,
        average_cpc_inr: 7.9,
        competition: "MEDIUM",
        intent_score: 95,
      },
      {
        id: `kw_gen_3`,
        text: `best ${q} machine price online`,
        match_type: "PHRASE",
        monthly_searches: 4900,
        average_cpc_inr: 9.1,
        competition: "HIGH",
        intent_score: 98,
      },
      {
        id: `kw_gen_4`,
        text: `${q} commercial suppliers coimbatore`,
        match_type: "EXACT",
        monthly_searches: 3100,
        average_cpc_inr: 6.5,
        competition: "LOW",
        intent_score: 92,
      },
      {
        id: `kw_gen_5`,
        text: `automatic ${q} factory machine`,
        match_type: "PHRASE",
        monthly_searches: 5400,
        average_cpc_inr: 10.2,
        competition: "HIGH",
        intent_score: 94,
      },
    ];
  } else {
    matchedKeywords = GENERAL_BUSINESS_KEYWORDS.default;
  }

  return NextResponse.json({
    query: q,
    keywords: matchedKeywords,
    negative_keywords: UNIVERSAL_NEGATIVE_KEYWORDS,
    recommended_bidding: {
      strategy: "MAXIMIZE_CONVERSIONS",
      target_cpa: 42,
      min_daily_budget: 500,
    },
  });
}
